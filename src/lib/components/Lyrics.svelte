<script lang="ts">
	import { currentLine } from '$lib/stores/lyricsStore';
	import { copyText } from 'svelte-copy';
	import { toast } from 'svelte-sonner';
	export const copy = (text: string) => {
		copyText(text);
		toast.success('Event has been created', {
			description: 'Sunday, December 03, 2023 at 9:00 AM',
			action: {
				label: 'Undo',
				onClick: () => console.info('Undo')
			},
			position: 'top-right'
		});
	};
</script>

<div class="flex h-[90vh] min-w-full items-center justify-center px-4">
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<h1
		class="cursor-copy text-center text-2xl font-extrabold
		leading-relaxed sm:text-3xl md:text-5xl xl:text-8xl"
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
