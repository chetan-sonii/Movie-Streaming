// src/features/movies/MoviePlayer.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import BackToTopButton from "../../components/BackToTopButton";
import MovieReview from "./MovieReview";
import { useGetMovieByIdQuery } from "../../redux/api/movies";
import Footer from "../../components/Footer";
import { PLAYER_OPTION, PLAYER_URL } from "../../redux/constants";

const YT_EMBED_BASE = "https://www.youtube-nocookie.com/embed";

const MoviePlayer: React.FC = () => {
    const { id: movieId } = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: movie, isLoading, isError } = useGetMovieByIdQuery(movieId as string);
    const epParam = searchParams.get("ep");
    const [currentEp, setCurrentEp] = useState<number>(() => (epParam ? Number(epParam) : 0));

    // keep ep in sync when movie loads or query param changes
    useEffect(() => {
        if (!movie) return;
        const idx = epParam ? Number(epParam) : 0;
        // clamp to valid index
        const validIdx = Math.max(0, Math.min((movie.videos?.length ?? 1) - 1, Number.isFinite(idx) ? idx : 0));
        setCurrentEp(validIdx);
    }, [movie, epParam]);

    // update query param when user changes episode within the app
    useEffect(() => {
        if (!movie) return;
        // only set if different
        const current = String(currentEp);
        if (searchParams.get("ep") !== current) {
            setSearchParams((prev) => {
                // preserve other params if any
                const next = new URLSearchParams(prev as any);
                next.set("ep", current);
                return next;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentEp, movie]);

    // pick video if youtube source exists
    const selectedVideo = useMemo(() => {
        if (movie?.source === "youtube" && Array.isArray(movie.videos) && movie.videos.length > 0) {
            const idx = Number.isFinite(currentEp) ? currentEp : 0;
            return movie.videos[Math.max(0, Math.min(movie.videos.length - 1, idx))];
        }
        return null;
    }, [movie, currentEp]);

    const embedSrc = useMemo(() => {
        if (selectedVideo) {
            return `${YT_EMBED_BASE}/${selectedVideo.youtubeId}?rel=0&modestbranding=1&iv_load_policy=3`;
        }
        // fallback to old player for non-youtube or tmdb-only entries
        if (movie?.tmdbId) {
            return `${PLAYER_URL}/${movie.tmdbId}?${PLAYER_OPTION}`;
        }
        return "";
    }, [selectedVideo, movie]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div>Loading movie...</div>
            </div>
        );
    }

    if (isError || !movie) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div>Could not load movie. Try again later.</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white pb-16">
            <div className="container mx-auto px-4 relative z-10">
                <div className="pt-14">
                    <div className="container mx-auto px-4">
                        <div className="aspect-video rounded-lg shadow-lg overflow-hidden bg-black">
                            {embedSrc ? (
                                <iframe
                                    key={embedSrc} // force reload when switching sources
                                    src={embedSrc}
                                    width="100%"
                                    height="100%"
                                    className="w-full h-full"
                                    title={selectedVideo ? selectedVideo.title : movie.name}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    loading="lazy"
                                    frameBorder="0"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No playable source available.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Episode controls for YouTube movies */}
                {movie.source === "youtube" && Array.isArray(movie.videos) && movie.videos.length > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-lg font-semibold">{movie.name}</div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50"
                                    onClick={() => setCurrentEp((p) => Math.max(0, p - 1))}
                                    disabled={currentEp <= 0}
                                >
                                    Prev
                                </button>
                                <button
                                    className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50"
                                    onClick={() =>
                                        setCurrentEp((p) => Math.min((movie.videos?.length ?? 1) - 1, p + 1))
                                    }
                                    disabled={currentEp >= (movie.videos?.length ?? 1) - 1}
                                >
                                    Next
                                </button>
                                <a
                                    href={`https://www.youtube.com/watch?v=${selectedVideo?.youtubeId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1 bg-gray-800 rounded text-sm"
                                >
                                    Open on YouTube
                                </a>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            {movie.videos.map((v: any, i: number) => {
                                const thumb =
                                    v.thumbnails?.medium?.url ||
                                    v.thumbnails?.standard?.url ||
                                    v.thumbnails?.default?.url ||
                                    `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;
                                const isActive = i === currentEp;
                                return (
                                    <button
                                        key={v.youtubeId + i}
                                        onClick={() => setCurrentEp(i)}
                                        className={`flex flex-col items-start gap-2 p-2 rounded transition-all text-left ${
                                            isActive ? "ring-2 ring-cyan-400 bg-gray-800" : "bg-gray-900 hover:bg-gray-800"
                                        }`}
                                    >
                                        <img src={thumb} alt={v.title} className="w-full h-28 object-cover rounded" />
                                        <div className="text-sm font-medium line-clamp-2">{`S${v.season ?? 1}E${v.episode ?? i + 1} • ${v.title}`}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <BackToTopButton />
                <MovieReview />
            </div>

            <div className="mt-6">
                <Footer />
            </div>
        </div>
    );
};

export default MoviePlayer;