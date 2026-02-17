"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Controllers
const movieRequestController_js_1 = require("../controllers/movieRequestController.js");
// Middleware
const authMiddleware_js_1 = require("../middlewares/authMiddleware.js");
router.post('/create-request', authMiddleware_js_1.authenticated, movieRequestController_js_1.createRequest);
router.get('/all-requests', authMiddleware_js_1.authenticated, authMiddleware_js_1.authorizeAdmin, movieRequestController_js_1.getAllRequests);
router.delete('/delete-request/:id', authMiddleware_js_1.authenticated, authMiddleware_js_1.authorizeAdmin, movieRequestController_js_1.deleteRequest);
exports.default = router;
