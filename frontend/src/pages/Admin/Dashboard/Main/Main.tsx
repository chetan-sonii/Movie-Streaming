import SecondaryCard from "./SecondaryCard";
import VideoCard from "./VideoCard";
import RealtimeCard from "./RealtimeCard";

import { useGetTopMoviesQuery, useGetAllMoviesQuery } from "../../../../redux/api/movies";
import { useGetUsersQuery } from "../../../../redux/api/users";
import { useGetAllRequestsQuery } from "../../../../redux/api/requests";
import { MovieProps } from "../../../../types/movieTypes";

const Main = () => {
    // pass undefined for queries typed with void
    const { data: topMovies } = useGetTopMoviesQuery(undefined);
    const { data: visitors } = useGetUsersQuery(undefined);
    const { data: allMovies } = useGetAllMoviesQuery(undefined);
    const { data: allRequests } = useGetAllRequestsQuery(undefined);

    // sum comments safely
    const sumOfCommentsLength =
        Array.isArray(allMovies) && allMovies.length > 0
            ? allMovies.reduce((acc, movie: MovieProps) => acc + (movie.numReviews ?? 0), 0)
            : 0;

    return (
        <div className="min-h-screen bg-gray-900">
            <section className="flex flex-col md:flex-row">
                <div className="w-full md:ml-[16rem] p-4 md:pt-6 lg:pt-8">
                    <div className="flex flex-wrap gap-3 md:gap-4">
                        <SecondaryCard
                            pill="Users"
                            content={visitors?.length ?? 0}
                            info=""
                            gradient="from-blue-500 to-purple-600"
                        />
                        <SecondaryCard
                            pill="Comments"
                            content={sumOfCommentsLength}
                            info=""
                            gradient="from-pink-500 to-rose-400"
                        />
                        <SecondaryCard
                            pill="Movies"
                            content={allMovies?.length ?? 0}
                            info=""
                            gradient="from-orange-500 to-red-400"
                        />
                        <SecondaryCard
                            pill="Requests"
                            content={allRequests?.length ?? 0}
                            info=""
                            gradient="from-green-500 to-teal-400"
                        />
                    </div>

                    <div className="flex justify-between w-full md:w-[90%] text-white mt-6 md:mt-8 lg:mt-10 font-bold px-2">
                        <h3 className="text-base md:text-lg">Top Content</h3>
                        <h3 className="text-base md:text-lg">Comments</h3>
                    </div>

                    <div className="mt-4">
                        {Array.isArray(topMovies) && topMovies.length > 0 ? (
                            topMovies.map((movie: MovieProps) => (
                                <VideoCard
                                    key={movie._id}
                                    image={movie.image ?? movie.videos?.[0]?.thumbnails?.high?.url ?? "/fallback.jpg"}
                                    title={movie.name ?? "Untitled"}
                                    rating={movie.rating ?? 0}
                                    date={movie.year ? String(movie.year) : ""}
                                    commentsNumber={movie.numReviews ?? 0}
                                />
                            ))
                        ) : (
                            <div className="text-gray-400">No top content available.</div>
                        )}
                    </div>
                </div>

                <div className="w-full md:w-auto mt-6 md:mt-0 p-4 md:p-6">
                    <RealtimeCard />
                </div>
            </section>
        </div>
    );
};

export default Main;
