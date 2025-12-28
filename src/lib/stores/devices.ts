import { writable, derived } from 'svelte/store';
import type { Device } from '$lib/types';
import { ApiCache } from '$lib/utils/performance';

// Create cache with 2 minute TTL for devices
const devicesCache = new ApiCache<{ success: boolean; data: Device[]; error?: string }>({
	ttl: 120000, // 2 minutes
	maxSize: 50
});

export const devices = writable<Device[]>([]);
export const loading = writable(false);
export const error = writable<string | null>(null);

export const onlineDevices = derived(devices, ($devices) => $devices.filter((d) => d.isOnline));

export const offlineDevices = derived(devices, ($devices) => $devices.filter((d) => !d.isOnline));

export const devicesByType = derived(devices, ($devices) => {
	return {
		doorbells: $devices.filter((d) => d.type === 'doorbell'),
		cameras: $devices.filter((d) => d.type === 'camera'),
		sensors: $devices.filter((d) => d.type === 'sensor'),
		misc: $devices.filter((d) => d.type === 'misc')
	};
});

export async function fetchDevices(skipCache = false): Promise<void> {
	loading.set(true);
	error.set(null);

	try {
		const cacheKey = '/api/devices';

		// Check cache first (unless explicitly skipping)
		if (!skipCache) {
			const cached = devicesCache.get(cacheKey);
			if (cached) {
				console.log('[DEVICES] Using cached data');
				if (cached.success) {
					devices.set(cached.data);
				} else {
					error.set(cached.error || 'Failed to fetch devices');
				}
				loading.set(false);
				return;
			}
		}

		console.log('[DEVICES] Fetching devices...');
		const response = await fetch('/api/devices');
		console.log('[DEVICES] Response status:', response.status);
		const data = await response.json();
		console.log('[DEVICES] Response data:', data);

		// Cache the response
		devicesCache.set(cacheKey, data);

		if (data.success) {
			console.log('[DEVICES] Setting devices:', data.data.length, 'devices');
			devices.set(data.data);
		} else {
			console.error('[DEVICES] Failed:', data.error);
			error.set(data.error || 'Failed to fetch devices');
		}
	} catch (err) {
		console.error('[DEVICES] Error:', err);
		error.set('Failed to fetch devices');
	} finally {
		loading.set(false);
	}
}

/**
 * Clear devices cache
 */
export function clearDevicesCache(): void {
	devicesCache.clear();
}

export function getDevice(id: string): Device | undefined {
	let device: Device | undefined;
	devices.subscribe((d) => {
		device = d.find((dev) => dev.id === id);
	})();
	return device;
}
