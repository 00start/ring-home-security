// Shared TypeScript types and interfaces

export interface EventLog {
	id: string;
	deviceId: string;
	deviceName: string;
	eventType: 'motion' | 'ding' | 'door_open' | 'door_close' | 'device_offline' | 'device_online';
	timestamp: Date;
	metadata: Record<string, unknown>;
	recordingPath?: string;
}

export interface Device {
	id: string;
	name: string;
	type: 'doorbell' | 'camera' | 'sensor';
	location?: string;
	batteryLevel?: number;
	isOnline: boolean;
	lastSeen: Date;
}

export interface Recording {
	id: string;
	deviceId: string;
	eventId: string;
	filePath: string;
	thumbnailPath?: string;
	duration: number;
	fileSize: number;
	createdAt: Date;
	status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface TranscodeJob {
	id: string;
	eventId: string;
	deviceId: string;
	inputPath: string;
	outputPath: string;
	status: 'queued' | 'processing' | 'completed' | 'failed';
	createdAt: Date;
	completedAt?: Date;
	error?: string;
}

export interface User {
	id: string;
	username: string;
	passwordHash: string;
	createdAt: Date;
	lastLogin?: Date;
}

export interface AppConfig {
	ringRefreshToken?: string;
	retentionDays: number;
	recordingsPath: string;
	redisUrl: string;
	databasePath: string;
}
