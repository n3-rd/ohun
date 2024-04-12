import { invoke } from '@tauri-apps/api/tauri'
import { currentPlayingSong, playTime } from './stores/player-store'
import type { Song } from './types'

export const getCurrentPlaying = async () => {
    const response: Song = await invoke('get_current_playing_song')
    currentPlayingSong.set(response)
    getPlayTime()
    console.log(response)
}
export const getPlayTime = async () => {
    const response: number = await invoke('get_current_audio_time')
    playTime.set(response)
    console.log(response)
}

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
            console.log('Song has changed from', previousSong, 'to', currentSong);
            currentPlayingSong.set(currentSong);
        }
    }, 1000); // Check every second
};

checkSongChange();
getCurrentPlaying();
setInterval(getPlayTime, 1000);