/**
 * scripts/seed_from_channels_playlists.js
 *
 * - Requires .env with MONGO_URI and YT_API_KEY
 * - Finds channel IDs by search (query: "Muse Asia", "Ani-One Asia")
 * - Lists playlists for each channel (skips the generic "Uploads" playlist)
 * - For each playlist: fetches playlist items (videoIds), batches video metadata
 *   checks embeddable flag, builds videos[] and upserts a Movie doc
 *
 * WARNING: YouTube API quotas apply. Use env variables below to limit work.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import Movie from "../models/Movie.ts";
import Genre from "../models/Genre.ts";

dotenv.config();

const { MONGO_URI, YT_API_KEY } = process.env;
if (!MONGO_URI || !YT_API_KEY) {
    console.error("Missing MONGO_URI or YT_API_KEY in .env");
    process.exit(1);
}

const YT_BASE = "https://www.googleapis.com/youtube/v3";

// Config: tune if you want fewer playlists/videos
const MAX_PLAYLISTS_PER_CHANNEL = Number(process.env.MAX_PLAYLISTS_PER_CHANNEL) || 10;
const MAX_VIDEOS_PER_PLAYLIST = Number(process.env.MAX_VIDEOS_PER_PLAYLIST) || 50;
const VIDEO_BATCH_SIZE = 50; // videos.list supports up to 50 ids

// The channel queries you asked for - add / remove names as needed
const CHANNEL_QUERIES = [
    "Muse Asia",
    "Ani-One Asia"
    // add more e.g. "GundamInfo", "Crunchyroll" (official), etc
];

/* ---------------- utilities ---------------- */

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function inferGenresFromTitle(title = "") {
    const map = {
        romance: ["romance", "love", "slice of life"],
        horror: ["horror", "psychological", "terror"],
        action: ["action", "shounen", "shonen", "battle", "fight"],
        comedy: ["comedy", "gag", "slice of life", "comedy"],
        drama: ["drama", "trag"],
        fantasy: ["fantasy", "isekai", "magic"],
        "sci-fi": ["sci-fi", "science", "space", "future"],
        thriller: ["thriller", "mystery"],
        sports: ["sports", "baseball", "basketball", "soccer"],
        mecha: ["mecha", "robot"],
        "slice of life": ["slice of life"]
    };

    const found = new Set();
    const t = String(title).toLowerCase();
    for (const [g, keywords] of Object.entries(map)) {
        for (const kw of keywords) {
            if (t.includes(kw)) {
                found.add(g);
                break;
            }
        }
    }
    return Array.from(found);
}

// simple ISO8601 PT#H#M#S -> seconds parser
function parseISO8601Duration(iso) {
    if (!iso) return 0;
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    const [, h = 0, min = 0, s = 0] = m;
    return Number(h) * 3600 + Number(min) * 60 + Number(s);
}

/* ---------------- YouTube API helpers ---------------- */

async function ytSearchChannelId(query) {
    // search for channels matching query and pick best match
    try {
        const res = await axios.get(`${YT_BASE}/search`, {
            params: {
                part: "snippet",
                q: query,
                type: "channel",
                maxResults: 5,
                key: YT_API_KEY
            },
            timeout: 15000
        });
        const items = res.data.items || [];
        if (!items.length) {
            console.warn(`[YT] channel search returned no results for "${query}"`);
            return null;
        }
        // prefer exact title match if possible
        const exact = items.find(i => (i.snippet.title || "").toLowerCase() === query.toLowerCase());
        const chosen = exact || items[0];
        console.log(`[YT] Resolved channel "${query}" -> ${chosen.snippet.title} (${chosen.snippet.channelId || chosen.id.channelId || chosen.id})`);
        // channelId may be in i.id.channelId or i.snippet.channelId depending on endpoint shape
        const channelId = (chosen.id && chosen.id.channelId) || chosen.snippet?.channelId || chosen.id?.channelId;
        // fallback to id.channelId or id if present
        return channelId || null;
    } catch (err) {
        console.error(`[YT] error searching channel "${query}":`, err?.response?.data || err.message);
        return null;
    }
}

async function ytListPlaylistsByChannel(channelId, max = 50) {
    const playlists = [];
    let pageToken = null;
    try {
        do {
            const res = await axios.get(`${YT_BASE}/playlists`, {
                params: {
                    part: "snippet,contentDetails",
                    channelId,
                    maxResults: 50,
                    pageToken,
                    key: YT_API_KEY
                },
                timeout: 20000
            });
            const items = res.data.items || [];
            for (const p of items) playlists.push(p);
            pageToken = res.data.nextPageToken;
            // stop early if we reached max
            if (playlists.length >= max) break;
            // be gentle
            await sleep(150);
        } while (pageToken);
    } catch (err) {
        console.error(`[YT] error listing playlists for channel ${channelId}:`, err?.response?.data || err.message);
    }
    return playlists.slice(0, max);
}

async function ytListPlaylistItems(playlistId, maxItems = 500) {
    // returns array of { videoId, title, position }
    const items = [];
    let pageToken = null;
    try {
        do {
            const res = await axios.get(`${YT_BASE}/playlistItems`, {
                params: {
                    part: "snippet,contentDetails",
                    playlistId,
                    maxResults: 50,
                    pageToken,
                    key: YT_API_KEY
                },
                timeout: 20000
            });
            const batch = (res.data.items || []).map(i => ({
                videoId: i.contentDetails?.videoId,
                title: i.snippet?.title,
                position: i.snippet?.position
            })).filter(Boolean);
            items.push(...batch);
            pageToken = res.data.nextPageToken;
            if (items.length >= maxItems) break;
            await sleep(120);
        } while (pageToken);
    } catch (err) {
        console.error(`[YT] error listing items for playlist ${playlistId}:`, err?.response?.data || err.message);
    }
    return items.slice(0, maxItems);
}

async function ytFetchVideosMetadata(videoIds = []) {
    const results = [];
    // process in batches of VIDEO_BATCH_SIZE
    for (let i = 0; i < videoIds.length; i += VIDEO_BATCH_SIZE) {
        const batch = videoIds.slice(i, i + VIDEO_BATCH_SIZE);
        try {
            const res = await axios.get(`${YT_BASE}/videos`, {
                params: {
                    part: "snippet,contentDetails,status",
                    id: batch.join(","),
                    key: YT_API_KEY,
                    maxResults: VIDEO_BATCH_SIZE
                },
                timeout: 20000
            });
            const items = res.data.items || [];
            for (const it of items) {
                results.push({
                    youtubeId: it.id,
                    title: it.snippet?.title,
                    publishedAt: it.snippet?.publishedAt,
                    thumbnails: it.snippet?.thumbnails,
                    duration: parseISO8601Duration(it.contentDetails?.duration),
                    embeddable: !!it.status?.embeddable
                });
            }
        } catch (err) {
            console.error("[YT] error fetching video metadata:", err?.response?.data || err.message);
        }
        // be polite
        await sleep(120);
    }
    return results;
}

/* ---------------- DB helpers ---------------- */

async function ensureGenres(genreNames = []) {
    const ids = [];
    for (const name of genreNames) {
        if (!name) continue;
        const normalized = String(name).trim().toLowerCase();
        let g = await Genre.findOne({ name: normalized });
        if (!g) {
            g = new Genre({ name: normalized });
            await g.save();
            console.log(`Created genre: ${normalized}`);
        }
        ids.push(g._id);
    }
    return ids;
}

async function upsertMovieFromPlaylist(playlist, channelTitle, videoMetas, playlistTitle) {
    // Build movie name
    const movieName = `${playlistTitle} — ${channelTitle}`.slice(0, 200); // keep reasonable length
    const inferredGenres = inferGenresFromTitle(playlistTitle);
    const genreIds = await ensureGenres(inferredGenres);

    // Map video metas into your videoSchema shape
    const videos = videoMetas.map((m, idx) => ({
        title: m.title || `Episode ${idx + 1}`,
        youtubeId: m.youtubeId,
        season: 1,
        episode: idx + 1,
        duration: m.duration || 0,
        publishedAt: m.publishedAt ? new Date(m.publishedAt) : undefined,
        thumbnails: m.thumbnails || {},
        embeddable: !!m.embeddable,
        createdAt: new Date()
    }));

    if (videos.length === 0) {
        console.warn(`No embeddable videos found for playlist "${playlistTitle}". Skipping movie creation.`);
        return;
    }

    // Upsert: prefer movie with same name & youtube source
    const existing = await Movie.findOne({ name: movieName, source: "youtube" });
    if (existing) {
        // merge videos without duplicates
        const existingSet = new Set((existing.videos || []).map(v => v.youtubeId));
        let newCount = 0;
        for (const v of videos) {
            if (!existingSet.has(v.youtubeId)) {
                existing.videos.push(v);
                newCount++;
            }
        }
        existing.genre = Array.from(new Set([...(existing.genre || []), ...genreIds]));
        existing.detail = existing.detail || `Imported playlist ${playlistTitle} from ${channelTitle}`;
        await existing.save();
        console.log(`Updated movie ${movieName}: +${newCount} new videos`);
    } else {
        const doc = new Movie({
            name: movieName,
            detail: `Imported playlist ${playlistTitle} from ${channelTitle}`,
            year: (new Date()).getFullYear(),
            genre: genreIds,
            videos,
            source: "youtube",
            tmdbId: null
        });
        await doc.save();
        console.log(`Created movie ${movieName} with ${videos.length} videos`);
    }
}

/* ---------------- main flow ---------------- */

async function processChannel(query) {
    console.log(`\n=== Processing channel query: "${query}" ===`);
    const channelId = await ytSearchChannelId(query);
    if (!channelId) {
        console.warn(`Skipping "${query}" - channelId not found`);
        return;
    }

    // fetch playlists
    const playlists = await ytListPlaylistsByChannel(channelId, MAX_PLAYLISTS_PER_CHANNEL);
    console.log(`Found ${playlists.length} playlists for channel ${query}`);

    // We will skip playlists that look like the default "Uploads" playlist (title contains 'uploads' or 'Uploads')
    const filtered = playlists.filter(p => {
        const t = (p.snippet?.title || "").toLowerCase();
        return !t.includes("uploads") && !t.includes("upload") ? true : false;
    });

    // if filtered becomes empty, fall back to using playlists as-is (maybe channel uses different naming)
    const toProcess = filtered.length ? filtered : playlists;

    for (const pl of toProcess.slice(0, MAX_PLAYLISTS_PER_CHANNEL)) {
        const playlistId = pl.id;
        const playlistTitle = pl.snippet?.title || "Playlist";
        const channelTitle = pl.snippet?.channelTitle || query;
        console.log(`\n-> Playlist: "${playlistTitle}" (id: ${playlistId})`);

        const items = await ytListPlaylistItems(playlistId, MAX_VIDEOS_PER_PLAYLIST);
        if (!items.length) {
            console.warn(`  No items found in playlist ${playlistTitle}. Skipping.`);
            continue;
        }

        const videoIds = items.map(i => i.videoId).filter(Boolean);
        // fetch metadata for video ids
        const metas = await ytFetchVideosMetadata(videoIds);
        // keep only embeddable videos and preserve order as in playlist
        const metasById = Object.fromEntries(metas.map(m => [m.youtubeId, m]));
        const ordered = videoIds.map(id => metasById[id]).filter(Boolean).filter(m => m.embeddable);

        console.log(`  Playlist contains ${videoIds.length} videos, ${ordered.length} embeddable kept.`);

        await upsertMovieFromPlaylist(pl, channelTitle, ordered, playlistTitle);

        // small delay between playlists
        await sleep(250);
    }
}

async function main() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        for (const q of CHANNEL_QUERIES) {
            try {
                await processChannel(q);
            } catch (err) {
                console.error(`Error processing channel ${q}:`, err.message || err);
            }
            // pause a little between channels
            await sleep(500);
        }

        console.log("\nAll done. Disconnecting.");
    } catch (err) {
        console.error("Fatal error:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();