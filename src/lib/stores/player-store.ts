import type { Song } from "$lib/types";
import { writable } from "svelte/store";

export const currentPlayingSong = writable<Song>({
    artist: null,
    title: null,
    album: null
});

export const playTime = writable<number>(0);
export const albumArt = writable('');
export const accentColor = writable('#ffffff');
export const textColor = writable('#000000');
export const isLoading = writable(false);