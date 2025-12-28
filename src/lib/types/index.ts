// Event Types
export type EventType =
	| 'motion'
	| 'ding'
	| 'door_open'
	| 'door_close'
	| 'device_offline'
	| 'device_online';

export interface EventLog {
	id: string;
	deviceId: string;
	deviceName: string;
	eventType: EventType;
	timestamp: Date;
	metadata: Record<string, unknown>;
	recordingId?: string;
}

export interface EventLogRow {
	id: string;
	device_id: string;
	device_name: string;
	event_type: EventType;
	timestamp: string;
	metadata: string;
	recording_id: string | null;
}

// Device Types
export type DeviceType = 'doorbell' | 'camera' | 'sensor' | 'misc';

// Sensor subtypes for more specific categorization
export type SensorSubtype = 'contact' | 'motion' | 'flood' | 'smoke' | 'co' | 'unknown';

// Misc device subtypes
export type MiscSubtype =
	| 'base_station'
	| 'keypad'
	| 'range_extender'
	| 'siren'
	| 'hub'
	| 'unknown';

export interface Device {
	id: string;
	name: string;
	type: DeviceType;
	subtype?: SensorSubtype | MiscSubtype;
	location?: string;
	batteryLevel?: number;
	isOnline: boolean;
	lastSeen: Date;
	// Sensor-specific state
	faulted?: boolean; // For contact sensors: true = open, false = closed
	tamperStatus?: string;
}

export interface DeviceRow {
	id: string;
	name: string;
	type: DeviceType;
	subtype: string | null;
	location: string | null;
	battery_level: number | null;
	is_online: number;
	last_seen: string;
	faulted: number | null;
	tamper_status: string | null;
}

// Video Quality Types (STOR-001)
export type VideoQuality = 'high' | 'medium' | 'low';

export interface VideoQualityPreset {
	name: VideoQuality;
	crf: number;
	preset: string;
	description: string;
}

// Thumbnail Format Types (STOR-002)
export type ThumbnailFormat = 'jpeg' | 'webp';

export interface ThumbnailOptions {
	format: ThumbnailFormat;
	width: number;
	quality: number;
	timestamp: number;
}

// Retention Priority Types (STOR-004)
export type RetentionPriority = 'critical' | 'normal' | 'low';

export interface DeviceRetentionConfig {
	deviceId: string;
	retentionDays: number;
	priority: RetentionPriority;
}

export interface StorageThresholdConfig {
	maxStorageBytes: number;
	warningThresholdPercent: number;
	criticalThresholdPercent: number;
	cleanupTargetPercent: number;
}

// Recording Types
export type RecordingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Recording {
	id: string;
	deviceId: string;
	eventId: string;
	filePath: string;
	thumbnailPath?: string;
	duration: number;
	fileSize: number;
	status: RecordingStatus;
	createdAt: Date;
	quality?: VideoQuality;
	eventType?: EventType;
}

export interface RecordingRow {
	id: string;
	device_id: string;
	event_id: string;
	file_path: string;
	thumbnail_path: string | null;
	duration: number;
	file_size: number;
	status: RecordingStatus;
	created_at: string;
	quality: VideoQuality | null;
}

// Queue Job Types
export interface TranscodeJobData {
	recordingId: string;
	sourceUrl: string;
	deviceId: string;
	eventId: string;
	timestamp: string;
	eventType?: EventType;
	quality?: VideoQuality;
}

export interface TranscodeJobResult {
	success: boolean;
	filePath?: string;
	thumbnailPath?: string;
	duration?: number;
	fileSize?: number;
	error?: string;
}

// API Response Types
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
	total: number;
	page: number;
	limit: number;
}

// Query Filter Types
export interface EventFilters {
	deviceId?: string;
	eventType?: EventType;
	hasRecording?: boolean;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
	offset?: number;
}

// Auth Types
export interface User {
	id: string;
	username: string;
	createdAt: Date;
}

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
}

// Dashboard Stats
export interface DashboardStats {
	totalDevices: number;
	onlineDevices: number;
	totalEventsToday: number;
	totalRecordings: number;
	storageUsed: number;
}

// Real-time event for SSE
export interface RealTimeEvent {
	type: 'event' | 'device_update' | 'recording_complete';
	payload: EventLog | Device | Recording;
}
