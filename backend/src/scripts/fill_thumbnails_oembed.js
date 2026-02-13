// scripts/fill_thumbnails_oembed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import Movie from "../models/Movie.ts";

dotenv.config();
const { MONGO_URI } = process.env;
if (!MONGO_URI) {
    console.error("Set MONGO_URI in .env");
    process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchOEmbedThumb(videoId) {
    try {
        const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const res = await axios.get(url, { timeout: 10000 });
        // oEmbed returns thumbnail_url
        return res.data.thumbnail_url;
    } catch (err) {
        // Not fatal — some videos (members-only/private) will 404 here
        // console.warn("oEmbed failed for", videoId, err?.response?.status || err.message);
        return null;
    }
}

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const cursor = Movie.find({ "videos.thumbnails": { $exists: false } }).cursor();
    let updated = 0, checkedMovies = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        checkedMovies++;
        let changed = false;

        for (let i = 0; i < (doc.videos || []).length; i++) {
            const v = doc.videos[i];
            if (!v) continue;
            const hasThumbs = v.thumbnails && Object.keys(v.thumbnails).length > 0;
            if (hasThumbs) continue;

            // try oembed
            const t = await fetchOEmbedThumb(v.youtubeId);
            if (t) {
                // store it in a simple shape compatible with your model
                v.thumbnails = {
                    default: { url: t },
                    // we don't have size variants via oEmbed, but storing default is enough
                };
                changed = true;
                console.log(`Updated thumb for ${v.youtubeId} in movie ${doc._id}`);
                // be polite to youtube
                await sleep(150);
            } else {
                // leave thumbnails null — frontend will fallback to img.youtube.com
            }
        }

        if (changed) {
            await doc.save();
            updated++;
        }
    }

    console.log(`Done. Checked ${checkedMovies} movies. Updated ${updated} movies.`);
    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });