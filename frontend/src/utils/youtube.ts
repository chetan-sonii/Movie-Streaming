// src/utils/youtube.ts
export function youtubeThumbFallback(videoId: string, thumbnails?: any) {
    // Prefer saved thumbnails if present
    if (thumbnails) {
        // common choices: maxres, standard, high, medium, default
        return thumbnails.maxres?.url || thumbnails.standard?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    // fallback to img.youtube.com host (no quota)
    // try maxres first (may 404), then hqdefault
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}