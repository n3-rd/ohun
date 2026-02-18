import { invoke } from '@tauri-apps/api/core';
import {
	accentColor,
	albumArt,
	currentPlayingSong,
	playTime,
	textColor,
	cachedAlbumArt
} from './stores/player-store';
import type { Song } from './types';
import { getLyrics } from './lyrics';
import { currentLine, syncedLyrics, nextLine } from './stores/lyricsStore';
import { Lyrics } from 'paroles';
import { prominent } from 'color.js';
import { getTextColor } from './ui';
import { replaceSpecialChars, debounce } from './utils';
import { isLoading } from './stores/player-store';
import { appError } from './stores/error-store';
import { requestCancellation } from './utils/request-cancellation';
import { retryWithBackoff, isNetworkError, isTimeoutError } from './utils/retry';

export const PROXY_ENABLED = false;
import { get, writable } from 'svelte/store';

let previousTime: number | null = null;
let songChangeInterval: ReturnType<typeof setInterval> | null = null;
let playTimeInterval: ReturnType<typeof setInterval> | null = null;
let currentSongKey = '';

export const availablePlayers = writable<string[]>([]);
export const activePlayer = writable<string>('');

export const getAvailablePlayers = async (): Promise<void> => {
	try {
		const players = await invoke<string[]>('get_available_players');
		availablePlayers.set(players);
	} catch (error) {
		console.error('Failed to get available players:', error);
	}
};

export const setActivePlayer = async (player: string): Promise<void> => {
	try {
		await invoke('set_active_player', { player });
		activePlayer.set(player);
		// Immediately refresh state
		await getCurrentPlaying();
	} catch (error) {
		console.error('Failed to set active player:', error);
	}
};

export const getActivePlayer = async (): Promise<void> => {
	try {
		const player = await invoke<string>('get_active_player');
		activePlayer.set(player);
	} catch (error) {
		console.error('Failed to get active player:', error);
	}
};

// Ensure default colors are set
const ensureDefaultColors = () => {
	if (!get(accentColor)) {
		accentColor.set('#121212');
		textColor.set('#ffffff');
	}
};

// Generate a unique key for a song
const getSongKey = (song: Song): string => {
	return `${song.artist || ''}-${song.title || ''}-${song.album || ''}`.toLowerCase();
};

export const getCurrentPlaying = async (): Promise<void> => {
	const requestKey = 'getCurrentPlaying';
	const signal = requestCancellation.getSignal(requestKey);

	try {
		isLoading.set(true);
		appError.clear();
		ensureDefaultColors();

		// Fetch current song with retry logic
		const response: Song = await retryWithBackoff(
			async () => {
				if (signal.aborted) throw new Error('Request cancelled');
				return await invoke<Song>('get_current_playing_song');
			},
			{
				maxRetries: 2,
				initialDelay: 500,
				shouldRetry: (error) => {
					const errorMessage = error instanceof Error ? error.message : String(error);
					return !errorMessage.includes('cancelled') && !errorMessage.includes('No media');
				}
			}
		);

		// Validate response
		if (!response || (!response.artist && !response.title)) {
			throw new Error(
				'Missing song metadata — artist and title are required'
			);
		}

		if (!response.artist || !response.title) {
			throw new Error('Incomplete song info. Make sure your media player exposes artist and title.');
		}

		currentPlayingSong.set(response);
		currentSongKey = getSongKey(response);

		// Cancel any previous album art or lyrics requests
		requestCancellation.cancel('getAlbumArt');
		requestCancellation.cancel('getLyrics');

		// Fetch lyrics and album art in parallel, but handle errors independently
		const promises = [
			getLyrics(response.artist, response.title).catch((error) => {
				console.error('Failed to fetch lyrics:', error);
				// Don't throw - allow album art to still load
			}),
			getPlayTime().catch((error) => {
				console.error('Failed to get play time:', error);
				// Don't throw - this is not critical
			}),
			getAlbumArt(response.artist, response.title, response.album || '').catch((error) => {
				console.error('Failed to fetch album art:', error);
				// Don't throw - use default art
			})
		];

		await Promise.allSettled(promises);
	} catch (error) {
		console.error('Error getting current song:', error);

		ensureDefaultColors();

		const errorMessage =
			error instanceof Error ? error.message : 'Something went wrong. Try again.';

		appError.setError(errorMessage, {
			severity: 'error',
			category: 'player',
			recoverable: true,
			retryable: true
		});
	} finally {
		isLoading.set(false);
		requestCancellation.cancel(requestKey);
	}
};

export const getPlayTime = async (): Promise<number> => {
	try {
		const response: number = await invoke('get_current_audio_time');
		const flooredTime = Math.floor(response);

		if (previousTime !== flooredTime && flooredTime >= 0) {
			playTime.set(flooredTime);
			previousTime = flooredTime;
			updateLyrics(flooredTime);
		}

		return flooredTime;
	} catch (error) {
		console.error('Error getting play time:', error);
		// Return previous time or 0, don't disrupt UI for minor errors
		return previousTime ?? 0;
	}
};

// Debounced song change checker to avoid rapid updates
const debouncedSongChange = debounce(async (song: Song) => {
	if (getSongKey(song) !== currentSongKey) {
		await getCurrentPlaying();
	}
}, 500);

const checkSongChange = (): void => {
	let currentSong: Song | null = null;
	let previousSong: Song | null = null;
	let activePlayer: string | null = null;
	let consecutiveErrors = 0;
	const MAX_CONSECUTIVE_ERRORS = 5;
	const CHECK_INTERVAL = 2000; // Check every 2 seconds instead of 1

	// Get the active player initially
	const initializePlayer = async () => {
		try {
			const response = await invoke<string>('get_active_player');
			activePlayer = response;
			console.log('Active player detected:', activePlayer);
			consecutiveErrors = 0;
		} catch (error) {
			console.error('Failed to get active player:', error);
			consecutiveErrors++;
		}
	};

	initializePlayer();

	songChangeInterval = setInterval(async () => {
		try {
			// Update active player periodically (less frequently)
			if (Math.random() < 0.1) {
				await getAvailablePlayers();
				await getActivePlayer();
				// Only check 10% of the time to reduce load
				try {
					const newActivePlayer = await invoke<string>('get_active_player');
					// if (newActivePlayer !== activePlayer) {
					// 	console.log('Active player changed from', activePlayer, 'to', newActivePlayer);
					// 	activePlayer = newActivePlayer;
					// 	appError.clear();
					// }
				} catch (error) {
					// Silently fail - not critical
					console.debug('Failed to update active player:', error);
				}
			}

			const song = await invoke<Song>('get_current_playing_song');

			// Validate song data
			if (!song || (!song.artist && !song.title)) {
				consecutiveErrors++;
				if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
					appError.setError('Unable to detect music. Is your media player running?', {
						severity: 'warning',
						category: 'player',
						recoverable: true
					});
				}
				return;
			}

			// Check if song changed
			if (currentSong) {
				const currentKey = getSongKey(song);
				const previousKey = getSongKey(currentSong);

				if (currentKey !== previousKey && currentKey !== '') {
					previousSong = currentSong;
					// Use debounced function to avoid rapid updates
					debouncedSongChange(song);
				}
			}

			currentSong = song;
			consecutiveErrors = 0; // Reset on success
		} catch (error) {
			console.error('Error in checkSongChange:', error);
			consecutiveErrors++;

			if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
				ensureDefaultColors();
				appError.setError('Unable to detect music. Is your media player running?', {
					severity: 'warning',
					category: 'player',
					recoverable: true,
					retryable: true
				});
			}
		}
	}, CHECK_INTERVAL) as unknown as ReturnType<typeof setInterval>;
};

// Initialize app with retry logic
const initializeApp = async (retries = 3, delay = 1000): Promise<void> => {
	ensureDefaultColors();

	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			await getCurrentPlaying();
			console.log('App initialized successfully');
			return;
		} catch (error) {
			console.error(`Initialization attempt ${attempt + 1} failed:`, error);

			if (attempt < retries - 1) {
				await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1))); // Exponential backoff
			} else {
				appError.setError(
					'Unable to connect to your music player. Please make sure music is playing and try again.',
					{
						severity: 'error',
						category: 'player',
						recoverable: true,
						retryable: true
					}
				);
			}
		}
	}
};

// Start the app
const startApp = async () => {
	try {
		checkSongChange();
		await initializeApp();
		playTimeInterval = setInterval(() => {
			getPlayTime().catch((error) => {
				console.debug('Play time update failed:', error);
			});
		}, 1000) as unknown as ReturnType<typeof setInterval>;
	} catch (error) {
		console.error('Failed to start app:', error);
	}
};

startApp();

// Cleanup function (can be called on app close)
export const cleanup = (): void => {
	if (songChangeInterval) {
		clearInterval(songChangeInterval);
		songChangeInterval = null;
	}
	if (playTimeInterval) {
		clearInterval(playTimeInterval);
		playTimeInterval = null;
	}
	requestCancellation.cancelAll();
};

/** Lead time in seconds so lyrics scroll/highlight slightly before the beat (better sync feel). */
const LYRICS_LEAD_SECONDS = 0.5;

const updateLyrics = (time: number): void => {
	try {
		const lyrics = get(syncedLyrics);

		if (!lyrics || time < 0) return;

		const sync = new Lyrics(lyrics);
		const ledTime = time + LYRICS_LEAD_SECONDS;
		const current = sync.atTime(ledTime);

		if (current) {
			currentLine.set(current);

			// Predict next line for smoother transitions
			try {
				const lyricsLines = lyrics.split('\n');
				const nextTimeIndex = lyricsLines.findIndex((line) => {
					const match = line.match(/\[(.*?)\]/);
					if (!match) return false;

					const timeStr = match[1].trim();
					const timeParts = timeStr.split(':');
					if (timeParts.length !== 2) return false;

					const [minutes, seconds] = timeParts.map(Number);
					if (isNaN(minutes) || isNaN(seconds)) return false;

					const lineTime = minutes * 60 + seconds;
					return lineTime > ledTime;
				});

				if (nextTimeIndex > 0 && nextTimeIndex < lyricsLines.length) {
					const nextLineText = lyricsLines[nextTimeIndex].replace(/\[.*?\]/, '').trim();
					if (nextLineText) {
						nextLine.set(nextLineText);
					}
				}
			} catch (error) {
				// Silently fail - next line prediction is not critical
				console.debug('Failed to predict next line:', error);
			}
		}
	} catch (error) {
		console.error('Error updating lyrics:', error);
		// Don't set appError - lyrics update failures shouldn't disrupt the UI
	}
};

export const getAlbumArt = async (
	artist: string,
	title: string,
	album: string
): Promise<string | undefined> => {
	const requestKey = 'getAlbumArt';
	const signal = requestCancellation.getSignal(requestKey);

	// Set default album art if we don't have one
	if (!get(albumArt)) {
		const defaultArt =
			'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxMjEyMTIiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjUwIiBmaWxsPSIjMzMzIi8+PHBhdGggZD0iTTgwIDEyNVYxMDBMMTMwIDExMlY4NyIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48L3N2Zz4=';
		albumArt.set(defaultArt);
		await getAccentColor();
	}

	// Create cache key
	const cacheKey = `${artist}-${title}-${album}`.toLowerCase().trim();

	// Check cache first
	const cache = get(cachedAlbumArt);
	const cached = cache[cacheKey];

	if (cached) {
		albumArt.set(cached);
		await getAccentColor();
		requestCancellation.cancel(requestKey);
		return cached;
	}

	// If not in cache, fetch from API
	try {
		if (signal.aborted) {
			requestCancellation.cancel(requestKey);
			return get(albumArt);
		}

		const targetUrl =
			!album || album !== title
				? `https://api.deezer.com/search?q=artist:"${replaceSpecialChars(artist)}" track:"${replaceSpecialChars(title)}"`
				: `https://api.deezer.com/search?q=album:"${replaceSpecialChars(album)}" artist:"${replaceSpecialChars(artist)}"`;

		let data: { data?: Array<{ album?: { cover_medium?: string } }> };
		if (PROXY_ENABLED) {
			const res = await fetch(targetUrl, { signal });
			if (!res.ok) throw new Error(`Failed to fetch album art: ${res.status}`);
			data = await res.json();
		} else {
			const raw = await invoke<string>('fetch_url', { url: targetUrl });
			data = JSON.parse(raw);
		}

		const art = data?.data?.[0]?.album?.cover_medium;

		if (art && !signal.aborted) {
			try {
				let base64Data: string;
				if (PROXY_ENABLED) {
					const imgResponse = await fetch(art, { signal });
					if (!imgResponse.ok) throw new Error('Failed to fetch image');
					const blob = await imgResponse.blob();
					base64Data = await new Promise<string>((resolve, reject) => {
						const reader = new FileReader();
						reader.onloadend = () =>
							reader.result ? resolve(reader.result as string) : reject(new Error('Failed'));
						reader.onerror = () => reject(new Error('Failed'));
						reader.readAsDataURL(blob);
					});
				} else {
					base64Data = await invoke<string>('fetch_image_base64', { url: art });
				}

				if (!signal.aborted) {
					cachedAlbumArt.update((cache) => ({
						...cache,
						[cacheKey]: base64Data
					}));
					albumArt.set(base64Data);
				}
			} catch (error) {
				console.error('Failed to cache album art:', error);
				if (!signal.aborted) {
					albumArt.set(art);
				}
			}
		}

		await getAccentColor();
		requestCancellation.cancel(requestKey);
		return art;
	} catch (error) {
		requestCancellation.cancel(requestKey);

		if (error instanceof Error && error.name === 'AbortError') {
			// Request was cancelled, return current art
			return get(albumArt);
		}

		console.error('Failed to fetch album art:', error);
		// Return current album art or undefined
		return get(albumArt);
	}
};

export const getAccentColor = async (): Promise<string> => {
	try {
		const url = get(albumArt);

		if (!url) {
			ensureDefaultColors();
			return '#121212';
		}

		const color = await prominent(url, { amount: 1, format: 'hex' }).catch((error) => {
			console.error('Failed to get accent color:', error);
			return '#121212';
		});

		const hexColor = color.toString();
		accentColor.set(hexColor);
		const fontColor = getTextColor(hexColor);
		textColor.set(fontColor);

		return hexColor;
	} catch (error) {
		console.error('Error getting accent color:', error);
		ensureDefaultColors();
		return '#121212';
	}
};

export const goToTime = async (time: number): Promise<void> => {
	try {
		if (time < 0) {
			throw new Error('Invalid time: cannot be negative');
		}
		await invoke('go_to_time', { time });
	} catch (error) {
		console.error('Error going to time:', error);
		appError.setError('Failed to seek to time. Please try again.', {
			severity: 'warning',
			category: 'player',
			recoverable: true
		});
	}
};

export const downloadLyrics = async (): Promise<void> => {
	const playInfo = get(currentPlayingSong);

	if (!playInfo || !playInfo.artist || !playInfo.title) {
		appError.setError('No song is currently playing', {
			severity: 'info',
			category: 'general',
			recoverable: false
		});
		return;
	}

	const { artist, title } = playInfo;

	try {
		const response = await fetch(
			`https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch lyrics: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		if (!data || !Array.isArray(data) || !data[0] || !data[0].syncedLyrics) {
			throw new Error('No lyrics found for download');
		}

		const lyrics = data[0].syncedLyrics;
		const blob = new Blob([lyrics], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${artist} - ${title}.lrc`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Failed to download lyrics:', error);
		appError.setError('Failed to download lyrics. Please try again.', {
			severity: 'warning',
			category: 'lyrics',
			recoverable: true
		});
	}
};


