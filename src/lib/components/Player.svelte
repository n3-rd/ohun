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

	const updatePlayingState = async () => {
		try {
			const isPlaying = await invoke<boolean>('is_playing');
			playing.set(isPlaying);
		} catch (error) {
			console.error('Error updating playing state:', error);
			// Don't disrupt UI for minor errors
		}
	};

	const next = async () => {
		try {
			await invoke('next_song');
			await updatePlayingState();
		} catch (error) {
			console.error('Error skipping to next song:', error);
		}
	};

	const previous = async () => {
		try {
			await invoke('previous_song');
			await updatePlayingState();
		} catch (error) {
			console.error('Error skipping to previous song:', error);
		}
	};

	const togglePlay = async () => {
		try {
			await invoke('toggle_play');
			await updatePlayingState();
		} catch (error) {
			console.error('Error toggling play/pause:', error);
		}
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

	<div class="fixed bottom-8 inset-x-0 w-full flex justify-center pointer-events-none z-50">
		<div
			class="pointer-events-auto flex h-20 w-[95%] max-w-4xl select-none items-center justify-between 
			rounded-3xl bg-black/20 px-6 backdrop-blur-4xl border border-white/10 shadow-2xl transition-all hover:bg-black/30"
		>
			<div class="song-info flex w-[30%] items-center gap-4">
				<div
					class="album-art h-14 w-14 rounded-xl bg-cover bg-center shadow-lg transition-transform hover:scale-105"
					style="background-image: url('{$albumArt}');"
				/>
				<Tip
					text="{$currentPlayingSong.title} - {$currentPlayingSong.artist} - {$currentPlayingSong.album}"
				>
					<div class="metadata flex flex-col justify-center text-left">
						<div class="song-title line-clamp-1 font-bold text-base text-white tracking-wide">
							{$currentPlayingSong.title}
						</div>
						<div class="artist line-clamp-1 text-sm text-white/60 font-medium">
							{$currentPlayingSong.artist}
						</div>
					</div>
				</Tip>
			</div>

			<div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
				<div class="controls flex items-center gap-6">
					<Tip text="Previous">
						<button
							class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
							on:click={previous}
						>
							<SkipBack size="24" fill="currentColor" class="scale-75" />
						</button>
					</Tip>

					<Tip text={$playing ? 'Pause' : 'Play'}>
						<button
							class="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-white/20"
							on:click={togglePlay}
						>
							{#if $playing}
								<Pause size="28" fill="currentColor" />
							{:else}
								<Play size="28" fill="currentColor" class="ml-1" />
							{/if}
						</button>
					</Tip>

					<Tip text="Next">
						<button
							class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
							on:click={next}
						>
							<SkipForward size="24" fill="currentColor" class="scale-75" />
						</button>
					</Tip>
				</div>
			</div>

			<div class="flex w-[30%] justify-end gap-2">
				<PlayerActions />
			</div>
		</div>
	</div>
