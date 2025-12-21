import { writable } from 'svelte/store';
import type { Recording, RecordingStatus } from '$lib/types';

export const recordings = writable<Recording[]>([]);
export const loading = writable(false);
export const error = writable<string | null>(null);

interface RecordingFilters {
	deviceId?: string;
	status?: RecordingStatus;
	limit?: number;
	offset?: number;
}

export async function fetchRecordings(filters: RecordingFilters = {}): Promise<void> {
	loading.set(true);
	error.set(null);

	try {
		const params = new URLSearchParams();
		if (filters.deviceId) params.set('deviceId', filters.deviceId);
		if (filters.status) params.set('status', filters.status);
		if (filters.limit) params.set('limit', filters.limit.toString());
		if (filters.offset) params.set('offset', filters.offset.toString());

		const response = await fetch(`/api/recordings?${params}`);
		const data = await response.json();

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

export function getVideoUrl(recordingId: string): string {
	return `/api/recordings/${recordingId}/video`;
}

export function getThumbnailUrl(recordingId: string): string {
	return `/api/recordings/${recordingId}/thumbnail`;
}
