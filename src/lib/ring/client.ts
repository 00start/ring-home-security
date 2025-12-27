import { RingApi, RingCamera, RingDevice } from 'ring-client-api';
import { config } from '$lib/config';
import { tokensRepo } from '$lib/db';
import { createLogger } from '$lib/utils/logger.server';
import { retry } from '$lib/utils';

const logger = createLogger('ring-client');

let ringApi: RingApi | null = null;

export async function getRingApi(): Promise<RingApi> {
	if (ringApi) {
		return ringApi;
	}

	// Try to get refresh token from database first, then fall back to config
	let refreshToken = tokensRepo.getRefreshToken();

	if (!refreshToken) {
		refreshToken = config.ringRefreshToken ?? null;

		if (!refreshToken) {
			throw new Error(
				'No Ring refresh token found. Please set RING_REFRESH_TOKEN environment variable.'
			);
		}

		// Save to database for persistence
		tokensRepo.saveRefreshToken(refreshToken);
	}

	logger.info('Initializing Ring API');

	ringApi = new RingApi({
		refreshToken,
		controlCenterDisplayName: 'Ring Home Security',
		cameraStatusPollingSeconds: config.ringPollingIntervalSeconds
	});

	logger.info({ pollingInterval: config.ringPollingIntervalSeconds }, 'Ring API status polling interval configured');

	// Handle token refresh and persist new token
	ringApi.onRefreshTokenUpdated.subscribe({
		next: ({ newRefreshToken }) => {
			logger.info('Ring refresh token updated');
			tokensRepo.saveRefreshToken(newRefreshToken);
		}
	});

	return ringApi;
}

export async function getCameras(): Promise<RingCamera[]> {
	const api = await getRingApi();
	return api.getCameras();
}

export async function getDevices(): Promise<RingDevice[]> {
	const api = await getRingApi();
	const locations = await api.getLocations();

	const devices: RingDevice[] = [];
	for (const location of locations) {
		const locationDevices = await location.getDevices();
		devices.push(...locationDevices);
	}

	return devices;
}

export function disconnectRingApi(): void {
	if (ringApi) {
		ringApi.disconnect();
		ringApi = null;
		logger.info('Ring API disconnected');
	}
}

export function mapCameraType(camera: RingCamera): 'doorbell' | 'camera' {
	if (camera.isDoorbot) {
		return 'doorbell';
	}
	return 'camera';
}

export interface DeviceTypeInfo {
	type: 'sensor' | 'camera' | 'doorbell' | 'misc';
	subtype?: string;
}

export function mapDeviceType(device: RingDevice): DeviceTypeInfo {
	const deviceType = device.deviceType.toLowerCase();

	// Contact sensors (doors/windows)
	if (deviceType.includes('contact') || deviceType.includes('sensor.contact')) {
		return { type: 'sensor', subtype: 'contact' };
	}

	// Motion sensors
	if (deviceType.includes('motion') || deviceType.includes('sensor.motion')) {
		return { type: 'sensor', subtype: 'motion' };
	}

	// Flood/freeze sensors
	if (deviceType.includes('flood') || deviceType.includes('freeze')) {
		return { type: 'sensor', subtype: 'flood' };
	}

	// Smoke/CO detectors
	if (deviceType.includes('smoke')) {
		return { type: 'sensor', subtype: 'smoke' };
	}
	if (deviceType.includes('co.alarm') || deviceType === 'listener.co') {
		return { type: 'sensor', subtype: 'co' };
	}

	// Generic sensor fallback
	if (deviceType.includes('sensor')) {
		return { type: 'sensor', subtype: 'unknown' };
	}

	// Camera types
	if (deviceType.includes('doorbell') || deviceType.includes('doorbot')) {
		return { type: 'doorbell' };
	}
	if (deviceType.includes('camera') || deviceType.includes('stickup_cam')) {
		return { type: 'camera' };
	}

	// Misc devices (base stations, keypads, range extenders, etc.)
	if (deviceType.includes('hub') || deviceType.includes('base_station') || deviceType === 'hub.redsky') {
		return { type: 'misc', subtype: 'base_station' };
	}
	if (deviceType.includes('keypad')) {
		return { type: 'misc', subtype: 'keypad' };
	}
	if (deviceType.includes('range') || deviceType.includes('extender') || deviceType === 'range-extender.zwave') {
		return { type: 'misc', subtype: 'range_extender' };
	}
	if (deviceType.includes('siren')) {
		return { type: 'misc', subtype: 'siren' };
	}
	if (deviceType.includes('security-panel') || deviceType.includes('alarm') || deviceType === 'security-panel') {
		return { type: 'misc', subtype: 'base_station' };
	}

	// Default to misc for unknown device types (non-camera)
	return { type: 'misc', subtype: 'unknown' };
}
