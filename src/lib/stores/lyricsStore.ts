import type { Lyrics } from "../types";
import { writable } from "svelte/store";

export const syncedLyrics = writable<string>('');
export const plainLyrics = writable<string>('');

export const currentLine = writable<Lyrics>({ time: 0, text: '' });
export const nextLine = writable('');