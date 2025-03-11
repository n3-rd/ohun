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
import { replaceSpecialChars } from './utils';
import { isLoading } from './stores/player-store';
import { appError } from './stores/error-store';
import { get } from 'svelte/store';

let previousTime: number | null = null;

export const getCurrentPlaying = async () => {
	try {
		isLoading.set(true);
		appError.set(null); // Clear any previous errors
		
		const response: Song = await invoke('get_current_playing_song');
		currentPlayingSong.set(response);
		
		if (!response.artist || !response.title) {
			throw new Error('🎵 Hmm... this song seems a bit shy - we need both an artist and title to find its lyrics! 🎸');
		}
		
		await Promise.all([
			getLyrics(response.artist, response.title),
			getPlayTime(),
			getAlbumArt(
				response.artist || '', 
				response.title || '', 
				response.album || ''
			)
		]);
		
	} catch (error) {
		console.error('Error getting current song:', error);
		// Set a default accent color if none exists to prevent white screen
		if (!get(accentColor)) {
			accentColor.set('#121212');
			textColor.set('#ffffff');
		}
		appError.set(error instanceof Error ? error.message : "🎼 Oops! The music spirits are being mischievous. Let's try that again! 🎹");
	} finally {
		isLoading.set(false);
	}
};

export const getPlayTime = async () => {
	try {
		let response: number = await invoke('get_current_audio_time');
		response = Math.floor(response);
		if (previousTime !== response) {
			playTime.set(response);
			previousTime = response;
			updateLyrics(response);
		}
		return response;
	} catch (error) {
		console.error('Error getting play time:', error);
		// Don't set appError here to avoid disrupting the UI for minor errors
		return previousTime || 0;
	}
};

const checkSongChange = async () => {
	let currentSong: Song | null = null;
	let previousSong: Song | null = null;
	let activePlayer: string | null = null;
	let retryCount = 0;
	const MAX_RETRIES = 3;

	// Get the active player initially
	try {
		const response = await invoke<string>('get_active_player');
		activePlayer = response;
		console.log('Active player detected:', activePlayer);
	} catch (error) {
		console.error('Failed to get active player:', error);
		// Set a fallback error message but don't stop execution
		if (retryCount >= MAX_RETRIES) {
			appError.set('No media player detected. Please start playing music in your favorite player.');
		}
	}

	setInterval(async () => {
		try {
			// Update active player periodically
			const newActivePlayer = await invoke<string>('get_active_player');
			if (newActivePlayer !== activePlayer) {
				console.log('Active player changed from', activePlayer, 'to', newActivePlayer);
				activePlayer = newActivePlayer;
				// Reset error state if we successfully found a player
				appError.set(null);
			}
			
			const song = await invoke<Song>('get_current_playing_song');

			if (currentSong && song.title !== currentSong.title) {
				previousSong = currentSong;
			}

			currentSong = song;

			if (previousSong && currentSong.title !== previousSong.title) {
				// Song has changed
				await getCurrentPlaying();
				
				// Update previousSong after handling the song change
				previousSong = currentSong;
			}
			
			// Reset retry count on success
			retryCount = 0;
		} catch (error) {
			console.error('Error in checkSongChange:', error);
			retryCount++;
			
			// Only set error after multiple failures to avoid flickering
			if (retryCount >= MAX_RETRIES) {
				// Set a default accent color if none exists
				if (!get(accentColor)) {
					accentColor.set('#121212');
					textColor.set('#ffffff');
				}
				
				appError.set('Unable to detect music. Is your media player running?');
			}
		}
	}, 1000); // Check every second
};

// Add a function to initialize the app with retries
const initializeApp = async (retries = 3, delay = 1000) => {
	// Set default colors immediately to prevent white screen
	if (!get(accentColor)) {
		accentColor.set('#121212');
		textColor.set('#ffffff');
	}
	
	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			await getCurrentPlaying();
			// If successful, break out of the retry loop
			console.log('App initialized successfully');
			return;
		} catch (error) {
			console.error(`Initialization attempt ${attempt + 1} failed:`, error);
			
			if (attempt < retries - 1) {
				// Wait before trying again
				await new Promise(resolve => setTimeout(resolve, delay));
			} else {
				// Last attempt failed, set a friendly error message
				appError.set('Unable to connect to your music player. Please make sure music is playing and try again.');
			}
		}
	}
};

// Replace the existing initialization code with our new retry mechanism
checkSongChange().then(() => {
	initializeApp().then(() => {
		setInterval(getPlayTime, 1000);
	});
});

const updateLyrics = (time: number) => {
	try {
		const lyrics = get(syncedLyrics);
		
		if (!lyrics) return;
		
		const sync = new Lyrics(lyrics);
		const current = sync.atTime(time);
		
		if (current) {
			currentLine.set(current);
			
			// Also try to predict the next line for smoother transitions
			const nextTimeIndex = lyrics.split('\n')
				.map(line => {
					const match = line.match(/\[(.*?)\]/);
					if (!match) return 0;
					
					const timeStr = match[1].trim();
					const [minutes, seconds] = timeStr.split(':').map(Number);
					return minutes * 60 + seconds;
				})
				.findIndex(lineTime => lineTime > time);
				
			if (nextTimeIndex > 0) {
				// We found a future timestamp, which means we can prepare for it
				// This helps the UI prepare for the next line
				const nextLines = lyrics.split('\n');
				if (nextLines[nextTimeIndex]) {
					const nextLineText = nextLines[nextTimeIndex].replace(/\[.*?\]/, '').trim();
					if (nextLineText) {
						nextLine.set(nextLineText);
					}
				}
			}
		}
	} catch (error) {
		console.error('Error updating lyrics:', error);
		// Don't set appError here to avoid disrupting the UI for minor errors
	}
};

export const getAlbumArt = async (
	artist: string,
	title: string,
	album: string
): Promise<string | undefined> => {
	// Set a default album art if we don't have one yet
	if (!get(albumArt)) {
		const defaultArt = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxMjEyMTIiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjUwIiBmaWxsPSIjMzMzIi8+PHBhdGggZD0iTTgwIDEyNVYxMDBMMTMwIDExMlY4NyIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48L3N2Zz4=';
		albumArt.set(defaultArt);
		await getAccentColor();
	}

	// Create cache key
	const cacheKey = `${artist}-${title}-${album}`.toLowerCase();
	
	// Check cache first
	const cache = get(cachedAlbumArt);
	const cached = cache[cacheKey];
	
	if (cached) {
		albumArt.set(cached);
		await getAccentColor();
		return cached;
	}

	// If not in cache, fetch from API
	try {
		let url;
		if (!album || album !== title) {
			artist = replaceSpecialChars(artist);
			title = replaceSpecialChars(title);
			url = `https://corsproxy.io/?${encodeURIComponent(
				`https://api.deezer.com/search?q=artist:"${artist}" track:"${title}"`
			)}`;
		} else {
			album = replaceSpecialChars(album);
			artist = replaceSpecialChars(artist);
			url = `https://corsproxy.io/?${encodeURIComponent(
				`https://api.deezer.com/search?q=album:"${album}" artist:"${artist}"`
			)}`;
		}

		const response = await fetch(url);
		const data = await response.json();
		const art = data?.data?.[0]?.album?.cover_medium;

		if (art) {
			// Cache the image data as base64
			try {
				const imgResponse = await fetch(art);
				const blob = await imgResponse.blob();
				const reader = new FileReader();
				
				const base64Promise = new Promise<string>((resolve) => {
					reader.onloadend = () => resolve(reader.result as string);
				});
				
				reader.readAsDataURL(blob);
				const base64Data = await base64Promise;

				// Update cache
				cachedAlbumArt.update(cache => ({
					...cache,
					[cacheKey]: base64Data
				}));

				albumArt.set(base64Data);
			} catch (error) {
				console.error('Failed to cache album art:', error);
				albumArt.set(art); // Fallback to URL if caching fails
			}
		}

		await getAccentColor();
		return art;
	} catch (error) {
		console.error('Failed to fetch album art:', error);
		// Don't set appError here to avoid disrupting the UI for minor errors
		return get(albumArt); // Return current album art
	}
};

export const getAccentColor = async () => {
	try {
		const url = get(albumArt);
		
		if (!url) {
			// Default dark theme
			accentColor.set('#121212');
			textColor.set('#ffffff');
			return '#121212';
		}
		
		const color = await prominent(url, { amount: 1, format: 'hex' });
		
		// Make sure we have a valid color
		let finalColor = '#121212'; // Default fallback
		
		if (color && Array.isArray(color) && color.length > 0) {
			if (typeof color[0] === 'string') {
				finalColor = color[0];
			} else if (color[0] && typeof color[0] === 'object') {
				// Handle RGB object format
				finalColor = '#121212'; // Fallback if we can't parse
			}
		}
		
		accentColor.set(finalColor);
		const fontColor = getTextColor(finalColor);
		textColor.set(fontColor);
		
		return finalColor;
	} catch (error) {
		console.error('Error getting accent color:', error);
		// Set default values
		accentColor.set('#121212');
		textColor.set('#ffffff');
		return '#121212';
	}
};

export const goToTime = async (time: number) => {
	await invoke('go_to_time', { time });
};

export const downloadLyrics = async () => {
	// download lyrics to lrc file
	const playInfo = get(currentPlayingSong);
	
	if (!playInfo) {
		console.error('No song is currently playing');
		return;
	}
	
	const artist = playInfo.artist;
	const title = playInfo.title;
	
	try {
		const response = await fetch(
			`https://lrclib.net/api/search?artist_name=${artist}&track_name=${title}`
		);
		if (!response.ok) {
			throw new Error('Failed to fetch lyrics');
		}

		const res = response.json();
		res.then((data) => {
			const lyrics = data[0].syncedLyrics;
			const blob = new Blob([lyrics], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${artist} - ${title}.lrc`;
			a.click();
			URL.revokeObjectURL(url);
		});
	} catch (error) {
		console.error('Failed to download lyrics:', error);
	}
};
