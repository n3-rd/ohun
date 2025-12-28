<script lang="ts">
	import { windowMaximized, windowAlwaysOnTop, windowFullscreen } from '$lib/stores/window-store';
	import { Window } from '@tauri-apps/api/window';
	import { ExternalLink, Maximize2, MenuIcon, Minimize2, Minus, X, Pin, Fullscreen } from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { textColor, accentColor } from '$lib/stores/player-store';
	import { openLink } from '$lib/utils';
	import { onMount, onDestroy } from 'svelte';
	
	export let title = 'Stauri';
	
	const window = Window.getCurrent();
	let unlistenResize: (() => void) | undefined;

	const startDragging = async () => {
		await window.startDragging();
	};

	const minimizeWindow = async () => {
		await window.minimize();
	};

	const maximizeWindow = async () => {
		try {
			const isMaximized = await window.isMaximized();
			if (isMaximized) {
				await window.unmaximize();
				windowMaximized.set(false);
			} else {
				await window.maximize();
				windowMaximized.set(true);
			}
		} catch (error) {
			console.error('Window operation failed:', error);
		}
	};

	const closeWindow = async () => {
		await window.close();
	};

	const setupResizeListener = async () => {
		unlistenResize = await window.onResized(() => {
			window.isMaximized().then(isMaximized => {
				windowMaximized.set(isMaximized);
			});
		});
	};

	const toggleAlwaysOnTop = async () => {
		try {
			const isAlwaysOnTop = $windowAlwaysOnTop;
			await window.setAlwaysOnTop(!isAlwaysOnTop);
			windowAlwaysOnTop.set(!isAlwaysOnTop);
		} catch (error) {
			console.error('Failed to toggle always on top:', error);
		}
	};

	const toggleFullscreen = async () => {
		try {
			const isFullscreen = await window.isFullscreen();
			await window.setFullscreen(!isFullscreen);
			windowFullscreen.set(!isFullscreen);
		} catch (error) {
			console.error('Failed to toggle fullscreen:', error);
		}
	};

	onMount(async () => {
		startDragging();
		const isMaximized = await window.isMaximized();
		windowMaximized.set(isMaximized);
		await setupResizeListener();
		windowAlwaysOnTop.set(false);
		const isFullscreen = await window.isFullscreen();
		windowFullscreen.set(isFullscreen);
	});

	onDestroy(() => {
		if (unlistenResize) {
			unlistenResize();
		}
	});
</script>

<div
	data-tauri-drag-region
	class="z-50 fixed flex w-screen select-none justify-between rounded-t-xl bg-transparent px-2 text-gray-700"
>
	<div
		class="app-title cursor-default p-2 font-semibold uppercase text-white/80 tracking-widest text-sm"
		data-tauri-drag-region
	>
		{title}
	</div>

	<ul class="flex items-center gap-2">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<button
					class="mx-4 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
				>
					<MenuIcon size="16" />
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
			class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
			on:click={toggleAlwaysOnTop}
			title="Always on top"
		>
			<Pin size="14" class={$windowAlwaysOnTop ? 'rotate-45 text-green-400' : ''} />
		</button>
		<button
			class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
			on:click={minimizeWindow}
		>
			<Minus size="16" />
		</button>
		<button
			class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
			on:click={maximizeWindow}
		>
			{#if $windowMaximized}
				<Minimize2 size="14" />
			{:else}
				<Maximize2 size="14" />
			{/if}
		</button>
		<button
			class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
			on:click={closeWindow}
		>
			<X size="16" />
		</button>
	</ul>
</div>
