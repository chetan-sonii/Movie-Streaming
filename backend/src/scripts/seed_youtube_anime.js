// scripts/seed_youtube_anime.js
/**
 * Seed YouTube anime into Movies collection (genres + videos).
 *
 * - Requires .env keys: MONGO_URI, YT_API_KEY
 * - Prompts: delete existing movies with source === "youtube"? (y/N)
 * - Discovers channel IDs for CHANNEL_QUERIES, lists playlists (skips "Uploads"), fetches playlist items,
 *   batches videos.list for metadata, and upserts Movie docs.
 *
 * WARNING: This uses the YouTube Data API. Adjust MAX_* env vars to limit quota usage.
 *
 * Usage:
 *   node scripts/seed_youtube_anime.js
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import readline from "readline";
import axios from "axios";
import mongoose from "mongoose";
import Movie from "../models/Movie.ts";
import Genre from "../models/Genre.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load .env from project root (one level up from scripts/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// const { MONGO_URI, YT_API_KEY } = process.env;
// const MONGO_URI= "mongodb://localhost:27017/MovieApp"
const YT_API_KEY = "AIzaSyBUI5s_OUC1dL6d326UyrW95WLJBtbQpvQ";
const MONGO_URI = "mongodb://localhost:27017/MovieApp";

console.log("MongoDB URI: " + MONGO_URI);

if (!MONGO_URI) {
    console.error("MONGO_URI is not set in .env — aborting.");
    process.exit(1);
}
if (!YT_API_KEY) {
    console.error("YT_API_KEY is not set in .env — aborting.");
    process.exit(1);
}

const YT_BASE = "https://www.googleapis.com/youtube/v3";

// Tunables (override via environment if needed)
const CHANNEL_QUERIES = [
    "Muse Asia",
    "Ani-One Asia"
    // add more channel search names if you want
];

const MAX_PLAYLISTS_PER_CHANNEL = Number(process.env.MAX_PLAYLISTS_PER_CHANNEL) || 8; // per channel
const MAX_VIDEOS_PER_PLAYLIST = Number(process.env.MAX_VIDEOS_PER_PLAYLIST) || 40; // per playlist
const VIDEO_BATCH_SIZE = 50; // videos.list supports up to 50 ids
const PLAYLIST_ITEMS_PAGE_SIZE = 50; // playlistItems maxResults
const PLAYLISTS_PAGE_SIZE = 50;
const SLEEP_MS_BETWEEN_CALLS = Number(process.env.SLEEP_MS_BETWEEN_CALLS) || 150; // be polite

/* ------------------ helpers ------------------ */

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function parseISO8601Duration(iso) {
    if (!iso) return 0;
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    const [, h = 0, min = 0, s = 0] = m;
    return Number(h) * 3600 + Number(min) * 60 + Number(s);
}

function inferGenresFromTitle(title = "") {
    const map = {
        romance: ["romance", "love", "slice of life", "slice-of-life"],
        horror: ["horror", "ghoul", "terror", "scary"],
        action: ["action", "battle", "fight", "shounen", "shonen"],
        comedy: ["comedy", "gag", "funny"],
        drama: ["drama", "trag"],
        fantasy: ["fantasy", "isekai", "magic"],
        "sci-fi": ["sci-fi", "science", "space"],
        thriller: ["thriller", "mystery"],
        sports: ["sports", "baseball", "basketball", "soccer"],
        mecha: ["mecha", "robot"],
        "slice of life": ["slice of life", "slice-of-life"],
    };

    const found = new Set();
    const t = String(title || "").toLowerCase();
    for (const [g, keywords] of Object.entries(map)) {
        for (const kw of keywords) {
            if (t.includes(kw)) {
                found.add(g);
                break;
            }
        }
    }
    // fallback: if nothing matched, use 'other'
    return found.size ? Array.from(found) : ["other"];
}

/* ------------------ YouTube API helpers ------------------ */

async function ytSearchChannelId(query) {
    try {
        const res = await axios.get(`${YT_BASE}/search`, {
            params: {
                part: "snippet",
                q: query,
                type: "channel",
                maxResults: 5,
                key: YT_API_KEY,
            },
        });
        const items = res.data.items || [];
        if (!items.length) {
            console.warn(`[YT] no channel search results for "${query}"`);
            return null;
        }
        // prefer exact match
        const exact = items.find((i) => (i.snippet.title || "").toLowerCase() === query.toLowerCase());
        const chosen = exact || items[0];
        const channelId = (chosen.id && chosen.id.channelId) || chosen.snippet?.channelId || chosen.id;
        console.log(`[YT] Resolved "${query}" -> channel "${chosen.snippet.title}" (${channelId})`);
        return channelId || null;
    } catch (err) {
        console.error(`[YT] channel search error for "${query}":`, err?.response?.data || err.message);
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
                    maxResults: PLAYLISTS_PAGE_SIZE,
                    pageToken,
                    key: YT_API_KEY,
                },
            });
            playlists.push(...(res.data.items || []));
            pageToken = res.data.nextPageToken;
            if (playlists.length >= max) break;
            await sleep(SLEEP_MS_BETWEEN_CALLS);
        } while (pageToken);
    } catch (err) {
        console.error(`[YT] playlists listing failed for channel ${channelId}:`, err?.response?.data || err.message);
    }
    return playlists.slice(0, max);
}

async function ytListPlaylistItems(playlistId, maxItems = 500) {
    const items = [];
    let pageToken = null;
    try {
        do {
            const res = await axios.get(`${YT_BASE}/playlistItems`, {
                params: {
                    part: "snippet,contentDetails",
                    playlistId,
                    maxResults: PLAYLIST_ITEMS_PAGE_SIZE,
                    pageToken,
                    key: YT_API_KEY,
                },
            });
            const batch = (res.data.items || []).map((i) => ({
                videoId: i.contentDetails?.videoId,
                title: i.snippet?.title,
                position: i.snippet?.position,
            })).filter(Boolean);
            items.push(...batch);
            pageToken = res.data.nextPageToken;
            if (items.length >= maxItems) break;
            await sleep(SLEEP_MS_BETWEEN_CALLS);
        } while (pageToken);
    } catch (err) {
        console.error(`[YT] playlistItems failed for playlist ${playlistId}:`, err?.response?.data || err.message);
    }
    return items.slice(0, maxItems);
}

async function ytFetchVideosMetadata(videoIds = []) {
    const results = [];
    for (let i = 0; i < videoIds.length; i += VIDEO_BATCH_SIZE) {
        const batch = videoIds.slice(i, i + VIDEO_BATCH_SIZE);
        try {
            const res = await axios.get(`${YT_BASE}/videos`, {
                params: {
                    part: "snippet,contentDetails,status",
                    id: batch.join(","),
                    key: YT_API_KEY,
                },
            });
            const items = res.data.items || [];
            for (const it of items) {
                results.push({
                    youtubeId: it.id,
                    title: it.snippet?.title || "",
                    publishedAt: it.snippet?.publishedAt,
                    thumbnails: it.snippet?.thumbnails,
                    duration: parseISO8601Duration(it.contentDetails?.duration),
                    embeddable: !!it.status?.embeddable,
                    privacyStatus: it.status?.privacyStatus || "public",
                    regionRestriction: it.contentDetails?.regionRestriction || null,
                });
            }
        } catch (err) {
            console.error("[YT] videos.list error:", err?.response?.data || err.message);
        }
        await sleep(SLEEP_MS_BETWEEN_CALLS);
    }
    return results;
}

/* ------------------ DB helpers ------------------ */

async function ensureGenres(names = []) {
    const ids = [];
    for (const raw of names) {
        const n = String(raw || "").trim().toLowerCase();
        if (!n) continue;
        let g = await Genre.findOne({ name: n });
        if (!g) {
            g = new Genre({ name: n });
            await g.save();
            console.log(`Created genre: ${n}`);
        }
        ids.push(g._id);
    }
    return ids;
}

async function upsertMovieFromPlaylist(playlist, channelTitle, videoMetas, playlistTitle) {
    const movieName = `${playlistTitle} — ${channelTitle}`.slice(0, 220);
    const inferredGenres = inferGenresFromTitle(playlistTitle);
    const genreIds = await ensureGenres(inferredGenres);

    const videos = videoMetas.map((m, idx) => ({
        title: m.title || `Episode ${idx + 1}`,
        youtubeId: m.youtubeId,
        season: 1,
        episode: idx + 1,
        duration: m.duration || 0,
        publishedAt: m.publishedAt ? new Date(m.publishedAt) : undefined,
        thumbnails: m.thumbnails || {},
        embeddable: !!m.embeddable,
        privacyStatus: m.privacyStatus,
        regionRestriction: m.regionRestriction,
        createdAt: new Date(),
    }));

    if (videos.length === 0) {
        console.warn(`No embeddable videos for playlist "${playlistTitle}" — skipping.`);
        return;
    }

    const existing = await Movie.findOne({ name: movieName, source: "youtube" });
    if (existing) {
        const existingSet = new Set((existing.videos || []).map((v) => v.youtubeId));
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
        console.log(`Updated existing movie: ${movieName} (+${newCount} videos)`);
    } else {
        const doc = new Movie({
            name: movieName,
            detail: `Imported playlist ${playlistTitle} from ${channelTitle}`,
            year: new Date().getFullYear(),
            genre: genreIds,
            videos,
            source: "youtube",
            tmdbId: null,
        });
        await doc.save();
        console.log(`Created movie: ${movieName} (${videos.length} videos)`);
    }
}

/* ------------------ CLI prompt ------------------ */

function askYesNo(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(`${question} (y/N): `, (answer) => {
            rl.close();
            const normalized = String(answer || "").trim().toLowerCase();
            resolve(normalized === "y" || normalized === "yes");
        });
    });
}

/* ------------------ main ------------------ */

async function main() {
    console.log("Starting YouTube anime seeder.");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    // prompt to delete existing YouTube movies
    const doDelete = await askYesNo("Delete existing movies where source === 'youtube' before seeding?");
    if (doDelete) {
        const res = await Movie.deleteMany({ source: "youtube" });
        console.log(`Deleted ${res.deletedCount || 0} movie(s) with source 'youtube'.`);
    } else {
        console.log("Preserving existing movies (no delete).");
    }

    for (const query of CHANNEL_QUERIES) {
        const channelId = await ytSearchChannelId(query);
        if (!channelId) {
            console.warn(`Skipping channel query "${query}" — cannot resolve channelId.`);
            continue;
        }

        const playlists = await ytListPlaylistsByChannel(channelId, MAX_PLAYLISTS_PER_CHANNEL);
        const filteredPlaylists = playlists.filter((p) => {
            const t = String(p.snippet?.title || "").toLowerCase();
            return !t.includes("uploads") && !t.includes("uploaded") && !t.includes("mixed");
        });

        const toProcess = filteredPlaylists.length ? filteredPlaylists : playlists.slice(0, MAX_PLAYLISTS_PER_CHANNEL);
        console.log(`Processing ${toProcess.length} playlists for channel "${query}".`);

        for (const pl of toProcess) {
            const playlistId = pl.id;
            const playlistTitle = pl.snippet?.title || "Playlist";
            const channelTitle = pl.snippet?.channelTitle || query;

            console.log(`\n>> Playlist: "${playlistTitle}" (${playlistId}) from ${channelTitle}`);

            const items = await ytListPlaylistItems(playlistId, MAX_VIDEOS_PER_PLAYLIST);
            if (!items.length) {
                console.warn(`  Playlist empty or no accessible items: ${playlistTitle}`);
                continue;
            }

            const videoIds = items.map((it) => it.videoId).filter(Boolean);
            if (!videoIds.length) {
                console.warn(`  No video IDs found in playlist ${playlistTitle}`);
                continue;
            }

            // fetch metadata in batches
            const metas = await ytFetchVideosMetadata(videoIds);
            // Keep order of playlist and filter to embeddable/public if possible
            const metaById = Object.fromEntries(metas.map((m) => [m.youtubeId, m]));
            const ordered = videoIds.map((id) => metaById[id]).filter(Boolean);

            // Optionally filter non-embeddable/ private here before saving:
            const embeddableOrdered = ordered.filter((m) => m && m.embeddable && m.privacyStatus === "public");

            if (!embeddableOrdered.length) {
                console.warn(`  No embeddable public videos found in playlist "${playlistTitle}". Trying to include non-embeddable/public items as fallback.`);
                // fallback: include any available metadata (even if not embeddable), but warn the user
                await upsertMovieFromPlaylist(pl, channelTitle, ordered, playlistTitle);
            } else {
                await upsertMovieFromPlaylist(pl, channelTitle, embeddableOrdered, playlistTitle);
            }

            await sleep(SLEEP_MS_BETWEEN_CALLS);
        } // playlists loop
    } // channels loop

    console.log("\nSeeding complete. Disconnecting.");
    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error("Fatal error in seeder:", err?.message || err);
    mongoose.disconnect().finally(() => process.exit(1));
});