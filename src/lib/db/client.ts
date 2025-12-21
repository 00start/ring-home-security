import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from '$lib/config';
import { createLogger, ensureDir } from '$lib/utils';

const logger = createLogger('database');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
	if (!db) {
		throw new Error('Database not initialized. Call initDatabase() first.');
	}
	return db;
}

export async function initDatabase(): Promise<Database.Database> {
	if (db) {
		return db;
	}

	logger.info({ path: config.databasePath }, 'Initializing database');

	// Ensure database directory exists
	await ensureDir(config.databasePath);

	// Create database connection
	db = new Database(config.databasePath);

	// Enable WAL mode and foreign keys
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');

	// Run migrations
	await runMigrations(db);

	logger.info('Database initialized successfully');

	return db;
}

async function runMigrations(database: Database.Database): Promise<void> {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const schemaPath = join(__dirname, 'schema.sql');

	try {
		const schema = readFileSync(schemaPath, 'utf-8');

		// Split by semicolons and execute each statement
		const statements = schema
			.split(';')
			.map((s) => s.trim())
			.filter((s) => s.length > 0 && !s.startsWith('--'));

		for (const statement of statements) {
			try {
				database.exec(statement);
			} catch (error) {
				// Ignore "table already exists" errors for CREATE TABLE IF NOT EXISTS
				if (error instanceof Error && !error.message.includes('already exists')) {
					throw error;
				}
			}
		}

		logger.info('Database migrations completed');
	} catch (error) {
		logger.error({ error }, 'Failed to run migrations');
		throw error;
	}
}

export function closeDatabase(): void {
	if (db) {
		db.close();
		db = null;
		logger.info('Database connection closed');
	}
}
