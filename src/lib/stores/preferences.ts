/**
 * Notification Preferences Store
 *
 * Manages user preferences for notifications with localStorage persistence.
 */

import { writable, get } from 'svelte/store';
import type { EventType } from '$lib/types';

export interface NotificationPreferences {
	enabled: boolean;
	soundEnabled: boolean;
	eventTypes: Record<EventType, boolean>;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
	enabled: true,
	soundEnabled: true,
	eventTypes: {
		ding: true,
		motion: true,
		door_open: true,
		door_close: false,
		device_offline: true,
		device_online: false
	}
};

const STORAGE_KEY = 'ring-notification-preferences';

function loadPreferences(): NotificationPreferences {
	if (typeof window === 'undefined') {
		return DEFAULT_PREFERENCES;
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Merge with defaults to handle new event types
			return {
				...DEFAULT_PREFERENCES,
				...parsed,
				eventTypes: {
					...DEFAULT_PREFERENCES.eventTypes,
					...parsed.eventTypes
				}
			};
		}
	} catch {
		// Ignore parse errors
	}

	return DEFAULT_PREFERENCES;
}

function createPreferencesStore() {
	const { subscribe, set, update } = writable<NotificationPreferences>(DEFAULT_PREFERENCES);

	// Initialize from localStorage on client
	if (typeof window !== 'undefined') {
		set(loadPreferences());
	}

	function save(prefs: NotificationPreferences): void {
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
		}
	}

	function setEnabled(enabled: boolean): void {
		update((prefs) => {
			const updated = { ...prefs, enabled };
			save(updated);
			return updated;
		});
	}

	function setSoundEnabled(soundEnabled: boolean): void {
		update((prefs) => {
			const updated = { ...prefs, soundEnabled };
			save(updated);
			return updated;
		});
	}

	function setEventTypeEnabled(eventType: EventType, enabled: boolean): void {
		update((prefs) => {
			const updated = {
				...prefs,
				eventTypes: {
					...prefs.eventTypes,
					[eventType]: enabled
				}
			};
			save(updated);
			return updated;
		});
	}

	function shouldNotify(eventType: EventType): boolean {
		const prefs = get({ subscribe });
		return prefs.enabled && prefs.eventTypes[eventType];
	}

	function reset(): void {
		set(DEFAULT_PREFERENCES);
		save(DEFAULT_PREFERENCES);
	}

	return {
		subscribe,
		setEnabled,
		setSoundEnabled,
		setEventTypeEnabled,
		shouldNotify,
		reset
	};
}

export const notificationPreferences = createPreferencesStore();
