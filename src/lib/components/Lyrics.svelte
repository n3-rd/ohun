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

	<div class="h-[90vh] w-full flex items-center justify-center">
		{#if !$appError}
			{#if $syncedLyrics == null}
				<h1 class="text-center text-4xl font-bold tracking-tight text-white/90 drop-shadow-md">
					<span class="block mb-6 scale-110">🎵 No lyrics yet!</span>
					<span class="text-2xl block font-medium opacity-70">This song is playing hard to get... 🙈</span>
				</h1>
			{:else if $lyricsMode === 'multiple'}
				<ScrollArea
					class="w-full h-[85vh] px-8 text-center scroll-smooth"
				>
					<div class="py-[40vh] space-y-8">
						<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
						{#each lyrics as line, i (i)}
							<!-- svelte-ignore a11y-click-events-have-key-events -->
							<p
								class={`
									cursor-pointer transition-all duration-500 ease-out origin-center
									text-3xl md:text-5xl xl:text-6xl font-extrabold leading-tight tracking-tight
									${line.time == $currentLine.time 
										? 'opacity-100 scale-100 blur-0 text-white drop-shadow-lg py-4' 
										: 'opacity-40 scale-95 blur-[1px] text-white/80 hover:opacity-70 hover:scale-[0.97] hover:blur-0 py-2'
									}
								`}
								id={`${line.time}`}
								on:click={() => goToTime(line.time).catch(console.error)}
							>
								{line.text}
							</p>
						{/each}
					</div>
				</ScrollArea>
			{:else}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
				<h1
					class="cursor-copy text-center text-5xl font-extrabold leading-relaxed lg:text-7xl transition-all duration-300 hover:scale-105 active:scale-95 drop-shadow-xl text-white"
					on:click={() => copyText($currentLine.text)}
				>
					{#if $currentLine.text}
						{$currentLine.text}
					{:else if $currentLine.text === ''}
						<span class="opacity-50 blur-sm animate-pulse">🎶 ...</span>
					{:else}
						<span class="block mb-4">🎵 No lyrics yet!</span>
						<span class="text-2xl block opacity-80">This song is playing hard to get... 🙈</span>
					{/if}
				</h1>
			{/if}
		{:else if $appError}
			<div class="text-center bg-black/30 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
				<h1 class="text-4xl font-bold text-white mb-4">{$appError.message}</h1>
				{#if $appError.recoverable}
					<p class="text-xl text-white/70 mb-6">Don't worry, we'll catch those lyrics next time! 🎯</p>
					{#if $appError.retryable}
						<button
							class="px-8 py-3 rounded-full bg-white text-black font-bold hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
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
					<p class="text-xl text-white/70">This error cannot be recovered automatically.</p>
				{/if}
			</div>
		{/if}
	</div>
