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
		appError.set(error instanceof Error ? error.message : "🎼 Oops! The music spirits are being mischievous. Let's try that again! 🎹");
	} finally {
		isLoading.set(false);
	}
};

export const getPlayTime = async () => {
	let response: number = await invoke('get_current_audio_time');
	response = Math.floor(response);
	if (previousTime !== response) {
		playTime.set(response);
		previousTime = response;
		updateLyrics(response);
	}
	return response;
};

const checkSongChange = async () => {
	let currentSong: Song | null = null;
	let previousSong: Song | null = null;
	let activePlayer: string | null = null;

	// Get the active player initially
	try {
		const response = await invoke<string>('get_active_player');
		activePlayer = response;
		console.log('Active player detected:', activePlayer);
	} catch (error) {
		console.error('Failed to get active player:', error);
	}

	setInterval(async () => {
		try {
			// Update active player periodically
			const newActivePlayer = await invoke<string>('get_active_player');
			if (newActivePlayer !== activePlayer) {
				console.log('Active player changed from', activePlayer, 'to', newActivePlayer);
				activePlayer = newActivePlayer;
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
		} catch (error) {
			console.error('Error in checkSongChange:', error);
		}
	}, 1000); // Check every second
};

// Call checkSongChange once at startup
checkSongChange();

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
	}
};

export const getAlbumArt = async (
	artist: string,
	title: string,
	album: string
): Promise<string | undefined> => {
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
		return undefined;
	}
};

export const getAccentColor = async () => {
	let url;
	albumArt.subscribe((value) => {
		url = value;
	});
	
	if (!url) {
		return '#000000'; // Default color if no album art
	}
	
	const color = await prominent(url, { amount: 1, format: 'hex' });
	if (color && typeof color[0] === 'string') {
		accentColor.set(color[0]);
		const fontColor = getTextColor(color[0]);
		textColor.set(fontColor);
		return color[0];
	}
	
	return '#000000'; // Default color if prominent fails
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

checkSongChange().then(() => {
	getCurrentPlaying().then(() => {
		setInterval(getPlayTime, 1000);
	});
});
