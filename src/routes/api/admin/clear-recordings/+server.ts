import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordingsRepo } from '$lib/db';
import { promises as fs } from 'fs';
import { config } from '$lib/config';
import { join, dirname } from 'path';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-admin');

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Not authenticated' }, { status: 401 });
	}

	try {
		// Get all recordings to delete their files
		const recordings = recordingsRepo.getAllRecordings();

		let filesDeleted = 0;
		let fileErrors = 0;

		// Delete recording files and thumbnails
		for (const recording of recordings) {
			// Delete video file
			if (recording.filePath) {
				try {
					await fs.unlink(recording.filePath);
					filesDeleted++;
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
						fileErrors++;
					}
				}
			}

			// Delete thumbnail
			if (recording.thumbnailPath) {
				try {
					await fs.unlink(recording.thumbnailPath);
				} catch (error) {
					// Ignore thumbnail deletion errors
				}
			}
		}

		// Delete database records
		const deleted = recordingsRepo.deleteAllRecordings();

		// Also update events to remove recording references
		const { getDatabase } = await import('$lib/db');
		const db = getDatabase();
		db.prepare('UPDATE events SET recording_id = NULL WHERE recording_id IS NOT NULL').run();

		return json({
			success: true,
			data: {
				recordsDeleted: deleted,
				filesDeleted,
				fileErrors
			}
		});
	} catch (error) {
		logger.error({ error }, 'Failed to clear recordings');
		return json({ success: false, error: 'Failed to clear recordings' }, { status: 500 });
	}
};
