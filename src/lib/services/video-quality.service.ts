/**
 * Video Quality Service
 *
 * Provides video quality presets and FFmpeg argument generation for
 * configurable video transcoding quality levels.
 *
 * @feature STOR-001: Configurable Video Quality
 * @feature STOR-003: Event-Based Quality Selection
 */

import { config } from '../config/index.js';
import type { VideoQuality, VideoQualityPreset, EventType } from '../types/index.js';

/**
 * Video quality presets with CRF and FFmpeg preset configurations
 */
export const VIDEO_QUALITY_PRESETS: Record<VideoQuality, VideoQualityPreset> = {
	high: {
		name: 'high',
		crf: config.videoQualityHighCrf,
		preset: config.videoQualityHighPreset,
		description: 'High quality for important events (motion, ding)'
	},
	medium: {
		name: 'medium',
		crf: config.videoQualityMediumCrf,
		preset: config.videoQualityMediumPreset,
		description: 'Medium quality - default preset'
	},
	low: {
		name: 'low',
		crf: config.videoQualityLowCrf,
		preset: config.videoQualityLowPreset,
		description: 'Low quality for status events (device_online/offline)'
	}
};

/**
 * Event type to video quality mapping
 * Higher importance events get higher quality recordings
 */
export const EVENT_QUALITY_MAP: Record<EventType, VideoQuality> = {
	motion: 'high', // Security-critical event
	ding: 'high', // Visitor identification
	door_open: 'medium', // Entry event
	door_close: 'medium', // Exit event
	device_online: 'low', // Status event
	device_offline: 'low' // Status event
};

/**
 * Get the quality preset configuration for a given quality level
 */
export function getQualityPreset(quality: VideoQuality): VideoQualityPreset {
	return VIDEO_QUALITY_PRESETS[quality];
}

/**
 * Get the recommended quality level for a given event type
 */
export function getQualityForEventType(eventType: EventType): VideoQuality {
	return EVENT_QUALITY_MAP[eventType] ?? config.defaultVideoQuality;
}

/**
 * Validate if a string is a valid video quality level
 */
export function validateQuality(quality: string): quality is VideoQuality {
	return quality === 'high' || quality === 'medium' || quality === 'low';
}

/**
 * Interface for transcode options
 */
export interface TranscodeOptions {
	quality: VideoQuality;
	inputPath: string;
	outputPath: string;
}

/**
 * Generate FFmpeg arguments for video transcoding with quality settings
 */
export function getFFmpegTranscodeArgs(options: TranscodeOptions): string[] {
	const preset = getQualityPreset(options.quality);

	return [
		'-i',
		options.inputPath,
		'-c:v',
		'libx264',
		'-preset',
		preset.preset,
		'-crf',
		preset.crf.toString(),
		'-c:a',
		'aac',
		'-b:a',
		'128k',
		'-movflags',
		'+faststart',
		'-y',
		options.outputPath
	];
}

/**
 * Estimate file size reduction when changing quality levels
 * CRF increases by ~6 roughly halves the file size
 *
 * @returns Reduction factor (0-1), where 0.5 means 50% smaller
 */
export function estimateFileSizeReduction(
	fromQuality: VideoQuality,
	toQuality: VideoQuality
): number {
	const fromCrf = getQualityPreset(fromQuality).crf;
	const toCrf = getQualityPreset(toQuality).crf;

	// If going to higher quality (lower CRF), no reduction
	if (toCrf <= fromCrf) {
		return 0;
	}

	// Each 6-point CRF increase roughly halves file size
	const crfDiff = toCrf - fromCrf;
	const reductionFactor = 1 - Math.pow(0.5, crfDiff / 6);

	return Math.min(reductionFactor, 0.8); // Cap at 80% reduction
}

/**
 * Get all quality mappings with rationales
 */
export function getQualityMappings(): Array<{
	eventType: EventType;
	quality: VideoQuality;
	rationale: string;
}> {
	return [
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
}

/**
 * Estimate storage savings based on event distribution
 *
 * @param eventDistribution Map of event types to counts
 * @returns Savings percentage compared to all-high-quality baseline
 */
export function estimateStorageSavings(eventDistribution: Record<EventType, number>): number {
	const highQualitySize = 5_000_000; // 5MB baseline for high quality
	const qualitySizes: Record<VideoQuality, number> = {
		high: 5_000_000,
		medium: 3_000_000,
		low: 1_500_000
	};

	let baselineSize = 0;
	let optimizedSize = 0;

	for (const [eventType, count] of Object.entries(eventDistribution)) {
		const quality = EVENT_QUALITY_MAP[eventType as EventType];
		baselineSize += count * highQualitySize;
		optimizedSize += count * qualitySizes[quality];
	}

	if (baselineSize === 0) return 0;

	return (baselineSize - optimizedSize) / baselineSize;
}
