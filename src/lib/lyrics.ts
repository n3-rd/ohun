
import { appError } from "./stores/error-store";
import { plainLyrics, syncedLyrics } from "./stores/lyricsStore";
import * as lockr from 'lockr'
import { replaceSpecialChars } from "./utils";

export const getLyrics = async (artist: string, title: string) => {
    // Reset appError at the start of the function
    appError.set(null);
    // artist = replaceSpecialChars(artist);
    // title = replaceSpecialChars(title);

    try {
        // Try to get lyrics from local storage first
        const offlineLyrics = lockr.get(`lyrics_${artist + title}`);
        if (offlineLyrics) {
            syncedLyrics.set(offlineLyrics);
            plainLyrics.set(offlineLyrics);
            return offlineLyrics;
        }

        const response = await fetch(
            `https://lrclib.net/api/search?artist_name=${artist}&track_name=${title}`
        );
        if (!response.ok) {
            appError.set('Error fetching lyrics');
            return;
        }
        const data = await response.json();
        if (!data || !data[0]) {
            appError.set('No lyrics found');
            return;
        }
        const lyrics = data[0].syncedLyrics;
        syncedLyrics.set(lyrics);
        plainLyrics.set(data[0].plainLyrics);

        // Save lyrics to local storage for offline use
        lockr.set(`lyrics_${artist + title}`, lyrics);

        if (lyrics == null) {
            appError.set('No lyrics found');
            return;
        }
        else {
            return lyrics;
        }

    } catch (error) {
        console.error('Error fetching lyrics:', error);
        appError.set('Error fetching lyrics');
        return 500;
    }
}