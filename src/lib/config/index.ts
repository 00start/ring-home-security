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
	ffmpegPath: z.string().optional()
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
		retentionDays: env.RETENTION_DAYS,
		port: env.PORT,
		host: env.HOST,
		authSecret: env.AUTH_SECRET,
		authUsername: env.AUTH_USERNAME,
		authPasswordHash: env.AUTH_PASSWORD_HASH,
		logLevel: env.LOG_LEVEL,
		ffmpegPath: env.FFMPEG_PATH
	});

	if (!result.success) {
		console.error('Configuration validation failed:', result.error.format());
		throw new Error('Invalid configuration');
	}

	return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
