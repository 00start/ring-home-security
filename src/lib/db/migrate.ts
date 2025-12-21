/**
 * Database Migration Script
 *
 * Run with: npm run db:migrate
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { initDatabase, closeDatabase, authRepo } from './index.js';

async function migrate() {
	console.log('Starting database migration...');

	try {
		// Initialize database (runs schema creation)
		await initDatabase();
		console.log('Database schema created/updated');

		// Ensure default admin user exists
		await authRepo.ensureDefaultUser();
		console.log('Default user ensured');

		console.log('Migration completed successfully');
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	} finally {
		closeDatabase();
	}
}

migrate();
