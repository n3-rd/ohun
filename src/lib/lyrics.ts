import { appError } from './stores/error-store';
import { plainLyrics, syncedLyrics, lyricsLoading } from './stores/lyricsStore';
import * as lockr from 'lockr';
import { replaceSpecialChars } from './utils';
import { getAccentColor } from './player';
import { accentColor } from './stores/player-store';

export const getLyrics = async (artist: string, title: string, retries = 3) => {
	appError.set(null);
	lyricsLoading.set(true);
	
	for (let i = 0; i < retries; i++) {
		try {
			// Try local storage first
			const offlineLyrics = lockr.get(`lyrics_${artist + title}`);
			const offlineAccent = lockr.get(`offline_${artist + title}accentColor`);

			if (offlineLyrics) {
				syncedLyrics.set(offlineLyrics);
				plainLyrics.set(offlineLyrics);
				accentColor.set(offlineAccent);
				lyricsLoading.set(false);
				return offlineLyrics;
			}

			const response = await fetch(
				`https://lrclib.net/api/search?artist_name=${artist}&track_name=${title}`
			);
			
			if (!response.ok) {
				throw new Error(`Oops! Our lyrics finder is having a bit of trouble (HTTP ${response.status}). Let's try again! 🎵`);
			}
			
			const data = await response.json();
			if (!data || !data[0]) {
				throw new Error("Hmm... looks like this song is playing hide and seek with its lyrics! ");
			}

			const lyrics = data[0].syncedLyrics;
			syncedLyrics.set(lyrics);
			plainLyrics.set(data[0].plainLyrics);

			// Cache lyrics
			lockr.set(`lyrics_${artist + title}`, lyrics);
			let lockerAccent = await getAccentColor();
			lockr.set(`offline_${artist + title}accentColor`, lockerAccent);

			lyricsLoading.set(false);
			return lyrics;

		} catch (error) {
			if (i === retries - 1) {
				console.error('Error fetching lyrics:', error);
				appError.set(error.message || "Whoopsie! Our lyrics detector needs a coffee break. Try again in a moment! ☕");
				lyricsLoading.set(false);
				return null;
			}
			// Wait before retrying
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}
};
