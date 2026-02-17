"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Controllers
const movieController_js_1 = require("../controllers/movieController.js");
// Middleware
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
const checkId_js_1 = __importDefault(require("../middlewares/checkId.js"));
/**
 * @swagger
 * tags:
 *   name: Movies
 *   description: Movie management endpoints
 */
/**
 * @swagger
 * /movies/all-movies:
 *   get:
 *     summary: Get all movies
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: List of all movies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Movie'
 */
// Public Routes
/**
 * @swagger
 * /movies/movie/{id}:
 *   get:
 *     summary: Get movie by ID
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Movie ID
 *     responses:
 *       200:
 *         description: Movie details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Movie'
 *       404:
 *         description: Movie not found
 */
router.get('/all-movies', movieController_js_1.getAllMovies);
router.get('/movie/:id', movieController_js_1.getMovieById);
/**
 * @swagger
 * /movies/new-movies:
 *   get:
 *     summary: Get new movies
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: List of new movies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Movie'
 */
router.get('/new-movies', movieController_js_1.getNewMovies);
/**
 * @swagger
 * /movies/top-movies:
 *   get:
 *     summary: Get top rated movies
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: List of top rated movies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Movie'
 */
router.get('/top-movies', movieController_js_1.getTopMovies);
/**
 * @swagger
 * /movies/random-movies:
 *   get:
 *     summary: Get random movies
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: List of random movies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Movie'
 */
router.get('/random-movies', movieController_js_1.getRandomMovies);
// Private Routes
/**
 * @swagger
 * /movies/{id}/review:
 *   post:
 *     summary: Add a review to a movie
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Movie ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Review'
 *     responses:
 *       201:
 *         description: Review added successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Movie not found
 */
router.post('/:id/review', authMiddleware_js_1.authenticated, checkId_js_1.default, movieController_js_1.reviewMovie);
// Admin Routes
/**
 * @swagger
 * /movies/create-movie:
 *   post:
 *     summary: Create a new movie (Admin only)
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - year
 *               - detail
 *               - genre
 *             properties:
 *               name:
 *                 type: string
 *               image:
 *                 type: string
 *               year:
 *                 type: number
 *               detail:
 *                 type: string
 *               cast:
 *                 type: array
 *                 items:
 *                   type: string
 *               genre:
 *                 type: string
 *     responses:
 *       201:
 *         description: Movie created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Movie'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/create-movie', authMiddleware_js_1.authenticated, authMiddleware_js_1.authorizeAdmin, movieController_js_1.createMovie);
/**
 * @swagger
 * /movies/update-movie/{id}:
 *   put:
 *     summary: Update a movie (Admin only)
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Movie ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               image:
 *                 type: string
 *               year:
 *                 type: number
 *               detail:
 *                 type: string
 *               cast:
 *                 type: array
 *                 items:
 *                   type: string
 *               genre:
 *                 type: string
 *     responses:
 *       200:
 *         description: Movie updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Movie'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Movie not found
 */
router.put('/update-movie/:id', authMiddleware_js_1.authenticated, authMiddleware_js_1.authorizeAdmin, movieController_js_1.updateMovie);
/**
 * @swagger
 * /movies/delete-movie/{id}:
 *   delete:
 *     summary: Delete a movie (Admin only)
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Movie ID
 *     responses:
 *       200:
 *         description: Movie deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Movie not found
 */
router.delete('/delete-movie/:id', authMiddleware_js_1.authenticated, authMiddleware_js_1.authorizeAdmin, movieController_js_1.deleteMovie);
/**
 * @swagger
 * /movies/delete-comment:
 *   delete:
 *     summary: Delete a comment (Admin only)
 *     tags: [Movies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieId
 *               - reviewId
 *             properties:
 *               movieId:
 *                 type: string
 *                 description: Movie ID
 *               reviewId:
 *                 type: string
 *                 description: Review ID to delete
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Movie or comment not found
 */
router.delete('/delete-comment', authMiddleware_js_1.authenticated, authMiddleware_js_1.authorizeAdmin, movieController_js_1.deleteComment);
exports.default = router;
