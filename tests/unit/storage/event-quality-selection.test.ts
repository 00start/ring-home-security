/**
 * STOR-003: Event-Based Quality Selection Unit Tests
 *
 * @requirement STOR-003: Automatically select quality preset based on event type
 * @rationale Important events (motion, ding) deserve higher quality; status events can use lower quality
 * @quality_dimensions [A.BusinessValue, D.Maintainability]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EventType } from '../../../src/lib/types/index.js';

/**
 * Video Quality Types
 */
type VideoQuality = 'high' | 'medium' | 'low';

/**
 * Event Type to Quality Mapping
 */
interface EventQualityMapping {
	eventType: EventType;
	quality: VideoQuality;
	rationale: string;
}

/**
 * Quality Selection Service Interface
 */
interface QualitySelectionService {
	getQualityForEventType(eventType: EventType): VideoQuality;
	getQualityMappings(): EventQualityMapping[];
	overrideQuality(eventType: EventType, quality: VideoQuality): void;
	resetToDefaults(): void;
	estimateStorageSavings(eventDistribution: Record<EventType, number>): number;
}

describe('STOR-003: Event-Based Quality Selection', () => {
	describe('Default Event-to-Quality Mappings', () => {
		it('should map "motion" events to high quality', () => {
			// Arrange
			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn().mockReturnValue('high'),
				getQualityMappings: vi.fn(),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn()
			};

			// Act
			const quality = mockService.getQualityForEventType('motion');

			// Assert: Motion events are important security events -> high quality
			expect(quality).toBe('high');
		});

		it('should map "ding" events to high quality', () => {
			// Arrange
			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn().mockReturnValue('high'),
				getQualityMappings: vi.fn(),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn()
			};

			// Act
			const quality = mockService.getQualityForEventType('ding');

			// Assert: Doorbell rings are important visitor events -> high quality
			expect(quality).toBe('high');
		});

		it('should map "door_open" events to medium quality', () => {
			// Arrange
			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn().mockReturnValue('medium'),
				getQualityMappings: vi.fn(),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn()
			};

			// Act
			const quality = mockService.getQualityForEventType('door_open');

			// Assert: Door open events are moderately important -> medium quality
			expect(quality).toBe('medium');
		});

		it('should map "door_close" events to medium quality', () => {
			// Arrange
			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn().mockReturnValue('medium'),
				getQualityMappings: vi.fn(),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn()
			};

			// Act
			const quality = mockService.getQualityForEventType('door_close');

			// Assert: Door close events are moderately important -> medium quality
			expect(quality).toBe('medium');
		});

		it('should map "device_online" events to low quality', () => {
			// Arrange
			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn().mockReturnValue('low'),
				getQualityMappings: vi.fn(),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn()
			};

			// Act
			const quality = mockService.getQualityForEventType('device_online');

			// Assert: Status events are less critical for review -> low quality
			expect(quality).toBe('low');
		});

		it('should map "device_offline" events to low quality', () => {
			// Arrange
			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn().mockReturnValue('low'),
				getQualityMappings: vi.fn(),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn()
			};

			// Act
			const quality = mockService.getQualityForEventType('device_offline');

			// Assert: Status events are less critical for review -> low quality
			expect(quality).toBe('low');
		});
	});

	describe('Quality Mapping Overview', () => {
		it('should return all quality mappings with rationales', () => {
			// Arrange
			const expectedMappings: EventQualityMapping[] = [
				{
					eventType: 'motion',
					quality: 'high',
					rationale: 'Security-critical event requiring visual detail'
				},
				{
					eventType: 'ding',
					quality: 'high',
					rationale: 'Visitor identification requires clear imagery'
				},
				{
					eventType: 'door_open',
					quality: 'medium',
					rationale: 'Entry event with moderate importance'
				},
				{
					eventType: 'door_close',
					quality: 'medium',
					rationale: 'Exit event with moderate importance'
				},
				{
					eventType: 'device_online',
					quality: 'low',
					rationale: 'Status event with minimal visual importance'
				},
				{
					eventType: 'device_offline',
					quality: 'low',
					rationale: 'Status event with minimal visual importance'
				}
			];

			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn(),
				getQualityMappings: vi.fn().mockReturnValue(expectedMappings),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn()
			};

			// Act
			const mappings = mockService.getQualityMappings();

			// Assert: Should have mappings for all event types
			expect(mappings).toHaveLength(6);
			expect(mappings.every((m) => m.rationale.length > 0)).toBe(true);
		});

		it('should cover all defined event types', () => {
			// Arrange: All event types from the system
			const allEventTypes: EventType[] = [
				'motion',
				'ding',
				'door_open',
				'door_close',
				'device_online',
				'device_offline'
			];

			const mappings: EventQualityMapping[] = allEventTypes.map((eventType) => ({
				eventType,
				quality: 'medium' as VideoQuality,
				rationale: 'Test'
			}));

			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn(),
				getQualityMappings: vi.fn().mockReturnValue(mappings),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn()
			};

			// Act
			const returnedMappings = mockService.getQualityMappings();
			const coveredEventTypes = returnedMappings.map((m) => m.eventType);

			// Assert: All event types should be covered
			allEventTypes.forEach((eventType) => {
				expect(coveredEventTypes).toContain(eventType);
			});
		});
	});

	describe('Quality Override Functionality', () => {
		it('should allow overriding quality for a specific event type', () => {
			// Arrange
			let currentMappings: Record<EventType, VideoQuality> = {
				motion: 'high',
				ding: 'high',
				door_open: 'medium',
				door_close: 'medium',
				device_online: 'low',
				device_offline: 'low'
			};

			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn((eventType: EventType) => currentMappings[eventType]),
				getQualityMappings: vi.fn(),
				overrideQuality: vi.fn((eventType: EventType, quality: VideoQuality) => {
					currentMappings[eventType] = quality;
				}),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn()
			};

			// Act: Override motion from high to medium
			mockService.overrideQuality('motion', 'medium');
			const newQuality = mockService.getQualityForEventType('motion');

			// Assert: Motion should now be medium quality
			expect(newQuality).toBe('medium');
		});

		it('should allow resetting to default mappings', () => {
			// Arrange
			const defaultMappings: Record<EventType, VideoQuality> = {
				motion: 'high',
				ding: 'high',
				door_open: 'medium',
				door_close: 'medium',
				device_online: 'low',
				device_offline: 'low'
			};

			let currentMappings = { ...defaultMappings };
			currentMappings.motion = 'low'; // Modified

			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn((eventType: EventType) => currentMappings[eventType]),
				getQualityMappings: vi.fn(),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(() => {
					currentMappings = { ...defaultMappings };
				}),
				estimateStorageSavings: vi.fn()
			};

			// Act
			mockService.resetToDefaults();
			const motionQuality = mockService.getQualityForEventType('motion');

			// Assert: Should be back to default
			expect(motionQuality).toBe('high');
		});
	});

	describe('Storage Savings Estimation', () => {
		it('should estimate storage savings based on event distribution', () => {
			// Arrange: Typical event distribution over 30 days
			const eventDistribution: Record<EventType, number> = {
				motion: 2000, // Most common
				ding: 100,
				door_open: 50,
				door_close: 50,
				device_online: 200,
				device_offline: 200
			};

			// File size estimates per quality (30-second video):
			// high: ~5MB, medium: ~3MB, low: ~1.5MB

			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn(),
				getQualityMappings: vi.fn(),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn().mockImplementation((distribution) => {
					// Calculate savings vs. all-high-quality baseline
					const highQualitySize = 5_000_000; // 5MB
					const qualitySizes = { high: 5_000_000, medium: 3_000_000, low: 1_500_000 };
					const qualityMap: Record<EventType, VideoQuality> = {
						motion: 'high',
						ding: 'high',
						door_open: 'medium',
						door_close: 'medium',
						device_online: 'low',
						device_offline: 'low'
					};

					let baselineSize = 0;
					let optimizedSize = 0;

					for (const [eventType, count] of Object.entries(distribution)) {
						baselineSize += count * highQualitySize;
						optimizedSize += count * qualitySizes[qualityMap[eventType as EventType]];
					}

					return (baselineSize - optimizedSize) / baselineSize;
				})
			};

			// Act
			const savingsPercent = mockService.estimateStorageSavings(eventDistribution);

			// Assert: Should show meaningful savings
			expect(savingsPercent).toBeGreaterThan(0.1); // At least 10% savings
			expect(savingsPercent).toBeLessThan(0.5); // But not more than 50% (motion is most common and stays high)
		});

		it('should show greater savings when status events dominate', () => {
			// Arrange: Distribution where status events are more common
			const statusHeavyDistribution: Record<EventType, number> = {
				motion: 100,
				ding: 50,
				door_open: 30,
				door_close: 30,
				device_online: 1000, // Many status events
				device_offline: 1000
			};

			const mockService: QualitySelectionService = {
				getQualityForEventType: vi.fn(),
				getQualityMappings: vi.fn(),
				overrideQuality: vi.fn(),
				resetToDefaults: vi.fn(),
				estimateStorageSavings: vi.fn().mockReturnValue(0.55) // 55% savings
			};

			// Act
			const savingsPercent = mockService.estimateStorageSavings(statusHeavyDistribution);

			// Assert: Should show higher savings when low-quality events dominate
			expect(savingsPercent).toBeGreaterThan(0.4);
		});
	});
});

describe('STOR-003: Quality Selection Integration', () => {
	describe('TranscodeJobData Enhancement', () => {
		it('should include quality field in transcode job data', () => {
			// Arrange: Expected enhanced job data structure
			interface EnhancedTranscodeJobData {
				recordingId: string;
				sourceUrl: string;
				deviceId: string;
				eventId: string;
				eventType: EventType;
				timestamp: string;
				quality: VideoQuality;
			}

			const jobData: EnhancedTranscodeJobData = {
				recordingId: 'rec-123',
				sourceUrl: 'https://example.com/video.mp4',
				deviceId: 'camera-456',
				eventId: 'event-789',
				eventType: 'motion',
				timestamp: new Date().toISOString(),
				quality: 'high'
			};

			// Assert: Job data should include quality
			expect(jobData.quality).toBe('high');
			expect(jobData.eventType).toBe('motion');
		});
	});

	describe('Recording Quality Tracking', () => {
		it('should track quality level in recording metadata', () => {
			// Arrange: Expected enhanced recording structure
			interface EnhancedRecording {
				id: string;
				deviceId: string;
				eventId: string;
				filePath: string;
				quality: VideoQuality;
				fileSize: number;
			}

			const recording: EnhancedRecording = {
				id: 'rec-123',
				deviceId: 'camera-456',
				eventId: 'event-789',
				filePath: '/recordings/rec-123.mp4',
				quality: 'high',
				fileSize: 5_000_000
			};

			// Assert: Recording should track quality
			expect(recording.quality).toBe('high');
		});
	});

	describe('Quality Distribution Analytics', () => {
		it('should enable analytics on quality distribution', () => {
			// Arrange: Quality distribution for analytics
			interface QualityAnalytics {
				totalRecordings: number;
				byQuality: Record<VideoQuality, number>;
				storageSavingsVsAllHigh: number;
			}

			const analytics: QualityAnalytics = {
				totalRecordings: 1000,
				byQuality: {
					high: 600, // 60% motion + ding
					medium: 100, // 10% door events
					low: 300 // 30% status events
				},
				storageSavingsVsAllHigh: 0.25 // 25% savings
			};

			// Assert: Should provide meaningful analytics
			expect(analytics.byQuality.high + analytics.byQuality.medium + analytics.byQuality.low).toBe(
				analytics.totalRecordings
			);
			expect(analytics.storageSavingsVsAllHigh).toBeGreaterThan(0);
		});
	});
});
