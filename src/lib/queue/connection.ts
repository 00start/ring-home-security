import { Redis } from 'ioredis';
import { config } from '$lib/config';
import { createLogger } from '$lib/utils';

const logger = createLogger('redis');

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
	if (!redisConnection) {
		logger.info({ url: config.redisUrl }, 'Creating Redis connection');

		redisConnection = new Redis(config.redisUrl, {
			maxRetriesPerRequest: null,
			enableReadyCheck: false
		});

		redisConnection.on('connect', () => {
			logger.info('Redis connected');
		});

		redisConnection.on('error', (error) => {
			logger.error({ error }, 'Redis error');
		});

		redisConnection.on('close', () => {
			logger.info('Redis connection closed');
		});
	}

	return redisConnection;
}

export async function closeRedisConnection(): Promise<void> {
	if (redisConnection) {
		await redisConnection.quit();
		redisConnection = null;
		logger.info('Redis connection closed');
	}
}
