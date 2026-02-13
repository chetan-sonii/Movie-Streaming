import React from "react";
import { Link } from "react-router-dom";
import { MovieProps } from "../../types/movieTypes";
import { youtubeThumbFallback } from "../../utils/youtube";

const MovieCard: React.FC<{ movie: MovieProps }> = ({ movie }) => {
    // pick poster: explicit movie.image > first youtube video thumb > youtube img fallback
    const posterSrc =
        movie?.image ||
        (Array.isArray(movie?.videos) && movie.videos.length > 0
            ? youtubeThumbFallback(movie.videos[0].youtubeId, movie.videos[0].thumbnails)
            : "/images/fallback_poster.jpg");

    // safe rating (show only if numeric)
    const hasRating = movie && typeof movie.rating === "number" && !Number.isNaN(movie.rating);

    // primary genre label (safe)
    const primaryGenre =
        Array.isArray(movie?.genre) && movie.genre.length > 0 && movie.genre[0]?.name
            ? movie.genre[0].name
            : null;

    return (
        <div className="group relative overflow-hidden rounded-lg sm:rounded-xl bg-gray-800 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-700/50 h-full">
            <Link to={`/movies/${movie._id}`} className="block h-full">
                <div className="aspect-[2/3] overflow-hidden relative">
                    <img
                        src={posterSrc}
                        alt={movie.name || "Poster"}
                        className="w-full h-full object-cover transition-all duration-500 transform group-hover:scale-105 sm:group-hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                            // fallback if image 404s
                            (e.currentTarget as HTMLImageElement).src = `/images/fallback_poster.jpg`;
                        }}
                    />

                    {/* YouTube series badge */}
                    {movie?.source === "youtube" && (
                        <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] sm:text-xs px-2 py-1 rounded-md font-semibold shadow">
                            Series
                        </div>
                    )}

                    {hasRating && (
                        <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 bg-yellow-500 text-2xs sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-black shadow-lg flex items-center">
                            <svg
                                className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5 sm:mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                            </svg>
                            {movie.rating}
                        </div>
                    )}
                </div>

                <div className="p-2 sm:p-3 md:p-4">
                    <h3 className="font-bold text-white text-sm sm:text-base md:text-lg line-clamp-1 group-hover:text-indigo-400 transition-colors">
                        {movie.name}
                    </h3>

                    <div className="flex items-center justify-between mt-1 sm:mt-2">
            <span className="text-2xs sm:text-xs md:text-sm text-gray-400">
              {movie.year || "—"}
            </span>

                        {primaryGenre && (
                            <span className="text-2xs sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-indigo-900/50 text-indigo-200 rounded-full truncate max-w-[90px] sm:max-w-none">
                {primaryGenre}
              </span>
                        )}
                    </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 sm:p-3 md:p-4">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1 sm:mb-2">
                            {movie.name}
                        </h3>
                        <p className="text-2xs sm:text-xs md:text-sm text-gray-300 line-clamp-2 sm:line-clamp-3 mb-2 sm:mb-3">
                            {movie.detail || "No description available"}
                        </p>
                        <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 mb-1 sm:mb-2 rounded-full text-2xs sm:text-xs font-medium bg-indigo-600/80 text-white">
              View Details
              <svg
                  className="w-2 h-2 sm:w-3 sm:h-3 ml-0.5 sm:ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </span>
                    </div>
                </div>
            </Link>
        </div>
    );
};

export default MovieCard;