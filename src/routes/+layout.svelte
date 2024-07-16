<script lang="ts">
	import Player from '$lib/components/Player.svelte';
	import Titlebar from '$lib/components/Titlebar.svelte';
	import { onMount } from 'svelte';
	import '../app.pcss';
	import { fly } from 'svelte/transition';
	import { getCurrentPlaying } from '$lib/player';
	import { Toaster } from '$lib/components/ui/sonner';
	import { accentColor, textColor } from '$lib/stores/player-store';
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

	<Titlebar title="Ohun" />
	{#key data.url}
		<div
			in:fly={{ x: -200, duration: 300, delay: 300 }}
			out:fly={{ x: 200, duration: 300 }}
			class="select-none px-2 pt-10
		"
			style="background-color: {$accentColor}; color: {$textColor};"
		>
			<slot />
		</div>
	{/key}
	<Player />
{:else}
	<div class="flex h-screen items-center justify-center">
		<div class="text-center">
			<h1 class="font-bold text-2xl">Playerctl is not installed</h1>
			<p class="text-sm">Please install playerctl to use this app</p>
			<button
				on:click={() =>
					openLink('https://github.com/altdesktop/playerctl?tab=readme-ov-file#installing')}
				class="mt-4 rounded-md bg-[#1db954] px-4 py-2 text-white">how to install?</button
			>
		</div>
	</div>
{/if}
