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
import { getRecordingPath, ensureDir } from '../lib/utils/paths.js';
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
	const dingId = notification?.data?.event?.ding?.id || notification?.ding?.id || 'unknown';
	const dingKind = notification?.data?.event?.ding?.subtype || notification?.ding?.kind || eventType;

	const event = eventsRepo.createEvent({
		deviceId: camera.id.toString(),
		deviceName: camera.name,
		eventType,
		timestamp,
		metadata: {
			notificationId: dingId,
			kind: dingKind
		}
	});

	logger.info({ eventId: event.id, dingId }, 'Event created successfully');

	// Process recording in background (don't block event creation)
	processRecording(camera, event.id, dingId, timestamp).catch((error) => {
		logger.error({ error, eventId: event.id }, 'Background recording processing failed');
	});
}

async function recordLiveStream(
	camera: RingCamera,
	recordingId: string,
	filePath: string,
	eventId: string
): Promise<void> {
	try {
		recordingsRepo.updateRecordingStatus(recordingId, 'processing');

		logger.info({ recordingId, cameraId: camera.id }, 'Starting live stream capture');
		console.log(`\n📹 Recording live stream for ${camera.name}...`);

		// Ensure the directory exists
		await ensureDir(filePath);

		// Stream video to file for 60 seconds (adjustable)
		const RECORDING_DURATION = 60 * 1000; // 60 seconds

		const streamSession = await camera.streamVideo({
			output: [
				'-t', '60', // Record for 60 seconds
				'-f', 'mp4',
				'-movflags', 'frag_keyframe+empty_moov',
				'-reset_timestamps', '1',
				filePath
			]
		});

		logger.info({ recordingId }, 'Stream session started, recording...');

		// Wait for recording to complete or timeout
		await Promise.race([
			new Promise((resolve) => {
				streamSession.onCallEnded.subscribe(() => {
					logger.info({ recordingId }, 'Stream ended');
					resolve(undefined);
				});
			}),
			sleep(RECORDING_DURATION + 5000) // Add 5s buffer
		]);

		// Stop the stream
		streamSession.stop();

		logger.info({ recordingId, filePath }, 'Live stream recording completed');
		console.log(`✅ Recording saved: ${filePath}\n`);

		// Enqueue transcode job to generate thumbnail and get metadata
		const jobData: TranscodeJobData = {
			recordingId,
			sourceUrl: filePath, // Use local file instead of URL
			deviceId: camera.id.toString(),
			eventId,
			timestamp: new Date().toISOString()
		};

		await addTranscodeJob(jobData);

	} catch (error) {
		logger.error({ error, recordingId }, 'Failed to record live stream');
		recordingsRepo.updateRecordingStatus(recordingId, 'failed');
	}
}

async function processRecording(
	camera: RingCamera,
	eventId: string,
	dingId: string,
	timestamp: Date
): Promise<void> {
	try {
		// Create recording record
		const filePath = getRecordingPath(camera.id.toString(), timestamp);
		const recording = recordingsRepo.createRecording({
			deviceId: camera.id.toString(),
			eventId,
			filePath
		});

		// Link recording to event
		eventsRepo.updateEventRecording(eventId, recording.id);

		logger.info({ eventId, cameraId: camera.id }, 'Starting live stream recording...');

		// Record live stream instead of downloading from cloud
		await recordLiveStream(camera, recording.id, filePath, eventId);

	} catch (error) {
		logger.error({ error, eventId, cameraId: camera.id }, 'Failed to process recording');
	}
}

async function getRecordingUrl(camera: RingCamera, dingId: string): Promise<string | null> {
	try {
		// First, check if this camera has recording capability
		const cameraData = (camera as any).data || {};
		logger.info({
			cameraId: camera.id,
			cameraName: camera.name,
			hasSnapshotWithinSeconds: camera.hasSnapshotWithinSeconds,
			operatingOnBattery: camera.operatingOnBattery,
			subscribed: cameraData.subscribed,
			subscriptionStatus: cameraData.subscription_status,
			features: cameraData.features,
			settings: {
				recordingEnabled: cameraData.settings?.motion_detection_enabled,
				videoRecordingEnabled: cameraData.settings?.video_settings?.recording_enabled
			}
		}, 'Camera recording capability check');

		// Note: Even without a subscription, we'll try the share/play endpoint
		// which may work for recent recordings
		if (cameraData.subscribed === false) {
			logger.warn('No active subscription - will try share/play endpoint anyway');
			console.log('\n⚠️  No Ring Protect subscription - attempting share/play endpoint...\n');
		}

		// Try to get the recording URL with retries (up to 2 minutes of retries)
		let attemptCount = 0;
		const url = await retry(
			async () => {
				attemptCount++;
				logger.info({ dingId, attemptCount }, 'Attempting to fetch recording URL');

				try {
					// Try with transcoded: false first (raw video)
					logger.info({ dingId }, 'Trying getRecordingUrl with transcoded: false');
					let recordingUrl = await camera.getRecordingUrl(dingId, { transcoded: false });

					if (!recordingUrl) {
						logger.info({ dingId }, 'Trying getRecordingUrl with transcoded: true');
						recordingUrl = await camera.getRecordingUrl(dingId, { transcoded: true });
					}

					if (!recordingUrl) {
						logger.warn({ dingId, attemptCount }, 'getRecordingUrl returned null/undefined');

						// Alternative: Try fetching recent events and finding this one
						if (attemptCount % 3 === 0) {
							logger.info({ attemptCount }, 'Trying alternative approach: fetching recent events');
							try {
								const events = await camera.getEvents({ limit: 10 });
								logger.info({
									eventCount: events.length,
									eventIds: events.map(e => e.id),
									lookingFor: dingId
								}, 'Recent events fetched');

								const matchingEvent = events.find(e => e.id === dingId);
								if (matchingEvent) {
									logger.info({ event: matchingEvent }, 'Found matching event');

									// Try to get URL from the event object if it has one
									if ((matchingEvent as any).recording?.url) {
										logger.info('Found URL in event.recording.url');
										return (matchingEvent as any).recording.url;
									}
									if ((matchingEvent as any).cv_properties?.video_url) {
										logger.info('Found URL in event.cv_properties.video_url');
										return (matchingEvent as any).cv_properties.video_url;
									}
								}
							} catch (eventsErr) {
								logger.warn({ error: eventsErr }, 'Failed to fetch events for debugging');
							}
						}

						throw new Error('Recording not yet available');
					}

					// Log the URL to terminal
					console.log('\n=================================');
					console.log('RECORDING URL FOUND:');
					console.log(recordingUrl);
					console.log('=================================\n');

					logger.info({ dingId, url: recordingUrl, attemptCount }, 'Recording URL obtained successfully!');
					return recordingUrl;
				} catch (err) {
					logger.warn({
						dingId,
						attemptCount,
						error: err instanceof Error ? err.message : String(err)
					}, 'Attempt failed');
					throw err;
				}
			},
			{ maxRetries: 15, baseDelay: 4000, maxDelay: 8000 } // Try for ~2 minutes total
		);

		return url;
	} catch (error) {
		logger.error({
			error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
			dingId,
			cameraId: camera.id
		}, 'Failed to get recording URL after all retries');
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
				} else if (notification.data?.event?.ding?.subtype === 'button_press') {
					eventType = 'ding';
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
