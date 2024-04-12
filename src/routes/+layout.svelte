<script>
	import Player from '$lib/components/Player.svelte';
	import Titlebar from '$lib/components/Titlebar.svelte';
	import { onMount } from 'svelte';
	import '../app.pcss';
	import { fly } from 'svelte/transition';
	import { getCurrent } from '@tauri-apps/api/window';
	import { getCurrentPlaying } from '$lib/player';
	import { Toaster } from '$lib/components/ui/sonner';

	export let data;

	onMount(() => {
		getCurrentPlaying();
	});
</script>

<Toaster />

<Titlebar title="Stauri" />
{#key data.url}
	<div
		in:fly={{ x: -200, duration: 300, delay: 300 }}
		out:fly={{ x: 200, duration: 300 }}
		class="select-none px-2 pt-10"
	>
		<slot />
	</div>
{/key}
<Player />
