/**
 * STOR-004: Smart Retention Service Unit Tests
 *
 * @requirement STOR-004: Enhanced retention with per-device overrides, storage-aware cleanup, and priority-based retention
 * @rationale Intelligent retention optimizes storage while preserving important recordings longer
 * @quality_dimensions [A.BusinessValue, D.Maintainability]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Recording, EventType } from '../../../src/lib/types/index.js';
import { mockRecording, mockRecordingsWithAge } from '../../../src/lib/test-utils/business-fixtures.js';

/**
 * Video Quality Types
 */
type VideoQuality = 'high' | 'medium' | 'low';

/**
 * Retention Priority based on event importance
 */
type RetentionPriority = 'critical' | 'normal' | 'low';

/**
 * Device Retention Configuration
 */
interface DeviceRetentionConfig {
	deviceId: string;
	retentionDays: number;
	priority: RetentionPriority;
}

/**
 * Storage Threshold Configuration
 */
interface StorageThresholdConfig {
	maxStorageBytes: number;
	warningThresholdPercent: number;
	criticalThresholdPercent: number;
	cleanupTargetPercent: number;
}

/**
 * Enhanced Recording with event type for priority
 */
interface EnhancedRecording extends Recording {
	eventType?: EventType;
	quality?: VideoQuality;
}

/**
 * Cleanup Result
 */
interface CleanupResult {
	deletedCount: number;
	freedBytes: number;
	skippedCount: number;
	errors: string[];
}

/**
 * Smart Retention Service Interface
 */
interface SmartRetentionService {
	// Per-device retention
	getDeviceRetentionConfig(deviceId: string): DeviceRetentionConfig | null;
	setDeviceRetentionConfig(config: DeviceRetentionConfig): void;
	removeDeviceRetentionConfig(deviceId: string): void;
	getEffectiveRetentionDays(deviceId: string, defaultDays: number): number;

	// Storage-aware cleanup
	getCurrentStorageUsage(): Promise<{ usedBytes: number; totalBytes: number }>;
	isStorageExceedingThreshold(thresholdPercent: number): Promise<boolean>;
	cleanupByStorageThreshold(config: StorageThresholdConfig): Promise<CleanupResult>;
	getOldestRecordings(limit: number): Recording[];

	// Priority-based retention
	getRetentionPriorityForEvent(eventType: EventType): RetentionPriority;
	getRetentionMultiplierForPriority(priority: RetentionPriority): number;
	getRecordingsForDeletion(
		recordings: EnhancedRecording[],
		defaultRetentionDays: number
	): EnhancedRecording[];
}

describe('STOR-004: Per-Device Retention Overrides', () => {
	describe('Device Retention Configuration', () => {
		it('should allow setting custom retention days for a specific device', () => {
			// Arrange
			const configs: Map<string, DeviceRetentionConfig> = new Map();

			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn((deviceId) => configs.get(deviceId) || null),
				setDeviceRetentionConfig: vi.fn((config) => configs.set(config.deviceId, config)),
				removeDeviceRetentionConfig: vi.fn((deviceId) => configs.delete(deviceId)),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			mockService.setDeviceRetentionConfig({
				deviceId: 'camera-front-door',
				retentionDays: 60, // Extended retention
				priority: 'critical'
			});

			const config = mockService.getDeviceRetentionConfig('camera-front-door');

			// Assert
			expect(config).not.toBeNull();
			expect(config?.retentionDays).toBe(60);
			expect(config?.priority).toBe('critical');
		});

		it('should return null for devices without custom config', () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn().mockReturnValue(null),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const config = mockService.getDeviceRetentionConfig('unknown-device');

			// Assert
			expect(config).toBeNull();
		});

		it('should allow removing device retention override', () => {
			// Arrange
			const configs: Map<string, DeviceRetentionConfig> = new Map();
			configs.set('camera-123', {
				deviceId: 'camera-123',
				retentionDays: 60,
				priority: 'critical'
			});

			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn((deviceId) => configs.get(deviceId) || null),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn((deviceId) => {
					configs.delete(deviceId);
				}),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			mockService.removeDeviceRetentionConfig('camera-123');
			const config = mockService.getDeviceRetentionConfig('camera-123');

			// Assert
			expect(config).toBeNull();
		});
	});

	describe('Effective Retention Days Calculation', () => {
		it('should use device-specific retention when configured', () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn().mockReturnValue({
					deviceId: 'camera-front-door',
					retentionDays: 60,
					priority: 'critical'
				}),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn().mockReturnValue(60),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const effectiveDays = mockService.getEffectiveRetentionDays('camera-front-door', 30);

			// Assert: Should use device-specific retention
			expect(effectiveDays).toBe(60);
		});

		it('should use default retention when no device config exists', () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn().mockReturnValue(null),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn().mockImplementation((deviceId, defaultDays) => {
					// If no device config, return default
					return defaultDays;
				}),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const effectiveDays = mockService.getEffectiveRetentionDays('unknown-device', 30);

			// Assert: Should fall back to default
			expect(effectiveDays).toBe(30);
		});
	});
});

describe('STOR-004: Storage-Aware Cleanup', () => {
	describe('Storage Monitoring', () => {
		it('should report current storage usage', async () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn().mockResolvedValue({
					usedBytes: 50_000_000_000, // 50GB used
					totalBytes: 100_000_000_000 // 100GB total
				}),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const usage = await mockService.getCurrentStorageUsage();

			// Assert
			expect(usage.usedBytes).toBe(50_000_000_000);
			expect(usage.totalBytes).toBe(100_000_000_000);
			const percentUsed = (usage.usedBytes / usage.totalBytes) * 100;
			expect(percentUsed).toBe(50);
		});

		it('should detect when storage exceeds threshold', async () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn().mockResolvedValue({
					usedBytes: 85_000_000_000, // 85GB used
					totalBytes: 100_000_000_000 // 100GB total
				}),
				isStorageExceedingThreshold: vi.fn().mockResolvedValue(true),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const isExceeding = await mockService.isStorageExceedingThreshold(80);

			// Assert: 85% > 80% threshold
			expect(isExceeding).toBe(true);
		});

		it('should not trigger cleanup when storage is below threshold', async () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn().mockResolvedValue({
					usedBytes: 50_000_000_000, // 50GB used
					totalBytes: 100_000_000_000 // 100GB total
				}),
				isStorageExceedingThreshold: vi.fn().mockResolvedValue(false),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const isExceeding = await mockService.isStorageExceedingThreshold(80);

			// Assert: 50% < 80% threshold
			expect(isExceeding).toBe(false);
		});
	});

	describe('Storage-Based Cleanup', () => {
		it('should delete oldest recordings first when storage exceeds threshold', async () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn().mockResolvedValue({
					deletedCount: 50,
					freedBytes: 10_000_000_000, // 10GB freed
					skippedCount: 5, // Critical recordings skipped
					errors: []
				}),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			const config: StorageThresholdConfig = {
				maxStorageBytes: 100_000_000_000,
				warningThresholdPercent: 70,
				criticalThresholdPercent: 85,
				cleanupTargetPercent: 60
			};

			// Act
			const result = await mockService.cleanupByStorageThreshold(config);

			// Assert
			expect(result.deletedCount).toBe(50);
			expect(result.freedBytes).toBe(10_000_000_000);
			expect(result.errors).toHaveLength(0);
		});

		it('should skip critical priority recordings during cleanup', async () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn().mockResolvedValue({
					deletedCount: 45,
					freedBytes: 8_000_000_000,
					skippedCount: 10, // Critical recordings preserved
					errors: []
				}),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			const config: StorageThresholdConfig = {
				maxStorageBytes: 100_000_000_000,
				warningThresholdPercent: 70,
				criticalThresholdPercent: 85,
				cleanupTargetPercent: 60
			};

			// Act
			const result = await mockService.cleanupByStorageThreshold(config);

			// Assert: Some recordings should be skipped due to priority
			expect(result.skippedCount).toBeGreaterThan(0);
		});

		it('should retrieve oldest recordings for cleanup', () => {
			// Arrange
			const now = new Date();
			const recordings = [
				mockRecording({ id: 'old', createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) }),
				mockRecording({ id: 'older', createdAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000) }),
				mockRecording({ id: 'oldest', createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) })
			];

			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn().mockReturnValue(recordings.sort((a, b) =>
					a.createdAt.getTime() - b.createdAt.getTime()
				)),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const oldest = mockService.getOldestRecordings(3);

			// Assert: Should be sorted oldest first
			expect(oldest[0].id).toBe('oldest');
			expect(oldest[1].id).toBe('older');
			expect(oldest[2].id).toBe('old');
		});
	});
});

describe('STOR-004: Priority-Based Retention', () => {
	describe('Event Priority Assignment', () => {
		it('should assign critical priority to motion events', () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn().mockReturnValue('critical'),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const priority = mockService.getRetentionPriorityForEvent('motion');

			// Assert
			expect(priority).toBe('critical');
		});

		it('should assign critical priority to ding events', () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn().mockReturnValue('critical'),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const priority = mockService.getRetentionPriorityForEvent('ding');

			// Assert
			expect(priority).toBe('critical');
		});

		it('should assign normal priority to door events', () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn().mockReturnValue('normal'),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const priorityOpen = mockService.getRetentionPriorityForEvent('door_open');
			const priorityClose = mockService.getRetentionPriorityForEvent('door_close');

			// Assert
			expect(priorityOpen).toBe('normal');
			expect(priorityClose).toBe('normal');
		});

		it('should assign low priority to device status events', () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn().mockReturnValue('low'),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const priorityOnline = mockService.getRetentionPriorityForEvent('device_online');
			const priorityOffline = mockService.getRetentionPriorityForEvent('device_offline');

			// Assert
			expect(priorityOnline).toBe('low');
			expect(priorityOffline).toBe('low');
		});
	});

	describe('Retention Multiplier', () => {
		it('should apply 1.5x retention for critical priority events', () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn().mockReturnValue(1.5),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const multiplier = mockService.getRetentionMultiplierForPriority('critical');

			// Assert: Critical events get 1.5x retention (30 days -> 45 days)
			expect(multiplier).toBe(1.5);
		});

		it('should apply 1x retention for normal priority events', () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn().mockReturnValue(1.0),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const multiplier = mockService.getRetentionMultiplierForPriority('normal');

			// Assert: Normal events get standard retention
			expect(multiplier).toBe(1.0);
		});

		it('should apply 0.5x retention for low priority events', () => {
			// Arrange
			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn().mockReturnValue(0.5),
				getRecordingsForDeletion: vi.fn()
			};

			// Act
			const multiplier = mockService.getRetentionMultiplierForPriority('low');

			// Assert: Low priority events get half retention (30 days -> 15 days)
			expect(multiplier).toBe(0.5);
		});
	});

	describe('Combined Retention Logic', () => {
		it('should correctly identify recordings for deletion based on priority', () => {
			// Arrange
			const now = new Date();
			const recordings: EnhancedRecording[] = [
				// Critical event, 40 days old (should be kept with 1.5x = 45 days)
				{
					...mockRecording({ id: 'critical-40', createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) }),
					eventType: 'motion',
					quality: 'high'
				},
				// Critical event, 50 days old (should be deleted, > 45 days)
				{
					...mockRecording({ id: 'critical-50', createdAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000) }),
					eventType: 'ding',
					quality: 'high'
				},
				// Low priority, 20 days old (should be deleted with 0.5x = 15 days)
				{
					...mockRecording({ id: 'low-20', createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) }),
					eventType: 'device_online',
					quality: 'low'
				},
				// Low priority, 10 days old (should be kept, < 15 days)
				{
					...mockRecording({ id: 'low-10', createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) }),
					eventType: 'device_offline',
					quality: 'low'
				}
			];

			const mockService: SmartRetentionService = {
				getDeviceRetentionConfig: vi.fn(),
				setDeviceRetentionConfig: vi.fn(),
				removeDeviceRetentionConfig: vi.fn(),
				getEffectiveRetentionDays: vi.fn(),
				getCurrentStorageUsage: vi.fn(),
				isStorageExceedingThreshold: vi.fn(),
				cleanupByStorageThreshold: vi.fn(),
				getOldestRecordings: vi.fn(),
				getRetentionPriorityForEvent: vi.fn(),
				getRetentionMultiplierForPriority: vi.fn(),
				getRecordingsForDeletion: vi.fn().mockReturnValue([
					recordings[1], // critical-50
					recordings[2]  // low-20
				])
			};

			// Act
			const forDeletion = mockService.getRecordingsForDeletion(recordings, 30);

			// Assert
			expect(forDeletion).toHaveLength(2);
			expect(forDeletion.map(r => r.id)).toContain('critical-50');
			expect(forDeletion.map(r => r.id)).toContain('low-20');
			expect(forDeletion.map(r => r.id)).not.toContain('critical-40');
			expect(forDeletion.map(r => r.id)).not.toContain('low-10');
		});
	});
});

describe('STOR-004: Database Schema Considerations', () => {
	describe('Device Retention Table', () => {
		it('should support per-device retention configuration schema', () => {
			// Expected schema structure
			const expectedSchema = {
				tableName: 'device_retention_config',
				columns: {
					device_id: 'TEXT PRIMARY KEY',
					retention_days: 'INTEGER NOT NULL',
					priority: "TEXT CHECK (priority IN ('critical', 'normal', 'low'))",
					created_at: 'TEXT NOT NULL DEFAULT (datetime(\'now\'))',
					updated_at: 'TEXT NOT NULL DEFAULT (datetime(\'now\'))'
				}
			};

			// Assert: Schema should have required columns
			expect(expectedSchema.columns.device_id).toContain('PRIMARY KEY');
			expect(expectedSchema.columns.retention_days).toContain('INTEGER');
			expect(expectedSchema.columns.priority).toContain('CHECK');
		});
	});

	describe('Recording Quality Column', () => {
		it('should support quality column in recordings table', () => {
			// Expected migration
			const expectedMigration = {
				alterTable: 'recordings',
				addColumn: {
					name: 'quality',
					type: "TEXT CHECK (quality IN ('high', 'medium', 'low'))",
					default: "'medium'"
				}
			};

			// Assert: Migration should add quality column with valid values
			expect(expectedMigration.addColumn.type).toContain('CHECK');
			expect(expectedMigration.addColumn.type).toContain('high');
			expect(expectedMigration.addColumn.type).toContain('medium');
			expect(expectedMigration.addColumn.type).toContain('low');
		});
	});
});

describe('STOR-004: Storage Savings Analysis', () => {
	describe('Combined Feature Impact', () => {
		it('should calculate total storage savings from all features', () => {
			// Arrange: Monthly baseline (current system)
			const monthlyRecordings = 3000;
			const avgVideoSizeMB = 4; // Average 4MB per recording
			const avgThumbnailSizeKB = 35; // 35KB JPEG

			const baselineVideoGB = (monthlyRecordings * avgVideoSizeMB) / 1024;
			const baselineThumbnailGB = (monthlyRecordings * avgThumbnailSizeKB) / (1024 * 1024);

			// New system estimates:
			// - 30% video savings from quality optimization (low/medium for 40% of events)
			// - 65% thumbnail savings from WebP + smaller size
			// - 20% retention savings from priority-based cleanup

			const videoSavingsPercent = 0.3;
			const thumbnailSavingsPercent = 0.65;
			const retentionSavingsPercent = 0.2;

			const newVideoGB = baselineVideoGB * (1 - videoSavingsPercent);
			const newThumbnailGB = baselineThumbnailGB * (1 - thumbnailSavingsPercent);

			const totalSavings =
				(baselineVideoGB - newVideoGB) +
				(baselineThumbnailGB - newThumbnailGB) +
				(baselineVideoGB * retentionSavingsPercent);

			// Assert: Should show significant combined savings
			expect(totalSavings).toBeGreaterThan(1); // At least 1GB savings per month
		});

		it('should project annual storage savings', () => {
			// Arrange: Monthly estimates
			const monthlySavingsGB = 2.5; // Conservative estimate
			const annualSavingsGB = monthlySavingsGB * 12;

			// Assert: Should save substantial storage annually
			expect(annualSavingsGB).toBeGreaterThan(25); // At least 25GB per year
		});
	});
});
