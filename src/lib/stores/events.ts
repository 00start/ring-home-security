import { writable, derived, get } from 'svelte/store';
import type { EventLog, EventType, EventFilters } from '$lib/types';
import { notificationService } from '$lib/services/notifications';
import { notificationPreferences } from './preferences';
import { toasts } from './toast';

// Event type display names for toasts
const EVENT_TITLES: Record<EventType, string> = {
	ding: 'Doorbell Ring',
	motion: 'Motion Detected',
	door_open: 'Door Opened',
	door_close: 'Door Closed',
	device_offline: 'Device Offline',
	device_online: 'Device Online'
};

/**
 * Handle incoming real-time event - show notifications
 */
function handleNewEvent(event: EventLog): void {
	const prefs = get(notificationPreferences);

	// Check if we should notify for this event type
	if (!prefs.enabled || !prefs.eventTypes[event.eventType]) {
		return;
	}

	// Show browser notification
	notificationService.showEventNotification(event, {
		playSound: prefs.soundEnabled
	});

	// Show in-app toast
	const title = EVENT_TITLES[event.eventType] || 'Event';
	toasts.add({
		type: event.eventType === 'device_offline' ? 'warning' : 'info',
		title: `${title} - ${event.deviceName}`,
		message: new Date(event.timestamp).toLocaleTimeString(),
		duration: 5000,
		action: event.recordingId
			? { label: 'View Recording', href: `/recordings?id=${event.recordingId}` }
			: undefined
	});
}

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
	console.log('[EVENTS] Fetching events, append:', append);
	loading.set(true);
	error.set(null);

	try {
		let currentFilters: EventFilters = {};
		filters.subscribe((f) => (currentFilters = f))();

		const params = new URLSearchParams();
		if (currentFilters.deviceId) params.set('deviceId', currentFilters.deviceId);
		if (currentFilters.eventType) params.set('eventType', currentFilters.eventType);
		if (currentFilters.hasRecording !== undefined)
			params.set('hasRecording', currentFilters.hasRecording.toString());
		if (currentFilters.startDate) params.set('startDate', currentFilters.startDate.toISOString());
		if (currentFilters.endDate) params.set('endDate', currentFilters.endDate.toISOString());
		if (currentFilters.limit) params.set('limit', currentFilters.limit.toString());
		if (currentFilters.offset) params.set('offset', currentFilters.offset.toString());

		console.log('[EVENTS] Fetching from:', `/api/events?${params}`);
		const response = await fetch(`/api/events?${params}`);
		console.log('[EVENTS] Response status:', response.status);
		const data = await response.json();
		console.log('[EVENTS] Response data:', data);

		if (data.success) {
			if (append) {
				events.update((e) => [...e, ...data.data]);
			} else {
				events.set(data.data);
			}
			total.set(data.total);
			console.log('[EVENTS] Set events:', data.data.length, 'total:', data.total);
		} else {
			error.set(data.error || 'Failed to fetch events');
			console.error('[EVENTS] Error:', data.error);
		}
	} catch (err) {
		console.error('[EVENTS] Exception:', err);
		error.set('Failed to fetch events');
	} finally {
		console.log('[EVENTS] Setting loading to false');
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
				const event = data.payload as EventLog;
				events.update((evts) => [event, ...evts]);
				total.update((t) => t + 1);

				// Trigger notifications for the new event
				handleNewEvent(event);
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
