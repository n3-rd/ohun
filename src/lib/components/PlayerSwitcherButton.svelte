<script lang="ts">
	import { showPlayerSwitcher, currentActivePlayer, availablePlayers } from '$lib/stores/player-manager-store';
	import { accentColor, textColor } from '$lib/stores/player-store';
	import { Monitor, ChevronDown } from 'lucide-svelte';
	import Tip from './Tip.svelte';

	let activePlayerName = $state('');
	let playerCount = $state(0);

	// Subscribe to stores
	$effect(() => {
		const activePlayer = $currentActivePlayer;
		const players = $availablePlayers;
		
		playerCount = players.length;
		
		if (activePlayer) {
			const player = players.find(p => p.name === activePlayer);
			activePlayerName = player?.displayName || formatPlayerName(activePlayer);
		} else {
			activePlayerName = playerCount > 0 ? 'Auto' : 'No Players';
		}
	});

	const formatPlayerName = (name: string): string => {
		return name
			.split('.')
			.pop()
			?.replace(/[-_]/g, ' ')
			.split(' ')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ') || name;
	};

	const openSwitcher = () => {
		showPlayerSwitcher.set(true);
	};
</script>

<Tip text="Switch media player (Ctrl+P)">
	<button
		class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:opacity-70 transition-all duration-200 min-w-0"
		style="background-color: {$accentColor}; color: {$textColor}; border: 1px solid {$textColor}20;"
		onclick={openSwitcher}
	>
		<Monitor size="14" />
		<span class="text-xs font-medium truncate max-w-[80px]">
			{activePlayerName}
		</span>
		{#if playerCount > 1}
			<ChevronDown size="12" />
		{/if}
	</button>
</Tip>
