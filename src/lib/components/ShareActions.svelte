<script lang="ts">
	import { currentPlayingSong, textColor } from '$lib/stores/player-store';
	import { Copy, Download } from 'lucide-svelte';
	import Tip from './Tip.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { copyText } from 'svelte-copy';
	import { plainLyrics } from '$lib/stores/lyricsStore';
	import { downloadLyrics } from '$lib/player';
	import { toast } from 'svelte-sonner';
</script>

<Popover.Root>
	<Popover.Trigger>
		<Tip text="Share">
			<button
				class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70 transition-transform duration-200 hover:scale-110"
				style="color: {$textColor};"
			>
				<Copy size="15" />
			</button>
		</Tip>
	</Popover.Trigger>
	<Popover.Content
		class="border-none bg-white/30 shadow-none backdrop-blur-sm rounded-xl p-2"
	>
		<div class="flex flex-col gap-2">
			<button
				class="flex items-center gap-2 p-2 rounded-lg hover:bg-white/20 transition-all duration-200 w-full"
				style="color: {$textColor};"
				onclick={() => {
					copyText($plainLyrics);
					toast.success('Lyrics copied to clipboard');
				}}
			>
				<Copy size="15" />
				<span class="text-sm">Copy lyrics</span>
			</button>

			<button
				class="flex items-center gap-2 p-2 rounded-lg hover:bg-white/20 transition-all duration-200 w-full"
				style="color: {$textColor};"
				onclick={() => {
					downloadLyrics($currentPlayingSong.artist, $currentPlayingSong.title);
					toast.success('Lyrics downloaded');
				}}
			>
				<Download size="15" />
				<span class="text-sm">Download lyrics</span>
			</button>
		</div>
	</Popover.Content>
</Popover.Root>
