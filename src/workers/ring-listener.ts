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
import { retry, sleep } from '../lib/utils/index.js';
import { createLogger } from '../lib/utils/logger.server.js';
import { getRecordingPath, ensureDir } from '../lib/utils/paths.js';
import { getBufferManager } from '../lib/utils/camera-buffer.js';
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

		// Try to use pre-event buffer if available
		const bufferManager = getBufferManager();
		const cameraBuffer = bufferManager.getBuffer(camera.id.toString());

		if (cameraBuffer) {
			const status = cameraBuffer.getStatus();
			logger.info(
				{
					eventId,
					cameraId: camera.id,
					bufferActive: status.isActive,
					bufferDuration: status.bufferDuration.toFixed(1),
					bufferSize: status.bufferSize
				},
				'Using pre-event buffer for recording'
			);

			recordingsRepo.updateRecordingStatus(recording.id, 'processing');

			// Ensure the directory exists
			await ensureDir(filePath);

			// Capture recording with pre-event buffer
			const success = await cameraBuffer.captureEventRecording(eventId, filePath);

			if (success) {
				logger.info({ eventId, cameraId: camera.id, filePath }, 'Buffered recording completed');
				console.log(`✅ Recording with pre-event buffer saved: ${filePath}\n`);

				// Enqueue transcode job to generate thumbnail and get metadata
				const jobData: TranscodeJobData = {
					recordingId: recording.id,
					sourceUrl: filePath,
					deviceId: camera.id.toString(),
					eventId,
					timestamp: new Date().toISOString()
				};

				await addTranscodeJob(jobData);
			} else {
				logger.warn({ eventId, cameraId: camera.id }, 'Buffer capture failed, falling back to live stream');
				await recordLiveStream(camera, recording.id, filePath, eventId);
			}
		} else {
			// No buffer available, fall back to live stream recording
			logger.info({ eventId, cameraId: camera.id }, 'No buffer available, using live stream recording');
			await recordLiveStream(camera, recording.id, filePath, eventId);
		}
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

	// Update faulted state in database if this is a contact sensor event
	if (eventType === 'door_open' || eventType === 'door_close') {
		devicesRepo.updateDeviceFaulted(device.zid, eventType === 'door_open');
	}

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

// Track sensor states to detect changes (only fire events on state transitions)
const sensorStates: Map<string, { faulted?: boolean; motionDetected?: boolean }> = new Map();

async function subscribeToSensors(): Promise<void> {
	try {
		const api = await getRingApi();
		const locations = await api.getLocations();

		logger.info({ locationCount: locations.length }, 'Found Ring locations');
		console.log(`\n🏠 Found ${locations.length} Ring location(s)\n`);

		for (const location of locations) {
			logger.info({
				locationId: location.id,
				locationName: location.name,
				hasAlarmSystem: location.hasAlarmBaseStation,
				hasHubs: location.hasHubs
			}, 'Subscribing to location');

			console.log(`📍 Location: ${location.name}`);
			console.log(`   - Has Alarm Base Station: ${location.hasAlarmBaseStation}`);
			console.log(`   - Has Hubs: ${location.hasHubs}`);

			// Skip if no hubs (getDevices will return empty anyway)
			if (!location.hasHubs) {
				console.log('   ⚠️ Location has no hubs, skipping device fetch');
				continue;
			}

			// Get all devices at this location with a timeout
			console.log('   🔄 Fetching Ring Alarm devices (may take up to 30s)...');
			// Force flush stdout to ensure message is visible
			process.stdout.write('');
			logger.debug('Fetching devices for location...');
			let devices;
			try {
				// Add a timeout to prevent hanging forever
				const timeoutPromise = new Promise<never>((_, reject) => {
					setTimeout(() => reject(new Error('Timeout: getDevices() took longer than 30 seconds')), 30000);
				});

				devices = await Promise.race([
					location.getDevices(),
					timeoutPromise
				]);
				console.log(`   ✅ getDevices() returned ${devices?.length ?? 'null'} devices`);
			} catch (deviceError) {
				logger.error({ error: deviceError, locationName: location.name }, 'Failed to get devices for location');
				console.log(`   ❌ Failed to get devices: ${deviceError}`);

				if (String(deviceError).includes('Timeout')) {
					console.log('   ℹ️ The Ring Alarm base station may be offline or taking too long to respond.');
					console.log('   ℹ️ All Ring Alarm hubs must be online for device discovery to complete.');
					console.log('   ℹ️ Try checking your Ring app to ensure all devices show as online.');
				}
				continue;
			}

			if (!devices || devices.length === 0) {
				console.log('   ⚠️ No devices returned from getDevices()');
				console.log('   ℹ️ This could mean:');
				console.log('      - No Ring Alarm sensors are configured');
				console.log('      - The Ring Alarm base station is offline');
				console.log('      - A hub failed to respond in time');
				continue;
			}

			logger.info({ deviceCount: devices.length }, 'Found devices at location');
			console.log(`   📱 Found ${devices.length} device(s)\n`);

			for (const device of devices) {
				const deviceData = device.data as RingDeviceData;
				const ringDeviceType = device.deviceType;
				const deviceTypeInfo = mapDeviceType(device);

				// Log device type for debugging
				logger.info({
					deviceId: deviceData.zid,
					deviceName: deviceData.name,
					ringDeviceType,
					mappedType: deviceTypeInfo.type,
					mappedSubtype: deviceTypeInfo.subtype,
					hasFaulted: 'faulted' in deviceData,
					deviceData: JSON.stringify(deviceData).substring(0, 500)
				}, 'Found device');

				const statusIcon = deviceTypeInfo.type === 'sensor' ? '🔸' :
					deviceTypeInfo.type === 'misc' ? '⚙️' : '🔹';
				console.log(`      ${statusIcon} ${deviceData.name || 'Unknown'}`);
				console.log(`         Ring Type: ${ringDeviceType}`);
				console.log(`         Category: ${deviceTypeInfo.type}${deviceTypeInfo.subtype ? ` (${deviceTypeInfo.subtype})` : ''}`);
				console.log(`         ID: ${deviceData.zid}`);
				if ('faulted' in deviceData) {
					const state = deviceData.faulted ? '🔓 OPEN' : '🔒 CLOSED';
					console.log(`         State: ${state}`);
				}

				// Register device in database with type and subtype
				devicesRepo.upsertDevice({
					id: deviceData.zid,
					name: deviceData.name || 'Unknown Device',
					type: deviceTypeInfo.type,
					subtype: deviceTypeInfo.subtype,
					isOnline: true,
					faulted: deviceData.faulted
				});

				// Initialize sensor state for sensors only
				if (deviceTypeInfo.type === 'sensor') {
					sensorStates.set(deviceData.zid, {
						faulted: deviceData.faulted,
						motionDetected: false
					});
				}

				// Subscribe to device data updates for sensors
				device.onData.subscribe({
					next: (data) => {
						const newData = data as RingDeviceData;
						const previousState = sensorStates.get(newData.zid) || {};

						// Handle contact sensor (door/window) open/close
						if ('faulted' in newData && newData.faulted !== previousState.faulted) {
							const eventType: EventType = newData.faulted ? 'door_open' : 'door_close';

							logger.info({
								deviceId: newData.zid,
								deviceName: newData.name,
								eventType,
								previousFaulted: previousState.faulted,
								newFaulted: newData.faulted
							}, 'Contact sensor state changed');

							handleSensorEvent(newData, eventType, {
								faulted: newData.faulted,
								sensorType: 'contact'
							});

							// Update stored state
							sensorStates.set(newData.zid, { ...previousState, faulted: newData.faulted });
						}

						// Handle motion sensor
						// Motion sensors typically have a 'motion' or 'motionStatus' property
						const motionDetected = (newData as any).motion === true ||
							(newData as any).motionStatus === 'motion' ||
							(newData as any).motionDetected === true;

						if (motionDetected && !previousState.motionDetected) {
							logger.info({
								deviceId: newData.zid,
								deviceName: newData.name,
								eventType: 'motion'
							}, 'Motion sensor triggered');

							handleSensorEvent(newData, 'motion', {
								sensorType: 'motion'
							});

							// Mark motion as detected, will reset after timeout
							sensorStates.set(newData.zid, { ...previousState, motionDetected: true });

							// Reset motion state after 30 seconds to allow new motion events
							setTimeout(() => {
								const currentState = sensorStates.get(newData.zid);
								if (currentState) {
									sensorStates.set(newData.zid, { ...currentState, motionDetected: false });
								}
							}, 30000);
						}

						// Handle device online/offline status changes
						const isOnline = (newData as any).status !== 'offline';
						devicesRepo.updateDeviceStatus(newData.zid, isOnline);
					},
					error: (error) => {
						logger.error({ error, deviceId: deviceData.zid }, 'Device subscription error');
					}
				});
			}

			// Subscribe to alarm mode changes and security events
			location.onDeviceDataUpdate.subscribe({
				next: (update) => {
					logger.debug({ update }, 'Device data update from location');

					// This catches events that might not come through individual device subscriptions
					const deviceInfo = update as any;
					if (deviceInfo.zid && deviceInfo.name) {
						// Check for motion events
						if (deviceInfo.motion === true || deviceInfo.motionStatus === 'motion') {
							const previousState = sensorStates.get(deviceInfo.zid) || {};
							if (!previousState.motionDetected) {
								logger.info({
									deviceId: deviceInfo.zid,
									deviceName: deviceInfo.name
								}, 'Motion detected via location update');

								handleSensorEvent(deviceInfo as RingDeviceData, 'motion', {
									sensorType: 'motion',
									source: 'location_update'
								});

								sensorStates.set(deviceInfo.zid, { ...previousState, motionDetected: true });
								setTimeout(() => {
									const currentState = sensorStates.get(deviceInfo.zid);
									if (currentState) {
										sensorStates.set(deviceInfo.zid, { ...currentState, motionDetected: false });
									}
								}, 30000);
							}
						}
					}
				}
			});
		}

		logger.info('Sensor subscription completed');
		console.log('\n✅ Sensor subscription completed\n');
	} catch (error) {
		logger.error({ error }, 'Failed to subscribe to sensors');
		console.error('\n❌ Failed to subscribe to sensors:', error);

		// Log more details
		if (error instanceof Error) {
			console.error('   Error name:', error.name);
			console.error('   Error message:', error.message);
			console.error('   Stack:', error.stack);
		}
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

	// Initialize camera buffer manager for pre-event recording
	const bufferManager = getBufferManager();
	logger.info('Initializing camera buffer manager for pre-event recording');
	await bufferManager.initialize(cameras);

	// Log buffer status
	const bufferStatus = bufferManager.getStatus();
	logger.info({ bufferStatus }, 'Camera buffers initialized');

	for (const camera of cameras) {
		await subscribeToCamera(camera);
	}

	// Subscribe to sensors (await to see full output for debugging)
	console.log('\n' + '='.repeat(50));
	console.log('🔍 STARTING SENSOR SUBSCRIPTION');
	console.log('='.repeat(50) + '\n');
	try {
		await subscribeToSensors();
		console.log('\n' + '='.repeat(50));
		console.log('✅ SENSOR SUBSCRIPTION COMPLETE');
		console.log('='.repeat(50) + '\n');
	} catch (error) {
		logger.error({ error }, 'Sensor subscription failed, continuing without sensors');
		console.error('\n' + '='.repeat(50));
		console.error('❌ SENSOR SUBSCRIPTION FAILED:', error);
		console.error('='.repeat(50) + '\n');
	}

	logger.info('Ring listener started successfully');

	// Keep the process running
	await new Promise<void>((resolve) => {
		const shutdown = async () => {
			if (isShuttingDown) return;
			isShuttingDown = true;

			logger.info('Shutting down Ring listener');

			// Shutdown buffer manager first
			bufferManager.shutdown();

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
