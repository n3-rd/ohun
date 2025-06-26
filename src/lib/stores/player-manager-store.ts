import { writable } from 'svelte/store';
import { persisted } from 'svelte-persisted-store';

export interface MediaPlayer {
	name: string;
	displayName: string;
	status: 'Playing' | 'Paused' | 'Stopped' | 'Unknown';
}

export const availablePlayers = writable<MediaPlayer[]>([]);
export const currentActivePlayer = persisted<string | null>('activePlayer', null, {
	storage: 'local',
	syncTabs: true
});
export const showPlayerSwitcher = writable(false);
