<script lang="ts">
	import { currentLine, plainLyrics, syncedLyrics } from '$lib/stores/lyricsStore';
	import { copyText } from 'svelte-copy';
	import { toast } from 'svelte-sonner';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { onMount, onDestroy } from 'svelte';
	import { accentColor, textColor } from '$lib/stores/player-store';
	import { lyricsMode } from '$lib/preferences';
	import { appError } from '$lib/stores/error-store';
	import { goToTime } from '$lib/player';
	import { createHover } from 'svelte-interactions';

	const { hoverAction } = createHover();

	// Define types for lyrics and lyrics with index
	interface Lyric {
		time: number;
		text: string;
	}

	interface LyricWithIndex {
		text: string;
		index: number;
	}

	// Type the copy function
	export const copy = (text: string): void => {
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

	const scrollTo = (index: number): void => {
		const element = document.getElementById(index.toString());
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	};

	let lyricWithIndex: LyricWithIndex[] = [];
	let lyrics: Lyric[] = [];
	let mouseOverLyrics = false;
	let scrollInterval: ReturnType<typeof setInterval> | undefined;

	// Automatically calculate lyrics based on the synced lyrics store
	$: {
		if ($syncedLyrics != null) {
			lyrics = $syncedLyrics.split('\n').map((line) => {
				let match = line.match(/\[(.*?)\](.*)/);
				let time = match ? match[1].trim() : '';
				let text = match ? match[2].trim() : '';

				let timeInSeconds = 0;
				if (time) {
					const [minutes, seconds] = time.split(':').map(Number);
					timeInSeconds = minutes * 60 + seconds;
				}

				return {
					time: timeInSeconds,
					text
				};
			});
		}
	}

	// Automatically calculate lyricWithIndex based on the plain lyrics store
	$: {
		lyricWithIndex = $plainLyrics.split('\n').map((line, index) => ({
			text: line,
			index
		}));
	}

	// Debounce function to delay execution of the scroll action
	const debounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
		let timer: ReturnType<typeof setTimeout>;
		return (...args: Parameters<T>) => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				func(...args);
			}, delay);
		};
	};

	const debouncedScrollTo = debounce(scrollTo, 200);

	const startScrollInterval = (): void => {
		if (scrollInterval) clearInterval(scrollInterval);
		scrollInterval = setInterval(() => {
			if (!mouseOverLyrics) {
				debouncedScrollTo($currentLine.time);
			}
		}, 1000);
	};

	onMount(() => {
		scrollTo(0);
		startScrollInterval();
	});

	onDestroy(() => {
		clearInterval(scrollInterval);
	});
</script>

<div class="h-screen min-w-full bg-[{$accentColor}]">
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
			debouncedScrollTo($currentLine.time); // Scroll immediately after hover ends
		}}
	>
		{#if $appError == null}
			{#if $syncedLyrics == null}
				<h1 class="text-center text-5xl font-extrabold">No lyrics found</h1>
			{:else if $lyricsMode === 'multiple'}
				<ScrollArea
					class="sm:text-1xl mx-12 mb-12 h-[80vh] w-full
		  cursor-copy whitespace-pre-wrap text-center text-2xl font-extrabold leading-[4.25rem] md:text-3xl md:leading-[5.25rem] xl:text-6xl xl:leading-[7.25rem]"
				>
					<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
					{#each lyrics as line, i (i)}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<p
							class={`line-{i} leading-[4.25rem] transition-opacity duration-300 hover:opacity-80 md:leading-[5.25rem] xl:leading-[7.25rem]
							${line.time == $currentLine.time ? 'opacity-95' : 'opacity-60'}
							`}
							id={`${line.time}`}
							on:click={goToTime(line.time)}
						>
							{line.text}
						</p>
					{/each}
				</ScrollArea>
			{:else}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
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
