import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from '$lib/config';
import { createLogger } from '$lib/utils/logger.server';
import { ensureDir } from '$lib/utils/paths';

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

		// Remove comments and split by semicolons
		const statements = schema
			.split('\n')
			.filter((line) => !line.trim().startsWith('--'))
			.join('\n')
			.split(';')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		logger.debug({ statementCount: statements.length }, 'Parsed statements');

		for (const statement of statements) {
			try {
				logger.debug({ statement: statement.substring(0, 80) + '...' }, 'Executing statement');
				database.exec(statement);
			} catch (error) {
				// Ignore "table already exists" errors for CREATE TABLE IF NOT EXISTS
				if (error instanceof Error && !error.message.includes('already exists')) {
					logger.error({ error, statement }, 'Failed to execute statement');
					throw error;
				} else {
					logger.debug({ error }, 'Skipping statement (already exists)');
				}
			}
		}

		// Run incremental migrations for new columns
		runIncrementalMigrations(database);

		logger.info('Database migrations completed');
	} catch (error) {
		logger.error({ error }, 'Failed to run migrations');
		throw error;
	}
}

function runIncrementalMigrations(database: Database.Database): void {
	// Check if devices table has the new columns, add them if missing
	const columns = database.prepare('PRAGMA table_info(devices)').all() as { name: string }[];
	const columnNames = columns.map((c) => c.name);

	const migrations: { column: string; sql: string }[] = [
		{ column: 'subtype', sql: 'ALTER TABLE devices ADD COLUMN subtype TEXT' },
		{ column: 'faulted', sql: 'ALTER TABLE devices ADD COLUMN faulted INTEGER' },
		{ column: 'tamper_status', sql: 'ALTER TABLE devices ADD COLUMN tamper_status TEXT' }
	];

	for (const migration of migrations) {
		if (!columnNames.includes(migration.column)) {
			logger.info({ column: migration.column }, 'Adding new column to devices table');
			database.exec(migration.sql);
		}
	}

	// Check if the CHECK constraint needs to be updated to include 'misc'
	// SQLite doesn't support ALTER TABLE to modify constraints, so we need to recreate the table
	const tableSchema = database
		.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='devices'")
		.get() as { sql: string } | undefined;
	if (tableSchema && !tableSchema.sql.includes("'misc'")) {
		logger.info('Migrating devices table to add misc type support');

		// Temporarily disable foreign keys for the migration
		database.exec('PRAGMA foreign_keys = OFF');

		// Create new table with updated schema
		database.exec(`
			CREATE TABLE devices_new (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				type TEXT NOT NULL CHECK (type IN ('doorbell', 'camera', 'sensor', 'misc')),
				subtype TEXT,
				location TEXT,
				battery_level INTEGER,
				is_online INTEGER NOT NULL DEFAULT 1,
				last_seen TEXT NOT NULL DEFAULT (datetime('now')),
				faulted INTEGER,
				tamper_status TEXT,
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				updated_at TEXT NOT NULL DEFAULT (datetime('now'))
			)
		`);

		// Copy data from old table
		database.exec(`
			INSERT INTO devices_new (id, name, type, subtype, location, battery_level, is_online, last_seen, faulted, tamper_status, created_at, updated_at)
			SELECT id, name, type, subtype, location, battery_level, is_online, last_seen, faulted, tamper_status, created_at, updated_at
			FROM devices
		`);

		// Drop old table and rename new one
		database.exec('DROP TABLE devices');
		database.exec('ALTER TABLE devices_new RENAME TO devices');

		// Re-enable foreign keys
		database.exec('PRAGMA foreign_keys = ON');

		logger.info('Devices table migration completed');
	}
}

export function closeDatabase(): void {
	if (db) {
		db.close();
		db = null;
		logger.info('Database connection closed');
	}
}
