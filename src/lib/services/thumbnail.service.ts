/**
 * Thumbnail Service
 *
 * Provides thumbnail generation with WebP support and optimized sizing.
 *
 * @feature STOR-002: WebP Thumbnail Optimization
 */

import { config } from '../config/index.js';
import type { ThumbnailFormat, ThumbnailOptions } from '../types/index.js';
import { join } from 'path';

/**
 * Default thumbnail options from config
 */
export function getDefaultThumbnailOptions(): ThumbnailOptions {
	return {
		format: config.thumbnailFormat,
		width: config.thumbnailWidth,
		quality: config.thumbnailQuality,
		timestamp: config.thumbnailTimestamp
	};
}

/**
 * Interface for thumbnail generation arguments
 */
export interface ThumbnailGenerationArgs {
	inputPath: string;
	outputPath: string;
	options: ThumbnailOptions;
}

/**
 * Interface for thumbnail generation result
 */
export interface ThumbnailResult {
	success: boolean;
	filePath: string;
	fileSize: number;
	format: ThumbnailFormat;
	width: number;
	height: number;
}

/**
 * Generate FFmpeg arguments for thumbnail generation
 *
 * WebP uses libwebp codec with quality setting
 * JPEG uses mjpeg with q:v quality setting
 */
export function getFFmpegThumbnailArgs(args: ThumbnailGenerationArgs): string[] {
	const { inputPath, outputPath, options } = args;

	const timestampStr = formatTimestamp(options.timestamp);
	const scaleFilter = `scale=${options.width}:-1`;

	const baseArgs = [
		'-i',
		inputPath,
		'-ss',
		timestampStr,
		'-vframes',
		'1',
		'-vf',
		scaleFilter
	];

	if (options.format === 'webp') {
		return [
			...baseArgs,
			'-c:v',
			'libwebp',
			'-quality',
			options.quality.toString(),
			'-y',
			outputPath
		];
	} else {
		// JPEG format
		// Convert quality (0-100) to JPEG q:v scale (1-31, lower is better)
		const jpegQuality = Math.max(1, Math.min(31, Math.round(31 - (options.quality / 100) * 30)));
		return [...baseArgs, '-q:v', jpegQuality.toString(), '-y', outputPath];
	}
}

/**
 * Format timestamp in seconds to HH:MM:SS format
 */
function formatTimestamp(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate thumbnail file path based on device ID, timestamp, and format
 */
export function getThumbnailPath(
	deviceId: string,
	timestamp: Date,
	format: ThumbnailFormat = config.thumbnailFormat
): string {
	const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
	const timeStr = timestamp.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-'); // HH-MM-SS

	const extension = format === 'webp' ? 'webp' : 'jpg';
	const fileName = `${timeStr}.${extension}`;

	return join(config.thumbnailsPath, deviceId, dateStr, fileName);
}

/**
 * Estimate size reduction when converting from JPEG to WebP
 *
 * @returns Reduction factor (0-1), where 0.5 means 50% smaller
 */
export function estimateSizeReduction(
	fromFormat: ThumbnailFormat,
	toFormat: ThumbnailFormat
): number {
	if (fromFormat === toFormat) {
		return 0;
	}

	if (fromFormat === 'jpeg' && toFormat === 'webp') {
		// WebP typically provides 25-35% smaller files than JPEG at equivalent quality
		// Combined with width reduction (320 -> 240), total savings around 50%
		return 0.5;
	}

	// Converting from WebP to JPEG would increase size
	return 0;
}

/**
 * Calculate combined storage savings from WebP format and reduced width
 */
export function calculateThumbnailSavings(): {
	formatSavingsPercent: number;
	dimensionSavingsPercent: number;
	totalSavingsPercent: number;
} {
	// WebP vs JPEG: ~30% savings at equivalent quality
	const formatSavingsPercent = 30;

	// 240px vs 320px width: ~44% fewer pixels (240/320 = 0.75, squared = 0.5625)
	// File size reduction is approximately linear with pixel count
	const dimensionSavingsPercent = 25;

	// Combined savings: 1 - (1 - 0.30) * (1 - 0.25) = 1 - 0.525 = 0.475
	const totalSavingsPercent = Math.round(
		(1 - (1 - formatSavingsPercent / 100) * (1 - dimensionSavingsPercent / 100)) * 100
	);

	return {
		formatSavingsPercent,
		dimensionSavingsPercent,
		totalSavingsPercent
	};
}

/**
 * Check if browser supports WebP based on Accept header
 */
export function browserSupportsWebP(acceptHeader: string): boolean {
	return acceptHeader.includes('image/webp');
}

/**
 * Get the appropriate thumbnail format based on browser support
 */
export function getPreferredFormat(acceptHeader?: string): ThumbnailFormat {
	if (acceptHeader && browserSupportsWebP(acceptHeader)) {
		return 'webp';
	}
	return 'jpeg';
}

/**
 * Estimate monthly storage savings for thumbnails
 *
 * @param recordingsPerMonth Number of recordings per month
 * @param oldThumbnailSizeBytes Average old JPEG thumbnail size
 * @param newThumbnailSizeBytes Average new WebP thumbnail size
 */
export function estimateMonthlyThumbnailSavings(
	recordingsPerMonth: number,
	oldThumbnailSizeBytes: number = 35_000, // 35KB JPEG at 320px
	newThumbnailSizeBytes: number = 12_000 // 12KB WebP at 240px
): {
	oldTotalBytes: number;
	newTotalBytes: number;
	savingsBytes: number;
	savingsPercent: number;
} {
	const oldTotalBytes = recordingsPerMonth * oldThumbnailSizeBytes;
	const newTotalBytes = recordingsPerMonth * newThumbnailSizeBytes;
	const savingsBytes = oldTotalBytes - newTotalBytes;
	const savingsPercent = (savingsBytes / oldTotalBytes) * 100;

	return {
		oldTotalBytes,
		newTotalBytes,
		savingsBytes,
		savingsPercent: Math.round(savingsPercent)
	};
}
