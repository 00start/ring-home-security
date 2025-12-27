<script lang="ts">
	import { onMount } from 'svelte';
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
	let modalElement: HTMLDivElement | undefined = $state();
	let previousActiveElement: Element | null = null;

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}

		// Focus trap: Handle tab key
		if (event.key === 'Tab' && modalElement) {
			const focusableElements = modalElement.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const firstFocusable = focusableElements[0] as HTMLElement;
			const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

			if (event.shiftKey) {
				// Shift + Tab
				if (document.activeElement === firstFocusable) {
					lastFocusable?.focus();
					event.preventDefault();
				}
			} else {
				// Tab
				if (document.activeElement === lastFocusable) {
					firstFocusable?.focus();
					event.preventDefault();
				}
			}
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	// Focus management
	$effect(() => {
		if (open && modalElement) {
			// Save the currently focused element
			previousActiveElement = document.activeElement;

			// Focus the first focusable element in the modal
			const focusableElements = modalElement.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const firstFocusable = focusableElements[0] as HTMLElement;
			firstFocusable?.focus();

			// Prevent body scroll
			document.body.style.overflow = 'hidden';

			// Cleanup function
			return () => {
				document.body.style.overflow = '';
				// Restore focus to the previously focused element
				if (previousActiveElement instanceof HTMLElement) {
					previousActiveElement.focus();
				}
			};
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		bind:this={modalElement}
		data-testid="modal-backdrop"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
		aria-describedby="modal-content"
	>
		<div
			data-testid="modal"
			class="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-zinc-800"
			role="document"
		>
			{#if title}
				<div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
					<h2
						id="modal-title"
						data-testid="modal-title"
						class="text-lg font-medium text-zinc-900 dark:text-white"
					>
						{title}
					</h2>
					<button
						data-testid="modal-close-button"
						onclick={handleClose}
						class="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:hover:bg-zinc-700"
						aria-label="Close modal"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}

			<div id="modal-content" class="p-4">
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
