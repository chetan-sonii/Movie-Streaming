"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
function checkId(req, res, next) {
    if (!(0, mongoose_1.isValidObjectId)(req.params.id)) {
        return res.status(400).json({ message: "Invalid ID format" });
    }
    next();
}
exports.default = checkId;
