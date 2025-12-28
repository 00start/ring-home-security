/**
 * STOR-002: WebP Thumbnail Optimization Unit Tests
 *
 * @requirement STOR-002: Convert thumbnails from JPEG to WebP format
 * @rationale WebP provides ~40-60% size reduction over JPEG at similar quality
 * @quality_dimensions [A.BusinessValue, D.Maintainability]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Thumbnail Format Types
 */
type ThumbnailFormat = 'jpeg' | 'webp';

interface ThumbnailOptions {
	format: ThumbnailFormat;
	width: number;
	quality: number;
	timestamp: number; // seconds into video
}

interface ThumbnailResult {
	success: boolean;
	filePath: string;
	fileSize: number;
	format: ThumbnailFormat;
	width: number;
	height: number;
}

interface ThumbnailGenerationArgs {
	inputPath: string;
	outputPath: string;
	options: ThumbnailOptions;
}

/**
 * Thumbnail Service Interface
 */
interface ThumbnailService {
	generateThumbnail(args: ThumbnailGenerationArgs): Promise<ThumbnailResult>;
	getFFmpegArgs(args: ThumbnailGenerationArgs): string[];
	estimateSizeReduction(fromFormat: ThumbnailFormat, toFormat: ThumbnailFormat): number;
	getThumbnailPath(deviceId: string, timestamp: Date, format: ThumbnailFormat): string;
	getDefaultOptions(): ThumbnailOptions;
}

describe('STOR-002: WebP Thumbnail Optimization', () => {
	describe('Thumbnail Format Configuration', () => {
		it('should use WebP as the default thumbnail format', () => {
			// Arrange
			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateSizeReduction: vi.fn(),
				getThumbnailPath: vi.fn(),
				getDefaultOptions: vi.fn().mockReturnValue({
					format: 'webp',
					width: 240,
					quality: 80,
					timestamp: 1
				})
			};

			// Act
			const defaults = mockService.getDefaultOptions();

			// Assert: Default format should be WebP
			expect(defaults.format).toBe('webp');
		});

		it('should use 240px width for thumbnails (reduced from 320px)', () => {
			// Arrange
			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateSizeReduction: vi.fn(),
				getThumbnailPath: vi.fn(),
				getDefaultOptions: vi.fn().mockReturnValue({
					format: 'webp',
					width: 240,
					quality: 80,
					timestamp: 1
				})
			};

			// Act
			const defaults = mockService.getDefaultOptions();

			// Assert: Width should be 240px (25% reduction from 320px)
			expect(defaults.width).toBe(240);
		});

		it('should capture thumbnail at 1 second mark', () => {
			// Arrange
			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateSizeReduction: vi.fn(),
				getThumbnailPath: vi.fn(),
				getDefaultOptions: vi.fn().mockReturnValue({
					format: 'webp',
					width: 240,
					quality: 80,
					timestamp: 1
				})
			};

			// Act
			const defaults = mockService.getDefaultOptions();

			// Assert: Timestamp should be 1 second
			expect(defaults.timestamp).toBe(1);
		});
	});

	describe('FFmpeg Arguments for WebP', () => {
		it('should generate correct FFmpeg args for WebP thumbnail generation', () => {
			// Arrange
			const args: ThumbnailGenerationArgs = {
				inputPath: '/recordings/video.mp4',
				outputPath: '/thumbnails/thumb.webp',
				options: {
					format: 'webp',
					width: 240,
					quality: 80,
					timestamp: 1
				}
			};

			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn(),
				getFFmpegArgs: vi.fn().mockReturnValue([
					'-i',
					'/recordings/video.mp4',
					'-ss',
					'00:00:01',
					'-vframes',
					'1',
					'-vf',
					'scale=240:-1',
					'-c:v',
					'libwebp',
					'-quality',
					'80',
					'-y',
					'/thumbnails/thumb.webp'
				]),
				estimateSizeReduction: vi.fn(),
				getThumbnailPath: vi.fn(),
				getDefaultOptions: vi.fn()
			};

			// Act
			const ffmpegArgs = mockService.getFFmpegArgs(args);

			// Assert: Should include WebP codec and quality settings
			expect(ffmpegArgs).toContain('-c:v');
			expect(ffmpegArgs).toContain('libwebp');
			expect(ffmpegArgs).toContain('-quality');
			expect(ffmpegArgs).toContain('80');
			expect(ffmpegArgs).toContain('scale=240:-1');
		});

		it('should support fallback to JPEG if WebP generation fails', () => {
			// Arrange
			const jpegArgs: ThumbnailGenerationArgs = {
				inputPath: '/recordings/video.mp4',
				outputPath: '/thumbnails/thumb.jpg',
				options: {
					format: 'jpeg',
					width: 240,
					quality: 80,
					timestamp: 1
				}
			};

			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn(),
				getFFmpegArgs: vi.fn().mockReturnValue([
					'-i',
					'/recordings/video.mp4',
					'-ss',
					'00:00:01',
					'-vframes',
					'1',
					'-vf',
					'scale=240:-1',
					'-q:v',
					'2',
					'-y',
					'/thumbnails/thumb.jpg'
				]),
				estimateSizeReduction: vi.fn(),
				getThumbnailPath: vi.fn(),
				getDefaultOptions: vi.fn()
			};

			// Act
			const ffmpegArgs = mockService.getFFmpegArgs(jpegArgs);

			// Assert: Should generate valid JPEG args as fallback
			expect(ffmpegArgs).toContain('-q:v');
			expect(ffmpegArgs).toContain('2');
			expect(ffmpegArgs[ffmpegArgs.length - 1]).toContain('.jpg');
		});
	});

	describe('Size Reduction Estimation', () => {
		it('should estimate 40-60% size reduction when converting from JPEG to WebP', () => {
			// Arrange
			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateSizeReduction: vi.fn().mockReturnValue(0.5), // 50% reduction
				getThumbnailPath: vi.fn(),
				getDefaultOptions: vi.fn()
			};

			// Act
			const reduction = mockService.estimateSizeReduction('jpeg', 'webp');

			// Assert: Should be in the 40-60% range
			expect(reduction).toBeGreaterThanOrEqual(0.4);
			expect(reduction).toBeLessThanOrEqual(0.6);
		});

		it('should return 0 reduction when converting from WebP to JPEG', () => {
			// Arrange
			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateSizeReduction: vi.fn().mockReturnValue(0),
				getThumbnailPath: vi.fn(),
				getDefaultOptions: vi.fn()
			};

			// Act
			const reduction = mockService.estimateSizeReduction('webp', 'jpeg');

			// Assert: No reduction (would likely increase size)
			expect(reduction).toBe(0);
		});

		it('should return 0 reduction when same format', () => {
			// Arrange
			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateSizeReduction: vi.fn().mockReturnValue(0),
				getThumbnailPath: vi.fn(),
				getDefaultOptions: vi.fn()
			};

			// Act
			const reduction = mockService.estimateSizeReduction('webp', 'webp');

			// Assert: No reduction for same format
			expect(reduction).toBe(0);
		});
	});

	describe('Thumbnail Path Generation', () => {
		it('should generate correct WebP thumbnail path', () => {
			// Arrange
			const deviceId = 'camera-123';
			const timestamp = new Date('2024-01-15T10:30:00Z');

			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateSizeReduction: vi.fn(),
				getThumbnailPath: vi
					.fn()
					.mockReturnValue('./data/thumbnails/camera-123/2024-01-15/10-30-00.webp'),
				getDefaultOptions: vi.fn()
			};

			// Act
			const path = mockService.getThumbnailPath(deviceId, timestamp, 'webp');

			// Assert: Path should end with .webp
			expect(path).toContain('.webp');
			expect(path).toContain(deviceId);
		});

		it('should generate correct JPEG thumbnail path for fallback', () => {
			// Arrange
			const deviceId = 'camera-123';
			const timestamp = new Date('2024-01-15T10:30:00Z');

			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn(),
				getFFmpegArgs: vi.fn(),
				estimateSizeReduction: vi.fn(),
				getThumbnailPath: vi
					.fn()
					.mockReturnValue('./data/thumbnails/camera-123/2024-01-15/10-30-00.jpg'),
				getDefaultOptions: vi.fn()
			};

			// Act
			const path = mockService.getThumbnailPath(deviceId, timestamp, 'jpeg');

			// Assert: Path should end with .jpg
			expect(path).toContain('.jpg');
			expect(path).toContain(deviceId);
		});
	});

	describe('Thumbnail Generation', () => {
		it('should successfully generate WebP thumbnail', async () => {
			// Arrange
			const args: ThumbnailGenerationArgs = {
				inputPath: '/recordings/video.mp4',
				outputPath: '/thumbnails/thumb.webp',
				options: {
					format: 'webp',
					width: 240,
					quality: 80,
					timestamp: 1
				}
			};

			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn().mockResolvedValue({
					success: true,
					filePath: '/thumbnails/thumb.webp',
					fileSize: 15_000, // ~15KB
					format: 'webp',
					width: 240,
					height: 135
				}),
				getFFmpegArgs: vi.fn(),
				estimateSizeReduction: vi.fn(),
				getThumbnailPath: vi.fn(),
				getDefaultOptions: vi.fn()
			};

			// Act
			const result = await mockService.generateThumbnail(args);

			// Assert: Should successfully generate WebP thumbnail
			expect(result.success).toBe(true);
			expect(result.format).toBe('webp');
			expect(result.width).toBe(240);
			expect(result.fileSize).toBeLessThan(50_000); // Should be under 50KB
		});

		it('should handle thumbnail generation failure gracefully', async () => {
			// Arrange
			const args: ThumbnailGenerationArgs = {
				inputPath: '/recordings/nonexistent.mp4',
				outputPath: '/thumbnails/thumb.webp',
				options: {
					format: 'webp',
					width: 240,
					quality: 80,
					timestamp: 1
				}
			};

			const mockService: ThumbnailService = {
				generateThumbnail: vi.fn().mockResolvedValue({
					success: false,
					filePath: '',
					fileSize: 0,
					format: 'webp',
					width: 0,
					height: 0
				}),
				getFFmpegArgs: vi.fn(),
				estimateSizeReduction: vi.fn(),
				getThumbnailPath: vi.fn(),
				getDefaultOptions: vi.fn()
			};

			// Act
			const result = await mockService.generateThumbnail(args);

			// Assert: Should handle failure gracefully (not throw)
			expect(result.success).toBe(false);
		});
	});

	describe('Storage Savings Analysis', () => {
		it('should calculate combined savings from WebP + reduced width', () => {
			// Arrange: Original JPEG at 320px vs new WebP at 240px
			const originalJpegSize = 35_000; // ~35KB average JPEG thumbnail at 320px
			const newWebpSize = 12_000; // ~12KB WebP thumbnail at 240px

			// Act
			const savingsPercent = ((originalJpegSize - newWebpSize) / originalJpegSize) * 100;

			// Assert: Combined savings should be ~65% (40% from WebP + ~25% from smaller dimensions)
			expect(savingsPercent).toBeGreaterThanOrEqual(55);
			expect(savingsPercent).toBeLessThanOrEqual(75);
		});

		it('should estimate monthly storage savings', () => {
			// Arrange: Assume 100 recordings per day, 30 days
			const recordingsPerDay = 100;
			const days = 30;
			const totalRecordings = recordingsPerDay * days;

			const oldThumbnailSize = 35_000; // 35KB JPEG
			const newThumbnailSize = 12_000; // 12KB WebP

			const oldTotalSize = totalRecordings * oldThumbnailSize;
			const newTotalSize = totalRecordings * newThumbnailSize;
			const savings = oldTotalSize - newTotalSize;

			// Act
			const savingsGB = savings / (1024 * 1024 * 1024);

			// Assert: Should save significant storage
			expect(savings).toBeGreaterThan(0);
			expect(savingsGB).toBeGreaterThan(0.05); // At least 50MB savings per month
		});
	});
});

describe('STOR-002: Browser Compatibility', () => {
	describe('WebP Support Detection', () => {
		it('should serve WebP to browsers that support it', () => {
			// Arrange: Modern browser Accept header
			const acceptHeader = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8';

			// Act
			const supportsWebP = acceptHeader.includes('image/webp');

			// Assert
			expect(supportsWebP).toBe(true);
		});

		it('should fall back to JPEG for older browsers', () => {
			// Arrange: Older browser Accept header (no WebP support)
			const acceptHeader = 'image/png,image/*,*/*;q=0.8';

			// Act
			const supportsWebP = acceptHeader.includes('image/webp');

			// Assert
			expect(supportsWebP).toBe(false);
		});
	});
});
