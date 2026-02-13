import { GenreProps } from "./genreTypes";

/* =========================
   Review Type
========================= */

export interface ReviewProps {
    _id: string;
    user: string;            // backend uses ref to User
    rating: number;
    comment: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

/* =========================
   YouTube Video Type
========================= */

export interface VideoProps {
    youtubeId: string;
    title: string;
    season?: number;
    episode?: number;
    duration?: number; // seconds
    publishedAt?: string;
    thumbnails?: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
        standard?: { url: string };
        maxres?: { url: string };
    };
    embeddable?: boolean;
    privacyStatus?: string; // public | private | unlisted
    regionRestriction?: {
        allowed?: string[];
        blocked?: string[];
    };
    createdAt?: string;
}

/* =========================
   Movie Type (Unified)
========================= */

export interface MovieProps {
    _id: string;
    name: string;

    // TMDB movies
    tmdbId?: number | null;

    detail?: string;
    year?: number;
    genre?: GenreProps[];

    rating?: number;
    numReviews?: number;

    image?: string;
    coverImage?: string;

    director?: string;
    cast?: string[];

    reviews?: ReviewProps[];

    source?: "tmdb" | "youtube" | "other";

    // 🔥 NEW: YouTube episodes
    videos?: VideoProps[];

    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

/* =========================
   Redux State
========================= */

export interface MovieState {
    moviesFilter: {
        searchTerm: string;
        selectedGenre: string;
        selectedYear: string;
        selectedSort: string;
    };
    filteredMovies: MovieProps[];
    movieYears: string[];
    uniqueYears: string[];
    currentPage: number;
    moviesPerPage: number;
    totalMovies: number;
}