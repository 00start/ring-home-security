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
		sensors: $devices.filter((d) => d.type === 'sensor')
	};
});

export async function fetchDevices(): Promise<void> {
	loading.set(true);
	error.set(null);

	try {
		const response = await fetch('/api/devices');
		const data = await response.json();

		if (data.success) {
			devices.set(data.data);
		} else {
			error.set(data.error || 'Failed to fetch devices');
		}
	} catch (err) {
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
