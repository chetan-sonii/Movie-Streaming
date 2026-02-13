// src/features/movies/MovieDetails.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useGetMovieByIdQuery } from "../../redux/api/movies";
import Loader from "../../components/Loader";
import { GenreProps } from "../../types/genreTypes";
import MovieReview from "./MovieReview";
import Footer from "../../components/Footer";
import { youtubeThumbFallback } from "../../utils/youtube";

const MovieDetails: React.FC = () => {
    const { id: movieId } = useParams<{ id: string }>();
    const { data: movie, isLoading, error } = useGetMovieByIdQuery(movieId);
    const [userCountry, setUserCountry] = useState<string | null>(null);

    // Determine country conservatively from browser locale (best-effort)
    useEffect(() => {
        try {
            const lang = (navigator.language || (navigator.languages && navigator.languages[0]) || "en-IN") as string;
            const parts = lang.split("-");
            if (parts.length > 1) setUserCountry(parts[1].toUpperCase());
            else setUserCountry("IN"); // fallback
        } catch {
            setUserCountry("IN");
        }
    }, []);

    // Ensure movie.cast is iterated safely
    const castList = Array.isArray(movie?.cast) ? movie!.cast : [];

    // Build playable video list using available metadata (be conservative)
    const playableVideos = useMemo(() => {
        if (!movie || !Array.isArray(movie.videos)) return [];
        const country = userCountry || "IN";

        return movie.videos.filter((v: any) => {
            // require youtubeId
            if (!v || !v.youtubeId) return false;

            // Skip private/unlisted (only allow public)
            if (v.privacyStatus && v.privacyStatus !== "public") return false;

            // Skip explicit embeddable: false
            if (v.embeddable === false) return false;

            // Region restriction: blocked list
            if (v.regionRestriction && Array.isArray(v.regionRestriction.blocked)) {
                if (v.regionRestriction.blocked.includes(country)) return false;
            }
            // Region restriction: allowed list (if exists) and user not in it -> skip
            if (v.regionRestriction && Array.isArray(v.regionRestriction.allowed)) {
                if (!v.regionRestriction.allowed.includes(country)) return false;
            }

            // otherwise consider playable (embed may still fail for member-only, but we've guarded many cases)
            return true;
        });
    }, [movie, userCountry]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-900">
                <Loader />
            </div>
        );
    }

    if (error || !movie) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Error Loading Movie</h2>
                    <p className="mb-6">We couldn't load the movie details. Please try again later.</p>
                    <Link to="/" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition duration-300">
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    // Poster fallback: prefer movie.image, then first playable video's thumb, then fallback image
    const firstPlayable = playableVideos[0] || (Array.isArray(movie.videos) ? movie.videos[0] : null);
    const posterSrc = movie.image || (firstPlayable ? youtubeThumbFallback(firstPlayable.youtubeId, firstPlayable.thumbnails) : "/images/fallback_poster.jpg");

    return (
        <div className="min-h-screen bg-gray-900 text-white pb-16">
            <div className="pt-4">
                <div className="container mx-auto px-4">
                    <Link
                        to="/"
                        className="inline-flex items-center text-white bg-black/50 hover:bg-black/70 px-4 py-2 rounded-lg mb-4 transition duration-300"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Back
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/3 lg:w-1/4">
                        <img src={posterSrc} alt={movie.name} className="w-full rounded-lg shadow-2xl object-cover" />
                    </div>

                    <div className="md:w-2/3 lg:w-3/4">
                        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">{movie.name}</h1>

                            <div className="flex flex-wrap items-center gap-4 my-6">
                                <span className="bg-blue-600 text-sm px-3 py-1 rounded-full">{movie.year}</span>
                                {movie.genre &&
                                    Array.isArray(movie.genre) &&
                                    movie.genre.map((g: GenreProps, index: number) => (
                                        <span key={index} className="bg-gray-700 bg-opacity-80 text-white px-3 py-1 rounded-full text-sm border border-gray-600">
                      {g.name}
                    </span>
                                    ))}
                            </div>

                            <div className="my-6">
                                <h3 className="text-xl font-semibold text-gray-300 mb-2">Overview</h3>
                                <p className="text-gray-300 leading-relaxed">{movie.detail}</p>
                            </div>

                            <div className="my-6">
                                <h3 className="text-xl font-semibold mb-3 text-gray-300">Director</h3>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-gray-700 px-3 py-1 rounded-full text-sm">{movie.director || "Unknown Director"}</span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h3 className="text-xl font-semibold mb-3 text-gray-300">Cast</h3>
                                <div className="flex flex-wrap gap-2">
                                    {castList.length ? (
                                        castList.map((actor: string, index: number) => (
                                            <span key={index} className="bg-gray-700 px-3 py-1 rounded-full text-sm">
                        {actor || "Unknown Actor"}
                      </span>
                                        ))
                                    ) : (
                                        <span className="bg-gray-700 px-3 py-1 rounded-full text-sm">Unknown Cast</span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6">
                                <Link to={`/movies/player/${movie._id}`}>
                                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl">
                                        Watch
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Episode preview / playable video list */}
                <div className="mt-8">
                    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4">Episodes</h3>

                        {/* If there are playable videos, show them first */}
                        {playableVideos.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                {playableVideos.map((v: any, i: number) => {
                                    const thumb = youtubeThumbFallback(v.youtubeId, v.thumbnails);
                                    return (
                                        <Link
                                            key={v.youtubeId}
                                            to={`/movies/player/${movie._id}?ep=${movie.videos.findIndex((x: any) => x.youtubeId === v.youtubeId)}`}
                                            className="flex flex-col items-start gap-2 p-2 rounded transition-all text-left bg-gray-900 hover:bg-gray-800"
                                        >
                                            <img src={thumb} alt={v.title} className="w-full h-28 object-cover rounded" />
                                            <div className="text-sm font-medium line-clamp-2">
                                                {v.title || `Episode ${v.episode || i + 1}`}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : Array.isArray(movie.videos) && movie.videos.length > 0 ? (
                            // No playable videos found for the user's region — show fallback list with Open on YouTube links
                            <div>
                                <p className="text-gray-300 mb-3">No embeddable episodes available in your region. Try watching on YouTube:</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {movie.videos.map((v: any, idx: number) => {
                                        const thumb = youtubeThumbFallback(v.youtubeId, v.thumbnails);
                                        return (
                                            <div key={v.youtubeId || idx} className="bg-gray-900 p-2 rounded">
                                                <img src={thumb} alt={v.title} className="w-full h-28 object-cover rounded mb-2" />
                                                <div className="text-sm mb-2 line-clamp-2">{v.title || `Episode ${v.episode || idx + 1}`}</div>
                                                <div className="flex gap-2">
                                                    <a
                                                        href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-sm bg-blue-600 px-3 py-1 rounded inline-block"
                                                    >
                                                        Open on YouTube
                                                    </a>
                                                    <Link
                                                        to={`/movies/player/${movie._id}?ep=${idx}`}
                                                        className="text-sm bg-gray-700 px-3 py-1 rounded inline-block"
                                                    >
                                                        Try Embed
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-300">No episodes available for this title.</div>
                        )}
                    </div>
                </div>

                <MovieReview />
            </div>

            <div className="mt-6">
                <Footer />
            </div>
        </div>
    );
};

export default MovieDetails;