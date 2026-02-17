"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/Movie.js
const mongoose_1 = __importDefault(require("mongoose"));
const { ObjectId } = mongoose_1.default.Schema.Types;
const reviewSchema = new mongoose_1.default.Schema({
    user: { type: ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    name: { type: String, required: true },
}, {
    timestamps: true,
});
const videoSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true },
    youtubeId: { type: String, required: true }, // e.g. "dQw4w9WgXcQ"
    season: { type: Number, default: 1 },
    episode: { type: Number, default: 1 },
    duration: { type: Number }, // seconds
    publishedAt: { type: Date },
    thumbnails: { type: Object }, // store YouTube thumbnails object if useful
    embeddable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const movieSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    tmdbId: { type: Number }, // keep optional if you have TMDB-based movies
    image: { type: String },
    coverImage: { type: String },
    year: { type: Number },
    detail: { type: String },
    genre: [{ type: ObjectId, ref: "Genre" }],
    cast: [{ type: String }],
    director: { type: String },
    reviews: [reviewSchema],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0, required: true },
    createAt: { type: Date, default: Date.now },
    // NEW:
    videos: [videoSchema], // episodes / youtube videos
    source: { type: String, enum: ["tmdb", "youtube", "other"], default: "tmdb" }
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model("Movie", movieSchema);
