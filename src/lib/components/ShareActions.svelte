<script lang="ts">
	import { accentColor, albumArt, currentPlayingSong, textColor } from '$lib/stores/player-store';

	import SingleModeIndicator from './SingleModeIndicator.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Tip from './Tip.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Copy, Download, Redo, Share, Undo } from 'lucide-svelte';
	import { setMultiLineMode, setSingleLineMode } from '$lib/preferences';
	import { copyText } from 'svelte-copy';
	import { parsedLyrics, plainLyrics } from '$lib/stores/lyricsStore';
	import { downloadLyrics } from '$lib/player';
</script>

<div class="flex justify-between gap-4 self-center rounded-xl" style="color: {$textColor}">
	<Separator orientation="vertical" />
	<div class="flex items-center gap-2">
		<Popover.Root>
			<Popover.Trigger>
				<Tip text="Change lyrics mode">
					<Button class="bg-transparent hover:bg-white/30 hover:backdrop-blur-sm">
						<Share size="22" color={$textColor} />
					</Button>
				</Tip>
			</Popover.Trigger>
			<Popover.Content class="w-fit border-none  bg-white/30 shadow-none backdrop-blur-sm">
				<div class="flex h-full items-center gap-6 px-4 py-2">
					<Button
						class="flex h-full w-28 flex-col items-center gap-3 bg-transparent px-4 
						hover:bg-white/30 hover:backdrop-blur-sm
						"
						on:click={() => {
							copyText($plainLyrics);
						}}
					>
						<Tip text="Download LRC file">
							<Copy size="22" color={$textColor} />
						</Tip>
						<p class="text-md" style="color: {$textColor};">Copy lyrics</p>
					</Button>
					<Button
						class="flex h-full w-28 flex-col items-center gap-3 bg-transparent px-4 
						hover:bg-white/30 hover:backdrop-blur-sm
						
						"
						on:click={() => {
							downloadLyrics();
						}}
					>
						<Tip text="Download LRC file">
							<Download size="22" color={$textColor} />
						</Tip>
						<p class="text-md" style="color: {$textColor};">Download LRC File</p>
					</Button>
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>
	<Separator orientation="vertical" />
</div>
