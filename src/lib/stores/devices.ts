import { writable, derived } from 'svelte/store';
import type { Device } from '$lib/types';

export const devices = writable<Device[]>([]);
export const loading = writable(false);
export const error = writable<string | null>(null);

export const onlineDevices = derived(devices, ($devices) =>
	$devices.filter((d) => d.isOnline)
);

export const offlineDevices = derived(devices, ($devices) =>
	$devices.filter((d) => !d.isOnline)
);

export const devicesByType = derived(devices, ($devices) => {
	return {
		doorbells: $devices.filter((d) => d.type === 'doorbell'),
		cameras: $devices.filter((d) => d.type === 'camera'),
		sensors: $devices.filter((d) => d.type === 'sensor'),
		misc: $devices.filter((d) => d.type === 'misc')
	};
});

export async function fetchDevices(): Promise<void> {
	loading.set(true);
	error.set(null);

	try {
		console.log('[DEVICES] Fetching devices...');
		const response = await fetch('/api/devices');
		console.log('[DEVICES] Response status:', response.status);
		const data = await response.json();
		console.log('[DEVICES] Response data:', data);

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

export function getDevice(id: string): Device | undefined {
	let device: Device | undefined;
	devices.subscribe((d) => {
		device = d.find((dev) => dev.id === id);
	})();
	return device;
}
