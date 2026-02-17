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
exports.readGenre = exports.listGenres = exports.deleteGenre = exports.updateGenre = exports.createGenre = void 0;
const asyncHandler_js_1 = __importDefault(require("../middlewares/asyncHandler.js"));
const Genre_js_1 = __importDefault(require("../models/Genre.js"));
const createGenre = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "name is required" });
        }
        const genreExists = yield Genre_js_1.default.findOne({ name: name });
        if (genreExists) {
            return res.status(400).json({ message: "Genre already exists" });
        }
        const newGenre = yield new Genre_js_1.default({
            name: name
        }).save();
        res.status(201).json({
            _id: newGenre._id,
            name: newGenre.name
        });
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error);
    }
}));
exports.createGenre = createGenre;
const updateGenre = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        const { id } = req.params;
        const genre = yield Genre_js_1.default.findById({ _id: id });
        if (!genre) {
            return res.status(404).json({ message: "Genre not found" });
        }
        genre.name = name;
        const updatedGenre = yield genre.save();
        res.status(200).json({
            _id: updatedGenre._id,
            name: updatedGenre.name
        });
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error);
    }
}));
exports.updateGenre = updateGenre;
const deleteGenre = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const genre = yield Genre_js_1.default.findByIdAndDelete({ _id: id });
        if (!genre) {
            return res.status(404).json({ message: "Genre not found" });
        }
        res.status(200).json({ message: "Genre deleted successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error);
    }
}));
exports.deleteGenre = deleteGenre;
const listGenres = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allGenres = yield Genre_js_1.default.find({}).sort({ name: 1 });
        res.status(200).json(allGenres);
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error);
    }
}));
exports.listGenres = listGenres;
const readGenre = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const genre = yield Genre_js_1.default.findOne({ _id: id });
        if (!genre) {
            return res.status(404).json({ message: "Genre not found" });
        }
        res.status(200).json(genre);
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error);
    }
}));
exports.readGenre = readGenre;
