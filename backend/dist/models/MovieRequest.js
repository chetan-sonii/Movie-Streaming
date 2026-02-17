"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const { ObjectId } = mongoose_1.default.Schema.Types;
const movieRequestSchema = new mongoose_1.default.Schema({
    user: {
        type: ObjectId,
        ref: "User",
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    movieTitle: {
        type: String,
        required: true,
    },
    detail: {
        type: String,
    },
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model("MovieRequest", movieRequestSchema);
