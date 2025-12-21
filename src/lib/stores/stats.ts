import { writable } from 'svelte/store';
import type { DashboardStats } from '$lib/types';

export const stats = writable<DashboardStats | null>(null);
export const loading = writable(false);
export const error = writable<string | null>(null);

export async function fetchStats(): Promise<void> {
	loading.set(true);
	error.set(null);

	try {
		const response = await fetch('/api/stats');
		const data = await response.json();

		if (data.success) {
			stats.set(data.data);
		} else {
			error.set(data.error || 'Failed to fetch stats');
		}
	} catch (err) {
		error.set('Failed to fetch stats');
	} finally {
		loading.set(false);
	}
}
