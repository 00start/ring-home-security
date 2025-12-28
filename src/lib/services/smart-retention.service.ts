/**
 * Smart Retention Service
 *
 * Provides intelligent retention management with:
 * - Per-device retention overrides
 * - Storage-aware cleanup
 * - Priority-based retention
 *
 * @feature STOR-004: Smart Retention Service
 */

import { config } from '../config/index.js';
import type {
	EventType,
	Recording,
	RetentionPriority,
	DeviceRetentionConfig,
	StorageThresholdConfig
} from '../types/index.js';

/**
 * In-memory storage for device retention configs
 * In production, this would be backed by a database table
 */
const deviceRetentionConfigs: Map<string, DeviceRetentionConfig> = new Map();

/**
 * Event type to retention priority mapping
 */
export const EVENT_PRIORITY_MAP: Record<EventType, RetentionPriority> = {
	motion: 'critical', // Security-critical
	ding: 'critical', // Visitor events
	door_open: 'normal', // Entry/exit events
	door_close: 'normal',
	device_online: 'low', // Status events
	device_offline: 'low'
};

/**
 * Retention multipliers by priority
 */
export const RETENTION_MULTIPLIERS: Record<RetentionPriority, number> = {
	critical: config.retentionCriticalMultiplier,
	normal: config.retentionNormalMultiplier,
	low: config.retentionLowMultiplier
};

// ============================================================================
// Per-Device Retention Configuration
// ============================================================================

/**
 * Get device-specific retention configuration
 */
export function getDeviceRetentionConfig(deviceId: string): DeviceRetentionConfig | null {
	return deviceRetentionConfigs.get(deviceId) ?? null;
}

/**
 * Set device-specific retention configuration
 */
export function setDeviceRetentionConfig(config: DeviceRetentionConfig): void {
	deviceRetentionConfigs.set(config.deviceId, config);
}

/**
 * Remove device-specific retention configuration
 */
export function removeDeviceRetentionConfig(deviceId: string): void {
	deviceRetentionConfigs.delete(deviceId);
}

/**
 * Get all device retention configurations
 */
export function getAllDeviceRetentionConfigs(): DeviceRetentionConfig[] {
	return Array.from(deviceRetentionConfigs.values());
}

/**
 * Get effective retention days for a device
 * Uses device-specific config if available, otherwise falls back to default
 */
export function getEffectiveRetentionDays(deviceId: string, defaultDays: number): number {
	const deviceConfig = getDeviceRetentionConfig(deviceId);
	return deviceConfig?.retentionDays ?? defaultDays;
}

// ============================================================================
// Priority-Based Retention
// ============================================================================

/**
 * Get retention priority for an event type
 */
export function getRetentionPriorityForEvent(eventType: EventType): RetentionPriority {
	return EVENT_PRIORITY_MAP[eventType] ?? 'normal';
}

/**
 * Get retention multiplier for a priority level
 */
export function getRetentionMultiplierForPriority(priority: RetentionPriority): number {
	return RETENTION_MULTIPLIERS[priority];
}

/**
 * Calculate effective retention days based on event priority
 */
export function calculatePriorityAdjustedRetention(
	baseDays: number,
	eventType: EventType
): number {
	const priority = getRetentionPriorityForEvent(eventType);
	const multiplier = getRetentionMultiplierForPriority(priority);
	return Math.ceil(baseDays * multiplier);
}

/**
 * Enhanced recording interface with event type
 */
export interface EnhancedRecording extends Recording {
	eventType?: EventType;
}

/**
 * Get recordings that are eligible for deletion based on priority-adjusted retention
 */
export function getRecordingsForDeletion(
	recordings: EnhancedRecording[],
	defaultRetentionDays: number
): EnhancedRecording[] {
	const now = new Date();

	return recordings.filter((recording) => {
		// Get device-specific retention if available
		const deviceRetention = getEffectiveRetentionDays(recording.deviceId, defaultRetentionDays);

		// Apply priority multiplier if event type is known
		let effectiveRetention = deviceRetention;
		if (recording.eventType) {
			effectiveRetention = calculatePriorityAdjustedRetention(
				deviceRetention,
				recording.eventType
			);
		}

		// Calculate age in days
		const ageInDays = (now.getTime() - recording.createdAt.getTime()) / (1000 * 60 * 60 * 24);

		// Mark for deletion if older than effective retention
		return ageInDays > effectiveRetention;
	});
}

// ============================================================================
// Storage-Aware Cleanup
// ============================================================================

/**
 * Storage usage interface
 */
export interface StorageUsage {
	usedBytes: number;
	totalBytes: number;
	usedPercent: number;
}

/**
 * Cleanup result interface
 */
export interface CleanupResult {
	deletedCount: number;
	freedBytes: number;
	skippedCount: number;
	errors: string[];
}

/**
 * Check if storage exceeds a given threshold percentage
 */
export function isStorageExceedingThreshold(
	usage: StorageUsage,
	thresholdPercent: number
): boolean {
	return usage.usedPercent >= thresholdPercent;
}

/**
 * Get storage threshold configuration from config
 */
export function getStorageThresholdConfig(): StorageThresholdConfig {
	return {
		maxStorageBytes: config.maxStorageGB * 1024 * 1024 * 1024,
		warningThresholdPercent: config.storageWarningThreshold,
		criticalThresholdPercent: config.storageCriticalThreshold,
		cleanupTargetPercent: config.storageCleanupTarget
	};
}

/**
 * Sort recordings by age (oldest first) for cleanup
 */
export function sortRecordingsByAge(recordings: Recording[]): Recording[] {
	return [...recordings].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * Get oldest recordings up to a limit
 */
export function getOldestRecordings(recordings: Recording[], limit: number): Recording[] {
	return sortRecordingsByAge(recordings).slice(0, limit);
}

/**
 * Calculate how many recordings need to be deleted to reach target storage level
 */
export function calculateRecordingsToDelete(
	recordings: Recording[],
	currentUsageBytes: number,
	targetUsageBytes: number
): Recording[] {
	if (currentUsageBytes <= targetUsageBytes) {
		return [];
	}

	const bytesToFree = currentUsageBytes - targetUsageBytes;
	const sorted = sortRecordingsByAge(recordings);

	let freedBytes = 0;
	const toDelete: Recording[] = [];

	for (const recording of sorted) {
		if (freedBytes >= bytesToFree) {
			break;
		}
		toDelete.push(recording);
		freedBytes += recording.fileSize;
	}

	return toDelete;
}

/**
 * Filter out critical priority recordings from deletion candidates
 * Critical recordings should not be deleted during storage-based cleanup
 */
export function filterCriticalRecordings(recordings: EnhancedRecording[]): {
	deletable: EnhancedRecording[];
	protected: EnhancedRecording[];
} {
	const deletable: EnhancedRecording[] = [];
	const protectedRecordings: EnhancedRecording[] = [];

	for (const recording of recordings) {
		const priority = recording.eventType
			? getRetentionPriorityForEvent(recording.eventType)
			: 'normal';

		if (priority === 'critical') {
			protectedRecordings.push(recording);
		} else {
			deletable.push(recording);
		}
	}

	return { deletable, protected: protectedRecordings };
}

// ============================================================================
// Storage Savings Analysis
// ============================================================================

/**
 * Estimate storage savings from priority-based retention
 */
export function estimatePriorityRetentionSavings(
	eventDistribution: Record<EventType, number>,
	avgFileSizeBytes: number,
	baseRetentionDays: number
): {
	withoutPriority: { recordings: number; storageBytes: number };
	withPriority: { recordings: number; storageBytes: number };
	savingsPercent: number;
} {
	let withoutPriorityCount = 0;
	let withPriorityCount = 0;

	for (const [eventType, count] of Object.entries(eventDistribution)) {
		// Without priority, all recordings kept for base retention
		withoutPriorityCount += count;

		// With priority, low-priority recordings kept for less time
		const multiplier = getRetentionMultiplierForPriority(
			getRetentionPriorityForEvent(eventType as EventType)
		);

		// Rough estimate: if multiplier is 0.5, we keep half as many of these recordings
		// over the same time period (they expire faster)
		withPriorityCount += count * Math.min(multiplier, 1);
	}

	const withoutPriorityStorage = withoutPriorityCount * avgFileSizeBytes;
	const withPriorityStorage = withPriorityCount * avgFileSizeBytes;
	const savingsPercent =
		withoutPriorityStorage > 0
			? ((withoutPriorityStorage - withPriorityStorage) / withoutPriorityStorage) * 100
			: 0;

	return {
		withoutPriority: {
			recordings: withoutPriorityCount,
			storageBytes: withoutPriorityStorage
		},
		withPriority: {
			recordings: Math.round(withPriorityCount),
			storageBytes: Math.round(withPriorityStorage)
		},
		savingsPercent: Math.round(savingsPercent)
	};
}

/**
 * Calculate total estimated storage savings from all features
 */
export function calculateTotalStorageSavings(): {
	videoQualitySavingsPercent: number;
	thumbnailSavingsPercent: number;
	retentionSavingsPercent: number;
	totalSavingsPercent: number;
} {
	// Estimates based on typical usage patterns
	const videoQualitySavingsPercent = 30; // From using low/medium for 40% of events
	const thumbnailSavingsPercent = 65; // From WebP + smaller dimensions
	const retentionSavingsPercent = 20; // From priority-based cleanup

	// Video is ~95% of storage, thumbnails ~5%
	const videoWeight = 0.95;
	const thumbnailWeight = 0.05;

	// Combined video+thumbnail savings
	const contentSavingsPercent =
		videoQualitySavingsPercent * videoWeight + thumbnailSavingsPercent * thumbnailWeight;

	// Retention savings applies on top of content savings
	const totalSavingsPercent = Math.round(
		contentSavingsPercent + (100 - contentSavingsPercent) * (retentionSavingsPercent / 100)
	);

	return {
		videoQualitySavingsPercent,
		thumbnailSavingsPercent,
		retentionSavingsPercent,
		totalSavingsPercent
	};
}
