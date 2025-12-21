/**
 * Ring Listener Background Worker
 *
 * This worker maintains a persistent connection to the Ring API,
 * listening for events (motion, doorbell, sensor triggers) and:
 * - Logging events to the database
 * - Triggering video recordings
 * - Enqueueing transcode jobs
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { RingCamera } from 'ring-client-api';
import { initDatabase, devicesRepo, eventsRepo, recordingsRepo } from '../lib/db/index.js';
import { getRingApi, getCameras, getDevices, mapCameraType, mapDeviceType } from '../lib/ring/index.js';
import { addTranscodeJob } from '../lib/queue/index.js';
import { createLogger, retry, sleep } from '../lib/utils/index.js';
import { getRecordingPath } from '../lib/utils/paths.js';
import type { EventType, TranscodeJobData } from '../lib/types/index.js';

const logger = createLogger('ring-listener');

let isShuttingDown = false;

// Type for Ring device data (not exported in newer versions)
interface RingDeviceData {
	zid: string;
	name: string;
	faulted?: boolean;
	[key: string]: any;
}

async function handleMotionOrDing(
	camera: RingCamera,
	eventType: 'motion' | 'ding',
	notification?: any
): Promise<void> {
	const timestamp = new Date();

	logger.info(
		{
			cameraId: camera.id,
			cameraName: camera.name,
			eventType
		},
		'Camera event detected'
	);

	// Ensure device exists in database
	devicesRepo.upsertDevice({
		id: camera.id.toString(),
		name: camera.name,
		type: mapCameraType(camera),
		batteryLevel: camera.batteryLevel ?? undefined,
		isOnline: true
	});

	// Create event record
	const event = eventsRepo.createEvent({
		deviceId: camera.id.toString(),
		deviceName: camera.name,
		eventType,
		timestamp,
		metadata: {
			notificationId: notification.ding.id,
			kind: notification.ding.kind
		}
	});

	// Create recording record
	const filePath = getRecordingPath(camera.id.toString(), timestamp);
	const recording = recordingsRepo.createRecording({
		deviceId: camera.id.toString(),
		eventId: event.id,
		filePath
	});

	// Link recording to event
	eventsRepo.updateEventRecording(event.id, recording.id);

	// Get video URL and enqueue transcode job
	try {
		// Wait briefly for Ring to process the video
		await sleep(5000);

		// Get the recording URL from Ring
		const recordingUrl = await getRecordingUrl(camera, notification.ding.id);

		if (recordingUrl) {
			const jobData: TranscodeJobData = {
				recordingId: recording.id,
				sourceUrl: recordingUrl,
				deviceId: camera.id.toString(),
				eventId: event.id,
				timestamp: timestamp.toISOString()
			};

			await addTranscodeJob(jobData);
			recordingsRepo.updateRecordingStatus(recording.id, 'processing');

			logger.info({ recordingId: recording.id }, 'Transcode job enqueued');
		} else {
			logger.warn({ cameraId: camera.id }, 'No recording URL available');
			recordingsRepo.updateRecordingStatus(recording.id, 'failed');
		}
	} catch (error) {
		logger.error({ error, cameraId: camera.id }, 'Failed to process recording');
		recordingsRepo.updateRecordingStatus(recording.id, 'failed');
	}
}

async function getRecordingUrl(camera: RingCamera, dingId: string): Promise<string | null> {
	try {
		// Try to get the recording URL with retries
		const url = await retry(
			async () => {
				// Ring API method to get recording URL
				const recordings = await camera.getRecordingUrl(dingId);
				return recordings;
			},
			{ maxRetries: 5, baseDelay: 2000 }
		);

		return url;
	} catch (error) {
		logger.error({ error, dingId }, 'Failed to get recording URL');
		return null;
	}
}

function handleSensorEvent(
	device: RingDeviceData,
	eventType: EventType,
	metadata: Record<string, unknown> = {}
): void {
	const timestamp = new Date();

	logger.info(
		{
			deviceId: device.zid,
			deviceName: device.name,
			eventType
		},
		'Sensor event detected'
	);

	// Ensure device exists in database
	devicesRepo.upsertDevice({
		id: device.zid,
		name: device.name || 'Unknown Sensor',
		type: 'sensor',
		isOnline: true
	});

	// Create event record
	eventsRepo.createEvent({
		deviceId: device.zid,
		deviceName: device.name || 'Unknown Sensor',
		eventType,
		timestamp,
		metadata
	});
}

async function subscribeToCamera(camera: RingCamera): Promise<void> {
	logger.info({ cameraId: camera.id, cameraName: camera.name }, 'Subscribing to camera events');

	// Register camera in database
	devicesRepo.upsertDevice({
		id: camera.id.toString(),
		name: camera.name,
		type: mapCameraType(camera),
		batteryLevel: camera.batteryLevel ?? undefined,
		isOnline: true
	});

	// Subscribe to motion events
	camera.onMotionDetected.subscribe({
		next: async (motionDetected) => {
			if (motionDetected && !isShuttingDown) {
				// We need to wait for the push notification to get the ding ID
				logger.debug({ cameraId: camera.id }, 'Motion detected, waiting for notification');
			}
		},
		error: (error) => {
			logger.error({ error, cameraId: camera.id }, 'Motion subscription error');
		}
	});

	// Subscribe to doorbell presses (for doorbells)
	if (camera.isDoorbot) {
		camera.onDoorbellPressed.subscribe({
			next: async (pressed) => {
				if (pressed && !isShuttingDown) {
					logger.debug({ cameraId: camera.id }, 'Doorbell pressed, waiting for notification');
				}
			},
			error: (error) => {
				logger.error({ error, cameraId: camera.id }, 'Doorbell subscription error');
			}
		});
	}

	// Subscribe to new dings (the main event handler)
	camera.onNewNotification.subscribe({
		next: async (notification) => {
			if (isShuttingDown) return;

			try {
				// Handle different notification structures
				let eventType: 'motion' | 'ding' = 'motion';

				// New notification format (notification.data.event.ding.subtype)
				if (notification.data?.event?.ding?.subtype === 'motion') {
					eventType = 'motion';
				} else if (notification.data?.event?.ding?.subtype === 'on_demand') {
					eventType = 'ding';
				} else if (notification.data?.event?.ding?.detection_type === 'motion') {
					eventType = 'motion';
				} else if (notification.data?.event?.ding?.detection_type === 'ding') {
					eventType = 'ding';
				}
				// Old notification format (notification.ding.kind)
				else if (notification.ding?.kind === 'ding') {
					eventType = 'ding';
				} else if (notification.ding?.kind === 'motion') {
					eventType = 'motion';
				}
				// Fallback to action field
				else if (notification.action === 'com.ring.push.HANDLE_NEW_DING') {
					eventType = 'ding';
				} else if (notification.action === 'com.ring.push.HANDLE_NEW_motion') {
					eventType = 'motion';
				}

				logger.info({ deviceName: camera.name, eventType }, 'Received notification');
				await handleMotionOrDing(camera, eventType, notification);
			} catch (error) {
				logger.error({ error, notification, cameraId: camera.id }, 'Error handling notification');
			}
		},
		error: (error) => {
			logger.error({ error, cameraId: camera.id }, 'Notification subscription error');
		}
	});

	// Subscribe to battery updates
	camera.onBatteryLevel?.subscribe({
		next: (batteryLevel) => {
			if (batteryLevel !== undefined) {
				devicesRepo.updateDeviceBattery(camera.id.toString(), batteryLevel);
			}
		}
	});
}

async function subscribeToSensors(): Promise<void> {
	try {
		const api = await getRingApi();
		const locations = await api.getLocations();

		for (const location of locations) {
			logger.info({ locationId: location.id, locationName: location.name }, 'Subscribing to location');

			// Get all devices at this location
			logger.debug('Fetching devices for location...');
			const devices = await location.getDevices();
			logger.info({ deviceCount: devices.length }, 'Found devices at location');

			for (const device of devices) {
				const deviceData = device.data as RingDeviceData;

				// Register device in database
				devicesRepo.upsertDevice({
					id: deviceData.zid,
					name: deviceData.name || 'Unknown Device',
					type: mapDeviceType(device),
					isOnline: !deviceData.faulted
				});

				// Subscribe to device data updates for sensors
				device.onData.subscribe({
					next: (data) => {
						const newData = data as RingDeviceData;

						// Handle contact sensor open/close
						if ('faulted' in newData) {
							const eventType: EventType = newData.faulted ? 'door_open' : 'door_close';
							handleSensorEvent(newData, eventType, { faulted: newData.faulted });
						}
					},
					error: (error) => {
						logger.error({ error, deviceId: deviceData.zid }, 'Device subscription error');
					}
				});
			}

			// Subscribe to alarm mode changes and security events
			location.onDeviceDataUpdate.subscribe({
				next: (update) => {
					logger.debug({ update }, 'Device data update');
				}
			});
		}

		logger.info('Sensor subscription completed');
	} catch (error) {
		logger.error({ error }, 'Failed to subscribe to sensors');
	}
}

async function startListener(): Promise<void> {
	logger.info('Starting Ring listener worker');

	// Initialize database
	await initDatabase();

	// Get Ring API
	const api = await getRingApi();

	// Get and subscribe to cameras
	const cameras = await getCameras();
	logger.info({ cameraCount: cameras.length }, 'Found cameras');

	for (const camera of cameras) {
		await subscribeToCamera(camera);
	}

	// Subscribe to sensors (non-blocking, runs in background)
	subscribeToSensors().catch((error) => {
		logger.error({ error }, 'Sensor subscription failed, continuing without sensors');
	});

	logger.info('Ring listener started successfully');

	// Keep the process running
	await new Promise<void>((resolve) => {
		const shutdown = async () => {
			if (isShuttingDown) return;
			isShuttingDown = true;

			logger.info('Shutting down Ring listener');
			api.disconnect();
			resolve();
		};

		process.on('SIGINT', shutdown);
		process.on('SIGTERM', shutdown);
	});
}

// Run with retry logic
async function main(): Promise<void> {
	while (!isShuttingDown) {
		try {
			await startListener();
		} catch (error) {
			logger.error({ error }, 'Ring listener error, restarting in 30 seconds');
			await sleep(30000);
		}
	}
}

main().catch((error) => {
	logger.fatal({ error }, 'Fatal error in Ring listener');
	process.exit(1);
});
