import { writable } from 'svelte/store';
import type { Recording, RecordingStatus } from '$lib/types';
import { ApiCache } from '$lib/utils/performance';

// Create cache with 1 minute TTL for recordings
const recordingsCache = new ApiCache<{ success: boolean; data: Recording[]; error?: string }>({
	ttl: 60000, // 1 minute
	maxSize: 50
});

export const recordings = writable<Recording[]>([]);
export const loading = writable(false);
export const error = writable<string | null>(null);

interface RecordingFilters {
	deviceId?: string;
	status?: RecordingStatus;
	limit?: number;
	offset?: number;
}

export async function fetchRecordings(
	filters: RecordingFilters = {},
	skipCache = false
): Promise<void> {
	loading.set(true);
	error.set(null);

	try {
		const params = new URLSearchParams();
		if (filters.deviceId) params.set('deviceId', filters.deviceId);
		if (filters.status) params.set('status', filters.status);
		if (filters.limit) params.set('limit', filters.limit.toString());
		if (filters.offset) params.set('offset', filters.offset.toString());

		const cacheKey = `/api/recordings?${params.toString()}`;

		// Check cache first (unless explicitly skipping)
		if (!skipCache) {
			const cached = recordingsCache.get(cacheKey);
			if (cached) {
				if (cached.success) {
					recordings.set(cached.data);
				} else {
					error.set(cached.error || 'Failed to fetch recordings');
				}
				loading.set(false);
				return;
			}
		}

		const response = await fetch(`/api/recordings?${params}`);
		const data = await response.json();

		// Cache the response
		recordingsCache.set(cacheKey, data);

		if (data.success) {
			recordings.set(data.data);
		} else {
			error.set(data.error || 'Failed to fetch recordings');
		}
	} catch (err) {
		error.set('Failed to fetch recordings');
	} finally {
		loading.set(false);
	}
}

/**
 * Clear recordings cache
 */
export function clearRecordingsCache(): void {
	recordingsCache.clear();
}

export function getVideoUrl(recordingId: string): string {
	return `/api/recordings/${recordingId}/video`;
}

export function getThumbnailUrl(recordingId: string): string {
	return `/api/recordings/${recordingId}/thumbnail`;
}
