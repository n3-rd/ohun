<script>
	import { windowMaximized } from '$lib/stores/window-store';

	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { ExternalLink, Maximize2, MenuIcon, Minimize2, Minus, X } from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { textColor, accentColor } from '$lib/stores/player-store';
	import { openLink } from '$lib/utils';
	import { onMount } from 'svelte';
	const appWindow = getCurrentWindow();
	export let title = 'Stauri';

	const startDragging = async()=>{
	await getCurrentWindow().startDragging();
	}
	// console.log('window info', getCurrentWindow().setAlwaysOnTop(true));

	const minimizeWindow = async () => {
		await appWindow.minimize();
	};

	const maximizeWindow = async () => {
		await appWindow.toggleMaximize();
		windowMaximized.update((value) => !value);
	};

	const closeWindow = async () => {
		await appWindow.close();
	};

	onMount(()=>{
	startDragging();
	})
</script>

<div
	data-tauri-drag-region
	class="z-100 fixed flex w-screen select-none justify-between rounded-t-xl bg-transparent px-2 text-gray-700"
>
	<div
		class="app-title cursor-default p-2 font-semibold uppercase dark:text-white"
		style="color: {$textColor};"
		data-tauri-drag-region
	>
		{title}
	</div>

	<ul class="flex items-center gap-3">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<button
					class="mx-5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
					style="background-color: {$accentColor}; color: {$textColor};"
				>
					<MenuIcon size="15" stroke-width="3" />
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Group>
					<DropdownMenu.Item class="cursor-pointer">
						<button
							on:click={() => openLink('https://github.com/n3-rd/ohun')}
							class="flex w-full justify-between"
						>
							<div>Github</div>
							<ExternalLink size="15" />
						</button>
					</DropdownMenu.Item>
					<DropdownMenu.Item class="cursor-pointer">
						<button
							on:click={() => openLink('https://www.buymeacoffee.com/n3rdyn3rd')}
							class="flex w-full justify-between"
						>
							<div>Donate</div>
							<ExternalLink size="15" />
						</button>
					</DropdownMenu.Item>
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
			style="background-color: {$accentColor}; color: {$textColor};"
			on:click={minimizeWindow}
		>
			<Minus size="15" stroke-width="3" />
		</button>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
			style="background-color: {$accentColor}; color: {$textColor};"
			on:click={maximizeWindow}
		>
			{#if $windowMaximized}
				<Minimize2 size="15" stroke-width="3" />
			{:else}
				<Maximize2 size="15" stroke-width="3" />
			{/if}
		</button>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:opacity-70"
			style="background-color: {$accentColor}; color: {$textColor};"
			on:click={closeWindow}
		>
			<X size="15" stroke-width="3" />
		</button>
	</ul>
</div>
