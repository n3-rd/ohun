<script>
	import { currentLine } from '$lib/stores/lyricsStore';
</script>

<div class="flex h-[90vh] min-w-full items-center justify-center px-4">
	<h1 class="text-center text-5xl font-extrabold leading-relaxed">
		{#if $currentLine.text}
			{$currentLine.text}
		{:else if $currentLine.text === ''}
			-
		{:else}
			No lyrics found
		{/if}
	</h1>
</div>
