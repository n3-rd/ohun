<script lang="ts">
	import { getAlbumArt } from '$lib/player';
	import { accentColor, albumArt, currentPlayingSong } from '$lib/stores/player-store';
	import { Pause, Play, SkipBack, SkipForward } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { invoke } from '@tauri-apps/api/tauri';
	import { getTextColor } from '$lib/ui';

	let playing = async () => {
		return await invoke('is_playing');
	};

	$: {
		console.log(playing);
	}

	let accent; // replace with your actual accent color
	accentColor.subscribe((value) => {
		accent = value;
	});

	const textColor = getTextColor(accent);

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
</script>

<div
	class="absolute bottom-0 right-0 flex h-16 min-w-full select-none items-center justify-between px-2 transition-colors duration-300 ease-in-out"
	style="background-color: {$accentColor};"
>
	<div class="song-info flex items-center gap-3">
		<div
			class="album-art h-11 w-11 rounded-md bg-cover bg-center"
			style="background-image: url('{$albumArt}');"
		></div>
		<div class="metadata flex flex-col gap-2">
			<div class="song-title text-sm font-semibold" style="color: {textColor};">
				{$currentPlayingSong.title}
			</div>
			<div class="artist text-xs" style="color: {textColor};">{$currentPlayingSong.artist}</div>
			<!-- <div class="artist text-xs">{$accentColor}</div> -->
		</div>
	</div>
	<div class="controls flex items-center gap-3">
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
			on:click={() => previous()}
		>
			<SkipBack size="15" />
		</button>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
			on:click={() => togglePlay()}
		>
			{#if playing}
				<Pause size="15" />
			{:else}
				<Play size="15" />
			{/if}
		</button>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
			on:click={() => next()}
		>
			<SkipForward size="15" />
		</button>
	</div>
</div>
