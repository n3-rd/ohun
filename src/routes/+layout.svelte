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

	<div class="fixed inset-0 z-[-1] transition-all duration-700 ease-in-out">
		{#if $albumArt}
			<div
				class="absolute inset-0 bg-cover bg-center transition-all duration-700"
				style="background-image: url('{$albumArt}'); filter: blur(40px) brightness(0.4) saturate(1.5);"
			/>
		{:else}
			<div
				class="absolute inset-0 transition-all duration-700"
				style="background-color: {$accentColor};"
			/>
		{/if}
		<div class="absolute inset-0 bg-black/20 backdrop-blur-3xl" />
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
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<h1 class="font-bold text-2xl">🎵 One Small Thing Missing!</h1>
			<p class="text-sm mt-2">We need a tiny helper called 'playerctl' to make the magic happen 🪄</p>
			<button
				on:click={() =>
					openLink('https://github.com/altdesktop/playerctl?tab=readme-ov-file#installing')}
				class="mt-4 rounded-md bg-[#1db954] px-4 py-2 text-white hover:bg-[#1ed760] transition-colors duration-200">
				Show me how to install it! 🚀
			</button>
		</div>
	</div>
{/if}
