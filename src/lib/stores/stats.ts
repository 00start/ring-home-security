import { writable } from 'svelte/store';
import type { DashboardStats } from '$lib/types';
import { ApiCache } from '$lib/utils/performance';

// Create cache with 30 second TTL for stats (they change frequently)
const statsCache = new ApiCache<{ success: boolean; data: DashboardStats; error?: string }>({
	ttl: 30000, // 30 seconds
	maxSize: 10
});

export const stats = writable<DashboardStats | null>(null);
export const loading = writable(false);
export const error = writable<string | null>(null);

export async function fetchStats(skipCache = false): Promise<void> {
	loading.set(true);
	error.set(null);

	try {
		const cacheKey = '/api/stats';

		// Check cache first (unless explicitly skipping)
		if (!skipCache) {
			const cached = statsCache.get(cacheKey);
			if (cached) {
				if (cached.success) {
					stats.set(cached.data);
				} else {
					error.set(cached.error || 'Failed to fetch stats');
				}
				loading.set(false);
				return;
			}
		}

		const response = await fetch('/api/stats');
		const data = await response.json();

		// Cache the response
		statsCache.set(cacheKey, data);

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

/**
 * Clear stats cache
 */
export function clearStatsCache(): void {
	statsCache.clear();
}
