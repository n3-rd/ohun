<script>
	import { lyricsLoading } from '../stores/lyricsStore';
</script>

{#if $lyricsLoading}
	<div class="lyrics-loader">
		<div class="spinner"></div>
		<p class="loading-text">Finding lyrics... 🎵</p>
	</div>
{/if}

<style>
	.lyrics-loader {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		min-height: 200px;
		background: var(--background-secondary, rgba(255, 255, 255, 0.05));
		border-radius: 12px;
		backdrop-filter: blur(10px);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.2);
		border-top: 3px solid var(--accent-color, #ff6b6b);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.loading-text {
		color: var(--text-secondary, rgba(255, 255, 255, 0.7));
		font-size: 0.9rem;
		margin: 0;
		opacity: 0.8;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>
