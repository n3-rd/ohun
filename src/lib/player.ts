import { invoke } from '@tauri-apps/api/tauri'
import { currentPlayingSong, playTime } from './stores/player-store'
import type { Song } from './types'
import { getLyrics } from './lyrics'
import { currentLine, nextLine, syncedLyrics } from './stores/lyricsStore'
import { Lyrics } from 'paroles';

export const getCurrentPlaying = async () => {
    const response: Song = await invoke('get_current_playing_song')
    currentPlayingSong.set(response)
    getLyrics(response.artist, response.title)
    getPlayTime();

}
export const getPlayTime = async () => {
    let response: number = await invoke('get_current_audio_time')
    response = Math.floor(response)
    playTime.set(response)
    return response

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

            getCurrentPlaying();
        }
    }, 1000); // Check every second
};

const updateLyrics = async (time: number) => {

    let lyrics;
    syncedLyrics.subscribe((value) => {
        lyrics = value
    })

    let sync = new Lyrics(lyrics);
    // console.log('sync', sync)
    let current = sync.atTime(time);
    let next = sync.atTime(time + 1);
    currentLine.set(current)
    nextLine.set(next)
    console.log('lyrics', current)
}


checkSongChange();
getCurrentPlaying();
setInterval(getPlayTime, 1000);

setInterval(async () => {
    updateLyrics(await getPlayTime())
}, 300)