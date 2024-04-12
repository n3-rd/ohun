<script lang="ts">
	import { invoke } from '@tauri-apps/api/tauri';
	import { currentPlayingSong, playTime } from '$lib/stores/player-store';
	import type { Song } from '$lib/types';
	import { getCurrentPlaying } from '$lib/player';

	let currentSong: Song = {
		artist: null,
		title: null,
		album: null
	};

	$: currentSong = $currentPlayingSong;
	$: {
		console.log($currentPlayingSong);
	}
</script>

<h1 class="text-7xl">Home</h1>
<a href="/about">about</a>

<button
	on:click={getCurrentPlaying}
	class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
	>Get current playing</button
>

<li>current song</li>
<p>{currentSong.title}</p>
<p>{currentSong.artist}</p>
<p>{currentSong.album}</p>

<li>play time: {$playTime}</li>
