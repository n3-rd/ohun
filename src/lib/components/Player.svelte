<script lang="ts">
	import { getAlbumArt } from '$lib/player';
	import { accentColor, albumArt, currentPlayingSong, textColor } from '$lib/stores/player-store';
	import { Pause, Play, Redo, Share, SkipBack, SkipForward, Undo } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import PlayerActions from './PlayerActions.svelte';
	import Tip from './Tip.svelte';
	import { writable } from 'svelte/store';
	import { fade } from 'svelte/transition';

	const playing = writable(false);
	let showArtDialog = false;

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

		switch (event.code) {
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

	function handleDialogKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') showArtDialog = false;
	}

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

<div class="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex w-full justify-center">
	<div
		class="pointer-events-auto relative flex h-20 w-[95%] max-w-4xl select-none items-center justify-between
		rounded-3xl border border-white/20 bg-white/5 px-2 shadow-2xl backdrop-blur backdrop-saturate-150 transition-all hover:bg-white/10"
	>
		<div class="song-info flex w-[30%] items-center gap-4">
			<button
				type="button"
				class="album-art h-14 w-14 shrink-0 cursor-pointer rounded-xl bg-cover bg-center shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
				style="background-image: url('{$albumArt}');"
				on:click={() => (showArtDialog = true)}
			/>
			{#if $currentPlayingSong.title}
				<Tip
					text="{$currentPlayingSong.title} - {$currentPlayingSong.artist}{$currentPlayingSong.album ? ` - ${$currentPlayingSong.album}` : ''}"
				>
					<div class="metadata flex flex-col justify-center text-left">
						<div class="song-title line-clamp-1 font-bold text-base tracking-wide text-white">
							{$currentPlayingSong.title}
						</div>
						<div class="artist line-clamp-1 text-sm font-medium text-white/60">
							{$currentPlayingSong.artist}
						</div>
					</div>
				</Tip>
			{:else}
				<div class="metadata flex flex-col justify-center text-left">
					<div class="song-title text-sm font-medium text-white/40">
						Not playing
					</div>
				</div>
			{/if}
		</div>

		<div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
			<div class="controls flex items-center gap-6">
				<Tip text="Previous">
					<button
						class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white"
						on:click={previous}
					>
						<SkipBack size="24" fill="currentColor" class="scale-75" />
					</button>
				</Tip>

				<Tip text={$playing ? 'Pause' : 'Play'}>
					<button
						class="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-lg transition-all hover:scale-105 hover:shadow-white/20 active:scale-95"
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
						class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white"
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

<svelte:window on:keydown={handleDialogKeydown} />

{#if showArtDialog}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Album art"
		on:click={() => (showArtDialog = false)}
		transition:fade={{ duration: 150 }}
	>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl ring-1 ring-white/10"
			style="background-image: url('{$albumArt}'); background-size: contain; background-position: center; background-repeat: no-repeat; aspect-ratio: 1; min-width: 280px; min-height: 280px;"
			on:click|stopPropagation
		/>
	</div>
{/if}

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
