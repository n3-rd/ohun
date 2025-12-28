<script lang="ts">
	import {
		availablePlayers,
		activePlayer,
		setActivePlayer,
		getAvailablePlayers
	} from '$lib/player';
	import { fly, fade } from 'svelte/transition';
	import { ChevronUp, Music } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { clickOutside } from '$lib/actions';

	let isOpen = false;

	const toggleOpen = () => {
		getAvailablePlayers(); // Refresh list on open
		isOpen = !isOpen;
	};

	const selectPlayer = (player: string) => {
		setActivePlayer(player);
		isOpen = false;
	};

	onMount(() => {
		getAvailablePlayers();
	});
</script>

<div class="relative" use:clickOutside on:clickoutside={() => (isOpen = false)}>
	<button
		class="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-medium text-white transition-all hover:bg-white/20"
		on:click={toggleOpen}
	>
		<Music size={16} />
		<span class="max-w-[100px] truncate text-xs opacity-80">
			{$activePlayer || 'Auto'}
		</span>
		<ChevronUp
			size={14}
			class={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
		/>
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 top-12 w-48 overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-xl backdrop-blur-xl"
			transition:fly={{ y: -10, duration: 200 }}
		>
			<div class="p-1">
				<button
					class={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
						$activePlayer === ''
							? 'bg-white/20 text-white'
							: 'text-white/70 hover:bg-white/10 hover:text-white'
					}`}
					on:click={() => selectPlayer('')}
				>
					<span class="truncate">Auto</span>
					{#if $activePlayer === ''}
						<div
							class="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"
						></div>
					{/if}
				</button>
				{#if $availablePlayers.length > 0}
					<div class="my-1 h-px bg-white/10"></div>
				{/if}
				{#each $availablePlayers as player}
					<button
						class={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
							$activePlayer === player
								? 'bg-white/20 text-white'
								: 'text-white/70 hover:bg-white/10 hover:text-white'
						}`}
						on:click={() => selectPlayer(player)}
					>
						<span class="truncate">{player}</span>
						{#if $activePlayer === player}
							<div
								class="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"
							></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
