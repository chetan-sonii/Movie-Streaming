// src/features/movies/MoviePlayer.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import BackToTopButton from "../../components/BackToTopButton";
import MovieReview from "./MovieReview";
import { useGetMovieByIdQuery } from "../../redux/api/movies";
import Footer from "../../components/Footer";
import { PLAYER_OPTION, PLAYER_URL } from "../../redux/constants";

const YT_EMBED_BASE = "https://www.youtube-nocookie.com/embed";

type Thumbs = {
    default?: { url?: string };
    medium?: { url?: string };
    standard?: { url?: string };
    high?: { url?: string };
};

type Video = {
    title?: string;
    youtubeId?: string; // playlist id or 11-char video id
    season?: number;
    episode?: number;
    duration?: number;
    publishedAt?: string | Date;
    thumbnails?: Thumbs;
    embeddable?: boolean;
    createdAt?: string | Date;
};

type Movie = {
    _id?: string;
    name?: string;
    source?: "youtube" | "tmdb" | "other";
    videos?: Video[];
    tmdbId?: number;
};

const isYoutubeVideoId = (id: string | undefined | null) =>
    !!id && id.length === 11 && /^[A-Za-z0-9_-]{11}$/.test(id);

const buildYoutubeVideoUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
const buildYoutubePlaylistUrl = (listId: string) =>
    `https://www.youtube.com/playlist?list=${listId}`;

const buildEmbedSrcForVideo = (videoId: string) =>
    `${YT_EMBED_BASE}/${videoId}?rel=0&modestbranding=1&iv_load_policy=3`;

const buildEmbedSrcForPlaylist = (playlistId: string) =>
    `${YT_EMBED_BASE}?listType=playlist&list=${playlistId}&rel=0&modestbranding=1&iv_load_policy=3`;

const fallbackThumb = (youtubeId: string) => `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const MoviePlayer: React.FC = () => {
    const { id: movieId } = useParams<{ id: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: movie, isLoading, isError } = useGetMovieByIdQuery(movieId as string);
    const epParam = searchParams.get("ep");
    const [currentEp, setCurrentEp] = useState<number>(() => (epParam ? Number(epParam) : 0));

    useEffect(() => {
        if (!movie) return;
        const rawIdx = epParam ? Number(epParam) : 0;
        const maxIndex = Math.max(0, (movie.videos?.length ?? 1) - 1);
        const validIdx = Number.isFinite(rawIdx) ? clamp(rawIdx, 0, maxIndex) : 0;
        setCurrentEp(validIdx);
    }, [movie, epParam]);

    useEffect(() => {
        if (!movie) return;
        const current = String(currentEp);
        if (searchParams.get("ep") === current) return;
        const next = new URLSearchParams(searchParams);
        next.set("ep", current);
        setSearchParams(next);
        // don't include setSearchParams/searchParams in deps loop intentionally to avoid infinite loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentEp, movie]);

    const selectedEffectiveIndex = useMemo(() => {
        if (!movie?.videos || movie.videos.length === 0) return -1;
        const req = clamp(currentEp, 0, movie.videos.length - 1);
        const reqVideo = movie.videos[req];
        if (reqVideo && (reqVideo.embeddable ?? true)) return req;
        // fallback: first embeddable video
        const firstEmb = movie.videos.findIndex((v) => v.embeddable ?? true);
        return firstEmb !== -1 ? firstEmb : req;
    }, [movie, currentEp]);

    const selectedEffectiveVideo = useMemo<Video | null>(() => {
        if (!movie?.videos || movie.videos.length === 0) return null;
        if (selectedEffectiveIndex < 0) return null;
        return movie.videos[selectedEffectiveIndex] ?? null;
    }, [movie, selectedEffectiveIndex]);

    const embedSrc = useMemo(() => {
        if (selectedEffectiveVideo && selectedEffectiveVideo.youtubeId) {
            const id = String(selectedEffectiveVideo.youtubeId);
            if (isYoutubeVideoId(id)) return buildEmbedSrcForVideo(id);
            return buildEmbedSrcForPlaylist(id);
        }
        if (movie?.tmdbId) {
            return `${PLAYER_URL}/${movie.tmdbId}?${PLAYER_OPTION}`;
        }
        return "";
    }, [selectedEffectiveVideo, movie]);

    const isEmbeddable = useMemo(() => {
        if (!selectedEffectiveVideo) return false;
        return selectedEffectiveVideo.embeddable ?? true;
    }, [selectedEffectiveVideo]);

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
                            {embedSrc && isEmbeddable ? (
                                <iframe
                                    key={embedSrc}
                                    src={embedSrc}
                                    width="100%"
                                    height="100%"
                                    className="w-full h-full"
                                    title={selectedEffectiveVideo ? selectedEffectiveVideo.title : movie.name}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    loading="lazy"
                                />
                            ) : embedSrc && !isEmbeddable ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
                                    <p className="text-gray-300 mb-2">
                                        This video is not embeddable here (members-only or region-restricted).
                                    </p>
                                    {isYoutubeVideoId(String(selectedEffectiveVideo?.youtubeId)) ? (
                                        <a
                                            className="text-sm text-blue-400 underline"
                                            href={buildYoutubeVideoUrl(String(selectedEffectiveVideo?.youtubeId))}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open on YouTube
                                        </a>
                                    ) : selectedEffectiveVideo?.youtubeId ? (
                                        <a
                                            className="text-sm text-blue-400 underline"
                                            href={buildYoutubePlaylistUrl(String(selectedEffectiveVideo.youtubeId))}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open playlist on YouTube
                                        </a>
                                    ) : (
                                        <div className="text-sm text-gray-500">No external link available.</div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    No playable source available.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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
                                    onClick={() => setCurrentEp((p) => Math.min((movie.videos?.length ?? 1) - 1, p + 1))}
                                    disabled={currentEp >= (movie.videos?.length ?? 1) - 1}
                                >
                                    Next
                                </button>
                                <a
                                    href={
                                        isYoutubeVideoId(String(selectedEffectiveVideo?.youtubeId))
                                            ? buildYoutubeVideoUrl(String(selectedEffectiveVideo?.youtubeId))
                                            : selectedEffectiveVideo?.youtubeId
                                                ? buildYoutubePlaylistUrl(String(selectedEffectiveVideo.youtubeId))
                                                : "#"
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1 bg-gray-800 rounded text-sm"
                                >
                                    Open on YouTube
                                </a>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            {movie.videos.map((v: Video, i: number) => {
                                const youtubeId = v.youtubeId ? String(v.youtubeId) : "";
                                const thumb =
                                    v.thumbnails?.medium?.url ||
                                    v.thumbnails?.standard?.url ||
                                    v.thumbnails?.default?.url ||
                                    (isYoutubeVideoId(youtubeId) ? fallbackThumb(youtubeId) : "/fallback.jpg");

                                const isActive = i === currentEp;
                                const emb = v.embeddable ?? true;

                                return (
                                    <button
                                        key={(v.youtubeId ?? "") + "-" + i}
                                        onClick={() => setCurrentEp(i)}
                                        className={`flex flex-col items-start gap-2 p-2 rounded transition-all text-left ${
                                            isActive ? "ring-2 ring-cyan-400 bg-gray-800" : "bg-gray-900 hover:bg-gray-800"
                                        }`}
                                        title={v.title}
                                    >
                                        <img
                                            src={thumb}
                                            alt={v.title}
                                            className={`w-full h-28 object-cover rounded ${!emb ? "opacity-60" : ""}`}
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).src = "/fallback.jpg";
                                            }}
                                        />
                                        <div className="text-sm font-medium line-clamp-2">
                                            {`S${v.season ?? 1}E${v.episode ?? i + 1} • ${v.title ?? ""}`}
                                        </div>
                                        {!emb && <div className="text-xs text-yellow-300">Not embeddable</div>}
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