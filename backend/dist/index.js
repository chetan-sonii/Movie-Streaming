"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
// Files
const db_1 = __importDefault(require("./config/db"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const genreRoutes_1 = __importDefault(require("./routes/genreRoutes"));
const movieRoutes_1 = __importDefault(require("./routes/movieRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const swagger_1 = __importDefault(require("./docs/swagger"));
const movieRequestRoutes_1 = __importDefault(require("./routes/movieRequestRoutes"));
// Configuration
dotenv_1.default.config();
(0, db_1.default)();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'https://movie-app-frontend-wzq8.onrender.com'], // Add your deployed frontend URL
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
const PORT = process.env.PORT || 3000;
// Routes
app.use('/api/v1/users', userRoutes_1.default);
app.use('/api/v1/genre', genreRoutes_1.default);
app.use('/api/v1/movies', movieRoutes_1.default);
app.use('/api/v1/uploads', uploadRoutes_1.default);
app.use('/api/v1/requests', movieRequestRoutes_1.default);
;
const __dirname = path_1.default.resolve();
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '/uploads')));
// Swagger documentation
(0, swagger_1.default)(app);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
