import { useState, useEffect } from "react";
import { MovieProps } from "../types/movieTypes";
import { Link } from "react-router-dom";

interface HeroSliderProps {
    data: MovieProps[];
}

const HeroSlider = ({ data }: HeroSliderProps) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        if (!data || data.length === 0) return;

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % data.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="relative h-64 sm:h-80 md:h-96 bg-gray-900 rounded-lg flex items-center justify-center">
                <h2 className="text-white text-xl sm:text-2xl px-4 text-center">
                    No featured anime available
                </h2>
            </div>
        );
    }

    const currentMovie = data[currentSlide];

    // 🔥 Safe fallback image logic
    const backgroundImage =
        currentMovie.coverImage ||
        currentMovie.image ||
        (currentMovie.videos &&
            currentMovie.videos.length > 0 &&
            currentMovie.videos[0]?.thumbnails?.high?.url) ||
        "/fallback.jpg"; // optional local fallback image

    return (
        <div className="relative h-64 sm:h-80 md:h-96 lg:h-[450px] xl:h-[550px] 2xl:h-[650px] rounded-lg overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
                <img
                    src={backgroundImage}
                    alt={currentMovie.name ?? "Anime"}
                    className="w-full h-full object-cover object-center"
                />
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>

            {/* Content */}
            <div className="relative h-full flex items-center justify-start px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20">
                <div className="max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl p-4 sm:p-6 md:p-8 lg:p-12 backdrop-blur-sm rounded-xl border border-white/10 bg-black/30">
                    <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 leading-tight drop-shadow-xl">
                        {currentMovie.name}
                        {currentMovie.year && (
                            <span className="text-gray-300 ml-2 text-sm sm:text-base md:text-lg">
                ({currentMovie.year})
              </span>
                        )}
                    </h1>

                    {/* Genres */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {currentMovie.genre?.slice(0, 3).map((g) => (
                            <span
                                key={g._id}
                                className="bg-gray-700/80 text-white px-3 py-1 rounded-full text-xs sm:text-sm border border-gray-600"
                            >
                {g.name}
              </span>
                        ))}
                    </div>

                    {/* Description */}
                    {currentMovie.detail && (
                        <p className="text-white text-sm sm:text-base md:text-lg mb-5 leading-relaxed line-clamp-3 drop-shadow-md">
                            {currentMovie.detail}
                        </p>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-4 mb-6">
            <span className="text-yellow-400 text-sm sm:text-base md:text-lg font-semibold">
              ⭐ {(currentMovie.rating ?? 0).toFixed(1)}
            </span>

                        {currentMovie.source === "youtube" && (
                            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs">
                Series
              </span>
                        )}
                    </div>

                    {/* Watch Button */}
                    <Link to={`/movies/player/${currentMovie._id}`}>
                        <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl text-sm sm:text-base">
                            Watch Now
                        </button>
                    </Link>
                </div>
            </div>

            {/* Navigation Buttons */}
            <button
                onClick={() =>
                    setCurrentSlide((prev) => (prev - 1 + data.length) % data.length)
                }
                className="hidden sm:block absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <button
                onClick={() =>
                    setCurrentSlide((prev) => (prev + 1) % data.length)
                }
                className="hidden sm:block absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full transition"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Indicators */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {data.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition ${
                            index === currentSlide
                                ? "bg-white"
                                : "bg-white/50 hover:bg-white/70"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroSlider;