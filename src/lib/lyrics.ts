import { plainLyrics, syncedLyrics } from "./stores/lyricsStore";

export const getLyrics = async (artist: string, title: string) => {
    try {
        const response = await fetch(
            `https://lrclib.net/api/search?artist_name=${artist}&track_name=${title}`
        );
        if (!response.ok) {
            console.log('Failed to fetch lyrics');
            return 503;
        }
        const data = await response.json();
        if (!data || !data[0]) {
            console.log('No data returned from the API');
            return 404;
        }
        const lyrics = data[0].syncedLyrics;
        syncedLyrics.set(lyrics);
        plainLyrics.set(data[0].plainLyrics);

        if (lyrics == null) {
            return 404;
        }
        else {
            return lyrics;
        }

    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return 500;
    }
}
