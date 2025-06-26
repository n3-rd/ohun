<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	interface Props {
		text: string;
		children?: import('svelte').Snippet;
	}

	let { text, children }: Props = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{@render children?.()}
	</Tooltip.Trigger>
	<Tooltip.Content>
		<p>{text}</p>
	</Tooltip.Content>
</Tooltip.Root>
