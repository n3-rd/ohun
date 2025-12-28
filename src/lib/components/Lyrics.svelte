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

	const scrollTo = (time: number): void => {
		// Find the lyric element with matching time
		const element = document.getElementById(time.toString());
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
		if ($syncedLyrics != null && typeof $syncedLyrics === 'string') {
			lyrics = $syncedLyrics.split('\n')
				.map((line) => {
					const match = line.match(/\[(.*?)\](.*)/);
					const time = match ? match[1].trim() : '';
					const text = match ? match[2].trim() : '';

					let timeInSeconds = 0;
					if (time) {
						const timeParts = time.split(':');
						if (timeParts.length === 2) {
							const [minutes, seconds] = timeParts.map(Number);
							if (!isNaN(minutes) && !isNaN(seconds)) {
								timeInSeconds = minutes * 60 + seconds;
							}
						}
					}

					return {
						time: timeInSeconds,
						text
					};
				})
				.filter((line) => line.text.length > 0); // Filter out empty lines
		} else {
			lyrics = [];
		}
	}

	// Automatically calculate lyricWithIndex based on the plain lyrics store
	$: {
		if ($plainLyrics && typeof $plainLyrics === 'string') {
			lyricWithIndex = $plainLyrics.split('\n').map((line, index) => ({
				text: line.trim(),
				index
			}));
		} else {
			lyricWithIndex = [];
		}
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
		{#if !$appError}
			{#if $syncedLyrics == null}
				<h1 class="text-center text-5xl font-extrabold">
					<span class="block mb-4">🎵 No lyrics yet!</span>
					<span class="text-2xl block opacity-80">This song is playing hard to get... 🙈</span>
				</h1>
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
							on:click={() => goToTime(line.time).catch(console.error)}
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
						<span class="opacity-60">🎶 ...</span>
					{:else}
						<span class="block mb-4">🎵 No lyrics yet!</span>
						<span class="text-2xl block opacity-80">This song is playing hard to get... 🙈</span>
					{/if}
				</h1>
			{/if}
		{:else if $appError}
			<div class="text-center">
				<h1 class="text-5xl font-extrabold text-[{$textColor}] mb-4">{$appError.message}</h1>
				{#if $appError.recoverable}
					<p class="text-2xl opacity-80 mb-4">Don't worry, we'll catch those lyrics next time! 🎯</p>
					{#if $appError.retryable}
						<button
							class="px-6 py-3 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-[{$textColor}] font-semibold"
							on:click={() => {
								appError.clear();
								// Trigger a retry by getting current playing again
								import('$lib/player').then(({ getCurrentPlaying }) => getCurrentPlaying());
							}}
						>
							Retry 🔄
						</button>
					{/if}
				{:else}
					<p class="text-2xl opacity-80">This error cannot be recovered automatically.</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
