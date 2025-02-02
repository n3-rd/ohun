import type { Song } from "$lib/types";
import { writable } from "svelte/store";
import { persisted } from 'svelte-persisted-store';

export const currentPlayingSong = writable<Song>({
    artist: null,
    title: null,
    album: null
});

export const cachedAlbumArt = persisted<Record<string, string>>('cachedAlbumArt', {}, {
    storage: 'local',
    syncTabs: true
});

export const albumArt = writable('');
export const accentColor = writable('#ffffff');
export const textColor = writable('#000000');
export const isLoading = writable(false);
export const playTime = writable(0);
export const duration = writable(0);