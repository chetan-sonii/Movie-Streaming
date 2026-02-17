"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const asyncHandler = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req, res, next))
        .catch((err) => {
        res.status(500).json({ message: err.message });
    });
};
exports.default = asyncHandler;
