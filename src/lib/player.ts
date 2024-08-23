import { invoke } from '@tauri-apps/api/core';
import {
	accentColor,
	albumArt,
	currentPlayingSong,
	playTime,
	textColor
} from './stores/player-store';
import type { Song } from './types';
import { getLyrics } from './lyrics';
import { currentLine, syncedLyrics } from './stores/lyricsStore';
import { Lyrics } from 'paroles';
import { prominent } from 'color.js';
import { getTextColor } from './ui';
import { replaceSpecialChars } from './utils';
import { notify } from './nofity';

let previousTime: number | null = null;

export const getCurrentPlaying = async () => {
	const response: Song = await invoke('get_current_playing_song');
	currentPlayingSong.set(response);
	getLyrics(response.artist, response.title);
	getPlayTime();
	getAlbumArt(response.artist, response.title, response.album);
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

	setInterval(async () => {
		const song = await invoke<Song>('get_current_playing_song');

		if (currentSong && song.title !== currentSong.title) {
			previousSong = currentSong;
		}

		currentSong = song;

		if (previousSong && currentSong.title !== previousSong.title) {
			// Song has changed
			await getCurrentPlaying();

			// Notify user about the new song
			const artist = currentSong.artist;
			const title = currentSong.title;

			console.log('starting notifier for', `${title} by ${artist}`);
			notify(`Lyrics fetched`, `${title} by ${artist}`);
			console.log('ending notifier');

			// Update previousSong after handling the song change
			previousSong = currentSong;
		}
	}, 1000); // Check every second
};

// Call checkSongChange once at startup
checkSongChange();

const updateLyrics = (time: number) => {
	let lyrics;
	syncedLyrics.subscribe((value) => {
		lyrics = value;
	});

	if (lyrics) {
		let sync = new Lyrics(lyrics);
		let current = sync.atTime(time);
		currentLine.set(current);
	}
};

export const getAlbumArt = async (
	artist: string,
	title: string,
	album: string
): Promise<string | undefined> => {
	let url;
	if (!album || album !== title) {
		artist = replaceSpecialChars(artist);
		title = replaceSpecialChars(title);
		url = `https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/search?q=artist:"${artist}" track:"${title}"`)}`;
	} else {
		album = replaceSpecialChars(album);
		artist = replaceSpecialChars(artist);
		url = `https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/search?q=album:"${album}" artist:"${artist}"`)}`;
	}
	try {
		const response = await fetch(url);
		const data = await response.json();

		const art = data?.data?.[0]?.album?.cover_medium;
		albumArt.set(art);
		getAccentColor();
		return art;
	} catch (error) {
		console.error('Failed to fetch album art:', error);
	}
};

export const getAccentColor = async () => {
	let url;
	albumArt.subscribe((value) => {
		url = value;
	});
	let color = await prominent(url, { amount: 1, format: 'hex' });
	accentColor.set(color);
	let fontColor = getTextColor(color);
	textColor.set(fontColor);
	return color;
};

export const goToTime = async (time: number) => {
	await invoke('go_to_time', { time });
};

export const downloadLyrics = async () => {
	// download lyrics to lrc file
	let playInfo;
	currentPlayingSong.subscribe((value) => {
		playInfo = value;
	});
	const artist = playInfo.artist;
	const title = playInfo.title;
	try {
		const response = await fetch(
			`https://lrclib.net/api/search?artist_name=${artist}&track_name=${title}`
		);
		if (!response.ok) {
			throw new Error('Failed to fetch lyrics');
		}

		let res = response.json();
		res.then((data) => {
			let lyrics = data[0].syncedLyrics;
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
		let playInfo;
		currentPlayingSong.subscribe((value) => {
			playInfo = value;
		});
		const artist = playInfo.artist;
		const title = playInfo.title;

		console.log('starting notifier for', `${title} by ${artist}`);
		notify(`Lyrics fetched`, `${title} by ${artist}`);
		console.log('ending notifier');

		setInterval(getPlayTime, 1000);
	});
});
