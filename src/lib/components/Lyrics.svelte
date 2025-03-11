<script lang="ts">
	import { currentLine, plainLyrics, syncedLyrics } from '$lib/stores/lyricsStore';
	import { copyText } from 'svelte-copy';
	import { toast } from 'svelte-sonner';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { onMount, onDestroy } from 'svelte';
	import { accentColor, textColor, playTime } from '$lib/stores/player-store';
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
		toast.success('Lyrics copied to clipboard', {
			position: 'top-right'
		});
	};

	const scrollTo = (index: number): void => {
		const element = document.getElementById(index.toString());
		if (element) {
			// Use a more subtle scrolling behavior for better user experience
			element.scrollIntoView({ 
				behavior: 'smooth', 
				block: 'center',
				inline: 'center'
			});
		}
	};

	// Add a small buffer to prevent too frequent scrolling
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
	const smoothScrollTo = (index: number): void => {
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}
		
		scrollTimeout = setTimeout(() => {
			scrollTo(index);
			scrollTimeout = null;
		}, 50); // Small delay for smoother experience
	};

	let lyricWithIndex: LyricWithIndex[] = [];
	let lyrics: Lyric[] = [];
	let mouseOverLyrics = false;
	let lastScrolledTime = -1;

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

	// Watch for changes in currentLine and scroll to it immediately
	$: if ($currentLine && $currentLine.time !== lastScrolledTime && !mouseOverLyrics) {
		lastScrolledTime = $currentLine.time;
		smoothScrollTo($currentLine.time);
	}

	// Also watch playTime directly for more responsive scrolling
	$: if ($playTime && !mouseOverLyrics) {
		// Find the closest lyric time to the current play time
		const closestLyric = lyrics.reduce((prev, curr) => {
			return (Math.abs(curr.time - $playTime) < Math.abs(prev.time - $playTime)) ? curr : prev;
		}, { time: 0, text: '' });
		
		if (closestLyric && closestLyric.time !== lastScrolledTime) {
			lastScrolledTime = closestLyric.time;
			smoothScrollTo(closestLyric.time);
		}
	}

	onMount(() => {
		smoothScrollTo(0);
	});

	// Clean up any pending timeouts
	onDestroy(() => {
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}
	});

	// Function to handle click on lyrics line
	const handleLineClick = (time: number) => {
		return () => goToTime(time);
	};
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
		}}
	>
		{#if $appError == null}
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
							class={`line-{i} leading-[4.25rem] transition-all duration-300 hover:opacity-100 md:leading-[5.25rem] xl:leading-[7.25rem]
							${line.time == $currentLine.time 
								? 'opacity-100 font-bold scale-105 text-[#ffffff]' 
								: 'opacity-60'
							}
							`}
							id={`${line.time}`}
							on:click={handleLineClick(line.time)}
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
		{:else if $appError != null}
			<div class="text-center">
				<h1 class="text-5xl font-extrabold text-[{$textColor}] mb-4">{$appError}</h1>
				<p class="text-2xl opacity-80">Don't worry, we'll catch those lyrics next time! 🎯</p>
			</div>
		{/if}
	</div>
</div>
