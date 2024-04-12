<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ArrowLeft } from 'lucide-svelte';

	export const goBack = () => {
		window.history.back();
	};
</script>

<button
	class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-[#ebebeb] hover:bg-gray-300"
	on:click={() => goBack()}
>
	<ArrowLeft size="15" stroke-width="3" />
</button>
