import { writable } from "svelte/store";

export const syncedLyrics = writable<string>('');
export const plainLyrics = writable<string>('');

export const currentLine = writable('');
export const nextLine = writable('');