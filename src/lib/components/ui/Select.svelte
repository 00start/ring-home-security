<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface Props extends HTMLSelectAttributes {
		label?: string;
		error?: string;
		children: Snippet;
		'data-testid'?: string;
	}

	let { label, error, class: className = '', id, children, 'data-testid': testId, ...rest }: Props = $props();

	const fallbackId = `select-${Math.random().toString(36).substr(2, 9)}`;
	const selectId = $derived(id ?? fallbackId);
</script>

<div class="w-full">
	{#if label}
		<label for={selectId} class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
			{label}
		</label>
	{/if}
	<select
		id={selectId}
		data-testid={testId || `select-${selectId}`}
		class="block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors
			{error
				? 'border-red-300 focus:border-red-500 focus:ring-red-500'
				: 'border-zinc-300 focus:border-blue-500 focus:ring-blue-500 dark:border-zinc-600'}
			bg-white dark:bg-zinc-700 dark:text-white
			focus:outline-none focus:ring-1
			disabled:cursor-not-allowed disabled:bg-zinc-100 dark:disabled:bg-zinc-800
			{className}"
		{...rest}
	>
		{@render children()}
	</select>
	{#if error}
		<p data-testid="select-error" class="mt-1 text-sm text-red-600">{error}</p>
	{/if}
</div>
