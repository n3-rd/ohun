import { writable } from 'svelte/store';

export const windowMaximized = writable(false);
export const windowAlwaysOnTop = writable(false);
export const windowFullscreen = writable(false);
export const playerctlInstalled = writable<boolean>(false);