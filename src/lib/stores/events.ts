import { writable, derived } from 'svelte/store';
import type { EventLog, EventType, EventFilters } from '$lib/types';

export const events = writable<EventLog[]>([]);
export const loading = writable(false);
export const error = writable<string | null>(null);
export const total = writable(0);
export const filters = writable<EventFilters>({
	limit: 50,
	offset: 0
});

export const hasMore = derived([events, total], ([$events, $total]) => $events.length < $total);

export async function fetchEvents(append = false): Promise<void> {
	loading.set(true);
	error.set(null);

	try {
		let currentFilters: EventFilters = {};
		filters.subscribe((f) => (currentFilters = f))();

		const params = new URLSearchParams();
		if (currentFilters.deviceId) params.set('deviceId', currentFilters.deviceId);
		if (currentFilters.eventType) params.set('eventType', currentFilters.eventType);
		if (currentFilters.startDate) params.set('startDate', currentFilters.startDate.toISOString());
		if (currentFilters.endDate) params.set('endDate', currentFilters.endDate.toISOString());
		if (currentFilters.limit) params.set('limit', currentFilters.limit.toString());
		if (currentFilters.offset) params.set('offset', currentFilters.offset.toString());

		const response = await fetch(`/api/events?${params}`);
		const data = await response.json();

		if (data.success) {
			if (append) {
				events.update((e) => [...e, ...data.data]);
			} else {
				events.set(data.data);
			}
			total.set(data.total);
		} else {
			error.set(data.error || 'Failed to fetch events');
		}
	} catch (err) {
		error.set('Failed to fetch events');
	} finally {
		loading.set(false);
	}
}

export function setFilters(newFilters: Partial<EventFilters>): void {
	filters.update((f) => ({ ...f, ...newFilters, offset: 0 }));
}

export function loadMore(): void {
	filters.update((f) => ({
		...f,
		offset: (f.offset ?? 0) + (f.limit ?? 50)
	}));
	fetchEvents(true);
}

export function resetFilters(): void {
	filters.set({ limit: 50, offset: 0 });
}

// SSE for real-time events
let eventSource: EventSource | null = null;

export function subscribeToEvents(): void {
	if (eventSource) return;

	eventSource = new EventSource('/api/events/stream');

	eventSource.addEventListener('event', (e) => {
		try {
			const data = JSON.parse(e.data);
			if (data.type === 'event') {
				events.update((evts) => [data.payload, ...evts]);
				total.update((t) => t + 1);
			}
		} catch (err) {
			console.error('Failed to parse SSE event:', err);
		}
	});

	eventSource.onerror = () => {
		eventSource?.close();
		eventSource = null;
		// Reconnect after 5 seconds
		setTimeout(subscribeToEvents, 5000);
	};
}

export function unsubscribeFromEvents(): void {
	eventSource?.close();
	eventSource = null;
}
