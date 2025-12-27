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
