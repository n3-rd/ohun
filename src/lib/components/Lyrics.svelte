<script lang="ts">
	import { currentLine, plainLyrics, syncedLyrics } from '$lib/stores/lyricsStore';
	import { copyText } from 'svelte-copy';
	import { toast } from 'svelte-sonner';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { onMount } from 'svelte';

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

	$: {
		lyricWithIndex = $plainLyrics.split('\n').map((line, index) => ({ text: line, index }));
	}

	setInterval(() => {
		// const currentTime = Math.floor($currentLine.time);
		console.log('scrolling to current line', $currentLine.time);
		scrollTo($currentLine.time);
	}, 1000);

	onMount(() => {
		scrollTo(0);
	});
</script>

<div class="flex h-[90vh] min-w-full items-center justify-center px-4">
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<ScrollArea
		class="sm:text-1xl h-full cursor-copy whitespace-pre-wrap
	  text-center text-2xl font-extrabold leading-[4.25rem] md:text-3xl md:leading-[5.25rem] xl:text-6xl xl:leading-[6.25rem]"
	>
		{#each lyrics as line, i (i)}
			<p
				class="opacity-60 line-{i}"
				style={line.time == $currentLine.time ? 'opacity: 1' : 'opacity: 0.6'}
				id={line.time}
			>
				{line.text}
			</p>
		{/each}
	</ScrollArea>
</div>
