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
exports.updateCurrentUserProfile = exports.getCurrentUserProfile = exports.getAllUsers = exports.logoutCurrentUser = exports.loginUser = exports.createUser = void 0;
const User_js_1 = __importDefault(require("../models/User.js"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const asyncHandler_js_1 = __importDefault(require("../middlewares/asyncHandler.js"));
const createToken_js_1 = __importDefault(require("../utils/createToken.js"));
const createUser = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        res.status(400);
        throw new Error('Please provide all required fields: username, email, and password');
    }
    const userExists = yield User_js_1.default.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists with this email');
    }
    // Hash the user password
    const salt = yield bcryptjs_1.default.genSalt(10);
    const hashPassword = yield bcryptjs_1.default.hash(password, salt);
    // Create new User
    const newUser = new User_js_1.default({ username, email, password: hashPassword });
    // Store User into db
    try {
        yield newUser.save();
        (0, createToken_js_1.default)(res, newUser._id);
        res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            isAdmin: newUser.isAdmin
        });
    }
    catch (error) {
        res.status(400);
        console.log(error);
        throw new Error("Invalid user data");
    }
}));
exports.createUser = createUser;
const loginUser = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const userExists = yield User_js_1.default.findOne({ email });
    if (userExists) {
        const isPasswordValid = yield bcryptjs_1.default.compare(password, userExists.password);
        if (isPasswordValid) {
            (0, createToken_js_1.default)(res, userExists._id);
            res.status(201).json({
                _id: userExists._id,
                username: userExists.username,
                email: userExists.email,
                isAdmin: userExists.isAdmin
            });
        }
        else {
            res.status(401).json({ message: "Invalid Password" });
        }
    }
    else {
        res.status(401).json({ message: "User not found" });
    }
}));
exports.loginUser = loginUser;
const logoutCurrentUser = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.status(200).json({ message: "Logged out successfully" });
}));
exports.logoutCurrentUser = logoutCurrentUser;
const getAllUsers = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield User_js_1.default.find({});
    res.json(users);
}));
exports.getAllUsers = getAllUsers;
const getCurrentUserProfile = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_js_1.default.findById(req.user._id);
    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
        });
    }
    else {
        res.status(404);
        throw new Error("User not found");
    }
}));
exports.getCurrentUserProfile = getCurrentUserProfile;
const updateCurrentUserProfile = (0, asyncHandler_js_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield User_js_1.default.findById(req.user._id);
    if (user) {
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        if (req.body.password) {
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashPassword = yield bcryptjs_1.default.hash(req.body.password, salt);
            user.password = hashPassword;
        }
        const updatedUser = yield user.save();
        res.status(201).json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            isAdmin: updatedUser.isAdmin
        });
    }
    else {
        res.status(404);
        throw new Error("User not found");
    }
}));
exports.updateCurrentUserProfile = updateCurrentUserProfile;
