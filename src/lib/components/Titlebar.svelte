<script>
	import { windowMaximized } from '$lib/stores/window-store';

	import { appWindow } from '@tauri-apps/api/window';
	import { Maximize2, Minimize2, Minus, X } from 'lucide-svelte';

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
	<div class="app-title cursor-default p-2 font-semibold" data-tauri-drag-region>
		{title}
	</div>

	<ul class="flex items-center gap-3">
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300"
			on:click={minimizeWindow}
		>
			<Minus size="15" stroke-width="3" />
		</button>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300"
			on:click={maximizeWindow}
		>
			{#if $windowMaximized}
				<Minimize2 size="15" stroke-width="3" />
			{:else}
				<Maximize2 size="15" stroke-width="3" />
			{/if}
		</button>
		<button
			class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300"
			on:click={closeWindow}
		>
			<X size="15" stroke-width="3" />
		</button>
	</ul>
</div>
