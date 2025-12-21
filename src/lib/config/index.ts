import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenvConfig();

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
	const result = configSchema.safeParse({
		ringRefreshToken: process.env.RING_REFRESH_TOKEN,
		databasePath: process.env.DATABASE_PATH,
		redisUrl: process.env.REDIS_URL,
		recordingsPath: process.env.RECORDINGS_PATH,
		thumbnailsPath: process.env.THUMBNAILS_PATH,
		retentionDays: process.env.RETENTION_DAYS,
		port: process.env.PORT,
		host: process.env.HOST,
		authSecret: process.env.AUTH_SECRET,
		authUsername: process.env.AUTH_USERNAME,
		authPasswordHash: process.env.AUTH_PASSWORD_HASH,
		logLevel: process.env.LOG_LEVEL,
		ffmpegPath: process.env.FFMPEG_PATH
	});

	if (!result.success) {
		console.error('Configuration validation failed:', result.error.format());
		throw new Error('Invalid configuration');
	}

	return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
