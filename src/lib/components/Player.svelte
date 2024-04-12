<script lang="ts">
	import { getAlbumArt } from '$lib/player';
	import { accentColor, albumArt, currentPlayingSong } from '$lib/stores/player-store';
	import { Play, SkipBack, SkipForward } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { invoke } from '@tauri-apps/api/tauri';

	const hailMary = () => {
		console.log('Hail Mary');
	};

	function isLight(color) {
		const hex = color.replace('#', '');
		const [r, g, b] = hex.match(/\w\w/g).map((c) => parseInt(c, 16));
		return r * 0.299 + g * 0.587 + b * 0.114 > 186;
	}

	let accent; // replace with your actual accent color
	accentColor.subscribe((value) => {
		accent = value;
	});
	const textColor = isLight(accent) ? 'black' : 'white';

	const next = async () => {
		const response = await invoke('next_song');
		console.log(response);
	};

	const previous = async () => {
		const response = await invoke('previous_song');
		console.log(response);
	};

	const togglePlay = async () => {
		const response = await invoke('toggle_play');
		console.log(response);
	};
</script>

<div
	class="absolute bottom-0 right-0 flex h-16 min-w-full items-center justify-between px-2"
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
			class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300"
			on:click={() => previous()}
		>
			<SkipBack size="15" stroke-width="3" />
		</button>
		<button
			class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300"
			on:click={() => togglePlay()}
		>
			<Play size="15" stroke-width="3" />
		</button>
		<button
			class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300"
			on:click={() => next()}
		>
			<SkipForward size="15" stroke-width="3" />
		</button>
	</div>
</div>
