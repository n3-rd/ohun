<script lang="ts">
	import Player from '$lib/components/Player.svelte';
	import Titlebar from '$lib/components/Titlebar.svelte';
	import { onMount } from 'svelte';
	import '../app.pcss';
	import { fly } from 'svelte/transition';
	import { getCurrent } from '@tauri-apps/api/window';
	import { getCurrentPlaying } from '$lib/player';
	import { Toaster } from '$lib/components/ui/sonner';
	import { accentColor, textColor } from '$lib/stores/player-store';
	import { getTextColor } from '$lib/ui';

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
		console.log(window.location);
	});
</script>

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
