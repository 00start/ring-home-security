<script lang="ts">
	import { toasts, type Toast, type ToastType } from '$lib/stores/toast';
	import { fly } from 'svelte/transition';

	const typeStyles: Record<ToastType, { bg: string; icon: string; iconColor: string }> = {
		info: {
			bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
			icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
			iconColor: 'text-blue-500'
		},
		success: {
			bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
			iconColor: 'text-green-500'
		},
		warning: {
			bg: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
			icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
			iconColor: 'text-yellow-500'
		},
		error: {
			bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
			icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
			iconColor: 'text-red-500'
		}
	};

	function handleAction(toast: Toast) {
		if (toast.action?.onClick) {
			toast.action.onClick();
		}
		if (toast.action?.href) {
			window.location.href = toast.action.href;
		}
		toasts.dismiss(toast.id);
	}
</script>

<div
	data-testid="toast-container"
	class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
>
	{#each $toasts as toast (toast.id)}
		<div
			data-testid="toast"
			data-toast-type={toast.type}
			data-toast-id={toast.id}
			class="pointer-events-auto rounded-lg border p-4 shadow-lg {typeStyles[toast.type].bg}"
			transition:fly={{ x: 100, duration: 200 }}
		>
			<div class="flex items-start gap-3">
				<svg
					class="h-5 w-5 flex-shrink-0 {typeStyles[toast.type].iconColor}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d={typeStyles[toast.type].icon}
					/>
				</svg>

				<div class="min-w-0 flex-1">
					<p data-testid="toast-title" class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
						{toast.title}
					</p>
					{#if toast.message}
						<p data-testid="toast-message" class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
							{toast.message}
						</p>
					{/if}
					{#if toast.action}
						<button
							data-testid="toast-action"
							class="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
							onclick={() => handleAction(toast)}
						>
							{toast.action.label}
						</button>
					{/if}
				</div>

				<button
					data-testid="toast-dismiss"
					class="flex-shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
					onclick={() => toasts.dismiss(toast.id)}
					aria-label="Dismiss notification"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>
	{/each}
</div>
