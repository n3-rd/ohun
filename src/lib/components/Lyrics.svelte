<script lang="ts">
	import { run } from 'svelte/legacy';

	import { currentLine, plainLyrics, syncedLyrics, lyricsLoading } from '$lib/stores/lyricsStore';
	import { copyText } from 'svelte-copy';
	import { toast } from 'svelte-sonner';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { onMount, onDestroy } from 'svelte';
	import { accentColor, textColor } from '$lib/stores/player-store';
	import { lyricsMode } from '$lib/preferences';
	import { appError } from '$lib/stores/error-store';
	import { goToTime } from '$lib/player';
	import { createHover } from 'svelte-interactions';
	import LyricsLoader from './LyricsLoader.svelte';

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

	let lyricWithIndex: LyricWithIndex[] = $state([]);
	let lyrics: Lyric[] = $state([]);
	let mouseOverLyrics = $state(false);
	let scrollInterval: ReturnType<typeof setInterval> | undefined;

	// Automatically calculate lyrics based on the synced lyrics store
	run(() => {
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
	});

	// Automatically calculate lyricWithIndex based on the plain lyrics store
	run(() => {
		lyricWithIndex = $plainLyrics.split('\n').map((line, index) => ({
			text: line,
			index
		}));
	});

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
		onhoverstart={(e) => {
			mouseOverLyrics = true;
			console.log('hover');
		}}
		onhoverend={(e) => {
			mouseOverLyrics = false;
			console.log('hover end');
			debouncedScrollTo($currentLine.time); // Scroll immediately after hover ends
		}}
	>
		<LyricsLoader />
		
		{#if $appError == null && !$lyricsLoading}
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
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					{#each lyrics as line, i (i)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<p
							class={`line-{i} leading-[4.25rem] transition-opacity duration-300 hover:opacity-80 md:leading-[5.25rem] xl:leading-[7.25rem]
							${line.time == $currentLine.time ? 'opacity-95' : 'opacity-60'}
							`}
							id={`${line.time}`}
							onclick={goToTime(line.time)}
						>
							{line.text}
						</p>
					{/each}
				</ScrollArea>
			{:else}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<h1
					class="cursor-copy text-center text-5xl font-extrabold leading-relaxed lg:text-7xl"
					onclick={() => copyText($currentLine.text)}
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
		{:else if $appError != null && !$lyricsLoading}
			<div class="text-center">
				<h1 class="text-5xl font-extrabold text-[{$textColor}] mb-4">{$appError}</h1>
				<p class="text-2xl opacity-80">Don't worry, we'll catch those lyrics next time! 🎯</p>
			</div>
		{/if}
	</div>
</div>
