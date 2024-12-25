import { writable } from 'svelte/store';

export const appError = writable<string | null>(null);
