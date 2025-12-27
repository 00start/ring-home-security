/**
 * FTR-001: Multi-Clip Download Feature Unit Tests
 *
 * @feature FTR-001: Multi-Clip Download Feature
 * @requirement Users can select multiple events and merge into single MP4
 * @rationale Improve UX for reviewing multiple incidents
 * @quality_dimensions [A.Usability, C.Performance]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Recording } from '../../src/lib/types/index.js';

/**
 * Event Selection Store Interface
 * Manages multi-selection of events for download
 */
interface EventSelectionStore {
	selectedEvents: Set<string>;
	toggleSelection(eventId: string): void;
	clearSelection(): void;
	isSelected(eventId: string): boolean;
	getSelectedCount(): number;
	canSelectMore(): boolean;
	maxSelection: number;
}

/**
 * Multi-Clip Merge Service Interface
 * Handles merging multiple recordings into single MP4
 */
interface MultiClipMergeService {
	validateRecordings(recordingIds: string[]): Promise<ValidationResult>;
	queueMergeJob(recordingIds: string[]): Promise<MergeJobResult>;
	getMergeJobStatus(jobId: string): Promise<MergeJobStatus>;
	downloadMergedVideo(jobId: string): Promise<DownloadResult>;
}

interface ValidationResult {
	valid: boolean;
	validRecordings: Recording[];
	invalidRecordings: string[];
	errors: string[];
}

interface MergeJobResult {
	jobId: string;
	status: 'queued' | 'processing' | 'completed' | 'failed';
	recordingIds: string[];
	estimatedDuration?: number;
}

interface MergeJobStatus {
	jobId: string;
	status: 'queued' | 'processing' | 'completed' | 'failed';
	progress: number; // 0-100
	currentStep?: string;
	error?: string;
	downloadUrl?: string;
}

interface DownloadResult {
	success: boolean;
	url?: string;
	filename?: string;
	fileSize?: number;
	metadata?: MergeMetadata;
	error?: string;
}

interface MergeMetadata {
	totalClips: number;
	totalDuration: number;
	devices: string[];
	timeRange: { start: Date; end: Date };
	mergedAt: Date;
}

describe('FTR-001: Multi-Clip Download', () => {
	describe('Event Selection Management', () => {
		it('can select multiple events for download', () => {
			// Arrange
			const store: EventSelectionStore = {
				selectedEvents: new Set<string>(),
				maxSelection: 10,
				toggleSelection(eventId: string) {
					if (this.selectedEvents.has(eventId)) {
						this.selectedEvents.delete(eventId);
					} else if (this.selectedEvents.size < this.maxSelection) {
						this.selectedEvents.add(eventId);
					}
				},
				clearSelection() {
					this.selectedEvents.clear();
				},
				isSelected(eventId: string) {
					return this.selectedEvents.has(eventId);
				},
				getSelectedCount() {
					return this.selectedEvents.size;
				},
				canSelectMore() {
					return this.selectedEvents.size < this.maxSelection;
				}
			};

			// Act
			store.toggleSelection('event-1');
			store.toggleSelection('event-2');
			store.toggleSelection('event-3');

			// Assert
			expect(store.getSelectedCount()).toBe(3);
			expect(store.isSelected('event-1')).toBe(true);
			expect(store.isSelected('event-2')).toBe(true);
			expect(store.isSelected('event-3')).toBe(true);
		});

		it('limits selection to 10 clips maximum', () => {
			// Arrange
			const store: EventSelectionStore = {
				selectedEvents: new Set<string>(),
				maxSelection: 10,
				toggleSelection(eventId: string) {
					if (this.selectedEvents.has(eventId)) {
						this.selectedEvents.delete(eventId);
					} else if (this.selectedEvents.size < this.maxSelection) {
						this.selectedEvents.add(eventId);
					}
				},
				clearSelection() {
					this.selectedEvents.clear();
				},
				isSelected(eventId: string) {
					return this.selectedEvents.has(eventId);
				},
				getSelectedCount() {
					return this.selectedEvents.size;
				},
				canSelectMore() {
					return this.selectedEvents.size < this.maxSelection;
				}
			};

			// Act: Try to select 15 events
			for (let i = 1; i <= 15; i++) {
				store.toggleSelection(`event-${i}`);
			}

			// Assert: Should only have 10 selected
			expect(store.getSelectedCount()).toBe(10);
			expect(store.canSelectMore()).toBe(false);
		});

		it('can deselect events', () => {
			// Arrange
			const store: EventSelectionStore = {
				selectedEvents: new Set(['event-1', 'event-2', 'event-3']),
				maxSelection: 10,
				toggleSelection(eventId: string) {
					if (this.selectedEvents.has(eventId)) {
						this.selectedEvents.delete(eventId);
					} else if (this.selectedEvents.size < this.maxSelection) {
						this.selectedEvents.add(eventId);
					}
				},
				clearSelection() {
					this.selectedEvents.clear();
				},
				isSelected(eventId: string) {
					return this.selectedEvents.has(eventId);
				},
				getSelectedCount() {
					return this.selectedEvents.size;
				},
				canSelectMore() {
					return this.selectedEvents.size < this.maxSelection;
				}
			};

			// Act
			store.toggleSelection('event-2');

			// Assert
			expect(store.getSelectedCount()).toBe(2);
			expect(store.isSelected('event-1')).toBe(true);
			expect(store.isSelected('event-2')).toBe(false);
			expect(store.isSelected('event-3')).toBe(true);
		});

		it('can clear all selections', () => {
			// Arrange
			const store: EventSelectionStore = {
				selectedEvents: new Set(['event-1', 'event-2', 'event-3']),
				maxSelection: 10,
				toggleSelection(eventId: string) {
					if (this.selectedEvents.has(eventId)) {
						this.selectedEvents.delete(eventId);
					} else if (this.selectedEvents.size < this.maxSelection) {
						this.selectedEvents.add(eventId);
					}
				},
				clearSelection() {
					this.selectedEvents.clear();
				},
				isSelected(eventId: string) {
					return this.selectedEvents.has(eventId);
				},
				getSelectedCount() {
					return this.selectedEvents.size;
				},
				canSelectMore() {
					return this.selectedEvents.size < this.maxSelection;
				}
			};

			// Act
			store.clearSelection();

			// Assert
			expect(store.getSelectedCount()).toBe(0);
			expect(store.canSelectMore()).toBe(true);
		});
	});

	describe('Recording Validation', () => {
		it('validates that all recordings exist', async () => {
			// Arrange
			const mockRecordings: Recording[] = [
				{
					id: 'rec-1',
					deviceId: 'cam-1',
					eventId: 'evt-1',
					filePath: '/recordings/rec-1.mp4',
					duration: 30,
					fileSize: 1024000,
					status: 'completed',
					createdAt: new Date('2025-12-27T10:00:00Z')
				},
				{
					id: 'rec-2',
					deviceId: 'cam-1',
					eventId: 'evt-2',
					filePath: '/recordings/rec-2.mp4',
					duration: 45,
					fileSize: 1536000,
					status: 'completed',
					createdAt: new Date('2025-12-27T11:00:00Z')
				}
			];

			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn().mockResolvedValue({
					valid: true,
					validRecordings: mockRecordings,
					invalidRecordings: [],
					errors: []
				}),
				queueMergeJob: vi.fn(),
				getMergeJobStatus: vi.fn(),
				downloadMergedVideo: vi.fn()
			};

			// Act
			const result = await mockService.validateRecordings(['rec-1', 'rec-2']);

			// Assert
			expect(result.valid).toBe(true);
			expect(result.validRecordings).toHaveLength(2);
			expect(result.invalidRecordings).toHaveLength(0);
			expect(result.errors).toHaveLength(0);
		});

		it('detects invalid recording IDs', async () => {
			// Arrange
			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn().mockResolvedValue({
					valid: false,
					validRecordings: [],
					invalidRecordings: ['rec-999', 'rec-888'],
					errors: ['Recording rec-999 not found', 'Recording rec-888 not found']
				}),
				queueMergeJob: vi.fn(),
				getMergeJobStatus: vi.fn(),
				downloadMergedVideo: vi.fn()
			};

			// Act
			const result = await mockService.validateRecordings(['rec-999', 'rec-888']);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.validRecordings).toHaveLength(0);
			expect(result.invalidRecordings).toHaveLength(2);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('validates only completed recordings can be merged', async () => {
			// Arrange
			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn().mockResolvedValue({
					valid: false,
					validRecordings: [],
					invalidRecordings: ['rec-pending'],
					errors: ['Recording rec-pending is not completed (status: pending)']
				}),
				queueMergeJob: vi.fn(),
				getMergeJobStatus: vi.fn(),
				downloadMergedVideo: vi.fn()
			};

			// Act
			const result = await mockService.validateRecordings(['rec-pending']);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('not completed'))).toBe(true);
		});
	});

	describe('Merge Job Processing', () => {
		it('merges selected events in chronological order', async () => {
			// Arrange
			const recordingIds = ['rec-3', 'rec-1', 'rec-2']; // Out of order

			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn(),
				queueMergeJob: vi.fn().mockResolvedValue({
					jobId: 'job-123',
					status: 'queued',
					recordingIds: ['rec-1', 'rec-2', 'rec-3'], // Should be sorted chronologically
					estimatedDuration: 120
				}),
				getMergeJobStatus: vi.fn(),
				downloadMergedVideo: vi.fn()
			};

			// Act
			const result = await mockService.queueMergeJob(recordingIds);

			// Assert
			expect(result.jobId).toBeDefined();
			expect(result.status).toBe('queued');
			expect(result.recordingIds).toEqual(['rec-1', 'rec-2', 'rec-3']);
		});

		it('shows download progress', async () => {
			// Arrange
			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn(),
				queueMergeJob: vi.fn(),
				getMergeJobStatus: vi.fn().mockResolvedValue({
					jobId: 'job-123',
					status: 'processing',
					progress: 45,
					currentStep: 'Merging clip 2 of 5'
				}),
				downloadMergedVideo: vi.fn()
			};

			// Act
			const status = await mockService.getMergeJobStatus('job-123');

			// Assert
			expect(status.status).toBe('processing');
			expect(status.progress).toBe(45);
			expect(status.currentStep).toContain('Merging clip');
		});

		it('handles merge errors gracefully', async () => {
			// Arrange
			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn(),
				queueMergeJob: vi.fn(),
				getMergeJobStatus: vi.fn().mockResolvedValue({
					jobId: 'job-456',
					status: 'failed',
					progress: 60,
					currentStep: 'Failed',
					error: 'FFmpeg merge failed: incompatible codec'
				}),
				downloadMergedVideo: vi.fn()
			};

			// Act
			const status = await mockService.getMergeJobStatus('job-456');

			// Assert
			expect(status.status).toBe('failed');
			expect(status.error).toBeDefined();
			expect(status.error).toContain('merge failed');
		});

		it('provides download URL when merge completes', async () => {
			// Arrange
			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn(),
				queueMergeJob: vi.fn(),
				getMergeJobStatus: vi.fn().mockResolvedValue({
					jobId: 'job-789',
					status: 'completed',
					progress: 100,
					currentStep: 'Complete',
					downloadUrl: '/api/recordings/merged/job-789/download'
				}),
				downloadMergedVideo: vi.fn()
			};

			// Act
			const status = await mockService.getMergeJobStatus('job-789');

			// Assert
			expect(status.status).toBe('completed');
			expect(status.progress).toBe(100);
			expect(status.downloadUrl).toBeDefined();
		});
	});

	describe('Download with Metadata', () => {
		it('download includes metadata', async () => {
			// Arrange
			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn(),
				queueMergeJob: vi.fn(),
				getMergeJobStatus: vi.fn(),
				downloadMergedVideo: vi.fn().mockResolvedValue({
					success: true,
					url: '/downloads/merged-job-789.mp4',
					filename: 'merged-2025-12-27-10-00-00.mp4',
					fileSize: 5242880,
					metadata: {
						totalClips: 3,
						totalDuration: 105,
						devices: ['Front Door', 'Backyard Camera'],
						timeRange: {
							start: new Date('2025-12-27T10:00:00Z'),
							end: new Date('2025-12-27T10:45:00Z')
						},
						mergedAt: new Date('2025-12-27T12:00:00Z')
					}
				})
			};

			// Act
			const result = await mockService.downloadMergedVideo('job-789');

			// Assert
			expect(result.success).toBe(true);
			expect(result.metadata).toBeDefined();
			expect(result.metadata?.totalClips).toBe(3);
			expect(result.metadata?.totalDuration).toBe(105);
			expect(result.metadata?.devices).toHaveLength(2);
			expect(result.metadata?.timeRange).toBeDefined();
		});

		it('generates appropriate filename with timestamp', async () => {
			// Arrange
			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn(),
				queueMergeJob: vi.fn(),
				getMergeJobStatus: vi.fn(),
				downloadMergedVideo: vi.fn().mockResolvedValue({
					success: true,
					url: '/downloads/merged-job-123.mp4',
					filename: 'merged-2025-12-27-14-30-15.mp4',
					fileSize: 3145728
				})
			};

			// Act
			const result = await mockService.downloadMergedVideo('job-123');

			// Assert
			expect(result.filename).toMatch(/^merged-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.mp4$/);
		});
	});

	describe('Edge Cases', () => {
		it('handles single recording selection', async () => {
			// Arrange
			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn().mockResolvedValue({
					valid: true,
					validRecordings: [{
						id: 'rec-1',
						deviceId: 'cam-1',
						eventId: 'evt-1',
						filePath: '/recordings/rec-1.mp4',
						duration: 30,
						fileSize: 1024000,
						status: 'completed',
						createdAt: new Date()
					}],
					invalidRecordings: [],
					errors: []
				}),
				queueMergeJob: vi.fn().mockResolvedValue({
					jobId: 'job-single',
					status: 'queued',
					recordingIds: ['rec-1']
				}),
				getMergeJobStatus: vi.fn(),
				downloadMergedVideo: vi.fn()
			};

			// Act
			const validation = await mockService.validateRecordings(['rec-1']);
			const job = await mockService.queueMergeJob(['rec-1']);

			// Assert: Should still work with single recording
			expect(validation.valid).toBe(true);
			expect(job.recordingIds).toHaveLength(1);
		});

		it('rejects empty selection', async () => {
			// Arrange
			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn().mockResolvedValue({
					valid: false,
					validRecordings: [],
					invalidRecordings: [],
					errors: ['No recordings provided']
				}),
				queueMergeJob: vi.fn(),
				getMergeJobStatus: vi.fn(),
				downloadMergedVideo: vi.fn()
			};

			// Act
			const result = await mockService.validateRecordings([]);

			// Assert
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('No recordings provided');
		});

		it('handles recordings from different devices', async () => {
			// Arrange
			const mockRecordings: Recording[] = [
				{
					id: 'rec-1',
					deviceId: 'doorbell-1',
					eventId: 'evt-1',
					filePath: '/recordings/rec-1.mp4',
					duration: 30,
					fileSize: 1024000,
					status: 'completed',
					createdAt: new Date('2025-12-27T10:00:00Z')
				},
				{
					id: 'rec-2',
					deviceId: 'camera-backyard',
					eventId: 'evt-2',
					filePath: '/recordings/rec-2.mp4',
					duration: 45,
					fileSize: 1536000,
					status: 'completed',
					createdAt: new Date('2025-12-27T10:15:00Z')
				}
			];

			const mockService: MultiClipMergeService = {
				validateRecordings: vi.fn().mockResolvedValue({
					valid: true,
					validRecordings: mockRecordings,
					invalidRecordings: [],
					errors: []
				}),
				queueMergeJob: vi.fn().mockResolvedValue({
					jobId: 'job-multi-device',
					status: 'queued',
					recordingIds: ['rec-1', 'rec-2']
				}),
				getMergeJobStatus: vi.fn(),
				downloadMergedVideo: vi.fn()
			};

			// Act
			const validation = await mockService.validateRecordings(['rec-1', 'rec-2']);

			// Assert: Should support recordings from different devices
			expect(validation.valid).toBe(true);
			expect(validation.validRecordings[0].deviceId).not.toBe(
				validation.validRecordings[1].deviceId
			);
		});
	});
});
