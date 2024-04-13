<script>
	import { windowMaximized } from '$lib/stores/window-store';

	import { appWindow } from '@tauri-apps/api/window';
	import { ExternalLink, Maximize2, MenuIcon, Minimize2, Minus, X } from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	export let title = 'Stauri';

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
</script>

<div
	data-tauri-drag-region
	class="z-100 fixed flex w-screen select-none justify-between rounded-t-xl bg-transparent px-2 text-gray-700"
>
	<div
		class="app-title cursor-default p-2 font-semibold uppercase dark:text-white"
		data-tauri-drag-region
	>
		{title}
	</div>

	<ul class="flex items-center gap-3">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<button
					class="mx-5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
				>
					<MenuIcon size="15" stroke-width="3" />
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Group>
					<!-- <DropdownMenu.Label>My Account</DropdownMenu.Label>
					<DropdownMenu.Separator /> -->
					<DropdownMenu.Item class="cursor-pointer">
						<a href="/preferences">Preferences</a>
					</DropdownMenu.Item>
					<DropdownMenu.Item class="cursor-pointer">
						<a href="/about">About</a>
					</DropdownMenu.Item>
					<DropdownMenu.Item class="cursor-pointer">
						<a
							href="n3rd.vercel.app"
							target="_blank"
							rel="noopener noreferrer"
							class="flex w-full justify-between"
						>
							<div>Donate</div>
							<ExternalLink size="15" />
						</a>
					</DropdownMenu.Item>
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
			on:click={minimizeWindow}
		>
			<Minus size="15" stroke-width="3" />
		</button>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
			on:click={maximizeWindow}
		>
			{#if $windowMaximized}
				<Minimize2 size="15" stroke-width="3" />
			{:else}
				<Maximize2 size="15" stroke-width="3" />
			{/if}
		</button>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
			on:click={closeWindow}
		>
			<X size="15" stroke-width="3" />
		</button>
	</ul>
</div>
