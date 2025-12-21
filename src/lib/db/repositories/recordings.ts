import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../client';
import type { Recording, RecordingRow, RecordingStatus } from '$lib/types';
import { config } from '$lib/config';

function rowToRecording(row: RecordingRow): Recording {
	return {
		id: row.id,
		deviceId: row.device_id,
		eventId: row.event_id,
		filePath: row.file_path,
		thumbnailPath: row.thumbnail_path ?? undefined,
		duration: row.duration,
		fileSize: row.file_size,
		status: row.status,
		createdAt: new Date(row.created_at)
	};
}

export function createRecording(recording: {
	deviceId: string;
	eventId: string;
	filePath: string;
}): Recording {
	const db = getDatabase();
	const id = uuidv4();

	db.prepare(
		`
        INSERT INTO recordings (id, device_id, event_id, file_path, status)
        VALUES (?, ?, ?, ?, 'pending')
    `
	).run(id, recording.deviceId, recording.eventId, recording.filePath);

	return getRecordingById(id)!;
}

export function getRecordingById(id: string): Recording | null {
	const db = getDatabase();
	const row = db.prepare('SELECT * FROM recordings WHERE id = ?').get(id) as
		| RecordingRow
		| undefined;
	return row ? rowToRecording(row) : null;
}

export function getRecordings(options: {
	deviceId?: string;
	status?: RecordingStatus;
	limit?: number;
	offset?: number;
} = {}): Recording[] {
	const db = getDatabase();

	let query = 'SELECT * FROM recordings WHERE 1=1';
	const params: (string | number)[] = [];

	if (options.deviceId) {
		query += ' AND device_id = ?';
		params.push(options.deviceId);
	}

	if (options.status) {
		query += ' AND status = ?';
		params.push(options.status);
	}

	query += ' ORDER BY created_at DESC';

	if (options.limit) {
		query += ' LIMIT ?';
		params.push(options.limit);
	}

	if (options.offset) {
		query += ' OFFSET ?';
		params.push(options.offset);
	}

	const rows = db.prepare(query).all(...params) as RecordingRow[];
	return rows.map(rowToRecording);
}

export function updateRecordingStatus(
	id: string,
	status: RecordingStatus,
	details?: {
		thumbnailPath?: string;
		duration?: number;
		fileSize?: number;
	}
): void {
	const db = getDatabase();

	if (details) {
		db.prepare(
			`
            UPDATE recordings
            SET status = ?, thumbnail_path = ?, duration = ?, file_size = ?, updated_at = datetime('now')
            WHERE id = ?
        `
		).run(
			status,
			details.thumbnailPath ?? null,
			details.duration ?? 0,
			details.fileSize ?? 0,
			id
		);
	} else {
		db.prepare(
			`
            UPDATE recordings
            SET status = ?, updated_at = datetime('now')
            WHERE id = ?
        `
		).run(status, id);
	}
}

export function getTotalRecordingsCount(): number {
	const db = getDatabase();
	const result = db.prepare('SELECT COUNT(*) as count FROM recordings').get() as { count: number };
	return result.count;
}

export function getTotalStorageUsed(): number {
	const db = getDatabase();
	const result = db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM recordings').get() as { total: number };
	return result.total;
}

export function getStorageByDevice(): { deviceId: string; total: number }[] {
	const db = getDatabase();
	const rows = db.prepare(`
        SELECT device_id, SUM(file_size) as total
        FROM recordings
        GROUP BY device_id
    `).all() as { device_id: string; total: number }[];

	return rows.map((row) => ({
		deviceId: row.device_id,
		total: row.total
	}));
}

export function getRecordingsOlderThan(days: number): Recording[] {
	const db = getDatabase();
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	const rows = db.prepare(`
        SELECT * FROM recordings
        WHERE created_at < ? AND status = 'completed'
        ORDER BY created_at ASC
    `).all(cutoffDate.toISOString()) as RecordingRow[];

	return rows.map(rowToRecording);
}

export function deleteRecording(id: string): void {
	const db = getDatabase();
	db.prepare('DELETE FROM recordings WHERE id = ?').run(id);
}

export function getExpiredRecordings(): Recording[] {
	return getRecordingsOlderThan(config.retentionDays);
}
