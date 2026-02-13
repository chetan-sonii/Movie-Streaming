// scripts/update_video_status_batch.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import Movie from "../models/Movie.ts";

dotenv.config();
const { MONGO_URI, YT_API_KEY } = process.env;
if (!MONGO_URI || !YT_API_KEY) {
    console.error("Set MONGO_URI and YT_API_KEY in .env");
    process.exit(1);
}

const YT_URL = "https://www.googleapis.com/youtube/v3/videos";
const BATCH_SIZE = 50; // videos.list supports up to 50
const MAX_VIDEOS_TO_PROCESS = Number(process.env.MAX_VIDEOS_TO_PROCESS) || 200; // tune this

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // gather unique videoIds that need checking
    const movies = await Movie.find({}, { videos: 1 }).lean();
    const allVideoIds = [];
    for (const m of movies) {
        for (const v of m.videos || []) {
            // we only add if missing status fields or explicit force-check (you can tweak)
            // If embeddable is undefined, push for check. Also check privacyStatus missing.
            if (!v || !v.youtubeId) continue;
            const needsCheck = (v.embeddable === undefined || v.privacyStatus === undefined || v.regionRestriction === undefined);
            if (needsCheck) allVideoIds.push(v.youtubeId);
        }
    }

    // dedupe and limit
    const dedup = Array.from(new Set(allVideoIds)).slice(0, MAX_VIDEOS_TO_PROCESS);
    console.log(`Will process up to ${dedup.length} videos (batch size ${BATCH_SIZE}).`);

    for (let i = 0; i < dedup.length; i += BATCH_SIZE) {
        const batch = dedup.slice(i, i + BATCH_SIZE);
        try {
            const res = await axios.get(YT_URL, {
                params: {
                    part: "status,contentDetails,snippet",
                    id: batch.join(","),
                    key: YT_API_KEY,
                },
                timeout: 20000
            });

            const items = res.data.items || [];
            // update each matching video in DB
            for (const item of items) {
                const id = item.id;
                const embeddable = !!item.status?.embeddable;
                const privacyStatus = item.status?.privacyStatus; // public/private/unlisted
                const regionRestrictions = item.contentDetails?.regionRestriction || null; // {blocked: [...]} or {allowed: [...]}
                // Update all movies that have this video
                await Movie.updateMany(
                    { "videos.youtubeId": id },
                    {
                        $set: {
                            "videos.$[v].embeddable": embeddable,
                            "videos.$[v].privacyStatus": privacyStatus,
                            "videos.$[v].regionRestriction": regionRestrictions,
                        }
                    },
                    {
                        arrayFilters: [{ "v.youtubeId": id }],
                        multi: true
                    }
                );
                console.log(`Updated status for ${id}: embeddable=${embeddable}, privacy=${privacyStatus}`);
            }
        } catch (err) {
            console.error("videos.list failed:", err?.response?.data || err.message);
        }
        // be polite
        await sleep(300);
    }

    console.log("Status update finished.");
    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });