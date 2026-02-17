// src/pages/Admin/UpdateMovie.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    useGetAllMoviesQuery,
    useGetMovieByIdQuery,
    useUpdateMovieMutation,
    useDeleteMovieMutation,
    useUploadMovieImageMutation,
} from "../../redux/api/movies";
import { toast } from "react-toastify";
import { useGetGenresQuery } from "../../redux/api/genre";
import { GenreProps } from "../../types/genreTypes";
import Sidebar from "./Dashboard/Sidebar/Sidebar";

type LocalMovieData = {
    name: string;
    year?: number | null;
    detail: string;
    genre: string[]; // genre ids
    image?: string | null;
    coverImage?: string | null;
    director?: string;
    cast: string[]; // actor names
    rating?: number | null;
    youtubeUrl?: string; // admin-visible youtube url (video or playlist)
};

const extractYoutubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const videoRegex =
        /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const m = url.match(videoRegex);
    return m ? m[1] : null;
};

const extractYoutubePlaylistId = (url: string): string | null => {
    if (!url) return null;
    try {
        const u = new URL(url, "https://youtube.com");
        const list = u.searchParams.get("list");
        return list || null;
    } catch {
        const m = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
        return m ? m[1] : null;
    }
};

const safeGetImagePathFromUpload = (resUnknown: unknown): string | null => {
    if (!resUnknown || typeof resUnknown !== "object") return null;
    const resObj = resUnknown as Record<string, unknown>;
    if (typeof resObj.image === "string") return resObj.image;
    if (resObj.data && typeof resObj.data === "object") {
        const dataObj = resObj.data as Record<string, unknown>;
        if (typeof dataObj.image === "string") return dataObj.image;
    }
    return null;
};

const UpdateMovie: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [movieData, setMovieData] = useState<LocalMovieData>({
        name: "",
        year: null,
        detail: "",
        genre: [],
        image: null,
        coverImage: null,
        director: "",
        cast: [],
        rating: null,
        youtubeUrl: "",
    });

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(null);

    // queries & mutations (pass undefined for void-typed hooks)
    const { refetch } = useGetAllMoviesQuery(undefined);
    const {
        data: initialMovieData,
        isLoading: isLoadingMovie,
    } = useGetMovieByIdQuery(id ?? "", { skip: !id }); // skip if no id

    const [updateMovie, { isLoading: isUpdatingMovie }] = useUpdateMovieMutation();
    const [deleteMovie, { isLoading: isDeletingMovie }] = useDeleteMovieMutation();
    const [uploadMovieImage, { isLoading: isUploadingImage }] = useUploadMovieImageMutation();
    const [uploadMovieCoverImage, { isLoading: isUploadingCoverImage }] =
        useUploadMovieImageMutation();

    const { data: genres, isLoading: isLoadingGenres } = useGetGenresQuery(undefined);

    // populate form with fetched movie data
    useEffect(() => {
        if (!initialMovieData) return;

        // derive youtubeUrl from videos (videoId vs playlistId heuristics)
        let youtubeUrl = "";
        const firstVideo = Array.isArray(initialMovieData.videos) && initialMovieData.videos.length > 0
            ? initialMovieData.videos[0]
            : undefined;

        if (firstVideo && typeof firstVideo.youtubeId === "string") {
            const idStr = firstVideo.youtubeId;
            // treat 11-char id as video, else playlist
            if (idStr.length === 11) {
                youtubeUrl = `https://www.youtube.com/watch?v=${idStr}`;
            } else {
                youtubeUrl = `https://www.youtube.com/playlist?list=${idStr}`;
            }
        }

        setMovieData({
            name: initialMovieData.name ?? "",
            year: typeof initialMovieData.year === "number" ? initialMovieData.year : null,
            detail: initialMovieData.detail ?? "",
            genre: Array.isArray(initialMovieData.genre)
                ? initialMovieData.genre.map((g: any) => (typeof g === "string" ? g : g._id))
                : [],
            image: initialMovieData.image ?? null,
            coverImage: initialMovieData.coverImage ?? null,
            director: initialMovieData.director ?? "",
            cast: Array.isArray(initialMovieData.cast) ? initialMovieData.cast : [],
            rating: typeof initialMovieData.rating === "number" ? initialMovieData.rating : null,
            youtubeUrl,
        });
    }, [initialMovieData]);

    // show errors from hooks (if you keep tracking errors separately, adapt accordingly)
    // handleChange
    const numberFields = new Set(["year", "rating"]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        if (numberFields.has(name)) {
            const num = value === "" ? null : Number(value);
            setMovieData((prev) => ({ ...prev, [name]: num }));
            return;
        }

        if (name === "cast") {
            // treat cast input as comma-separated
            setMovieData((prev) => ({ ...prev, cast: value ? value.split(",").map((s) => s.trim()) : [] }));
            return;
        }

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

    const addGenre = (genreId: string) => {
        if (!genreId) return;
        setMovieData((prev) => {
            if (prev.genre.includes(genreId)) return prev;
            return { ...prev, genre: [...prev.genre, genreId] };
        });
    };

    const removeGenre = (genreId: string) => {
        setMovieData((prev) => ({ ...prev, genre: prev.genre.filter((id) => id !== genreId) }));
    };

    const handleUpdateMovie = async () => {
        // minimal validation
        if (!movieData.name.trim() || !movieData.detail.trim()) {
            toast.error("Please provide at least a name and description.");
            return;
        }

        // video/playlist must exist either in form or previously stored
        const newVideoId = extractYoutubeVideoId(movieData.youtubeUrl ?? "");
        const newPlaylistId = extractYoutubePlaylistId(movieData.youtubeUrl ?? "");
        const hasExistingVideos = Array.isArray(initialMovieData?.videos) && initialMovieData!.videos.length > 0;

        if (!newVideoId && !newPlaylistId && !hasExistingVideos) {
            toast.error("Please provide a YouTube video or playlist URL (or keep existing videos).");
            return;
        }

        try {
            let uploadImagePath = movieData.image ?? null;
            let uploadCoverImagePath = movieData.coverImage ?? null;

            if (selectedImage) {
                const fd = new FormData();
                fd.append("image", selectedImage);
                try {
                    const res: unknown = await uploadMovieImage(fd).unwrap();
                    const p = safeGetImagePathFromUpload(res);
                    if (p) uploadImagePath = p;
                } catch (err: unknown) {
                    console.error("Image upload failed:", err);
                    toast.error("Image upload failed.");
                    return;
                }
            }

            if (selectedCoverImage) {
                const fd = new FormData();
                fd.append("image", selectedCoverImage);
                try {
                    const res: unknown = await uploadMovieCoverImage(fd).unwrap();
                    const p = safeGetImagePathFromUpload(res);
                    if (p) uploadCoverImagePath = p;
                } catch (err: unknown) {
                    console.error("Cover upload failed:", err);
                    toast.error("Cover image upload failed.");
                    return;
                }
            }

            // ensure at least image and cover exist
            if (!uploadImagePath) {
                toast.error("Movie must have an image.");
                return;
            }
            if (!uploadCoverImagePath) {
                toast.error("Movie must have a cover image.");
                return;
            }

            // prepare videos array: if admin provided new url, replace videos with single entry (video or playlist).
            const videosToSend = (() => {
                if (newPlaylistId) {
                    return [
                        {
                            title: movieData.name,
                            youtubeId: newPlaylistId,
                            season: 1,
                            episode: 1,
                        },
                    ];
                }
                if (newVideoId) {
                    return [
                        {
                            title: movieData.name,
                            youtubeId: newVideoId,
                            season: 1,
                            episode: 1,
                        },
                    ];
                }
                // else keep existing videos from DB
                return initialMovieData?.videos ?? [];
            })();

            // compose payload as backend expects: updatedMovie
            const updatedMovie: Record<string, unknown> = {
                name: movieData.name,
                year: movieData.year ?? new Date().getFullYear(),
                detail: movieData.detail,
                genre: movieData.genre,
                image: uploadImagePath,
                coverImage: uploadCoverImagePath,
                director: movieData.director ?? "",
                cast: movieData.cast ?? [],
                rating: movieData.rating ?? 0,
                videos: videosToSend,
                source: "youtube",
            };

            await updateMovie({ id: id ?? "", updatedMovie }).unwrap();
            toast.success("Movie updated successfully!");
            if (typeof refetch === "function") {
                try {
                    await refetch();
                } catch {
                    // ignore
                }
            }
            navigate("/admin/movies-list");
        } catch (err: unknown) {
            if (err instanceof Error) toast.error("Failed to update movie: " + err.message);
            else toast.error("Failed to update movie.");
            console.error("Update movie error:", err);
        }
    };

    const handleDeleteMovie = async () => {
        const confirmed = window.confirm("Are you sure you want to delete this movie?");
        if (!confirmed) return;
        try {
            await deleteMovie(id ?? "").unwrap();
            toast.success("Movie deleted successfully!");
            if (typeof refetch === "function") {
                try {
                    await refetch();
                } catch {
                    // ignore
                }
            }
            navigate("/admin/movies-list");
        } catch (err: unknown) {
            if (err instanceof Error) toast.error("Failed to delete movie: " + err.message);
            else toast.error("Failed to delete movie.");
            console.error("Delete movie error:", err);
        }
    };

    return (
        <>
            <Sidebar />
            <div className="container flex justify-center items-center min-h-screen mt-2 sm:mt-4 pt-2 sm:pt-4 overflow-hidden px-3 sm:px-0">
                <form className="w-full max-w-xs sm:max-w-sm md:max-w-md">
                    <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Update Movie</h1>

                    <div className="mb-2 sm:mb-3">
                        <label className="block text-white text-sm sm:text-base">Name</label>
                        <input
                            type="text"
                            name="name"
                            value={movieData.name}
                            onChange={handleChange}
                            className="w-full p-1.5 sm:p-2 border border-gray-300 rounded text-sm sm:text-base"
                            required
                        />
                    </div>

                    <div className="mb-2 sm:mb-3">
                        <label className="block text-white text-sm sm:text-base">YouTube video or playlist URL</label>
                        <input
                            type="text"
                            name="youtubeUrl"
                            value={movieData.youtubeUrl ?? ""}
                            onChange={handleChange}
                            placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/playlist?list=..."
                            className="w-full p-1.5 sm:p-2 border border-gray-300 rounded text-sm sm:text-base"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Leave blank to keep existing video(s) from the database.
                        </p>
                    </div>

                    <div className="mb-2 sm:mb-3">
                        <label className="block text-white text-sm sm:text-base">Year</label>
                        <input
                            type="number"
                            name="year"
                            value={movieData.year ?? ""}
                            onChange={handleChange}
                            className="w-full p-1.5 sm:p-2 border border-gray-300 rounded text-sm sm:text-base"
                        />
                    </div>

                    <div className="mb-2 sm:mb-3">
                        <label className="block text-white text-sm sm:text-base">Detail</label>
                        <textarea
                            value={movieData.detail}
                            name="detail"
                            onChange={handleChange}
                            className="w-full p-1.5 sm:p-2 border border-gray-300 rounded bg-white text-black text-sm sm:text-base"
                            rows={4}
                            required
                        />
                    </div>

                    <div className="mb-2 sm:mb-3">
                        <label className="block text-white text-sm sm:text-base">Director</label>
                        <input
                            type="text"
                            name="director"
                            value={movieData.director ?? ""}
                            onChange={handleChange}
                            className="w-full p-1.5 sm:p-2 border border-gray-300 rounded text-sm sm:text-base"
                        />
                    </div>

                    <div className="mb-2 sm:mb-3">
                        <label className="block text-white text-sm sm:text-base">Cast (comma separated)</label>
                        <input
                            type="text"
                            name="cast"
                            value={movieData.cast.join(", ")}
                            onChange={(e) =>
                                setMovieData((prev) => ({ ...prev, cast: e.target.value ? e.target.value.split(",").map((s) => s.trim()) : [] }))
                            }
                            className="w-full p-1.5 sm:p-2 border border-gray-300 rounded text-sm sm:text-base"
                        />
                    </div>

                    <div className="mb-2 sm:mb-3">
                        <label className="block mb-1 sm:mb-2 text-xs sm:text-sm font-medium text-white">Genre:</label>
                        <select
                            name="genre"
                            className="border p-1 sm:p-1.5 w-full bg-white text-black rounded-md text-sm sm:text-base"
                            onChange={(e) => {
                                const selectedGenreId = e.target.value;
                                if (!selectedGenreId) return;
                                addGenre(selectedGenreId);
                            }}
                        >
                            <option value="">Select genre to add</option>
                            {isLoadingGenres ? <option>Loading genres...</option> : null}
                            {Array.isArray(genres) &&
                                genres.map((genre: GenreProps) => (
                                    <option key={genre._id} value={genre._id}>
                                        {genre.name}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
                        {Array.isArray(movieData.genre) &&
                            movieData.genre.map((genreId: string, index: number) => {
                                const genre = Array.isArray(genres) ? genres.find((g: GenreProps) => g._id === genreId) : undefined;
                                return (
                                    <div
                                        key={`${genreId}-${index}`}
                                        className="bg-transparent border text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2"
                                    >
                                        <span>{genre?.name || "Unknown"}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeGenre(genreId)}
                                            className="bg-transparent hover:bg-red-600 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs"
                                        >
                                            X
                                        </button>
                                    </div>
                                );
                            })}
                    </div>

                    <div className="mb-2 sm:mb-3">
                        <label className="block text-white text-sm sm:text-base">Image</label>
                        <input
                            type="file"
                            name="image"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="w-full p-1.5 sm:p-2 border border-gray-300 rounded text-xs sm:text-sm"
                        />
                    </div>

                    <div className="mb-2 sm:mb-3">
                        <label className="block text-white text-sm sm:text-base">Cover Image</label>
                        <input
                            type="file"
                            name="coverImage"
                            accept="image/*"
                            onChange={handleCoverImageChange}
                            className="w-full p-1.5 sm:p-2 border border-gray-300 rounded text-xs sm:text-sm"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between py-2 gap-2 sm:gap-0">
                        <button
                            type="button"
                            onClick={handleUpdateMovie}
                            disabled={isUpdatingMovie || isUploadingImage || isUploadingCoverImage}
                            className="bg-blue-900 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm sm:text-base"
                        >
                            {isUpdatingMovie || isUploadingImage || isUploadingCoverImage ? "Updating..." : "Update Movie"}
                        </button>

                        <button
                            type="button"
                            onClick={handleDeleteMovie}
                            className="bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded cursor-pointer text-sm sm:text-base"
                            disabled={isDeletingMovie}
                        >
                            {isDeletingMovie ? "Deleting..." : "Delete Movie"}
                        </button>

                        {isLoadingMovie && <p className="text-xs sm:text-sm">Loading movie data...</p>}
                    </div>
                </form>
            </div>
        </>
    );
};

export default UpdateMovie;
