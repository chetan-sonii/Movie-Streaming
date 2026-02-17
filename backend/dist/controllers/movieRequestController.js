"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRequest = exports.getAllRequests = exports.createRequest = void 0;
const MovieRequest_js_1 = __importDefault(require("../models/MovieRequest.js"));
const createRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { movieTitle, detail } = req.body;
    try {
        if (!movieTitle) {
            return res.status(400).json({ message: "Movie title is required" });
        }
        const newRequest = new MovieRequest_js_1.default({
            user: req.user._id,
            name: req.user.username,
            movieTitle: movieTitle,
            detail: detail || "",
        });
        const savedRequest = yield newRequest.save();
        res.status(201).json(savedRequest);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.createRequest = createRequest;
const getAllRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requests = yield MovieRequest_js_1.default.find().populate('user', 'name email').sort({ createdAt: -1 });
        res.status(200).json(requests);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.getAllRequests = getAllRequests;
const deleteRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: requestId } = req.params;
        const requestIndex = yield MovieRequest_js_1.default.findByIdAndDelete(requestId);
        if (!requestIndex) {
            return res.status(404).json({ message: "Request not found" });
        }
        res.status(200).json({ message: "Request deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.deleteRequest = deleteRequest;
