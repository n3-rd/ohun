<script lang="ts">
	import { getAlbumArt } from '$lib/player';
	import { accentColor, albumArt, currentPlayingSong, textColor } from '$lib/stores/player-store';
	import { Pause, Play, Redo, Share, SkipBack, SkipForward, Undo } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { invoke } from '@tauri-apps/api/tauri';
	import PlayerActions from './PlayerActions.svelte';

	let playing = async () => {
		return await invoke('is_playing');
	};

	$: {
		console.log(playing);
	}

	const next = async () => {
		const response = await invoke('next_song');
		console.log(response);
	};

	const previous = async () => {
		const response = await invoke('previous_song');
		console.log(response);
	};

	const togglePlay = async () => {
		await invoke('toggle_play');
		playing = await invoke('is_playing');
	};

	let textColour;
	let accent;

	textColor.subscribe((value) => {
		textColour = value;
	});

	accentColor.subscribe((value) => {
		accent = value;
	});

	let controlsColour = {
		background: accent,
		color: textColour
	};
</script>

<div
	class="absolute bottom-0 right-0 flex h-16 w-full select-none items-center justify-between bg-white/30 px-2 backdrop-blur-sm transition-colors duration-300 ease-in-out"
>
	<div class="song-info flex w-[20%] items-center gap-3">
		<div
			class="album-art h-11 w-11 rounded-md bg-cover bg-center"
			style="background-image: url('{$albumArt}'); object-fit: cover;"
		></div>
		<div class="metadata flex flex-col gap-2">
			<div class="song-title line-clamp-1 text-sm font-semibold" style="color: {$textColor};">
				{$currentPlayingSong.title}
			</div>
			<div class="artist line-clamp-1 text-xs" style="color: {$textColor};">
				{$currentPlayingSong.artist}
			</div>
			<!-- <div class="artist text-xs">{$accentColor}</div> -->
		</div>
	</div>

	<PlayerActions />

	<div class="controls flex items-center gap-3 justify-self-end">
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
			style=" color: {$textColor};"
			on:click={() => previous()}
		>
			<SkipBack size="15" />
		</button>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
			style=" color: {$textColor};"
			on:click={() => togglePlay()}
		>
			{#if playing}
				<Pause size="15" />
			{:else}
				<Play size="15" />
			{/if}
		</button>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
			style=" color: {$textColor};"
			on:click={() => next()}
		>
			<SkipForward size="15" />
		</button>
	</div>
</div>
