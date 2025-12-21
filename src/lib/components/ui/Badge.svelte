<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

	interface Props {
		variant?: Variant;
		class?: string;
		children: Snippet;
	}

	let { variant = 'default', class: className = '', children }: Props = $props();

	const variantClasses: Record<Variant, string> = {
		default: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300',
		success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
		warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
		danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
		info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
	};
</script>

<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {variantClasses[variant]} {className}">
	{@render children()}
</span>
