import { z } from 'zod';

// Only load dotenv on server-side (Node.js environment)
if (typeof process !== 'undefined' && process.versions?.node) {
	const { config: dotenvConfig } = await import('dotenv');
	dotenvConfig();
}

const configSchema = z.object({
	// Ring
	ringRefreshToken: z.string().optional(),

	// Database
	databasePath: z.string().default('./data/ring-security.db'),

	// Redis
	redisUrl: z.string().default('redis://localhost:6379'),

	// Storage
	recordingsPath: z.string().default('./data/recordings'),
	thumbnailsPath: z.string().default('./data/thumbnails'),
	logsPath: z.string().default('./data/logs'),

	// Retention
	retentionDays: z.coerce.number().default(30),
	// Storage threshold for cleanup (percentage, 0 = disabled)
	storageWarningThreshold: z.coerce.number().default(70),
	storageCriticalThreshold: z.coerce.number().default(85),
	storageCleanupTarget: z.coerce.number().default(60),
	// Maximum storage in GB (0 = unlimited)
	maxStorageGB: z.coerce.number().default(0),

	// Video Quality (STOR-001)
	defaultVideoQuality: z.enum(['high', 'medium', 'low']).default('medium'),
	// CRF values for each quality level (0-51, lower = higher quality)
	videoQualityHighCrf: z.coerce.number().default(18),
	videoQualityMediumCrf: z.coerce.number().default(23),
	videoQualityLowCrf: z.coerce.number().default(28),
	// FFmpeg presets for each quality level
	videoQualityHighPreset: z.string().default('slower'),
	videoQualityMediumPreset: z.string().default('fast'),
	videoQualityLowPreset: z.string().default('veryfast'),

	// Thumbnail Settings (STOR-002)
	thumbnailFormat: z.enum(['jpeg', 'webp']).default('webp'),
	thumbnailWidth: z.coerce.number().default(240),
	thumbnailQuality: z.coerce.number().default(80),
	thumbnailTimestamp: z.coerce.number().default(1),

	// Priority-Based Retention (STOR-004)
	// Retention multiplier for critical events (motion, ding)
	retentionCriticalMultiplier: z.coerce.number().default(1.5),
	// Retention multiplier for normal events (door_open, door_close)
	retentionNormalMultiplier: z.coerce.number().default(1.0),
	// Retention multiplier for low priority events (device_online, device_offline)
	retentionLowMultiplier: z.coerce.number().default(0.5),

	// Server
	port: z.coerce.number().default(3000),
	host: z.string().default('0.0.0.0'),

	// Auth
	authSecret: z.string().default('change-me-in-production'),
	authUsername: z.string().default('admin'),
	authPasswordHash: z.string().optional(),

	// Logging
	logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

	// FFmpeg
	ffmpegPath: z.string().optional(),
	ffprobePath: z.string().optional(),

	// Video Buffer
	bufferPreEventSeconds: z.coerce.number().default(15),
	bufferLatencyCompensationSeconds: z.coerce.number().default(10),
	bufferSafetyMarginSeconds: z.coerce.number().default(5),
	bufferPostEventSeconds: z.coerce.number().default(60),
	bufferReconnectDelayMs: z.coerce.number().default(5000),
	bufferMaxReconnectDelayMs: z.coerce.number().default(60000),

	// Battery Optimization
	// Enable/disable continuous pre-event buffering (major battery impact)
	bufferEnabled: z.coerce.boolean().default(false),
	// Ring API polling interval in seconds (higher = less battery drain)
	ringPollingIntervalSeconds: z.coerce.number().default(30),
	// Battery threshold below which to disable streaming (0-100, 0 = disabled)
	batteryLowThreshold: z.coerce.number().default(20),
	// Auto-stop live view after this many seconds of inactivity (0 = disabled)
	liveViewTimeoutSeconds: z.coerce.number().default(300),
	// Recording duration in seconds (shorter = less battery drain)
	recordingDurationSeconds: z.coerce.number().default(30)
});

function loadConfig() {
	// Only access process.env on server-side
	const env = typeof process !== 'undefined' ? process.env : {};

	const result = configSchema.safeParse({
		ringRefreshToken: env.RING_REFRESH_TOKEN,
		databasePath: env.DATABASE_PATH,
		redisUrl: env.REDIS_URL,
		recordingsPath: env.RECORDINGS_PATH,
		thumbnailsPath: env.THUMBNAILS_PATH,
		logsPath: env.LOGS_PATH,
		retentionDays: env.RETENTION_DAYS,
		storageWarningThreshold: env.STORAGE_WARNING_THRESHOLD,
		storageCriticalThreshold: env.STORAGE_CRITICAL_THRESHOLD,
		storageCleanupTarget: env.STORAGE_CLEANUP_TARGET,
		maxStorageGB: env.MAX_STORAGE_GB,
		defaultVideoQuality: env.DEFAULT_VIDEO_QUALITY,
		videoQualityHighCrf: env.VIDEO_QUALITY_HIGH_CRF,
		videoQualityMediumCrf: env.VIDEO_QUALITY_MEDIUM_CRF,
		videoQualityLowCrf: env.VIDEO_QUALITY_LOW_CRF,
		videoQualityHighPreset: env.VIDEO_QUALITY_HIGH_PRESET,
		videoQualityMediumPreset: env.VIDEO_QUALITY_MEDIUM_PRESET,
		videoQualityLowPreset: env.VIDEO_QUALITY_LOW_PRESET,
		thumbnailFormat: env.THUMBNAIL_FORMAT,
		thumbnailWidth: env.THUMBNAIL_WIDTH,
		thumbnailQuality: env.THUMBNAIL_QUALITY,
		thumbnailTimestamp: env.THUMBNAIL_TIMESTAMP,
		retentionCriticalMultiplier: env.RETENTION_CRITICAL_MULTIPLIER,
		retentionNormalMultiplier: env.RETENTION_NORMAL_MULTIPLIER,
		retentionLowMultiplier: env.RETENTION_LOW_MULTIPLIER,
		port: env.PORT,
		host: env.HOST,
		authSecret: env.AUTH_SECRET,
		authUsername: env.AUTH_USERNAME,
		authPasswordHash: env.AUTH_PASSWORD_HASH,
		logLevel: env.LOG_LEVEL,
		ffmpegPath: env.FFMPEG_PATH,
		ffprobePath: env.FFPROBE_PATH,
		bufferPreEventSeconds: env.BUFFER_PRE_EVENT_SECONDS,
		bufferLatencyCompensationSeconds: env.BUFFER_LATENCY_COMPENSATION_SECONDS,
		bufferSafetyMarginSeconds: env.BUFFER_SAFETY_MARGIN_SECONDS,
		bufferPostEventSeconds: env.BUFFER_POST_EVENT_SECONDS,
		bufferReconnectDelayMs: env.BUFFER_RECONNECT_DELAY_MS,
		bufferMaxReconnectDelayMs: env.BUFFER_MAX_RECONNECT_DELAY_MS,
		bufferEnabled: env.BUFFER_ENABLED,
		ringPollingIntervalSeconds: env.RING_POLLING_INTERVAL_SECONDS,
		batteryLowThreshold: env.BATTERY_LOW_THRESHOLD,
		liveViewTimeoutSeconds: env.LIVE_VIEW_TIMEOUT_SECONDS,
		recordingDurationSeconds: env.RECORDING_DURATION_SECONDS
	});

	if (!result.success) {
		console.error('Configuration validation failed:', result.error.format());
		throw new Error('Invalid configuration');
	}

	return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
