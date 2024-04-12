<script>
	import Titlebar from '$lib/components/Titlebar.svelte';
	import '../app.pcss';
	import { fly } from 'svelte/transition';

	export let data;
</script>

<Titlebar title="Stauri" />
{#key data.url}
	<div
		in:fly={{ x: -200, duration: 300, delay: 300 }}
		out:fly={{ x: 200, duration: 300 }}
		class="px-2"
	>
		<slot />
	</div>
{/key}
