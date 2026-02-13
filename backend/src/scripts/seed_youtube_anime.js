

// scripts/seed_youtube_anime_safeguarded.js
// Node ESM script: run with `node scripts/seed_youtube_anime_safeguarded.js` from project root.
//
// Purpose: safe seeding of YouTube anime into Movie docs, avoiding members-only and region-blocked videos,
// ensuring each genre has at least 3 movies. Conservative quota usage, batching, and interactive delete prompt.

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
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const YT_API_KEY = "AIzaSyBUI5s_OUC1dL6d326UyrW95WLJBtbQpvQ";
const MONGO_URI = "mongodb://localhost:27017/MovieApp";

const TARGET_COUNTRY = (process.env.TARGET_COUNTRY || "IN").toUpperCase();
const CHANNEL_QUERIES = [
    "Muse Asia",
    "Ani-One Asia",
    // Add more reputable official channels here if you want
];

const MAX_PLAYLISTS_PER_CHANNEL = Number(process.env.MAX_PLAYLISTS_PER_CHANNEL || 5);
const MAX_VIDEOS_PER_PLAYLIST = Number(process.env.MAX_VIDEOS_PER_PLAYLIST || 30);
const MAX_ADDITIONAL_SEARCHES_PER_GENRE = Number(process.env.MAX_ADDITIONAL_SEARCHES_PER_GENRE || 6);
const VIDEO_BATCH_SIZE = 50;
const SLEEP_MS = 150; // polite delay between YouTube API requests

const YT_BASE = "https://www.googleapis.com/youtube/v3";

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
        horror: ["horror", "scary", "terror", "ghoul"],
        action: ["action", "battle", "fight", "shounen", "shonen"],
        comedy: ["comedy", "gag", "funny"],
        drama: ["drama", "trag"],
        fantasy: ["fantasy", "isekai", "magic"],
        "sci-fi": ["sci-fi", "science", "space", "future"],
        thriller: ["thriller", "mystery"],
        sports: ["sports", "baseball", "basketball", "soccer"],
        mecha: ["mecha", "robot"],
        "slice of life": ["slice of life", "slice-of-life"],
    };
    const found = new Set();
    const t = String(title || "").toLowerCase();
    for (const [g, kws] of Object.entries(map)) {
        for (const kw of kws) {
            if (t.includes(kw)) {
                found.add(g);
                break;
            }
        }
    }
    return found.size ? Array.from(found) : ["other"];
}

function isLikelyMemberOnly(snippet) {
    // heuristic: titles/descriptions containing "members" or "members-only" or "member only"
    const txt = (snippet?.title || "") + " " + (snippet?.description || "");
    const lower = txt.toLowerCase();
    return (
        lower.includes("member") ||
        lower.includes("members-only") ||
        lower.includes("members only") ||
        lower.includes("only for members")
    );
}

async function askYesNo(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(`${question} (y/N): `, (ans) => {
            rl.close();
            const ok = String(ans || "").trim().toLowerCase();
            resolve(ok === "y" || ok === "yes");
        });
    });
}

/* --------- YouTube API helpers (conservative) --------- */

async function ytSearchChannelId(query) {
    try {
        const res = await axios.get(`${YT_BASE}/search`, {
            params: { part: "snippet", q: query, type: "channel", maxResults: 5, key: YT_API_KEY },
        });
        const items = res.data.items || [];
        if (!items.length) return null;
        const exact = items.find((i) => (i.snippet.title || "").toLowerCase() === query.toLowerCase());
        const chosen = exact || items[0];
        const channelId = chosen.id?.channelId || chosen.snippet?.channelId || (chosen.id && chosen.id);
        return channelId || null;
    } catch (err) {
        console.error("ytSearchChannelId error:", err?.response?.data || err.message);
        return null;
    }
}

async function ytListPlaylistsByChannel(channelId, max = 10) {
    const out = [];
    let pageToken = null;
    try {
        do {
            const res = await axios.get(`${YT_BASE}/playlists`, {
                params: { part: "snippet,contentDetails", channelId, maxResults: 50, pageToken, key: YT_API_KEY },
            });
            out.push(...(res.data.items || []));
            pageToken = res.data.nextPageToken;
            if (out.length >= max) break;
            await sleep(SLEEP_MS);
        } while (pageToken);
    } catch (err) {
        console.error("ytListPlaylistsByChannel error:", err?.response?.data || err.message);
    }
    return out.slice(0, max);
}

async function ytListPlaylistItems(playlistId, maxItems = 200) {
    const all = [];
    let pageToken = null;
    try {
        do {
            const res = await axios.get(`${YT_BASE}/playlistItems`, {
                params: {
                    part: "snippet,contentDetails",
                    playlistId,
                    maxResults: 50,
                    pageToken,
                    key: YT_API_KEY,
                },
            });
            const batch = (res.data.items || []).map((i) => ({
                videoId: i.contentDetails?.videoId,
                title: i.snippet?.title,
            })).filter(Boolean);
            all.push(...batch);
            pageToken = res.data.nextPageToken;
            if (all.length >= maxItems) break;
            await sleep(SLEEP_MS);
        } while (pageToken);
    } catch (err) {
        console.error("ytListPlaylistItems error:", err?.response?.data || err.message);
    }
    return all.slice(0, maxItems);
}

async function ytFetchVideosMetadata(videoIds = []) {
    const results = [];
    for (let i = 0; i < videoIds.length; i += VIDEO_BATCH_SIZE) {
        const batch = videoIds.slice(i, i + VIDEO_BATCH_SIZE);
        try {
            const res = await axios.get(`${YT_BASE}/videos`, {
                params: { part: "snippet,contentDetails,status", id: batch.join(","), key: YT_API_KEY },
            });
            const items = res.data.items || [];
            for (const it of items) {
                results.push({
                    youtubeId: it.id,
                    title: it.snippet?.title || "",
                    description: it.snippet?.description || "",
                    thumbnails: it.snippet?.thumbnails || null,
                    duration: parseISO8601Duration(it.contentDetails?.duration),
                    embeddable: !!it.status?.embeddable,
                    privacyStatus: it.status?.privacyStatus || "public",
                    regionRestriction: it.contentDetails?.regionRestriction || null,
                    snippet: it.snippet || {},
                });
            }
        } catch (err) {
            console.error("ytFetchVideosMetadata error:", err?.response?.data || err.message);
        }
        await sleep(SLEEP_MS);
    }
    return results;
}

async function ytSearchPlaylistsByQuery(query, max = 6) {
    // We'll search playlists by query (safer than video search for episodes)
    try {
        const res = await axios.get(`${YT_BASE}/search`, {
            params: { part: "snippet", q: query, type: "playlist", maxResults: Math.min(max, 50), key: YT_API_KEY },
        });
        const items = res.data.items || [];
        return items.map((i) => ({ playlistId: i.id?.playlistId || i.id, title: i.snippet?.title, channelTitle: i.snippet?.channelTitle }));
    } catch (err) {
        console.error("ytSearchPlaylistsByQuery error:", err?.response?.data || err.message);
        return [];
    }
}

/* --------- DB helpers --------- */

async function ensureGenreDoc(name) {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized) return null;
    let g = await Genre.findOne({ name: normalized });
    if (!g) {
        g = new Genre({ name: normalized });
        await g.save();
        console.log("Created genre:", normalized);
    }
    return g;
}

async function ensureGenres(names = []) {
    const ids = [];
    for (const n of names) {
        const g = await ensureGenreDoc(n);
        if (g) ids.push(g._id);
    }
    return ids;
}

async function upsertMovie(movieName, channelTitle, playlistTitle, genreIds, videoMetas) {
    // videoMetas: array of metadata objects (already filtered)
    const movieDocName = `${playlistTitle} — ${channelTitle}`.slice(0, 220);
    const videos = videoMetas.map((m, i) => ({
        title: m.title,
        youtubeId: m.youtubeId,
        season: 1,
        episode: i + 1,
        duration: m.duration,
        publishedAt: m.publishedAt ? new Date(m.publishedAt) : undefined,
        thumbnails: m.thumbnails,
        embeddable: m.embeddable,
        privacyStatus: m.privacyStatus,
        regionRestriction: m.regionRestriction,
        createdAt: new Date(),
    }));

    if (videos.length === 0) {
        console.warn(`No valid videos for playlist "${playlistTitle}", skipping upsert.`);
        return false;
    }

    const existing = await Movie.findOne({ name: movieDocName, source: "youtube" });
    if (existing) {
        const existingSet = new Set((existing.videos || []).map((v) => v.youtubeId));
        let added = 0;
        for (const v of videos) {
            if (!existingSet.has(v.youtubeId)) {
                existing.videos.push(v);
                added++;
            }
        }
        existing.genre = Array.from(new Set([...(existing.genre || []), ...genreIds]));
        existing.detail = existing.detail || `Imported playlist ${playlistTitle} from ${channelTitle}`;
        await existing.save();
        console.log(`Updated movie: ${movieDocName} (+${added} videos).`);
        return true;
    } else {
        const doc = new Movie({
            name: movieDocName,
            detail: `Imported playlist ${playlistTitle} from ${channelTitle}`,
            year: new Date().getFullYear(),
            genre: genreIds,
            videos,
            source: "youtube",
            tmdbId: null,
        });
        await doc.save();
        console.log(`Created movie: ${movieDocName} (${videos.length} videos).`);
        return true;
    }
}

/* --------- Higher-level processing logic --------- */

async function processPlaylist(pl, channelTitle, desiredGenreNames = []) {
    const playlistId = pl.id || pl.playlistId || pl.id?.playlistId;
    const playlistTitle = pl.snippet?.title || pl.title || pl.title || "Playlist";
    if (!playlistId) {
        console.warn("Playlist with no id:", playlistTitle);
        return false;
    }

    // fetch playlist items (video ids)
    const items = await ytListPlaylistItems(playlistId, MAX_VIDEOS_PER_PLAYLIST);
    if (!items.length) return false;
    const videoIds = items.map((it) => it.videoId).filter(Boolean);

    // fetch batch metadata
    const metas = await ytFetchVideosMetadata(videoIds);
    if (!metas.length) return false;

    // filter: public + embeddable + not region-blocked + not likely member-only
    const filtered = metas.filter((m) => {
        if (m.privacyStatus !== "public") return false;
        if (!m.embeddable) return false;
        if (isLikelyMemberOnly(m.snippet)) return false;
        // region restriction: blocked or allowed
        if (m.regionRestriction && Array.isArray(m.regionRestriction.blocked) && m.regionRestriction.blocked.includes(TARGET_COUNTRY)) return false;
        if (m.regionRestriction && Array.isArray(m.regionRestriction.allowed) && !m.regionRestriction.allowed.includes(TARGET_COUNTRY)) return false;
        return true;
    });

    // If not enough embeddable videos found, try relaxing "isLikelyMemberOnly" filter once as a fallback,
    // but still respect embeddable/privacy/region.
    if (filtered.length < 3) {
        const relaxed = metas.filter((m) => {
            if (m.privacyStatus !== "public") return false;
            if (!m.embeddable) return false;
            if (m.regionRestriction && Array.isArray(m.regionRestriction.blocked) && m.regionRestriction.blocked.includes(TARGET_COUNTRY)) return false;
            if (m.regionRestriction && Array.isArray(m.regionRestriction.allowed) && !m.regionRestriction.allowed.includes(TARGET_COUNTRY)) return false;
            return true;
        });
        // prefer relaxed if it has at least 3; otherwise keep filtered (safer)
        if (relaxed.length >= 3) {
            console.warn(`Relaxed member-only filter for playlist "${playlistTitle}" (using relaxed set).`);
            return { playlistTitle, channelTitle, metas: relaxed };
        }
    }

    return { playlistTitle, channelTitle, metas: filtered };
}

async function seedFromChannel(channelQuery, genresToPrefer = []) {
    const channelId = await ytSearchChannelId(channelQuery);
    if (!channelId) {
        console.warn("Could not resolve channel for query:", channelQuery);
        return;
    }
    const playlists = await ytListPlaylistsByChannel(channelId, MAX_PLAYLISTS_PER_CHANNEL);
    const candidates = playlists.filter((p) => {
        const t = String(p.snippet?.title || "").toLowerCase();
        // skip generic uploads playlist
        return !t.includes("uploads") && !t.includes("upload") && !t.includes("mixed");
    }).slice(0, MAX_PLAYLISTS_PER_CHANNEL);

    for (const pl of candidates) {
        const playlistTitle = pl.snippet?.title || "";
        const inferred = inferGenresFromTitle(playlistTitle);
        // prefer the genresToPrefer if it matches
        const finalGenres = genresToPrefer.length ? genresToPrefer.filter(g => inferred.includes(g)) : inferred;
        const genreNames = finalGenres.length ? finalGenres : inferred;
        const genreIds = await ensureGenres(genreNames);
        const result = await processPlaylist(pl, pl.snippet?.channelTitle || channelQuery, genreNames);
        if (result && result.metas && result.metas.length >= 1) {
            // upsert only if we have enough metas (we already filtered for embeddable/public)
            await upsertMovie(pl.snippet?.title || pl.title, pl.snippet?.channelTitle || channelQuery, result.playlistTitle, genreIds, result.metas);
        } else {
            console.log(`Skipping playlist "${playlistTitle}" — no usable videos found.`);
        }
        await sleep(SLEEP_MS);
    }
}

/* --------- Strategy to ensure each genre has >=3 movies --------- */

async function ensureGenresHaveMinimum(minPerGenre = 3) {
    // Get all genres in DB (or use default list)
    const genres = await Genre.find().lean();
    const genreMap = {};
    for (const g of genres) genreMap[g.name] = g;

    for (const g of genres) {
        const count = await Movie.countDocuments({ genre: g._id, source: "youtube" });
        console.log(`Genre "${g.name}" has ${count} YouTube movies.`);
        if (count >= minPerGenre) continue;

        // We need to seed more for this genre
        const need = minPerGenre - count;
        console.log(`Seeding ${need} more movie(s) for genre "${g.name}"`);

        // Strategy:
        // 1) Search playlists for "<genre> anime official playlist" and attempt to import up to needed.
        // 2) If not found, broaden query to "<genre> anime full episodes official"

        let foundForGenre = 0;
        const triedPlaylists = new Set();

        const searchQueries = [
            `${g.name} anime official playlist`,
            `${g.name} anime playlist`,
            `${g.name} anime full episodes official`,
            `${g.name} anime full episodes`,
        ];

        for (const q of searchQueries) {
            if (foundForGenre >= need) break;
            const playlists = await ytSearchPlaylistsByQuery(q, MAX_ADDITIONAL_SEARCHES_PER_GENRE);
            for (const pl of playlists) {
                if (foundForGenre >= need) break;
                const pid = pl.playlistId;
                if (!pid || triedPlaylists.has(pid)) continue;
                triedPlaylists.add(pid);
                // Prepare a fake playlist object for processPlaylist
                const fakePl = { id: pid, snippet: { title: pl.title || "", channelTitle: pl.channelTitle || "unknown" } };
                const res = await processPlaylist(fakePl, pl.channelTitle || "search", [g.name]);
                if (res && res.metas && res.metas.length >= 3) {
                    const genreIds = await ensureGenres([g.name]);
                    const ok = await upsertMovie(pl.title || `Playlist ${pid}`, pl.channelTitle || "search", pl.title || "Playlist", genreIds, res.metas);
                    if (ok) {
                        foundForGenre++;
                        console.log(`Seeded one playlist for genre "${g.name}" from search query "${q}".`);
                    }
                } else {
                    console.log(`Search playlist "${pl.title}" didn't have enough usable videos for genre "${g.name}".`);
                }
                await sleep(SLEEP_MS);
            }
        }

        if (foundForGenre < need) {
            console.warn(`Could not reach desired count (${minPerGenre}) for genre "${g.name}". Seeded ${foundForGenre} extra items.`);
        }
    }
}

/* --------- Main flow --------- */

async function main() {
    console.log("Starting safeguarded YouTube seeder.");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    const doDelete = await askYesNo("Delete existing movies with source === 'youtube' before seeding?");
    if (doDelete) {
        const r = await Movie.deleteMany({ source: "youtube" });
        console.log(`Deleted ${r.deletedCount || 0} movie(s).`);
    } else {
        console.log("Keeping existing YouTube movies.");
    }

    // Step 1: ensure genres exist — if DB has none, create a minimal set
    let existingGenres = await Genre.find().lean();
    if (!existingGenres.length) {
        const REQUIRED_GENRES = ["romance", "horror", "action", "comedy", "drama", "fantasy", "sci-fi", "thriller", "sports", "mecha", "slice of life"];
        for (const g of REQUIRED_GENRES) {
            await ensureGenreDoc(g);
        }
        existingGenres = await Genre.find().lean();
    }

    // Step 2: scan official channels
    for (const q of CHANNEL_QUERIES) {
        console.log(`\n--- Processing channel: ${q} ---`);
        try {
            await seedFromChannel(q);
        } catch (err) {
            console.error(`Error processing channel ${q}:`, err?.message || err);
        }
        await sleep(SLEEP_MS);
    }

    // Step 3: ensure minimum per genre
    await ensureGenresHaveMinimum(3);

    console.log("Seeding run finished. Disconnecting.");
    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error("Fatal seeder error:", err?.message || err);
    mongoose.disconnect().finally(() => process.exit(1));
});