import React from "react";
import { Link } from "react-router-dom";
import { useGetAllMoviesQuery } from "../../redux/api/movies";
import Sidebar from "./Dashboard/Sidebar/Sidebar";
import { MovieProps } from "../../types/movieTypes";

const AdminMoviesList: React.FC = () => {
    // RTK Query expects no args for this hook (typed as void)
    const { data: movies, isLoading } = useGetAllMoviesQuery({});

    return (
        <div className="flex flex-col md:flex-row">
            <Sidebar />
            <div className="flex-1 p-3 sm:p-4 md:p-6 md:ml-16 lg:ml-64 pt-1 sm:pt-2">
                <div className="p-2 sm:p-3">
                    <div className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-6">
                        Movies List ({movies?.length ?? 0})
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                            {Array.isArray(movies) && movies.length > 0 ? (
                                movies.map((movie: MovieProps) => (
                                    <div
                                        key={movie._id}
                                        className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border border-gray-700"
                                    >
                                        <div className="relative">
                                            <img
                                                src={movie.image ?? (movie.videos && movie.videos[0]?.thumbnails?.high?.url) ?? "/fallback.jpg"}
                                                alt={movie.name ?? "Untitled"}
                                                className="w-full h-40 sm:h-56 md:h-64 lg:h-72 object-cover"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).src = "/fallback.jpg";
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                        </div>

                                        <div className="p-3 sm:p-4 md:p-5">
                                            <h3 className="font-bold text-base sm:text-lg mb-1 sm:mb-2 text-white truncate">
                                                {movie.name ?? "Untitled"}
                                            </h3>

                                            <p className="text-gray-300 text-xs sm:text-sm mb-2 sm:mb-4 leading-relaxed line-clamp-2 sm:line-clamp-3">
                                                {movie.detail ?? "No description available"}
                                            </p>

                                            <div className="mt-auto">
                                                <Link
                                                    to={`/admin/movies/update/${movie._id}`}
                                                    className="block bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-colors duration-200 text-center text-xs sm:text-sm"
                                                >
                                                    Update Movie
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center text-gray-300 py-12">
                                    No movies found.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminMoviesList;