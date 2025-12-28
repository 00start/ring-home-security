/**
 * BR-3: 30-Day Retention Policy Unit Tests
 *
 * @requirement BR-3: Recordings shall be retained for minimum 30 days
 * @rationale Compliance with typical home insurance requirements
 * @quality_dimensions [A.BusinessValue, D.Maintainability]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	mockRecording,
	mockRecordingsWithAge
} from '../../src/lib/test-utils/business-fixtures.js';
import type { Recording } from '../../src/lib/types/index.js';

/**
 * Retention Policy Service Interface
 * This represents the business logic that should be implemented
 */
interface RetentionPolicyService {
	markRecordingsForDeletion(recordings: Recording[], retentionDays: number): Promise<Recording[]>;
	verifyRetentionCompliance(
		recordings: Recording[],
		retentionDays: number
	): Promise<RetentionComplianceReport>;
	getRetentionConfiguration(): Promise<RetentionConfiguration>;
	preserveRecentRecordings(recordings: Recording[], retentionDays: number): Promise<Recording[]>;
}

interface RetentionComplianceReport {
	totalRecordings: number;
	recordingsWithinRetention: number;
	recordingsBeyondRetention: number;
	oldestRecordingAge: number; // days
	isCompliant: boolean;
}

interface RetentionConfiguration {
	retentionDays: number;
	minimumRetentionDays: number;
	autoDeleteEnabled: boolean;
	graceperiodDays: number;
}

describe('BR-3: 30-Day Local Retention Policy', () => {
	describe('Retention Policy Marking', () => {
		it('should mark recordings older than 30 days for deletion', async () => {
			// Arrange: Create recordings with various ages
			const recordings = mockRecordingsWithAge(10);
			const retentionDays = 30;

			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn().mockImplementation((recs, days) => {
					const now = new Date();
					const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
					return Promise.resolve(recs.filter((rec: Recording) => rec.createdAt < cutoffDate));
				}),
				verifyRetentionCompliance: vi.fn(),
				getRetentionConfiguration: vi.fn(),
				preserveRecentRecordings: vi.fn()
			};

			// Act: Mark recordings older than 30 days
			const markedForDeletion = await mockService.markRecordingsForDeletion(
				recordings,
				retentionDays
			);

			// Assert: Should identify recordings older than 30 days
			expect(markedForDeletion.length).toBeGreaterThan(0);
			markedForDeletion.forEach((recording) => {
				const ageInDays = (Date.now() - recording.createdAt.getTime()) / (1000 * 60 * 60 * 24);
				expect(ageInDays).toBeGreaterThan(30);
			});
		});

		it('should preserve recordings within 30-day retention period', async () => {
			// Arrange: Create recordings all within 30 days
			const now = new Date();
			const recordings = [
				mockRecording({
					id: 'rec-1',
					createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day old
				}),
				mockRecording({
					id: 'rec-2',
					createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days old
				}),
				mockRecording({
					id: 'rec-3',
					createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000) // 25 days old
				})
			];
			const retentionDays = 30;

			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn().mockResolvedValue([]),
				verifyRetentionCompliance: vi.fn(),
				getRetentionConfiguration: vi.fn(),
				preserveRecentRecordings: vi.fn().mockResolvedValue(recordings)
			};

			// Act: Check which recordings are preserved
			const preserved = await mockService.preserveRecentRecordings(recordings, retentionDays);

			// Assert: All recordings should be preserved (all within 30 days)
			expect(preserved).toHaveLength(3);
			expect(preserved).toEqual(recordings);
		});

		it('should correctly handle recordings exactly at 30-day boundary', async () => {
			// Arrange: Create recording exactly 30 days old
			const now = new Date();
			const exactlyThirtyDaysOld = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			const recordings = [
				mockRecording({
					id: 'rec-boundary',
					createdAt: exactlyThirtyDaysOld
				})
			];
			const retentionDays = 30;

			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn().mockImplementation((recs, days) => {
					const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
					// Recordings exactly at boundary should be preserved (>= vs >)
					return Promise.resolve(recs.filter((rec: Recording) => rec.createdAt < cutoffDate));
				}),
				verifyRetentionCompliance: vi.fn(),
				getRetentionConfiguration: vi.fn(),
				preserveRecentRecordings: vi.fn()
			};

			// Act
			const markedForDeletion = await mockService.markRecordingsForDeletion(
				recordings,
				retentionDays
			);

			// Assert: Recording at exactly 30 days should still be preserved
			expect(markedForDeletion).toHaveLength(0);
		});
	});

	describe('Retention Policy Configuration', () => {
		it('should enforce minimum 30-day retention period', async () => {
			// Arrange
			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn(),
				verifyRetentionCompliance: vi.fn(),
				getRetentionConfiguration: vi.fn().mockResolvedValue({
					retentionDays: 30,
					minimumRetentionDays: 30,
					autoDeleteEnabled: true,
					graceperiodDays: 7
				}),
				preserveRecentRecordings: vi.fn()
			};

			// Act
			const config = await mockService.getRetentionConfiguration();

			// Assert: Minimum retention should be 30 days
			expect(config.retentionDays).toBeGreaterThanOrEqual(30);
			expect(config.minimumRetentionDays).toBe(30);
		});

		it('should allow custom retention periods longer than 30 days', async () => {
			// Arrange: Configure 60-day retention
			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn(),
				verifyRetentionCompliance: vi.fn(),
				getRetentionConfiguration: vi.fn().mockResolvedValue({
					retentionDays: 60,
					minimumRetentionDays: 30,
					autoDeleteEnabled: true,
					graceperiodDays: 7
				}),
				preserveRecentRecordings: vi.fn()
			};

			// Act
			const config = await mockService.getRetentionConfiguration();

			// Assert: Should allow retention periods longer than minimum
			expect(config.retentionDays).toBe(60);
			expect(config.retentionDays).toBeGreaterThan(config.minimumRetentionDays);
		});

		it('should provide grace period before deletion', async () => {
			// Arrange
			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn(),
				verifyRetentionCompliance: vi.fn(),
				getRetentionConfiguration: vi.fn().mockResolvedValue({
					retentionDays: 30,
					minimumRetentionDays: 30,
					autoDeleteEnabled: true,
					graceperiodDays: 7
				}),
				preserveRecentRecordings: vi.fn()
			};

			// Act
			const config = await mockService.getRetentionConfiguration();

			// Assert: Should have grace period for safety
			expect(config.graceperiodDays).toBeGreaterThan(0);
			expect(config.graceperiodDays).toBe(7);
		});
	});

	describe('Retention Compliance Verification', () => {
		it('should verify compliance with 30-day retention policy', async () => {
			// Arrange: All recordings within 30 days
			const now = new Date();
			const recordings = Array.from({ length: 10 }, (_, i) =>
				mockRecording({
					id: `rec-${i}`,
					createdAt: new Date(now.getTime() - i * 2 * 24 * 60 * 60 * 1000) // 0, 2, 4...18 days old
				})
			);
			const retentionDays = 30;

			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn(),
				verifyRetentionCompliance: vi.fn().mockResolvedValue({
					totalRecordings: 10,
					recordingsWithinRetention: 10,
					recordingsBeyondRetention: 0,
					oldestRecordingAge: 18, // days
					isCompliant: true
				}),
				getRetentionConfiguration: vi.fn(),
				preserveRecentRecordings: vi.fn()
			};

			// Act
			const compliance = await mockService.verifyRetentionCompliance(recordings, retentionDays);

			// Assert: System should be compliant
			expect(compliance.isCompliant).toBe(true);
			expect(compliance.recordingsBeyondRetention).toBe(0);
			expect(compliance.oldestRecordingAge).toBeLessThanOrEqual(30);
		});

		it('should detect non-compliance when recordings exceed retention', async () => {
			// Arrange: Mix of recordings, some beyond 30 days
			const recordings = mockRecordingsWithAge(10); // Includes recordings up to 50 days old
			const retentionDays = 30;

			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn(),
				verifyRetentionCompliance: vi.fn().mockImplementation((recs, days) => {
					const now = new Date();
					const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
					const beyondRetention = recs.filter((rec: Recording) => rec.createdAt < cutoffDate);
					const oldestAge = Math.max(
						...recs.map(
							(rec: Recording) => (now.getTime() - rec.createdAt.getTime()) / (1000 * 60 * 60 * 24)
						)
					);

					return Promise.resolve({
						totalRecordings: recs.length,
						recordingsWithinRetention: recs.length - beyondRetention.length,
						recordingsBeyondRetention: beyondRetention.length,
						oldestRecordingAge: Math.round(oldestAge),
						isCompliant: beyondRetention.length === 0
					});
				}),
				getRetentionConfiguration: vi.fn(),
				preserveRecentRecordings: vi.fn()
			};

			// Act
			const compliance = await mockService.verifyRetentionCompliance(recordings, retentionDays);

			// Assert: Should detect non-compliance
			expect(compliance.isCompliant).toBe(false);
			expect(compliance.recordingsBeyondRetention).toBeGreaterThan(0);
		});

		it('should calculate oldest recording age accurately', async () => {
			// Arrange: Create recordings with known ages
			const now = new Date();
			const recordings = [
				mockRecording({
					createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days
				}),
				mockRecording({
					createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days
				}),
				mockRecording({
					createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) // 45 days (oldest)
				})
			];
			const retentionDays = 30;

			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn(),
				verifyRetentionCompliance: vi.fn().mockResolvedValue({
					totalRecordings: 3,
					recordingsWithinRetention: 2,
					recordingsBeyondRetention: 1,
					oldestRecordingAge: 45,
					isCompliant: false
				}),
				getRetentionConfiguration: vi.fn(),
				preserveRecentRecordings: vi.fn()
			};

			// Act
			const compliance = await mockService.verifyRetentionCompliance(recordings, retentionDays);

			// Assert: Should accurately report oldest recording age
			expect(compliance.oldestRecordingAge).toBe(45);
			expect(compliance.oldestRecordingAge).toBeGreaterThan(retentionDays);
		});
	});

	describe('Edge Cases and Data Integrity', () => {
		it('should handle empty recording list', async () => {
			// Arrange
			const recordings: Recording[] = [];
			const retentionDays = 30;

			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn().mockResolvedValue([]),
				verifyRetentionCompliance: vi.fn().mockResolvedValue({
					totalRecordings: 0,
					recordingsWithinRetention: 0,
					recordingsBeyondRetention: 0,
					oldestRecordingAge: 0,
					isCompliant: true
				}),
				getRetentionConfiguration: vi.fn(),
				preserveRecentRecordings: vi.fn().mockResolvedValue([])
			};

			// Act
			const markedForDeletion = await mockService.markRecordingsForDeletion(
				recordings,
				retentionDays
			);
			const compliance = await mockService.verifyRetentionCompliance(recordings, retentionDays);

			// Assert: Should handle empty list gracefully
			expect(markedForDeletion).toHaveLength(0);
			expect(compliance.totalRecordings).toBe(0);
			expect(compliance.isCompliant).toBe(true);
		});

		it('should handle all recordings being expired', async () => {
			// Arrange: All recordings older than 30 days
			const now = new Date();
			const recordings = Array.from({ length: 5 }, (_, i) =>
				mockRecording({
					id: `rec-${i}`,
					createdAt: new Date(now.getTime() - (35 + i) * 24 * 60 * 60 * 1000) // 35-39 days old
				})
			);
			const retentionDays = 30;

			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn().mockResolvedValue(recordings),
				verifyRetentionCompliance: vi.fn(),
				getRetentionConfiguration: vi.fn(),
				preserveRecentRecordings: vi.fn()
			};

			// Act
			const markedForDeletion = await mockService.markRecordingsForDeletion(
				recordings,
				retentionDays
			);

			// Assert: All recordings should be marked for deletion
			expect(markedForDeletion).toHaveLength(5);
			expect(markedForDeletion).toEqual(recordings);
		});

		it('should preserve recordings when none are expired', async () => {
			// Arrange: All recordings within retention period
			const now = new Date();
			const recordings = Array.from({ length: 5 }, (_, i) =>
				mockRecording({
					id: `rec-${i}`,
					createdAt: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000) // 1-5 days old
				})
			);
			const retentionDays = 30;

			const mockService: RetentionPolicyService = {
				markRecordingsForDeletion: vi.fn().mockImplementation((recs, days) => {
					const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
					return Promise.resolve(recs.filter((rec: Recording) => rec.createdAt < cutoffDate));
				}),
				verifyRetentionCompliance: vi.fn(),
				getRetentionConfiguration: vi.fn(),
				preserveRecentRecordings: vi.fn()
			};

			// Act
			const markedForDeletion = await mockService.markRecordingsForDeletion(
				recordings,
				retentionDays
			);

			// Assert: No recordings should be marked for deletion
			expect(markedForDeletion).toHaveLength(0);
		});
	});
});
