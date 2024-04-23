<script>
	import { textColor } from '$lib/stores/player-store';
	import { AlignCenter } from 'lucide-svelte';
</script>

<div class="flex w-8 items-center justify-center">
	<AlignCenter color={$textColor} />
</div>
