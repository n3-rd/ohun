<script lang="ts">
	import { getAlbumArt } from '$lib/player';
	import { accentColor, albumArt, currentPlayingSong, textColor } from '$lib/stores/player-store';
	import { Pause, Play, Redo, Share, SkipBack, SkipForward, Undo } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import PlayerActions from './PlayerActions.svelte';
	import Tip from './Tip.svelte';
	import { writable } from 'svelte/store';

	const playing = writable(false);
	let isAlbumArtHovered = $state(false);

	const updatePlayingState = async () => {
		const isPlaying = await invoke('is_playing');
			playing.set(isPlaying);
	};

	const next = async () => {
		await invoke('next_song');
		await updatePlayingState();
	};

	const previous = async () => {
		await invoke('previous_song');
		await updatePlayingState();
	};

	const togglePlay = async () => {
		await invoke('toggle_play');
		await updatePlayingState();
	};

	let interval: number;

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.target instanceof HTMLInputElement) return;
		
		switch(event.code) {
			case 'Space':
				event.preventDefault();
				togglePlay();
				break;
			case 'ArrowLeft':
				if (event.altKey) previous();
				break;
			case 'ArrowRight':
				if (event.altKey) next();
				break;
		}
	};

	onMount(async () => {
		await updatePlayingState();
		interval = setInterval(updatePlayingState, 1000) as unknown as number;
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		window.removeEventListener('keydown', handleKeydown);
	});

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

<style lang="postcss">
	button {
		transition: transform 0.2s ease;
	}
	
	button:hover {
		transform: scale(1.1);
	}
	
	button:active {
		transform: scale(0.95);
	}
</style>

{#if isAlbumArtHovered}

<div class="cover-preview h-56 w-56 bg-cover bg-center rounded-md absolute bottom-16 left-4"
		style="background-image: url('{$albumArt}'); object-fit: cover;">
	

</div>

{/if}

<div class="fixed bottom-0 right-0 flex flex-col w-full">
	<div
		class="fixed bottom-0 right-0 flex h-16 w-full select-none items-center justify-between bg-white/30 px-2 backdrop-blur-sm transition-colors duration-300 ease-in-out"
	>
		<div class="song-info flex w-[30%] items-center gap-3">
			<div
				class="album-art min-h-11 min-w-11 rounded-md bg-cover bg-center"
				style="background-image: url('{$albumArt}'); object-fit: cover;"
				onmouseenter={() => isAlbumArtHovered = true}
				onmouseleave={() => isAlbumArtHovered = false}
			></div>
			<Tip
				text="{$currentPlayingSong.title} - {$currentPlayingSong.artist} - {$currentPlayingSong.album}"
			>
				<div class="metadata flex flex-col gap-2 text-left">
					<div class="song-title line-clamp-1 font-bold text-sm" style="color: {$textColor};">
						{$currentPlayingSong.title}
					</div>
					<div class="artist line-clamp-1 text-xs" style="color: {$textColor};">
						{$currentPlayingSong.artist}
					</div>
					<!-- <div class="artist text-xs">{$accentColor}</div> -->
				</div>
			</Tip>
		</div>

		<PlayerActions />

		<div class="controls flex items-center gap-3 justify-self-end">
			<Tip text="Previous">
				<button
					class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
					style="color: {$textColor};"
					onclick={previous}
				>
					<SkipBack size="15" />
				</button>
			</Tip>

			<Tip text={$playing ? 'Pause' : 'Play'}>
				<button
					class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
					style="color: {$textColor};"
					onclick={togglePlay}
				>
					{#if $playing}
						<Pause size="15" />
					{:else}
						<Play size="15" />
					{/if}
				</button>
			</Tip>

			<Tip text="Next">
				<button
					class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
					style="color: {$textColor};"
					onclick={next}
				>
					<SkipForward size="15" />
				</button>
			</Tip>
		</div>
	</div>
</div>
