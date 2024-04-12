import { invoke } from '@tauri-apps/api/tauri'
import { accentColor, albumArt, currentPlayingSong, playTime } from './stores/player-store'
import type { Song } from './types'
import { getLyrics } from './lyrics'
import { currentLine, nextLine, syncedLyrics } from './stores/lyricsStore'
import { Lyrics } from 'paroles';
import { prominent } from 'color.js'

export const getCurrentPlaying = async () => {
    const response: Song = await invoke('get_current_playing_song')
    currentPlayingSong.set(response)
    getLyrics(response.artist, response.title)
    getPlayTime();
    getAlbumArt(response.artist, response.title)

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
    // let next = sync.atTime(time + 1);
    currentLine.set(current)
    // nextLine.set(next)
    console.log('lyrics', current)
}

export const getAlbumArt = async (artist: string, title: string): Promise<string | undefined> => {
    const url = `https://corsproxy.io/?${encodeURIComponent(`https://api.deezer.com/search?q=artist:"${artist}" track:"${title}"`)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        const art = data?.data?.[0]?.album?.cover_medium;
        albumArt.set(art);
        getAccentColor()
        return art;
    } catch (error) {
        console.error('Failed to fetch album art:', error);
    }
};

export const getAccentColor = async () => {
    let url;
    albumArt.subscribe((value) => {
        url = value;
    })

    console.log('url', url)
    let color = await prominent(url, { amount: 1, format: 'hex' });
    accentColor.set(color)
}

checkSongChange().then(() => {
    getCurrentPlaying().then(() => {

        setInterval(async () => {
            let lyrics;
            syncedLyrics.subscribe((value) => {
                lyrics = value;
            })
            if (lyrics) {
                updateLyrics(await getPlayTime())

            }
        }, 300)
        setInterval(getPlayTime, 1000);
    }

    )
})

