<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		title?: string;
		onclose?: () => void;
		children: Snippet;
		footer?: Snippet;
	}

	let { open = $bindable(), title, onclose, children, footer }: Props = $props();

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-zinc-800">
			{#if title}
				<div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
					<h2 class="text-lg font-medium text-zinc-900 dark:text-white">{title}</h2>
					<button
						onclick={handleClose}
						class="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500 dark:hover:bg-zinc-700"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}

			<div class="p-4">
				{@render children()}
			</div>

			{#if footer}
				<div class="border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
