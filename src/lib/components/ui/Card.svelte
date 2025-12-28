<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		class?: string;
		children: Snippet;
		header?: Snippet;
		footer?: Snippet;
		'data-testid'?: string;
		id?: string;
	}

	let { title, class: className = '', children, header, footer, ...rest }: Props = $props();
</script>

<div
	class="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 {className}"
	{...rest}
>
	{#if header}
		<div class="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
			{@render header()}
		</div>
	{:else if title}
		<div class="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
			<h3 class="text-lg font-medium text-zinc-900 dark:text-white">{title}</h3>
		</div>
	{/if}

	<div class="p-4">
		{@render children()}
	</div>

	{#if footer}
		<div
			class="border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
		>
			{@render footer()}
		</div>
	{/if}
</div>
