<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		padding?: boolean;
		children: Snippet;
	}

	let { title, padding = true, children }: Props = $props();
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
	{#if title}
		<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
		</div>
	{/if}
	<div class={padding ? 'p-6' : ''}>
		{@render children()}
	</div>
</div>
