<script lang="ts">
	import { accentColor, albumArt, currentPlayingSong, textColor } from '$lib/stores/player-store';

	import SingleModeIndicator from './SingleModeIndicator.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Tip from './Tip.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Redo, Share, Undo } from 'lucide-svelte';
	import { setMultiLineMode, setSingleLineMode } from '$lib/preferences';
	import ShareActions from './ShareActions.svelte';
</script>

<div class="flex justify-between gap-4 self-center rounded-xl" style="color: {$textColor}">
	<Separator orientation="vertical" />
	<div class="flex items-center gap-2">
		<ShareActions />
		<Popover.Root>
			<Popover.Trigger>
				<Tip text="Change lyrics mode">
					<Button class="bg-transparent hover:bg-white/30 hover:backdrop-blur-sm">
						<SingleModeIndicator />
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
							setSingleLineMode();
						}}
					>
						<Skeleton
							class="h-[20px] w-[100px] rounded-full"
							style="background-color: {$textColor};"
						/>
						<p class="text-md" style="color: {$textColor};">Single line</p>
					</Button>
					<Button
						class="flex h-full w-28 flex-col items-center gap-3 bg-transparent px-4 
						hover:bg-white/30 hover:backdrop-blur-sm
						
						"
						on:click={() => {
							setMultiLineMode();
						}}
					>
						<Skeleton
							class="h-[20px] w-[100px] rounded-full"
							style="background-color: {$textColor};"
						/>
						<Skeleton
							class="h-[20px] w-[100px] rounded-full"
							style="background-color: {$textColor};"
						/>
						<Skeleton
							class="h-[20px] w-[100px] rounded-full"
							style="background-color: {$textColor};"
						/>
						<p class="text-md" style="color: {$textColor};">Multi-line</p>
					</Button>
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>
	<Separator orientation="vertical" />
</div>
