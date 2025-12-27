/**
 * Zone Settings Store
 *
 * Manages zone/camera-specific settings with localStorage persistence.
 * Includes settings like pre-event buffer, motion sensitivity, recording duration, etc.
 */

import { writable, get } from 'svelte/store';

export interface ZoneSettings {
	preBufferEnabled: boolean;
	motionSensitivity?: number;
	recordingDuration?: number;
}

export interface ZoneSettingsMap {
	[deviceId: string]: ZoneSettings;
}

const DEFAULT_ZONE_SETTINGS: ZoneSettings = {
	preBufferEnabled: false,
	motionSensitivity: 5,
	recordingDuration: 60
};

const STORAGE_KEY = 'ring-zone-settings';

function loadSettings(): ZoneSettingsMap {
	if (typeof window === 'undefined') {
		return {};
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch {
		// Ignore parse errors
	}

	return {};
}

function createZoneSettingsStore() {
	const { subscribe, set, update } = writable<ZoneSettingsMap>({});

	// Initialize from localStorage on client
	if (typeof window !== 'undefined') {
		set(loadSettings());
	}

	function save(settings: ZoneSettingsMap): void {
		if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
			} catch (e) {
				// Ignore storage errors (e.g., quota exceeded, private browsing)
			}
		}
	}

	function getDeviceSettings(deviceId: string): ZoneSettings {
		const allSettings = get({ subscribe });
		return allSettings[deviceId] || { ...DEFAULT_ZONE_SETTINGS };
	}

	function setPreBufferEnabled(deviceId: string, enabled: boolean): void {
		update((settings) => {
			const deviceSettings = settings[deviceId] || { ...DEFAULT_ZONE_SETTINGS };
			const updated = {
				...settings,
				[deviceId]: {
					...deviceSettings,
					preBufferEnabled: enabled
				}
			};
			save(updated);
			return updated;
		});
	}

	function setMotionSensitivity(deviceId: string, sensitivity: number): void {
		update((settings) => {
			const deviceSettings = settings[deviceId] || { ...DEFAULT_ZONE_SETTINGS };
			const updated = {
				...settings,
				[deviceId]: {
					...deviceSettings,
					motionSensitivity: sensitivity
				}
			};
			save(updated);
			return updated;
		});
	}

	function setRecordingDuration(deviceId: string, duration: number): void {
		update((settings) => {
			const deviceSettings = settings[deviceId] || { ...DEFAULT_ZONE_SETTINGS };
			const updated = {
				...settings,
				[deviceId]: {
					...deviceSettings,
					recordingDuration: duration
				}
			};
			save(updated);
			return updated;
		});
	}

	function reset(deviceId?: string): void {
		if (deviceId) {
			update((settings) => {
				const updated = { ...settings };
				delete updated[deviceId];
				save(updated);
				return updated;
			});
		} else {
			set({});
			save({});
		}
	}

	function reload(): void {
		set(loadSettings());
	}

	return {
		subscribe,
		getDeviceSettings,
		setPreBufferEnabled,
		setMotionSensitivity,
		setRecordingDuration,
		reset,
		reload
	};
}

export const zoneSettings = createZoneSettingsStore();
