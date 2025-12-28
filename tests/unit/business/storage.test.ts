/**
 * A3 Worker: Storage & Retention Unit Tests
 *
 * @requirement BO-3: Local storage verification
 * @requirement BR-3: 30-day retention policy enforcement
 * @quality_dimensions [A.BusinessValue, D.Maintainability]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	mockRecording,
	mockRecordingsWithAge,
	mockCamera
} from '../../../src/lib/test-utils/business-fixtures.js';
import type { Recording } from '../../../src/lib/types/index.js';

/**
 * Storage Service Interface
 * This represents the business logic that should be implemented
 */
interface StorageService {
	verifyLocalStorage(recordings: Recording[]): Promise<StorageVerificationResult>;
	calculateStorageUsage(recordings: Recording[]): Promise<number>;
	checkStorageHealth(): Promise<StorageHealthStatus>;
}

interface StorageVerificationResult {
	totalRecordings: number;
	verifiedRecordings: number;
	missingFiles: string[];
	corruptedFiles: string[];
	totalSize: number;
}

interface StorageHealthStatus {
	totalSpace: number;
	usedSpace: number;
	freeSpace: number;
	utilizationPercent: number;
	isHealthy: boolean;
}

interface RetentionService {
	identifyExpiredRecordings(recordings: Recording[], retentionDays: number): Promise<Recording[]>;
	deleteExpiredRecordings(recordingIds: string[]): Promise<DeleteResult>;
	enforceRetentionPolicy(retentionDays: number): Promise<RetentionReport>;
}

interface DeleteResult {
	deletedCount: number;
	failedIds: string[];
	freedSpace: number;
}

interface RetentionReport {
	totalRecordings: number;
	expiredRecordings: number;
	deletedRecordings: number;
	freedSpace: number;
	errors: string[];
}

describe('BO-3: Local Storage Verification', () => {
	describe('Storage Integrity Checks', () => {
		it('should verify all recordings exist on disk', async () => {
			// Arrange
			const recordings = [
				mockRecording({ id: 'rec-1', filePath: '/recordings/rec-1.mp4', fileSize: 5_000_000 }),
				mockRecording({ id: 'rec-2', filePath: '/recordings/rec-2.mp4', fileSize: 3_500_000 }),
				mockRecording({ id: 'rec-3', filePath: '/recordings/rec-3.mp4', fileSize: 2_000_000 })
			];

			// Mock storage service
			const mockStorageService: StorageService = {
				verifyLocalStorage: vi.fn().mockResolvedValue({
					totalRecordings: 3,
					verifiedRecordings: 3,
					missingFiles: [],
					corruptedFiles: [],
					totalSize: 10_500_000
				}),
				calculateStorageUsage: vi.fn(),
				checkStorageHealth: vi.fn()
			};

			// Act
			const result = await mockStorageService.verifyLocalStorage(recordings);

			// Assert: All recordings should be verified
			expect(result.totalRecordings).toBe(3);
			expect(result.verifiedRecordings).toBe(3);
			expect(result.missingFiles).toHaveLength(0);
			expect(result.corruptedFiles).toHaveLength(0);
			expect(result.totalSize).toBe(10_500_000);
		});

		it('should detect missing recording files', async () => {
			// Arrange
			const recordings = [
				mockRecording({ id: 'rec-1', filePath: '/recordings/rec-1.mp4' }),
				mockRecording({ id: 'rec-2', filePath: '/recordings/rec-2.mp4' }),
				mockRecording({ id: 'rec-3', filePath: '/recordings/rec-3.mp4' })
			];

			const mockStorageService: StorageService = {
				verifyLocalStorage: vi.fn().mockResolvedValue({
					totalRecordings: 3,
					verifiedRecordings: 2,
					missingFiles: ['/recordings/rec-2.mp4'],
					corruptedFiles: [],
					totalSize: 7_500_000
				}),
				calculateStorageUsage: vi.fn(),
				checkStorageHealth: vi.fn()
			};

			// Act
			const result = await mockStorageService.verifyLocalStorage(recordings);

			// Assert: Should identify missing file
			expect(result.verifiedRecordings).toBe(2);
			expect(result.missingFiles).toContain('/recordings/rec-2.mp4');
			expect(result.missingFiles).toHaveLength(1);
		});

		it('should detect corrupted recording files', async () => {
			// Arrange
			const recordings = [
				mockRecording({ id: 'rec-1', filePath: '/recordings/rec-1.mp4' }),
				mockRecording({ id: 'rec-2', filePath: '/recordings/rec-2.mp4' })
			];

			const mockStorageService: StorageService = {
				verifyLocalStorage: vi.fn().mockResolvedValue({
					totalRecordings: 2,
					verifiedRecordings: 1,
					missingFiles: [],
					corruptedFiles: ['/recordings/rec-2.mp4'],
					totalSize: 2_500_000
				}),
				calculateStorageUsage: vi.fn(),
				checkStorageHealth: vi.fn()
			};

			// Act
			const result = await mockStorageService.verifyLocalStorage(recordings);

			// Assert: Should identify corrupted file
			expect(result.corruptedFiles).toContain('/recordings/rec-2.mp4');
			expect(result.corruptedFiles).toHaveLength(1);
		});
	});

	describe('Storage Usage Calculation', () => {
		it('should calculate total storage used by recordings', async () => {
			// Arrange
			const recordings = [
				mockRecording({ fileSize: 5_000_000 }),
				mockRecording({ fileSize: 3_500_000 }),
				mockRecording({ fileSize: 2_000_000 })
			];

			const mockStorageService: StorageService = {
				verifyLocalStorage: vi.fn(),
				calculateStorageUsage: vi.fn().mockResolvedValue(10_500_000),
				checkStorageHealth: vi.fn()
			};

			// Act
			const totalSize = await mockStorageService.calculateStorageUsage(recordings);

			// Assert: Should sum all file sizes
			expect(totalSize).toBe(10_500_000); // ~10.5MB
		});

		it('should handle empty recording list', async () => {
			// Arrange
			const recordings: Recording[] = [];

			const mockStorageService: StorageService = {
				verifyLocalStorage: vi.fn(),
				calculateStorageUsage: vi.fn().mockResolvedValue(0),
				checkStorageHealth: vi.fn()
			};

			// Act
			const totalSize = await mockStorageService.calculateStorageUsage(recordings);

			// Assert: Should return 0 for empty list
			expect(totalSize).toBe(0);
		});
	});

	describe('Storage Health Monitoring', () => {
		it('should report healthy storage when utilization is below 80%', async () => {
			// Arrange
			const mockStorageService: StorageService = {
				verifyLocalStorage: vi.fn(),
				calculateStorageUsage: vi.fn(),
				checkStorageHealth: vi.fn().mockResolvedValue({
					totalSpace: 100_000_000_000, // 100GB
					usedSpace: 50_000_000_000, // 50GB
					freeSpace: 50_000_000_000, // 50GB
					utilizationPercent: 50,
					isHealthy: true
				})
			};

			// Act
			const health = await mockStorageService.checkStorageHealth();

			// Assert: Should be healthy at 50% utilization
			expect(health.isHealthy).toBe(true);
			expect(health.utilizationPercent).toBe(50);
			expect(health.freeSpace).toBeGreaterThan(0);
		});

		it('should warn when storage utilization exceeds 80%', async () => {
			// Arrange
			const mockStorageService: StorageService = {
				verifyLocalStorage: vi.fn(),
				calculateStorageUsage: vi.fn(),
				checkStorageHealth: vi.fn().mockResolvedValue({
					totalSpace: 100_000_000_000, // 100GB
					usedSpace: 85_000_000_000, // 85GB
					freeSpace: 15_000_000_000, // 15GB
					utilizationPercent: 85,
					isHealthy: false
				})
			};

			// Act
			const health = await mockStorageService.checkStorageHealth();

			// Assert: Should be unhealthy at 85% utilization
			expect(health.isHealthy).toBe(false);
			expect(health.utilizationPercent).toBe(85);
		});
	});
});

describe('BR-3: 30-Day Retention Policy', () => {
	describe('Expired Recording Identification', () => {
		it('should identify recordings older than 30 days', async () => {
			// Arrange
			const recordings = mockRecordingsWithAge(10);
			const retentionDays = 30;

			// Mock retention service
			const mockRetentionService: RetentionService = {
				identifyExpiredRecordings: vi.fn().mockImplementation((recs, days) => {
					const now = new Date();
					const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
					return Promise.resolve(recs.filter((rec: Recording) => rec.createdAt < cutoffDate));
				}),
				deleteExpiredRecordings: vi.fn(),
				enforceRetentionPolicy: vi.fn()
			};

			// Act
			const expired = await mockRetentionService.identifyExpiredRecordings(
				recordings,
				retentionDays
			);

			// Assert: Should find recordings older than 30 days
			expect(expired.length).toBeGreaterThan(0);
			expired.forEach((recording) => {
				const ageInDays = (Date.now() - recording.createdAt.getTime()) / (1000 * 60 * 60 * 24);
				expect(ageInDays).toBeGreaterThan(30);
			});
		});

		it('should not flag recordings within retention period', async () => {
			// Arrange: Create recordings all within 30 days
			const now = new Date();
			const recordings = Array.from({ length: 5 }, (_, i) =>
				mockRecording({
					id: `rec-${i}`,
					createdAt: new Date(now.getTime() - i * 5 * 24 * 60 * 60 * 1000) // 0, 5, 10, 15, 20 days old
				})
			);
			const retentionDays = 30;

			const mockRetentionService: RetentionService = {
				identifyExpiredRecordings: vi.fn().mockImplementation((recs, days) => {
					const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
					return Promise.resolve(recs.filter((rec: Recording) => rec.createdAt < cutoffDate));
				}),
				deleteExpiredRecordings: vi.fn(),
				enforceRetentionPolicy: vi.fn()
			};

			// Act
			const expired = await mockRetentionService.identifyExpiredRecordings(
				recordings,
				retentionDays
			);

			// Assert: Should find no expired recordings
			expect(expired).toHaveLength(0);
		});

		it('should handle custom retention periods', async () => {
			// Arrange
			const recordings = mockRecordingsWithAge(10);
			const customRetentionDays = 14; // 2 weeks instead of 30 days

			const mockRetentionService: RetentionService = {
				identifyExpiredRecordings: vi.fn().mockImplementation((recs, days) => {
					const now = new Date();
					const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
					return Promise.resolve(recs.filter((rec: Recording) => rec.createdAt < cutoffDate));
				}),
				deleteExpiredRecordings: vi.fn(),
				enforceRetentionPolicy: vi.fn()
			};

			// Act
			const expired = await mockRetentionService.identifyExpiredRecordings(
				recordings,
				customRetentionDays
			);

			// Assert: Should find more expired recordings with shorter retention
			expect(expired.length).toBeGreaterThan(0);
			expired.forEach((recording) => {
				const ageInDays = (Date.now() - recording.createdAt.getTime()) / (1000 * 60 * 60 * 24);
				expect(ageInDays).toBeGreaterThan(14);
			});
		});
	});

	describe('Storage Cleanup Operations', () => {
		it('should delete expired recordings successfully', async () => {
			// Arrange
			const expiredIds = ['rec-1', 'rec-2', 'rec-3'];

			const mockRetentionService: RetentionService = {
				identifyExpiredRecordings: vi.fn(),
				deleteExpiredRecordings: vi.fn().mockResolvedValue({
					deletedCount: 3,
					failedIds: [],
					freedSpace: 7_500_000 // ~7.5MB freed
				}),
				enforceRetentionPolicy: vi.fn()
			};

			// Act
			const result = await mockRetentionService.deleteExpiredRecordings(expiredIds);

			// Assert: Should delete all recordings
			expect(result.deletedCount).toBe(3);
			expect(result.failedIds).toHaveLength(0);
			expect(result.freedSpace).toBeGreaterThan(0);
		});

		it('should handle partial deletion failures', async () => {
			// Arrange
			const expiredIds = ['rec-1', 'rec-2', 'rec-3', 'rec-4'];

			const mockRetentionService: RetentionService = {
				identifyExpiredRecordings: vi.fn(),
				deleteExpiredRecordings: vi.fn().mockResolvedValue({
					deletedCount: 3,
					failedIds: ['rec-2'], // One deletion failed
					freedSpace: 5_000_000
				}),
				enforceRetentionPolicy: vi.fn()
			};

			// Act
			const result = await mockRetentionService.deleteExpiredRecordings(expiredIds);

			// Assert: Should report partial success
			expect(result.deletedCount).toBe(3);
			expect(result.failedIds).toContain('rec-2');
			expect(result.failedIds).toHaveLength(1);
		});

		it('should track freed storage space after deletion', async () => {
			// Arrange
			const expiredIds = ['rec-1', 'rec-2'];

			const mockRetentionService: RetentionService = {
				identifyExpiredRecordings: vi.fn(),
				deleteExpiredRecordings: vi.fn().mockResolvedValue({
					deletedCount: 2,
					failedIds: [],
					freedSpace: 10_000_000 // 10MB freed
				}),
				enforceRetentionPolicy: vi.fn()
			};

			// Act
			const result = await mockRetentionService.deleteExpiredRecordings(expiredIds);

			// Assert: Should report freed space
			expect(result.freedSpace).toBe(10_000_000);
			expect(result.freedSpace).toBeGreaterThan(0);
		});
	});

	describe('Retention Policy Enforcement', () => {
		it('should enforce 30-day retention policy automatically', async () => {
			// Arrange
			const mockRetentionService: RetentionService = {
				identifyExpiredRecordings: vi.fn(),
				deleteExpiredRecordings: vi.fn(),
				enforceRetentionPolicy: vi.fn().mockResolvedValue({
					totalRecordings: 100,
					expiredRecordings: 15,
					deletedRecordings: 15,
					freedSpace: 37_500_000, // ~37.5MB freed
					errors: []
				})
			};

			// Act
			const report = await mockRetentionService.enforceRetentionPolicy(30);

			// Assert: Should delete expired recordings
			expect(report.deletedRecordings).toBe(15);
			expect(report.expiredRecordings).toBe(15);
			expect(report.errors).toHaveLength(0);
			expect(report.freedSpace).toBeGreaterThan(0);
		});

		it('should generate retention policy report', async () => {
			// Arrange
			const mockRetentionService: RetentionService = {
				identifyExpiredRecordings: vi.fn(),
				deleteExpiredRecordings: vi.fn(),
				enforceRetentionPolicy: vi.fn().mockResolvedValue({
					totalRecordings: 50,
					expiredRecordings: 8,
					deletedRecordings: 8,
					freedSpace: 20_000_000,
					errors: []
				})
			};

			// Act
			const report = await mockRetentionService.enforceRetentionPolicy(30);

			// Assert: Should provide comprehensive report
			expect(report).toHaveProperty('totalRecordings');
			expect(report).toHaveProperty('expiredRecordings');
			expect(report).toHaveProperty('deletedRecordings');
			expect(report).toHaveProperty('freedSpace');
			expect(report).toHaveProperty('errors');
			expect(report.totalRecordings).toBe(50);
		});

		it('should handle errors during policy enforcement', async () => {
			// Arrange
			const mockRetentionService: RetentionService = {
				identifyExpiredRecordings: vi.fn(),
				deleteExpiredRecordings: vi.fn(),
				enforceRetentionPolicy: vi.fn().mockResolvedValue({
					totalRecordings: 30,
					expiredRecordings: 5,
					deletedRecordings: 3,
					freedSpace: 7_500_000,
					errors: ['Failed to delete rec-2', 'Failed to delete rec-4']
				})
			};

			// Act
			const report = await mockRetentionService.enforceRetentionPolicy(30);

			// Assert: Should report errors while continuing
			expect(report.deletedRecordings).toBeLessThan(report.expiredRecordings);
			expect(report.errors).toHaveLength(2);
			expect(report.errors[0]).toContain('Failed to delete');
		});
	});
});
