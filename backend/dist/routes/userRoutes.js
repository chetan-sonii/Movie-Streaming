"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// Controllers
const userController_js_1 = require("../controllers/userController.js");
// Middleware
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
const router = express_1.default.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the user
 *         username:
 *           type: string
 *           description: The user's username
 *         email:
 *           type: string
 *           description: The user's email
 *         password:
 *           type: string
 *           description: The user's password
 *         isAdmin:
 *           type: boolean
 *           description: Whether the user is an admin
 */
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */
/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 */
router.route('/').post(userController_js_1.createUser).get(authMiddleware_js_1.authenticated, authMiddleware_js_1.authorizeAdmin, userController_js_1.getAllUsers);
/**
 * @swagger
 * /api/v1/users/auth:
 *   post:
 *     summary: Authenticate user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User authenticated successfully
 *       401:
 *         description: Invalid credentials
 */
router.post('/auth', userController_js_1.loginUser);
/**
 * @swagger
 * /api/v1/users/logout:
 *  post:
 *      summary: Logout current user
 *      tags: [Users]
 *      responses:
 *      200:
 *          description: User logged out successfully
 *      401:
 *          description: Unauthorized - User not logged in
 */
router.post('/logout', userController_js_1.logoutCurrentUser);
/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - User not logged in
 */
router.route('/profile').get(authMiddleware_js_1.authenticated, userController_js_1.getCurrentUserProfile).put(authMiddleware_js_1.authenticated, userController_js_1.updateCurrentUserProfile);
exports.default = router;
