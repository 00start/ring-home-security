/**
 * Business Test Fixtures
 *
 * Provides mock data generators for unit testing business logic.
 * Used by tests in tests/unit/business/
 */

import type { Device, EventLog, Recording } from '../types/index.js';

export interface MockCameraOptions {
	id?: string;
	name?: string;
	batteryLevel?: number;
	isOnline?: boolean;
	location?: string;
}

export interface MockZoneOptions {
	id?: string;
	name?: string;
	cameraIds?: string[];
	motionCooldownSeconds?: number;
	triggerLatencyMs?: number;
	isActive?: boolean;
}

export interface MockMotionEventOptions {
	id?: string;
	deviceId?: string;
	deviceName?: string;
	timestamp?: Date;
	recordingId?: string;
	metadata?: Record<string, unknown>;
}

export interface MockRecordingOptions {
	id?: string;
	deviceId?: string;
	eventId?: string;
	filePath?: string;
	thumbnailPath?: string;
	duration?: number;
	fileSize?: number;
	status?: 'pending' | 'processing' | 'completed' | 'failed';
	createdAt?: Date;
}

export interface Zone {
	id: string;
	name: string;
	cameraIds: string[];
	motionCooldownSeconds: number;
	triggerLatencyMs: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Creates a mock camera device for testing
 *
 * @example
 * const camera = mockCamera({ batteryLevel: 15 });
 * expect(camera.batteryLevel).toBe(15);
 */
export function mockCamera(options: MockCameraOptions = {}): Device {
	const id = options.id ?? `camera-${Math.random().toString(36).substring(7)}`;

	return {
		id,
		name: options.name ?? `Test Camera ${id}`,
		type: 'camera',
		location: options.location ?? 'Front Door',
		batteryLevel: options.batteryLevel ?? 85,
		isOnline: options.isOnline ?? true,
		lastSeen: new Date()
	};
}

/**
 * Creates a mock zone configuration for testing
 *
 * @example
 * const zone = mockZone({
 *   cameraIds: ['camera-1', 'camera-2'],
 *   motionCooldownSeconds: 7
 * });
 */
export function mockZone(options: MockZoneOptions = {}): Zone {
	const id = options.id ?? `zone-${Math.random().toString(36).substring(7)}`;

	return {
		id,
		name: options.name ?? `Test Zone ${id}`,
		cameraIds: options.cameraIds ?? ['camera-1', 'camera-2'],
		motionCooldownSeconds: options.motionCooldownSeconds ?? 7,
		triggerLatencyMs: options.triggerLatencyMs ?? 350,
		isActive: options.isActive ?? true,
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

/**
 * Creates a mock motion event for testing
 *
 * @example
 * const event = mockMotionEvent({ deviceId: 'camera-123' });
 * expect(event.eventType).toBe('motion');
 */
export function mockMotionEvent(options: MockMotionEventOptions = {}): EventLog {
	const id = options.id ?? `event-${Math.random().toString(36).substring(7)}`;
	const deviceId = options.deviceId ?? `camera-${Math.random().toString(36).substring(7)}`;

	return {
		id,
		deviceId,
		deviceName: options.deviceName ?? `Test Camera ${deviceId}`,
		eventType: 'motion',
		timestamp: options.timestamp ?? new Date(),
		metadata: options.metadata ?? {
			confidence: 0.95,
			duration: 5000
		},
		recordingId: options.recordingId
	};
}

/**
 * Creates a mock recording for testing
 *
 * @example
 * const recording = mockRecording({
 *   duration: 30,
 *   fileSize: 5_000_000,
 *   status: 'completed'
 * });
 */
export function mockRecording(options: MockRecordingOptions = {}): Recording {
	const id = options.id ?? `recording-${Math.random().toString(36).substring(7)}`;
	const deviceId = options.deviceId ?? `camera-${Math.random().toString(36).substring(7)}`;
	const eventId = options.eventId ?? `event-${Math.random().toString(36).substring(7)}`;

	return {
		id,
		deviceId,
		eventId,
		filePath: options.filePath ?? `/recordings/${id}.mp4`,
		thumbnailPath: options.thumbnailPath ?? `/thumbnails/${id}.jpg`,
		duration: options.duration ?? 30,
		fileSize: options.fileSize ?? 2_500_000, // ~2.5MB
		status: options.status ?? 'completed',
		createdAt: options.createdAt ?? new Date()
	};
}

/**
 * Creates multiple mock cameras with varying battery levels
 * Useful for testing battery-related scenarios
 */
export function mockCameraFleet(count: number = 5): Device[] {
	const batteryLevels = [95, 75, 45, 18, 8]; // Mix of healthy and low battery
	return Array.from({ length: count }, (_, i) =>
		mockCamera({
			id: `camera-${i + 1}`,
			name: `Camera ${i + 1}`,
			batteryLevel: batteryLevels[i % batteryLevels.length],
			location: ['Front Door', 'Back Yard', 'Driveway', 'Side Gate', 'Garage'][i % 5]
		})
	);
}

/**
 * Creates a series of motion events with timestamps
 * Useful for testing cooldown and grouping logic
 */
export function mockMotionEventSeries(
	deviceId: string,
	count: number,
	intervalMs: number
): EventLog[] {
	const baseTime = new Date();
	return Array.from({ length: count }, (_, i) =>
		mockMotionEvent({
			id: `event-${i + 1}`,
			deviceId,
			timestamp: new Date(baseTime.getTime() + i * intervalMs)
		})
	);
}

/**
 * Creates mock recordings with different ages
 * Useful for testing retention policies
 */
export function mockRecordingsWithAge(count: number = 10): Recording[] {
	const now = new Date();
	const daysOld = [1, 3, 7, 15, 20, 25, 30, 35, 40, 50];

	return Array.from({ length: count }, (_, i) => {
		const ageInDays = daysOld[i % daysOld.length];
		const createdAt = new Date(now.getTime() - ageInDays * 24 * 60 * 60 * 1000);

		return mockRecording({
			id: `recording-${i + 1}`,
			createdAt,
			fileSize: 2_000_000 + i * 500_000 // Varying sizes
		});
	});
}
