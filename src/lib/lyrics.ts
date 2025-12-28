import { appError } from './stores/error-store';
import { plainLyrics, syncedLyrics } from './stores/lyricsStore';
import * as lockr from 'lockr';
import { replaceSpecialChars } from './utils';
import { getAccentColor } from './player';
import { accentColor } from './stores/player-store';
import { requestCancellation } from './utils/request-cancellation';
import { retryWithBackoff, isNetworkError, isTimeoutError } from './utils/retry';

const LYRICS_CACHE_PREFIX = 'lyrics_';
const ACCENT_CACHE_PREFIX = 'offline_';
const ACCENT_CACHE_SUFFIX = 'accentColor';

// Get cache key for lyrics
const getLyricsCacheKey = (artist: string, title: string): string => {
	return `${LYRICS_CACHE_PREFIX}${artist}${title}`;
};

// Get cache key for accent color
const getAccentCacheKey = (artist: string, title: string): string => {
	return `${ACCENT_CACHE_PREFIX}${artist}${title}${ACCENT_CACHE_SUFFIX}`;
};

// Validate lyrics data
const isValidLyricsData = (data: unknown): boolean => {
	return (
		Array.isArray(data) &&
		data.length > 0 &&
		data[0] &&
		typeof data[0] === 'object' &&
		'syncedLyrics' in data[0]
	);
};

export const getLyrics = async (artist: string, title: string, retries = 3): Promise<string | null> => {
	const requestKey = 'getLyrics';
	const signal = requestCancellation.getSignal(requestKey);

	// Clear previous errors
	appError.clear();

	// Validate inputs
	if (!artist || !title) {
		const errorMsg = 'Artist and title are required to fetch lyrics';
		appError.setError(errorMsg, {
			severity: 'error',
			category: 'lyrics',
			recoverable: false
		});
		return null;
	}

	// Normalize inputs
	const normalizedArtist = artist.trim();
	const normalizedTitle = title.trim();

	if (!normalizedArtist || !normalizedTitle) {
		const errorMsg = 'Artist and title cannot be empty';
		appError.setError(errorMsg, {
			severity: 'error',
			category: 'lyrics',
			recoverable: false
		});
		return null;
	}

	// Try local storage first
	try {
		const cacheKey = getLyricsCacheKey(normalizedArtist, normalizedTitle);
		const accentCacheKey = getAccentCacheKey(normalizedArtist, normalizedTitle);
		const offlineLyrics = lockr.get(cacheKey);
		const offlineAccent = lockr.get(accentCacheKey);

		if (offlineLyrics && typeof offlineLyrics === 'string' && offlineLyrics.length > 0) {
			syncedLyrics.set(offlineLyrics);
			plainLyrics.set(offlineLyrics);
			if (offlineAccent && typeof offlineAccent === 'string') {
				accentColor.set(offlineAccent);
			}
			requestCancellation.cancel(requestKey);
			return offlineLyrics;
		}
	} catch (error) {
		console.error('Error reading from cache:', error);
		// Continue to fetch from API if cache read fails
	}

	// Fetch from API with retry logic
	try {
		const lyrics = await retryWithBackoff(
			async () => {
				if (signal.aborted) {
					throw new Error('Request cancelled');
				}

				const cleanArtist = replaceSpecialChars(normalizedArtist);
				const cleanTitle = replaceSpecialChars(normalizedTitle);

				const url = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(
					cleanArtist
				)}&track_name=${encodeURIComponent(cleanTitle)}`;

				const response = await fetch(url, { signal });

				if (!response.ok) {
					if (response.status === 404) {
						throw new Error(
							"Hmm... looks like this song is playing hide and seek with its lyrics! 🎭"
						);
					}
					if (response.status >= 500) {
						throw new Error(
							`Oops! Our lyrics finder is having a bit of trouble (HTTP ${response.status}). Let's try again! 🎵`
						);
					}
					throw new Error(
						`Failed to fetch lyrics: ${response.status} ${response.statusText}`
					);
				}

				const data = await response.json();

				if (!isValidLyricsData(data)) {
					throw new Error(
						"Hmm... looks like this song is playing hide and seek with its lyrics! 🎭"
					);
				}

				const synced = data[0].syncedLyrics;
				const plain = data[0].plainLyrics || synced;

				if (!synced || typeof synced !== 'string' || synced.trim().length === 0) {
					throw new Error(
						"Hmm... looks like this song is playing hide and seek with its lyrics! 🎭"
					);
				}

				return { synced, plain };
			},
			{
				maxRetries: retries,
				initialDelay: 1000,
				maxDelay: 5000,
				backoffMultiplier: 2,
				shouldRetry: (error) => {
					if (error instanceof Error && error.name === 'AbortError') {
						return false; // Don't retry cancelled requests
					}
					if (error instanceof Error && error.message.includes('cancelled')) {
						return false;
					}
					// Retry on network errors or timeouts
					return isNetworkError(error) || isTimeoutError(error);
				}
			}
		);

		// Set lyrics
		syncedLyrics.set(lyrics.synced);
		plainLyrics.set(lyrics.plain);

		// Cache lyrics
		try {
			const cacheKey = getLyricsCacheKey(normalizedArtist, normalizedTitle);
			lockr.set(cacheKey, lyrics.synced);

			// Cache accent color
			try {
				const accent = await getAccentColor();
				const accentCacheKey = getAccentCacheKey(normalizedArtist, normalizedTitle);
				lockr.set(accentCacheKey, accent);
			} catch (error) {
				console.error('Failed to cache accent color:', error);
				// Don't fail the whole operation if accent color caching fails
			}
		} catch (error) {
			console.error('Failed to cache lyrics:', error);
			// Don't fail the whole operation if caching fails
		}

		requestCancellation.cancel(requestKey);
		return lyrics.synced;
	} catch (error) {
		requestCancellation.cancel(requestKey);

		// Handle different error types
		let errorMessage = "Whoopsie! Our lyrics detector needs a coffee break. Try again in a moment! ☕";
		let severity: 'error' | 'warning' | 'info' = 'error';
		let recoverable = true;

		if (error instanceof Error) {
			if (error.name === 'AbortError' || error.message.includes('cancelled')) {
				// Request was cancelled, don't show error
				return null;
			}

			if (error.message.includes('hide and seek') || error.message.includes('404')) {
				errorMessage = "Hmm... looks like this song is playing hide and seek with its lyrics! 🎭";
				severity = 'info';
			} else if (error.message.includes('HTTP 5')) {
				errorMessage = "Oops! Our lyrics finder is having a bit of trouble. Let's try again! 🎵";
				severity = 'warning';
			} else {
				errorMessage = error.message || errorMessage;
			}
		}

		console.error('Error fetching lyrics:', error);

		appError.setError(errorMessage, {
			severity,
			category: 'lyrics',
			recoverable,
			retryable: isNetworkError(error) || isTimeoutError(error)
		});

		return null;
	}
};
