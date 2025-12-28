import { playerctlInstalled } from "$lib/stores/window-store";
import { checkPlayerCtl } from "$lib/utils";
import { platform } from '@tauri-apps/plugin-os';

async function init() {
    try {
        // Check if we're on Windows or MacOS (which don't need playerctl)
        const currentPlatform = await platform();
        if (currentPlatform === 'windows' || currentPlatform === 'macos') {
            playerctlInstalled.set(true);
            return;
        }

        // For Linux and macOS, check for playerctl
        const exists = await checkPlayerCtl();
        playerctlInstalled.set(exists);
    } catch (error) {
        console.error('Error checking playerctl:', error);
        // On macOS, playerctl won't exist, so set to false
        // Also handle case where Tauri APIs aren't available yet
        playerctlInstalled.set(false);
    }
}

// Use requestAnimationFrame to ensure DOM and Tauri are ready
if (typeof window !== 'undefined') {
    requestAnimationFrame(() => {
        init();
    });
} else {
    init();
}