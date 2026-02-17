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
exports.getRandomMovies = exports.getTopMovies = exports.getNewMovies = exports.deleteComment = exports.reviewMovie = exports.deleteMovie = exports.updateMovie = exports.getMovieById = exports.getAllMovies = exports.createMovie = void 0;
const Movie_js_1 = __importDefault(require("../models/Movie.js"));
const createMovie = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newMovie = new Movie_js_1.default(req.body);
        const savedMovie = yield newMovie.save();
        res.status(201).json(savedMovie);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.createMovie = createMovie;
const getAllMovies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const movies = yield Movie_js_1.default.find().populate('genre');
        movies.forEach(movie => {
            movie.rating = movie.reviews.reduce((acc, item) => item.rating + acc, 0) / movie.reviews.length;
        });
        res.status(200).json(movies);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.getAllMovies = getAllMovies;
const getMovieById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const movie = yield Movie_js_1.default.findById(id).populate('genre');
        movie.rating = movie.reviews.reduce((acc, item) => item.rating + acc, 0) / movie.reviews.length;
        if (!movie) {
            return res.status(404).json({ message: "Movie not found" });
        }
        res.status(200).json(movie);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.getMovieById = getMovieById;
const updateMovie = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedMovie = yield Movie_js_1.default.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedMovie) {
            return res.status(404).json({ message: "Movie not found" });
        }
        res.status(200).json(updatedMovie);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.updateMovie = updateMovie;
const deleteMovie = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedMovie = yield Movie_js_1.default.findByIdAndDelete(id);
        if (!deletedMovie) {
            return res.status(404).json({ message: "Movie not found" });
        }
        res.status(200).json({ message: "Movie deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.deleteMovie = deleteMovie;
const reviewMovie = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const movie = yield Movie_js_1.default.findById(id);
        if (movie) {
            const alreadyReviewed = movie.reviews.find(review => review.user.toString() === req.user._id.toString());
            if (alreadyReviewed) {
                return res.status(400).json({ message: "Movie already reviewed" });
            }
            const review = {
                user: req.user._id,
                name: req.user.username,
                rating: Number(rating),
                comment: comment || "",
            };
            movie.reviews.push(review);
            movie.numReviews = movie.reviews.length;
            movie.rating = movie.reviews.reduce((acc, item) => item.rating + acc, 0) / movie.reviews.length;
            yield movie.save();
            res.status(201).json({ message: "Review added successfully", review });
        }
        else {
            res.status(404).json({ message: "Movie not found" });
        }
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.reviewMovie = reviewMovie;
const deleteComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { movieId, commentId } = req.body;
        const movie = yield Movie_js_1.default.findById(movieId);
        if (!movie) {
            return res.status(404).json({ message: "Movie not found" });
        }
        const reviewIndex = movie.reviews.findIndex(review => review._id.toString() === commentId);
        if (reviewIndex === -1) {
            return res.status(404).json({ message: "Comment not found" });
        }
        movie.reviews.splice(reviewIndex, 1);
        movie.numReviews = movie.reviews.length;
        movie.rating = movie.reviews.length > 0 ? movie.reviews.reduce((acc, item) => item.rating + acc, 0) / movie.reviews.length : 0;
        yield movie.save();
        res.status(200).json({ message: "Comment deleted successfully", reviews: movie.reviews });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.deleteComment = deleteComment;
const getNewMovies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newMovies = yield Movie_js_1.default.find().populate('genre').sort({ createdAt: -1 }).limit(10);
        newMovies.forEach(movie => {
            movie.rating = movie.reviews.reduce((acc, item) => item.rating + acc, 0) / movie.reviews.length;
        });
        res.status(200).json(newMovies);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.getNewMovies = getNewMovies;
const getTopMovies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const topMovies = yield Movie_js_1.default.find().populate('genre').sort({ rating: -1 }).limit(10);
        topMovies.forEach(movie => {
            movie.rating = movie.reviews.reduce((acc, item) => item.rating + acc, 0) / movie.reviews.length;
        });
        res.status(200).json(topMovies);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});
exports.getTopMovies = getTopMovies;
const getRandomMovies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const randomMovies = yield Movie_js_1.default.aggregate([
            { $sample: { size: 10 } },
            {
                $lookup: {
                    from: 'genres',
                    localField: 'genre',
                    foreignField: '_id',
                    as: 'genre'
                }
            }
        ]);
        randomMovies.forEach(movie => {
            movie.rating = movie.reviews.reduce((acc, item) => item.rating + acc, 0) / movie.reviews.length;
        });
        res.json(randomMovies);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getRandomMovies = getRandomMovies;
