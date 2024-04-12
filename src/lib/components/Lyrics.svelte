<script lang="ts">
	import { currentLine } from '$lib/stores/lyricsStore';
	import { copyText } from 'svelte-copy';
	import { toast } from 'svelte-sonner';
	export const copy = (text: string) => {
		copyText(text);
		toast('Lyrics copied to clipboard');
	};
</script>

<div class="flex h-[90vh] min-w-full items-center justify-center px-4">
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<h1
		class="cursor-copy text-center text-5xl font-extrabold leading-relaxed"
		on:click={() => copyText($currentLine.text)}
	>
		{#if $currentLine.text}
			{$currentLine.text}
		{:else if $currentLine.text === ''}
			-
		{:else}
			No lyrics found
		{/if}
	</h1>
</div>
