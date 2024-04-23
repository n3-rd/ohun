import { browser } from "$app/environment";
import { persisted } from 'svelte-persisted-store';

// Define the store
export const lyricsMode = persisted('lyricsMode', 'single', {
    storage: 'local',
    syncTabs: true,
    onWriteError: (error) => { console.error(error); },
    onParseError: (raw, error) => { console.error(error); },
});

export const setMultiLineMode = () => {
    if (browser) {
        lyricsMode.set('multiple');
    }
}

export const setSingleLineMode = () => {
    if (browser) {
        lyricsMode.set('single');
    }
}