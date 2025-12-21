/**
 * Retention Worker
 *
 * This worker runs periodically to clean up old recordings
 * based on the configured retention policy.
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { promises as fs } from 'fs';
import { initDatabase, recordingsRepo } from '../lib/db/index.js';
import { config } from '../lib/config/index.js';
import { createLogger, sleep } from '../lib/utils/index.js';

const logger = createLogger('retention-worker');

let isShuttingDown = false;

async function deleteFile(filePath: string): Promise<boolean> {
	try {
		await fs.unlink(filePath);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			// File doesn't exist, that's fine
			return true;
		}
		logger.error({ error, filePath }, 'Failed to delete file');
		return false;
	}
}

async function cleanupExpiredRecordings(): Promise<number> {
	const expiredRecordings = recordingsRepo.getExpiredRecordings();

	if (expiredRecordings.length === 0) {
		logger.debug('No expired recordings to clean up');
		return 0;
	}

	logger.info({ count: expiredRecordings.length }, 'Found expired recordings to clean up');

	let deleted = 0;

	for (const recording of expiredRecordings) {
		// Delete video file
		const videoDeleted = await deleteFile(recording.filePath);

		// Delete thumbnail if it exists
		if (recording.thumbnailPath) {
			await deleteFile(recording.thumbnailPath);
		}

		if (videoDeleted) {
			// Remove from database
			recordingsRepo.deleteRecording(recording.id);
			deleted++;
		}
	}

	logger.info({ deleted, total: expiredRecordings.length }, 'Cleanup completed');

	return deleted;
}

async function startWorker(): Promise<void> {
	logger.info({ retentionDays: config.retentionDays }, 'Starting retention worker');

	// Initialize database
	await initDatabase();

	// Run cleanup every hour
	const intervalMs = 60 * 60 * 1000;

	while (!isShuttingDown) {
		try {
			await cleanupExpiredRecordings();
		} catch (error) {
			logger.error({ error }, 'Cleanup error');
		}

		await sleep(intervalMs);
	}
}

// Handle shutdown
process.on('SIGINT', () => {
	isShuttingDown = true;
});

process.on('SIGTERM', () => {
	isShuttingDown = true;
});

startWorker().catch((error) => {
	logger.fatal({ error }, 'Fatal error in retention worker');
	process.exit(1);
});
