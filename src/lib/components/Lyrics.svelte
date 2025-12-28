<script lang="ts">
	import { currentLine, plainLyrics, syncedLyrics } from '$lib/stores/lyricsStore';
	import { copyText } from 'svelte-copy';
	import { toast } from 'svelte-sonner';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { onMount, onDestroy } from 'svelte';
	import { accentColor, textColor, isLoading } from '$lib/stores/player-store';
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
			lyrics = $syncedLyrics
				.split('\n')
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

	// Reactie scrolling
	$: if (!mouseOverLyrics && $currentLine) {
		scrollTo($currentLine.time);
	}

	onMount(() => {
		scrollTo(0);
	});

	onDestroy(() => {
		clearInterval(scrollInterval);
	});
</script>

<div class="flex h-[90vh] w-full items-center justify-center">
	{#if !$appError}
		{#if $isLoading}
			<div class="flex flex-col items-center justify-center space-y-4">
				<div
					class="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"
				></div>
				<p class="animate-pulse text-lg font-medium text-white/70">Processing...</p>
			</div>
		{:else if $syncedLyrics == null}
			<h1 class="text-center font-bold text-4xl tracking-tight text-white/90 drop-shadow-md">
				<span class="mb-6 block scale-110">🎵 No lyrics yet!</span>
				<span class="block text-2xl font-medium opacity-70"
					>This song is playing hard to get... 🙈</span
				>
			</h1>
		{:else if $lyricsMode === 'multiple'}
			<div
				class="h-[85vh] w-full"
				on:mouseenter={() => (mouseOverLyrics = true)}
				on:mouseleave={() => (mouseOverLyrics = false)}
				role="application"
			>
				<ScrollArea class="h-full w-full scroll-smooth px-8 text-center">
					<div class="space-y-8 py-[40vh]">
						<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
						{#each lyrics as line, i (i)}
							<!-- svelte-ignore a11y-click-events-have-key-events -->
							<p
								class={`
										origin-center cursor-pointer text-3xl font-extrabold leading-tight
										tracking-tight transition-all duration-200 ease-out md:text-5xl xl:text-6xl
										${
											line.time == $currentLine.time
												? 'scale-100 py-8 text-white opacity-100 blur-0 drop-shadow-lg'
												: 'scale-95 py-4 text-white/80 opacity-40 blur-[1px] hover:scale-[0.97] hover:opacity-70 hover:blur-0'
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
			</div>
		{:else}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
			<h1
				class="cursor-copy text-center text-5xl font-extrabold leading-relaxed text-white drop-shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 lg:text-7xl"
				on:click={() => copyText($currentLine.text)}
			>
				{#if $currentLine.text}
					{$currentLine.text}
				{:else if $currentLine.text === ''}
					<span class="animate-pulse opacity-50 blur-sm">🎶 ...</span>
				{:else}
					<span class="mb-4 block">🎵 No lyrics yet!</span>
					<span class="block text-2xl opacity-80">This song is playing hard to get... 🙈</span>
				{/if}
			</h1>
		{/if}
	{:else if $appError}
		<div class="rounded-3xl p-8 text-center">
			<h1 class="mb-4 font-bold text-4xl text-white">{$appError.message}</h1>
			{#if $appError.recoverable}
				<p class="mb-6 text-xl text-white/70">
					Don't worry, we'll catch those lyrics next time! 🎯
				</p>
				{#if $appError.retryable}
					<button
						class="rounded-full bg-white px-8 py-3 font-bold text-black shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
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
