<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
		error?: string;
		value?: string;
		'data-testid'?: string;
	}

	let {
		label,
		error,
		class: className = '',
		id,
		value = $bindable(''),
		'data-testid': testId,
		...rest
	}: Props = $props();

	const fallbackId = `input-${Math.random().toString(36).substr(2, 9)}`;
	const inputId = $derived(id ?? fallbackId);
</script>

<div class="w-full">
	{#if label}
		<label for={inputId} class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
			{label}
		</label>
	{/if}
	<input
		id={inputId}
		bind:value
		data-testid={testId || `input-${inputId}`}
		class="block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors
			{error
			? 'border-red-300 focus:border-red-500 focus:ring-red-500'
			: 'border-zinc-300 focus:border-blue-500 focus:ring-blue-500 dark:border-zinc-600'}
			bg-white focus:ring-1 focus:outline-none
			disabled:cursor-not-allowed disabled:bg-zinc-100
			dark:bg-zinc-700 dark:text-white dark:disabled:bg-zinc-800
			{className}"
		{...rest}
	/>
	{#if error}
		<p data-testid="input-error" class="mt-1 text-sm text-red-600">{error}</p>
	{/if}
</div>
