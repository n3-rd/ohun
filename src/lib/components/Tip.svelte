<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	export let text: string;
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		<slot />
	</Tooltip.Trigger>
	<Tooltip.Content>
		<p>{text}</p>
	</Tooltip.Content>
</Tooltip.Root>
