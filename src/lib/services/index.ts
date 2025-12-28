/**
 * Services Index
 *
 * Re-exports all service modules for convenient importing.
 */

// Video Quality Service (STOR-001, STOR-003)
export {
	VIDEO_QUALITY_PRESETS,
	EVENT_QUALITY_MAP,
	getQualityPreset,
	getQualityForEventType,
	validateQuality,
	getFFmpegTranscodeArgs,
	estimateFileSizeReduction,
	getQualityMappings,
	estimateStorageSavings,
	type TranscodeOptions
} from './video-quality.service.js';

// Thumbnail Service (STOR-002)
export {
	getDefaultThumbnailOptions,
	getFFmpegThumbnailArgs,
	getThumbnailPath,
	estimateSizeReduction,
	calculateThumbnailSavings,
	browserSupportsWebP,
	getPreferredFormat,
	estimateMonthlyThumbnailSavings,
	type ThumbnailGenerationArgs,
	type ThumbnailResult
} from './thumbnail.service.js';

// Smart Retention Service (STOR-004)
export {
	EVENT_PRIORITY_MAP,
	RETENTION_MULTIPLIERS,
	getDeviceRetentionConfig,
	setDeviceRetentionConfig,
	removeDeviceRetentionConfig,
	getAllDeviceRetentionConfigs,
	getEffectiveRetentionDays,
	getRetentionPriorityForEvent,
	getRetentionMultiplierForPriority,
	calculatePriorityAdjustedRetention,
	getRecordingsForDeletion,
	isStorageExceedingThreshold,
	getStorageThresholdConfig,
	sortRecordingsByAge,
	getOldestRecordings,
	calculateRecordingsToDelete,
	filterCriticalRecordings,
	estimatePriorityRetentionSavings,
	calculateTotalStorageSavings,
	type EnhancedRecording,
	type StorageUsage,
	type CleanupResult
} from './smart-retention.service.js';

// Notifications
export { sendNotification } from './notifications.js';
