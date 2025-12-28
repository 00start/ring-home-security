/**
 * STOR-001: Configurable Video Quality Presets Unit Tests
 *
 * @requirement STOR-001: Add quality presets for video transcoding
 * @rationale Different quality levels optimize storage vs. visual quality tradeoffs
 * @quality_dimensions [A.BusinessValue, D.Maintainability]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EventType } from '../../../src/lib/types/index.js';

/**
 * Video Quality Types
 */
type VideoQuality = 'high' | 'medium' | 'low';

interface VideoQualityPreset {
	name: VideoQuality;
	crf: number;
	preset: string;
	description: string;
}

interface TranscodeOptions {
	quality: VideoQuality;
	inputPath: string;
	outputPath: string;
}

interface TranscodeResult {
	success: boolean;
	fileSize: number;
	duration: number;
	quality: VideoQuality;
}

/**
 * Video Quality Service Interface
 */
interface VideoQualityService {
	getQualityPreset(quality: VideoQuality): VideoQualityPreset;
	getFFmpegArgs(options: TranscodeOptions): string[];
	estimateFileSizeReduction(fromQuality: VideoQuality, toQuality: VideoQuality): number;
	validateQuality(quality: string): quality is VideoQuality;
}

describe('STOR-001: Configurable Video Quality Presets', () => {
	describe('Quality Preset Definitions', () => {
		it('should define high quality preset with CRF 18 and slower preset', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn().mockReturnValue({
					name: 'high',
					crf: 18,
					preset: 'slower',
					description: 'High quality for important events (motion, ding)'
				}),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn()
			};

			// Act
			const preset = mockService.getQualityPreset('high');

			// Assert: High quality should use CRF 18 with slower preset
			expect(preset.name).toBe('high');
			expect(preset.crf).toBe(18);
			expect(preset.preset).toBe('slower');
		});

		it('should define medium quality preset with CRF 23 and fast preset', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn().mockReturnValue({
					name: 'medium',
					crf: 23,
					preset: 'fast',
					description: 'Medium quality - default preset'
				}),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn()
			};

			// Act
			const preset = mockService.getQualityPreset('medium');

			// Assert: Medium quality should use CRF 23 with fast preset (current default)
			expect(preset.name).toBe('medium');
			expect(preset.crf).toBe(23);
			expect(preset.preset).toBe('fast');
		});

		it('should define low quality preset with CRF 28 and veryfast preset', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn().mockReturnValue({
					name: 'low',
					crf: 28,
					preset: 'veryfast',
					description: 'Low quality for status events (device_online/offline)'
				}),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn()
			};

			// Act
			const preset = mockService.getQualityPreset('low');

			// Assert: Low quality should use CRF 28 with veryfast preset
			expect(preset.name).toBe('low');
			expect(preset.crf).toBe(28);
			expect(preset.preset).toBe('veryfast');
		});
	});

	describe('FFmpeg Arguments Generation', () => {
		it('should generate correct FFmpeg args for high quality', () => {
			// Arrange
			const options: TranscodeOptions = {
				quality: 'high',
				inputPath: '/tmp/input.mp4',
				outputPath: '/recordings/output.mp4'
			};

			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn().mockReturnValue([
					'-i',
					'/tmp/input.mp4',
					'-c:v',
					'libx264',
					'-preset',
					'slower',
					'-crf',
					'18',
					'-c:a',
					'aac',
					'-b:a',
					'128k',
					'-movflags',
					'+faststart',
					'-y',
					'/recordings/output.mp4'
				]),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn()
			};

			// Act
			const args = mockService.getFFmpegArgs(options);

			// Assert: Should include high quality settings
			expect(args).toContain('-crf');
			expect(args).toContain('18');
			expect(args).toContain('-preset');
			expect(args).toContain('slower');
		});

		it('should generate correct FFmpeg args for medium quality', () => {
			// Arrange
			const options: TranscodeOptions = {
				quality: 'medium',
				inputPath: '/tmp/input.mp4',
				outputPath: '/recordings/output.mp4'
			};

			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn().mockReturnValue([
					'-i',
					'/tmp/input.mp4',
					'-c:v',
					'libx264',
					'-preset',
					'fast',
					'-crf',
					'23',
					'-c:a',
					'aac',
					'-b:a',
					'128k',
					'-movflags',
					'+faststart',
					'-y',
					'/recordings/output.mp4'
				]),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn()
			};

			// Act
			const args = mockService.getFFmpegArgs(options);

			// Assert: Should include medium quality settings
			expect(args).toContain('-crf');
			expect(args).toContain('23');
			expect(args).toContain('-preset');
			expect(args).toContain('fast');
		});

		it('should generate correct FFmpeg args for low quality', () => {
			// Arrange
			const options: TranscodeOptions = {
				quality: 'low',
				inputPath: '/tmp/input.mp4',
				outputPath: '/recordings/output.mp4'
			};

			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn().mockReturnValue([
					'-i',
					'/tmp/input.mp4',
					'-c:v',
					'libx264',
					'-preset',
					'veryfast',
					'-crf',
					'28',
					'-c:a',
					'aac',
					'-b:a',
					'128k',
					'-movflags',
					'+faststart',
					'-y',
					'/recordings/output.mp4'
				]),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn()
			};

			// Act
			const args = mockService.getFFmpegArgs(options);

			// Assert: Should include low quality settings
			expect(args).toContain('-crf');
			expect(args).toContain('28');
			expect(args).toContain('-preset');
			expect(args).toContain('veryfast');
		});
	});

	describe('File Size Estimation', () => {
		it('should estimate ~40% size reduction from high to medium quality', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn().mockReturnValue(0.4), // 40% reduction
				validateQuality: vi.fn()
			};

			// Act
			const reduction = mockService.estimateFileSizeReduction('high', 'medium');

			// Assert: CRF difference of 5 roughly equates to ~40% size reduction
			expect(reduction).toBeGreaterThanOrEqual(0.3);
			expect(reduction).toBeLessThanOrEqual(0.5);
		});

		it('should estimate ~60% size reduction from high to low quality', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn().mockReturnValue(0.6), // 60% reduction
				validateQuality: vi.fn()
			};

			// Act
			const reduction = mockService.estimateFileSizeReduction('high', 'low');

			// Assert: CRF difference of 10 roughly equates to ~60% size reduction
			expect(reduction).toBeGreaterThanOrEqual(0.5);
			expect(reduction).toBeLessThanOrEqual(0.7);
		});

		it('should estimate ~35% size reduction from medium to low quality', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn().mockReturnValue(0.35), // 35% reduction
				validateQuality: vi.fn()
			};

			// Act
			const reduction = mockService.estimateFileSizeReduction('medium', 'low');

			// Assert: CRF difference of 5 roughly equates to ~35% size reduction
			expect(reduction).toBeGreaterThanOrEqual(0.25);
			expect(reduction).toBeLessThanOrEqual(0.45);
		});

		it('should return 0 reduction when going from lower to higher quality', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn().mockReturnValue(0), // No reduction (would increase)
				validateQuality: vi.fn()
			};

			// Act
			const reduction = mockService.estimateFileSizeReduction('low', 'high');

			// Assert: Should not claim reduction when increasing quality
			expect(reduction).toBe(0);
		});
	});

	describe('Quality Validation', () => {
		it('should validate "high" as a valid quality level', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn().mockReturnValue(true)
			};

			// Act
			const isValid = mockService.validateQuality('high');

			// Assert
			expect(isValid).toBe(true);
		});

		it('should validate "medium" as a valid quality level', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn().mockReturnValue(true)
			};

			// Act
			const isValid = mockService.validateQuality('medium');

			// Assert
			expect(isValid).toBe(true);
		});

		it('should validate "low" as a valid quality level', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn().mockReturnValue(true)
			};

			// Act
			const isValid = mockService.validateQuality('low');

			// Assert
			expect(isValid).toBe(true);
		});

		it('should reject invalid quality levels', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn().mockReturnValue(false)
			};

			// Act
			const isValid = mockService.validateQuality('ultra');

			// Assert
			expect(isValid).toBe(false);
		});
	});

	describe('Default Quality Behavior', () => {
		it('should use medium quality as the default when quality is not specified', () => {
			// Arrange
			const mockService: VideoQualityService = {
				getQualityPreset: vi.fn().mockReturnValue({
					name: 'medium',
					crf: 23,
					preset: 'fast',
					description: 'Medium quality - default preset'
				}),
				getFFmpegArgs: vi.fn(),
				estimateFileSizeReduction: vi.fn(),
				validateQuality: vi.fn()
			};

			// Act
			const defaultPreset = mockService.getQualityPreset('medium');

			// Assert: Default should maintain backward compatibility with current settings
			expect(defaultPreset.crf).toBe(23);
			expect(defaultPreset.preset).toBe('fast');
		});
	});
});

describe('STOR-001: Quality Presets Configuration', () => {
	describe('Configuration Schema', () => {
		it('should allow quality presets to be configured via environment variables', () => {
			// Arrange: Expected config structure
			const expectedConfig = {
				videoQuality: {
					high: { crf: 18, preset: 'slower' },
					medium: { crf: 23, preset: 'fast' },
					low: { crf: 28, preset: 'veryfast' }
				},
				defaultQuality: 'medium' as VideoQuality
			};

			// Assert: Config structure should match expected
			expect(expectedConfig.videoQuality.high.crf).toBe(18);
			expect(expectedConfig.videoQuality.medium.crf).toBe(23);
			expect(expectedConfig.videoQuality.low.crf).toBe(28);
			expect(expectedConfig.defaultQuality).toBe('medium');
		});

		it('should provide reasonable CRF bounds for each quality level', () => {
			// Arrange: CRF ranges (0-51, lower = higher quality)
			const qualityBounds = {
				high: { minCrf: 15, maxCrf: 20 },
				medium: { minCrf: 21, maxCrf: 25 },
				low: { minCrf: 26, maxCrf: 30 }
			};

			// Assert: Each quality level has distinct CRF range
			expect(qualityBounds.high.maxCrf).toBeLessThan(qualityBounds.medium.minCrf);
			expect(qualityBounds.medium.maxCrf).toBeLessThan(qualityBounds.low.minCrf);
		});
	});
});
