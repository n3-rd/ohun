<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { onMount, onDestroy } from 'svelte';
	import { availablePlayers, currentActivePlayer, showPlayerSwitcher, type MediaPlayer } from '$lib/stores/player-manager-store';
	import { accentColor, textColor } from '$lib/stores/player-store';
	import { Monitor, Music, X, RefreshCw } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { getCurrentPlaying } from '$lib/player';

	let players: MediaPlayer[] = $state([]);
	let activePlayer: string | null = $state(null);
	let isRefreshing = $state(false);

	// Subscribe to stores
	$effect(() => {
		players = $availablePlayers;
	});

	$effect(() => {
		activePlayer = $currentActivePlayer;
	});

	const refreshPlayers = async () => {
		if (isRefreshing) return;
		
		try {
			isRefreshing = true;
			const playerNames: string[] = await invoke('get_available_players');
			
			const playersWithStatus = await Promise.all(
				playerNames.map(async (name) => {
					try {
						// Get status for each player
						const status = await invoke('get_player_status', { player: name });
						return {
							name,
							displayName: formatPlayerName(name),
							status: status || 'Unknown'
						} as MediaPlayer;
					} catch {
						return {
							name,
							displayName: formatPlayerName(name),
							status: 'Unknown'
						} as MediaPlayer;
					}
				})
			);

			// Filter out players with invalid statuses or those that contain help text
			const validPlayers = playersWithStatus.filter(player => {
				const status = player.status;
				// Exclude players with help text, errors, or extremely long names
				if (status.includes('Usage:') || 
				    status.includes('Help Options:') || 
				    status.includes('COMMAND') ||
				    status.length > 50 ||
				    player.name.length > 100) {
					return false;
				}
				return true;
			});

			availablePlayers.set(validPlayers);
		} catch (error) {
			console.error('Failed to refresh players:', error);
			toast.error('Failed to refresh players');
		} finally {
			isRefreshing = false;
		}
	};

	const formatPlayerName = (name: string): string => {
		// Convert player names to more readable format
		return name
			.split('.')
			.pop()
			?.replace(/[-_]/g, ' ')
			.split(' ')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ') || name;
	};

	const selectPlayer = async (playerName: string) => {
		try {
			await invoke('set_active_player', { player: playerName });
			currentActivePlayer.set(playerName);
			showPlayerSwitcher.set(false);
			
			// Refresh current playing info with new player
			await getCurrentPlaying();
			
			toast.success(`Switched to ${formatPlayerName(playerName)}`);
		} catch (error) {
			console.error('Failed to set active player:', error);
			toast.error('Failed to switch player');
		}
	};

	const getPlayerIcon = (playerName: string) => {
		const name = playerName.toLowerCase();
		if (name.includes('spotify')) return '🎵';
		if (name.includes('vlc')) return '🎬';
		if (name.includes('firefox') || name.includes('chrome') || name.includes('browser')) return '🌐';
		if (name.includes('rhythmbox')) return '🎶';
		if (name.includes('clementine')) return '🍊';
		if (name.includes('amarok')) return '🐺';
		return '🎵';
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'Playing': return '#1db954';
			case 'Paused': return '#ffa500';
			case 'Stopped': return '#ff4444';
			default: return '#888888';
		}
	};

	onMount(() => {
		refreshPlayers();
	});
</script>

{#if $showPlayerSwitcher}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
		onclick={() => showPlayerSwitcher.set(false)}
		role="button"
		tabindex="-1"
	></div>

	<!-- Player Switcher Modal -->
	<div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
		<div 
			class="bg-black/20 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl border border-white/20 min-w-[400px] max-w-[500px]"
			style="background-color: {$accentColor}20; color: {$textColor};"
		>
			<!-- Header -->
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-3">
					<Monitor size="24" />
					<h2 class="text-xl font-bold">Choose Media Player</h2>
				</div>
				<div class="flex items-center gap-2">
					<button
						class="p-2 rounded-lg hover:bg-white/10 transition-colors"
						onclick={refreshPlayers}
						disabled={isRefreshing}
						title="Refresh players"
					>
						<RefreshCw size="18" class={isRefreshing ? 'animate-spin' : ''} />
					</button>
					<button
						class="p-2 rounded-lg hover:bg-white/10 transition-colors"
						onclick={() => showPlayerSwitcher.set(false)}
					>
						<X size="18" />
					</button>
				</div>
			</div>

			<!-- Players List -->
			<div class="space-y-3 max-h-[400px] overflow-y-auto">
				{#if players.length === 0}
					<div class="text-center py-8 opacity-70">
						<Music size="48" class="mx-auto mb-3 opacity-50" />
						<p class="text-lg font-medium">No media players detected</p>
						<p class="text-sm mt-1">Try opening a music app and refresh</p>
					</div>
				{:else}
					{#each players as player (player.name)}
						<button
							class="w-full p-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all duration-200 border border-white/10 hover:border-white/30 text-left group {activePlayer === player.name ? 'ring-2 ring-white/50 bg-white/25' : ''}"
							onclick={() => selectPlayer(player.name)}
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-4">
									<div class="text-2xl">
										{getPlayerIcon(player.name)}
									</div>
									<div>
										<h3 class="font-semibold text-lg group-hover:text-white transition-colors">
											{player.displayName}
										</h3>
										<p class="text-sm opacity-70 font-mono">
											{player.name}
										</p>
									</div>
								</div>
								<div class="flex items-center gap-3">
									<div 
										class="px-3 py-1 rounded-full text-xs font-medium border"
										style="background-color: {getStatusColor(player.status)}20; border-color: {getStatusColor(player.status)}40; color: {getStatusColor(player.status)};"
									>
										{player.status}
									</div>
									{#if activePlayer === player.name}
										<div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div class="mt-6 pt-4 border-t border-white/20">
				<p class="text-xs opacity-60 text-center">
					Players are automatically detected. Make sure your media app is running.
				</p>
			</div>
		</div>
	</div>
{/if}
