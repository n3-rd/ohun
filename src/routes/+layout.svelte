<script lang="ts">
	import Player from '$lib/components/Player.svelte';
	import Titlebar from '$lib/components/Titlebar.svelte';
	import { onMount } from 'svelte';
	import '../app.pcss';
	import { fly } from 'svelte/transition';
	import { getCurrentPlaying } from '$lib/player';
	import { Toaster } from '$lib/components/ui/sonner';
	import { accentColor, textColor, albumArt } from '$lib/stores/player-store';
	import { playerctlInstalled } from '$lib/stores/window-store';
	import { openLink } from '$lib/utils';
	if (!import.meta.env.DEV) {
            document.oncontextmenu = (event) => {
                event.preventDefault()
            }
        }

	export let data;

	const disableContextMenu = () => {
		if (window.location.hostname !== 'localhost') {
			document.addEventListener('contextmenu', (e) => {
				e.preventDefault();
			});
		}
	};

	onMount(() => {
		getCurrentPlaying();
		disableContextMenu();
	});
</script>

{#if $playerctlInstalled}
	<Toaster />

	<div class="fixed inset-0 z-[-1] bg-neutral-950 transition-all duration-700 ease-in-out">
		{#if $albumArt && !$albumArt.startsWith('data:image/svg')}
			<div
				class="absolute inset-0 bg-cover bg-center transition-all duration-700"
				style="background-image: url('{$albumArt}'); filter: blur(40px) brightness(0.4) saturate(1.5);"
			/>
			<div class="absolute inset-0 bg-black/20 backdrop-blur-3xl" />
		{:else if $accentColor && $accentColor !== '#121212'}
			<div
				class="absolute inset-0 transition-all duration-700"
				style="background-color: {$accentColor};"
			/>
			<div class="absolute inset-0 bg-black/20" />
		{/if}
	</div>

	<Titlebar title="Ohun" />
	
	<div
		class="relative z-10 select-none pb-24 pt-10"
		in:fly={{ x: -20, duration: 500, delay: 100 }}
		out:fly={{ x: 20, duration: 300 }}
		style="color: {$textColor};"
	>
		<slot />
	</div>
	<Player />
{:else}
	<div class="flex h-screen items-center justify-center bg-neutral-950">
		<div class="flex flex-col items-center gap-4 text-center">
			<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white/60"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
			</div>
			<h1 class="text-xl font-bold text-white/90">playerctl not found</h1>
			<p class="max-w-xs text-sm text-white/50">Ohun requires playerctl to communicate with your media player. Install it to get started.</p>
			<button
				on:click={() =>
					openLink('https://github.com/altdesktop/playerctl?tab=readme-ov-file#installing')}
				class="mt-1 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 active:scale-95">
				Install playerctl
			</button>
		</div>
	</div>
{/if}
