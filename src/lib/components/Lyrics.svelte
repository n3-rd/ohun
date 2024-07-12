<script lang="ts">
	// @ts-nocheck
	import { currentLine, parsedLyrics, plainLyrics, syncedLyrics } from '$lib/stores/lyricsStore';
	import { copyText } from 'svelte-copy';
	import { toast } from 'svelte-sonner';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { onMount } from 'svelte';
	import { accentColor, textColor } from '$lib/stores/player-store';
	import { lyricsMode } from '$lib/preferences';
	import { appError } from '$lib/stores/error-store';
	import { goToTime } from '$lib/player';
	import { createHover } from 'svelte-interactions';

	const { hoverAction } = createHover();

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

	const scrollTo = (index) => {
		const element = document.getElementById(index);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	};

	let lyricWithIndex;
	let lyrics;

	$: {
		if ($syncedLyrics != null) {
			lyrics = $syncedLyrics.split('\n').map((line) => {
				let match = line.match(/\[(.*?)\](.*)/);
				let time = match ? match[1].trim() : '';
				let text = match ? match[2].trim() : '';

				if (time) {
					let [minutes, seconds] = time.split(':').map(Number);
					time = minutes * 60 + seconds;
				}

				return {
					time,
					text
				};
			});
		}
	}

	$: {
		lyricWithIndex = $plainLyrics.split('\n').map((line, index) => ({ text: line, index }));
	}

	let mouseOverLyrics = false;

	setInterval(() => {
		if (!mouseOverLyrics) {
			scrollTo($currentLine.time);
		}
	}, 1000);

	onMount(() => {
		scrollTo(0);
	});
</script>

<div class="h-screen min-w-full bg-[{$accentColor}]">
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- svelte-ignore a11y-mouse-events-have-key-events -->
	<div
		class="flex h-[90vh] min-w-[98vw] items-center justify-center px-4"
		use:hoverAction
		on:hoverstart={(e) => {
			mouseOverLyrics = true;
			console.log('hover');
		}}
		on:hoverend={(e) => {
			mouseOverLyrics = false;
			console.log('hover end');
		}}
	>
		{#if $appError == null}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			{#if $syncedLyrics == null}
				<h1 class="text-center text-5xl font-extrabold">No lyrics found</h1>
			{:else if $lyricsMode === 'multiple'}
				<ScrollArea
					class="sm:text-1xl mx-12 mb-12 h-[80vh] w-full
		  cursor-copy whitespace-pre-wrap text-center text-2xl font-extrabold leading-[4.25rem] md:text-3xl md:leading-[5.25rem] xl:text-6xl xl:leading-[7.25rem]"
				>
					{#each lyrics as line, i (i)}
						<!-- svelte-ignore a11y-mouse-events-have-key-events -->
						<p
							class="opacity-60 line-{i} hover:opacity-80"
							style={line.time == $currentLine.time ? 'opacity: 1' : 'opacity: 0.6'}
							id={line.time}
							on:click={goToTime(line.time)}
						>
							{line.text}
						</p>
					{/each}
				</ScrollArea>
			{:else}
				<h1
					class="cursor-copy text-center text-5xl font-extrabold leading-relaxed lg:text-7xl"
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
			{/if}
		{:else if $appError != null}
			<h1 class="text-center text-5xl font-extrabold text-[{$textColor}]">{$appError}</h1>
		{/if}
	</div>
</div>
