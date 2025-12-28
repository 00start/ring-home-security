/**
 * UX Test Fixtures
 *
 * Reusable mock data and utilities for E2E UX tests
 */

export interface MockCamera {
	id: string;
	name: string;
	status: 'online' | 'offline';
	batteryLevel?: number;
	powerSource: 'battery' | 'wired';
	lastSeen?: string;
}

export interface MockEvent {
	id: string;
	cameraId: string;
	timestamp: string;
	thumbnailUrl: string;
	hasRecording: boolean;
	zoneTriggered?: boolean;
	triggeredBy?: string;
}

export interface BatteryAlert {
	cameraId: string;
	cameraName: string;
	batteryLevel: number;
	alertType: 'push' | 'email' | 'critical';
	timestamp: string;
}

export interface StorageStats {
	totalGB: number;
	usedGB: number;
	availableGB: number;
	percentUsed: number;
	eventCount: number;
	oldestEventDate: string;
}

export interface DashboardState {
	cameras: MockCamera[];
	systemStatus: 'healthy' | 'warning' | 'critical';
	activeAlerts: number;
	lastSync: string;
}

/**
 * Create mock dashboard state with configurable cameras
 */
export function mockDashboardState(overrides?: Partial<DashboardState>): DashboardState {
	const defaultState: DashboardState = {
		cameras: [
			{
				id: 'cam-front',
				name: 'Front Door',
				status: 'online',
				batteryLevel: 85,
				powerSource: 'battery'
			},
			{
				id: 'cam-back',
				name: 'Backyard',
				status: 'online',
				batteryLevel: 62,
				powerSource: 'battery'
			},
			{
				id: 'cam-garage',
				name: 'Garage',
				status: 'online',
				powerSource: 'wired'
			},
			{
				id: 'cam-driveway',
				name: 'Driveway',
				status: 'offline',
				batteryLevel: 15,
				powerSource: 'battery',
				lastSeen: new Date(Date.now() - 3600000).toISOString()
			}
		],
		systemStatus: 'healthy',
		activeAlerts: 0,
		lastSync: new Date().toISOString()
	};

	return { ...defaultState, ...overrides };
}

/**
 * Create mock event list with various scenarios
 */
export function mockEventList(count: number = 10): MockEvent[] {
	const events: MockEvent[] = [];
	const now = Date.now();

	for (let i = 0; i < count; i++) {
		const timestamp = new Date(now - i * 3600000); // 1 hour apart
		const cameraIds = ['cam-front', 'cam-back', 'cam-garage', 'cam-driveway'];
		const cameraId = cameraIds[i % cameraIds.length];

		events.push({
			id: `event-${i + 1}`,
			cameraId,
			timestamp: timestamp.toISOString(),
			thumbnailUrl: `/api/thumbnails/${i + 1}.jpg`,
			hasRecording: i % 3 !== 0, // Most have recordings
			zoneTriggered: i % 4 === 0,
			triggeredBy: i % 4 === 0 ? cameraIds[(i + 1) % cameraIds.length] : undefined
		});
	}

	return events;
}

/**
 * Create mock battery alert notification
 */
export function mockBatteryAlert(
	level: number = 18,
	type: BatteryAlert['alertType'] = 'push'
): BatteryAlert {
	return {
		cameraId: 'cam-driveway',
		cameraName: 'Driveway',
		batteryLevel: level,
		alertType: type,
		timestamp: new Date().toISOString()
	};
}

/**
 * Create mock storage statistics
 */
export function mockStorageStats(overrides?: Partial<StorageStats>): StorageStats {
	const defaultStats: StorageStats = {
		totalGB: 100,
		usedGB: 42.5,
		availableGB: 57.5,
		percentUsed: 42.5,
		eventCount: 1247,
		oldestEventDate: new Date(Date.now() - 30 * 24 * 3600000).toISOString() // 30 days ago
	};

	return { ...defaultStats, ...overrides };
}

/**
 * Create mock camera with low battery for testing alerts
 */
export function mockLowBatteryCamera(batteryLevel: number = 15): MockCamera {
	return {
		id: 'cam-low-battery',
		name: 'Low Battery Camera',
		status: 'online',
		batteryLevel,
		powerSource: 'battery'
	};
}

/**
 * Create mock camera with critical battery for testing alerts
 */
export function mockCriticalBatteryCamera(): MockCamera {
	return mockLowBatteryCamera(8);
}

/**
 * Helper to create multiple events for zone-triggered scenarios
 */
export function mockZoneTriggeredEventGroup(triggerCameraId: string): MockEvent[] {
	const now = Date.now();
	const triggerEvent: MockEvent = {
		id: 'event-trigger',
		cameraId: triggerCameraId,
		timestamp: new Date(now).toISOString(),
		thumbnailUrl: '/api/thumbnails/trigger.jpg',
		hasRecording: true,
		zoneTriggered: false
	};

	const cascadeEvents: MockEvent[] = [
		{
			id: 'event-cascade-1',
			cameraId: 'cam-back',
			timestamp: new Date(now + 2000).toISOString(),
			thumbnailUrl: '/api/thumbnails/cascade-1.jpg',
			hasRecording: true,
			zoneTriggered: true,
			triggeredBy: triggerCameraId
		},
		{
			id: 'event-cascade-2',
			cameraId: 'cam-garage',
			timestamp: new Date(now + 4000).toISOString(),
			thumbnailUrl: '/api/thumbnails/cascade-2.jpg',
			hasRecording: true,
			zoneTriggered: true,
			triggeredBy: triggerCameraId
		}
	];

	return [triggerEvent, ...cascadeEvents];
}

/**
 * Mock download metadata
 */
export interface DownloadMetadata {
	eventId: string;
	filename: string;
	format: 'mp4';
	size: number;
	duration: number;
	hasTimestamp: boolean;
	resolution: string;
}

export function mockDownloadMetadata(overrides?: Partial<DownloadMetadata>): DownloadMetadata {
	const defaults: DownloadMetadata = {
		eventId: 'event-1',
		filename: 'Ring_FrontDoor_2025-12-27_14-30-00.mp4',
		format: 'mp4',
		size: 15728640, // 15 MB
		duration: 60, // 60 seconds
		hasTimestamp: true,
		resolution: '1920x1080'
	};

	return { ...defaults, ...overrides };
}
