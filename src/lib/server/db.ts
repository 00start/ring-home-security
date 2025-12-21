/**
 * Database initialization for SvelteKit server
 */
import { initDatabase } from '$lib/db';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('server-db');

let initialized = false;

export async function ensureDatabase(): Promise<void> {
	if (initialized) return;

	try {
		await initDatabase();
		initialized = true;
		logger.info('Database initialized for server');
	} catch (error) {
		logger.error({ error }, 'Failed to initialize database');
		throw error;
	}
}
