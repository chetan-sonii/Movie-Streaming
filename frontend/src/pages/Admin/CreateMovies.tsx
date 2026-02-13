// src/pages/Admin/CreateMovies.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    useCreateMovieMutation,
    useUploadMovieImageMutation,
    useGetAllMoviesQuery,
} from "../../redux/api/movies";
import { useGetGenresQuery } from "../../redux/api/genre";
import { toast } from "react-toastify";
import { GenreProps } from "../../types/genreTypes";
import Sidebar from "./Dashboard/Sidebar/Sidebar";
// import { MovieProps } from "../../types/movieTypes";

type LocalMovieData = {
    name: string;
    tmdbId?: number | null;
    year?: number | null;
    detail: string;
    genre: string[]; // array of genre IDs
    image?: string | null;
    coverImage?: string | null;
    director?: string;
    cast: string[]; // simple array of actor names
    rating?: number | null;
};

const CreateMovies: React.FC = () => {
    const navigate = useNavigate();

    // local form state
    const [movieData, setMovieData] = useState<LocalMovieData>({
        name: "",
        tmdbId: null,
        year: null,
        detail: "",
        genre: [],
        image: null,
        coverImage: null,
        director: "",
        cast: [],
        rating: null,
    });

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(null);

    // RTK Query mutations & queries (pass undefined when a void arg is expected)
    const [createMovie, { isLoading: isCreatingMovie }] = useCreateMovieMutation();
    const [uploadMovieImage, { isLoading: isUploadingImage }] = useUploadMovieImageMutation();

    // calling queries with undefined to match typed void input
    const { refetch } = useGetAllMoviesQuery(undefined);
    const { data: genres, isLoading: isLoadingGenres } = useGetGenresQuery(undefined);

    // initialise default genre when genres load and none selected
    useEffect(() => {
        if (Array.isArray(genres) && genres.length > 0 && movieData.genre.length === 0) {
            const firstId = genres[0]._id;
            setMovieData((prev) => ({ ...prev, genre: firstId ? [firstId] : [] }));
        }
        // include movieData.genre.length to satisfy exhaustive-deps and to re-run when user clears genres
    }, [genres, movieData.genre.length]);

    // helper: numeric fields
    const numberFieldNames = new Set(["tmdbId", "year", "rating"]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        if (numberFieldNames.has(name)) {
            const num = value === "" ? null : Number(value);
            setMovieData((prev) => ({ ...prev, [name]: num }));
            return;
        }

        // normal string fields
        setMovieData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setSelectedImage(file);
    };

    const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setSelectedCoverImage(file);
    };

    // Add a genre id to movieData.genre (keeps duplicates out)
    const addGenreById = (genreId: string) => {
        if (!genreId) return;
        setMovieData((prev) => {
            if (prev.genre.includes(genreId)) return prev;
            return { ...prev, genre: [...prev.genre, genreId] };
        });
    };

    const removeGenreById = (genreId: string) => {
        setMovieData((prev) => ({ ...prev, genre: prev.genre.filter((id) => id !== genreId) }));
    };

    const handleCreateMovie = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // minimal validation
        if (!movieData.name.trim() || !movieData.detail.trim()) {
            toast.error("Please provide at least a name and description.");
            return;
        }

        try {
            // upload images if provided
            let uploadedImagePath: string | null = null;
            let uploadedCoverPath: string | null = null;

            if (selectedImage) {
                const fd = new FormData();
                fd.append("image", selectedImage);
                try {
                    // .unwrap() resolves or throws
                    const resUnknown: unknown = await uploadMovieImage(fd).unwrap();
                    if (resUnknown && typeof resUnknown === "object" && resUnknown !== null) {
                        const resObj = resUnknown as Record<string, unknown>;
                        if (typeof resObj.image === "string") {
                            uploadedImagePath = resObj.image;
                        } else if (resObj.data && typeof resObj.data === "object") {
                            const dataObj = resObj.data as Record<string, unknown>;
                            if (typeof dataObj.image === "string") uploadedImagePath = dataObj.image;
                        }
                    }
                } catch (err: unknown) {
                    if (err instanceof Error) console.error("Image upload failed:", err.message);
                    else console.error("Image upload failed:", err);
                    toast.error("Image upload failed.");
                    return;
                }
            }

            if (selectedCoverImage) {
                const fd = new FormData();
                fd.append("image", selectedCoverImage);
                try {
                    const resUnknown: unknown = await uploadMovieImage(fd).unwrap();
                    if (resUnknown && typeof resUnknown === "object" && resUnknown !== null) {
                        const resObj = resUnknown as Record<string, unknown>;
                        if (typeof resObj.image === "string") {
                            uploadedCoverPath = resObj.image;
                        } else if (resObj.data && typeof resObj.data === "object") {
                            const dataObj = resObj.data as Record<string, unknown>;
                            if (typeof dataObj.image === "string") uploadedCoverPath = dataObj.image;
                        }
                    }
                } catch (err: unknown) {
                    if (err instanceof Error) console.error("Cover upload failed:", err.message);
                    else console.error("Cover upload failed:", err);
                    toast.error("Cover image upload failed.");
                    return;
                }
            }

            // prepare final payload for backend
            type CreateMoviePayload = {
                name: string;
                detail: string;
                genre: string[]; // ids
                cast: string[];
                director?: string;
                rating?: number;
                tmdbId?: number | null;
                year?: number | null;
                image?: string | null;
                coverImage?: string | null;
                source?: "tmdb" | "youtube" | "other";
            };

            const payload: CreateMoviePayload = {
                name: movieData.name,
                detail: movieData.detail,
                genre: Array.isArray(movieData.genre) ? movieData.genre : [],
                cast: Array.isArray(movieData.cast) ? movieData.cast : [],
                director: movieData.director || "",
                rating: movieData.rating ?? 0,
                tmdbId: movieData.tmdbId ?? null,
                year: movieData.year ?? new Date().getFullYear(),
                image: uploadedImagePath ?? movieData.image ?? null,
                coverImage: uploadedCoverPath ?? movieData.coverImage ?? null,
                source: "other",
            };

            try {
                await createMovie(payload).unwrap();
                toast.success("Movie created successfully!");
                // reset
                setMovieData({
                    name: "",
                    tmdbId: null,
                    year: null,
                    detail: "",
                    genre: [],
                    image: null,
                    coverImage: null,
                    director: "",
                    cast: [],
                    rating: null,
                });
                setSelectedImage(null);
                setSelectedCoverImage(null);
                // refetch if available
                if (typeof refetch === "function") {
                    try {
                        await refetch();
                    } catch {
                        // ignore refetch errors
                    }
                }
                navigate("/admin/movies-list");
            } catch (err: unknown) {
                if (err instanceof Error) console.error("Create movie failed:", err.message);
                else console.error("Create movie failed:", err);
                toast.error("Failed to create movie.");
            }
        } catch (outerErr) {
            console.error("Unexpected error while creating movie:", outerErr);
            toast.error("Failed to create movie.");
        }
    };

    return (
        <>
            <Sidebar />
            <div className="container flex justify-center min-h-screen overflow-hidden pt-2 sm:pt-4 px-3 sm:px-0">
                <form onSubmit={handleCreateMovie} className="w-full max-w-xs sm:max-w-sm md:max-w-md">
                    <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Create Movie</h1>

                    <div className="mb-3 sm:mb-4">
                        <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-white">
                            Name:
                            <input
                                type="text"
                                name="name"
                                value={movieData.name}
                                onChange={handleChange}
                                placeholder="Enter movie name"
                                className="border p-1.5 sm:p-2 w-full text-sm sm:text-base"
                            />
                        </label>

                        <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-white">
                            TMDB ID (optional):
                            <input
                                type="number"
                                name="tmdbId"
                                value={movieData.tmdbId ?? ""}
                                onChange={handleChange}
                                placeholder="Enter TMDB ID (if any)"
                                className="border p-1.5 sm:p-2 w-full text-sm sm:text-base"
                            />
                        </label>

                        <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-white">
                            Year:
                            <input
                                type="number"
                                name="year"
                                value={movieData.year ?? ""}
                                onChange={handleChange}
                                min={1900}
                                max={2099}
                                className="border p-1 sm:p-1.5 w-full text-sm sm:text-base"
                            />
                        </label>

                        <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-white">
                            Detail:
                            <textarea
                                name="detail"
                                value={movieData.detail}
                                onChange={handleChange}
                                className="border p-1.5 sm:p-2 w-full bg-white text-black rounded-md text-sm sm:text-base"
                                placeholder="Enter movie details"
                                rows={4}
                            />
                        </label>

                        <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-white">
                            Director:
                            <input
                                type="text"
                                name="director"
                                value={movieData.director ?? ""}
                                onChange={handleChange}
                                className="border p-1.5 sm:p-2 w-full text-sm sm:text-base"
                                placeholder="Enter director's name"
                            />
                        </label>

                        <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-white">
                            Cast (comma separated):
                            <input
                                type="text"
                                name="cast"
                                placeholder="Enter cast separated by commas"
                                value={movieData.cast.join(", ")}
                                onChange={(e) =>
                                    setMovieData((prev) => ({
                                        ...prev,
                                        cast: e.target.value ? e.target.value.split(",").map((s) => s.trim()) : [],
                                    }))
                                }
                                className="border p-1.5 sm:p-2 w-full text-sm sm:text-base"
                            />
                        </label>

                        <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-white">Genres:</label>
                        <select
                            name="genre"
                            className="border p-1 sm:p-1.5 w-full bg-white text-black rounded-md text-sm sm:text-base"
                            onChange={(e) => {
                                const selectedGenreId = e.target.value;
                                if (!selectedGenreId) return;
                                addGenreById(selectedGenreId);
                            }}
                        >
                            <option value="">Select genre</option>
                            {isLoadingGenres ? <option>Loading genres...</option> : null}
                            {Array.isArray(genres) &&
                                genres.map((genre: GenreProps) => (
                                    <option key={genre._id} value={genre._id}>
                                        {genre.name}
                                    </option>
                                ))}
                        </select>

                        <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                            {Array.isArray(movieData.genre) &&
                                movieData.genre.map((genreId, index) => {
                                    const genre = Array.isArray(genres) ? genres.find((g: GenreProps) => g._id === genreId) : undefined;
                                    return (
                                        <div
                                            key={`${genreId}-${index}`}
                                            className="bg-transparent border text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2"
                                        >
                                            <span>{genre?.name ?? "Unknown"}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeGenreById(genreId)}
                                                className="bg-transparent hover:bg-red-600 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs"
                                            >
                                                X
                                            </button>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    <div className="mb-2 sm:mb-4">
                        <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-white">
                            Image
                            <input
                                type="file"
                                accept="image/*"
                                name="image"
                                onChange={handleImageChange}
                                className={`w-full p-1.5 sm:p-2 border border-gray-300 rounded text-xs sm:text-sm ${
                                    !selectedImage ? "text-gray-500" : "text-black"
                                }`}
                            />
                        </label>
                    </div>

                    <div className="mb-2 sm:mb-4">
                        <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-white">
                            Cover Image
                            <input
                                type="file"
                                accept="image/*"
                                name="coverImage"
                                onChange={handleCoverImageChange}
                                className={`w-full p-1.5 sm:p-2 border border-gray-300 rounded text-xs sm:text-sm ${
                                    !selectedCoverImage ? "text-gray-500" : "text-black"
                                }`}
                            />
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="bg-blue-900 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded cursor-pointer mt-2 mb-4 sm:mb-6 text-sm sm:text-base"
                        disabled={isCreatingMovie || isUploadingImage}
                    >
                        {isCreatingMovie || isUploadingImage ? "Creating..." : "Create Movie"}
                    </button>
                </form>
            </div>
        </>
    );
};

export default CreateMovies;