/**
 * Toast Notification Store
 *
 * Manages in-app toast notifications with auto-dismiss and queuing.
 */

import { writable } from 'svelte/store';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
	id: string;
	type: ToastType;
	title: string;
	message?: string;
	duration?: number;
	action?: {
		label: string;
		href?: string;
		onClick?: () => void;
	};
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	let idCounter = 0;

	function add(toast: Omit<Toast, 'id'>): string {
		const id = `toast-${++idCounter}`;
		const duration = toast.duration ?? 5000;

		update((toasts) => [...toasts, { ...toast, id }]);

		// Auto-dismiss
		if (duration > 0) {
			setTimeout(() => {
				dismiss(id);
			}, duration);
		}

		return id;
	}

	function dismiss(id: string): void {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	function clear(): void {
		update(() => []);
	}

	// Convenience methods
	function info(title: string, message?: string, duration?: number): string {
		return add({ type: 'info', title, message, duration });
	}

	function success(title: string, message?: string, duration?: number): string {
		return add({ type: 'success', title, message, duration });
	}

	function warning(title: string, message?: string, duration?: number): string {
		return add({ type: 'warning', title, message, duration });
	}

	function error(title: string, message?: string, duration?: number): string {
		return add({ type: 'error', title, message, duration: duration ?? 8000 });
	}

	return {
		subscribe,
		add,
		dismiss,
		clear,
		info,
		success,
		warning,
		error
	};
}

export const toasts = createToastStore();
