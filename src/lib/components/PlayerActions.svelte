<script lang="ts">
	import { textColor } from '$lib/stores/player-store';
	import { AlignCenter, AlignJustify, Copy, Download } from 'lucide-svelte';
	import Tip from './Tip.svelte';
	import { setMultiLineMode, setSingleLineMode } from '$lib/preferences';
	import { copyText } from 'svelte-copy';
	import { plainLyrics } from '$lib/stores/lyricsStore';
	import { downloadLyrics } from '$lib/player';
	import { toast } from 'svelte-sonner';
	import { currentPlayingSong } from '$lib/stores/player-store';
</script>

<div class="flex items-center gap-3" style="color: {$textColor};">
	<Tip text="Copy lyrics">
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
			on:click={() => {
				copyText($plainLyrics);
				toast.success('Lyrics copied');
			}}
		>
			<Copy size="15" />
		</button>
	</Tip>

	<Tip text="Download lyrics">
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
			on:click={() => {
				downloadLyrics($currentPlayingSong.artist, $currentPlayingSong.title);
				toast.success('Lyrics downloaded');
			}}
		>
			<Download size="15" />
		</button>
	</Tip>

	<div class="h-4 w-[1px] bg-current opacity-20" />

	<Tip text="Single line mode">
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
			on:click={setSingleLineMode}
		>
			<AlignCenter size="15" />
		</button>
	</Tip>

	<Tip text="Multi line mode">
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
			on:click={setMultiLineMode}
		>
			<AlignJustify size="15" />
		</button>
	</Tip>
</div>

<style>
	button {
		transition: transform 0.2s ease;
	}
	
	button:hover {
		transform: scale(1.1);
	}
	
	button:active {
		transform: scale(0.95);
	}
</style>
