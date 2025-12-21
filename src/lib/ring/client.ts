import { RingApi, RingCamera, RingDevice } from 'ring-client-api';
import { config } from '$lib/config';
import { tokensRepo } from '$lib/db';
import { createLogger, retry } from '$lib/utils';

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
		cameraDingsPollingSeconds: 2
	});

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

export function mapDeviceType(device: RingDevice): 'sensor' | 'camera' | 'doorbell' {
	const deviceType = device.deviceType;

	if (deviceType.includes('sensor') || deviceType.includes('contact')) {
		return 'sensor';
	}

	if (deviceType.includes('doorbell') || deviceType.includes('doorbot')) {
		return 'doorbell';
	}

	return 'camera';
}
