/**
 * Database Migration Script
 *
 * Run with: npm run db:migrate
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { initDatabase, closeDatabase, authRepo } from './index.js';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('db-migrate');

async function migrate() {
	logger.info('Starting database migration');

	try {
		// Initialize database (runs schema creation)
		await initDatabase();
		logger.info('Database schema created/updated');

		// Ensure default admin user exists
		await authRepo.ensureDefaultUser();
		logger.info('Default user ensured');

		logger.info('Migration completed successfully');
	} catch (error) {
		logger.error({ error }, 'Migration failed');
		process.exit(1);
	} finally {
		closeDatabase();
	}
}

migrate();
