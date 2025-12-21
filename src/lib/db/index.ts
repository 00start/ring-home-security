// Database client and utilities
// TODO: Implement database connection using better-sqlite3 or PostgreSQL

import type { Device, EventLog, Recording } from '$lib/types/index.js';

export interface DatabaseClient {
	// Device operations
	getDevices(): Promise<Device[]>;
	getDevice(id: string): Promise<Device | null>;
	upsertDevice(device: Device): Promise<void>;

	// Event operations
	getEvents(options?: {
		deviceId?: string;
		eventType?: string;
		startDate?: Date;
		endDate?: Date;
		limit?: number;
		offset?: number;
	}): Promise<EventLog[]>;
	createEvent(event: Omit<EventLog, 'id'>): Promise<EventLog>;

	// Recording operations
	getRecordings(options?: {
		deviceId?: string;
		startDate?: Date;
		endDate?: Date;
		limit?: number;
		offset?: number;
	}): Promise<Recording[]>;
	getRecording(id: string): Promise<Recording | null>;
	createRecording(recording: Omit<Recording, 'id'>): Promise<Recording>;
	updateRecordingStatus(id: string, status: Recording['status']): Promise<void>;

	// Cleanup
	deleteOldRecordings(olderThanDays: number): Promise<number>;
}

// Placeholder - will be implemented with actual database
export function createDatabaseClient(): DatabaseClient {
	throw new Error('Database client not yet implemented');
}
