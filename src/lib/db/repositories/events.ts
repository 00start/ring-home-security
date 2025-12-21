import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../client';
import type { EventLog, EventLogRow, EventType, EventFilters } from '$lib/types';

function rowToEvent(row: EventLogRow): EventLog {
	return {
		id: row.id,
		deviceId: row.device_id,
		deviceName: row.device_name,
		eventType: row.event_type,
		timestamp: new Date(row.timestamp),
		metadata: JSON.parse(row.metadata),
		recordingId: row.recording_id ?? undefined
	};
}

export function createEvent(event: {
	deviceId: string;
	deviceName: string;
	eventType: EventType;
	timestamp?: Date;
	metadata?: Record<string, unknown>;
	recordingId?: string;
}): EventLog {
	const db = getDatabase();
	const id = uuidv4();
	const timestamp = event.timestamp ?? new Date();

	db.prepare(
		`
        INSERT INTO events (id, device_id, device_name, event_type, timestamp, metadata, recording_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `
	).run(
		id,
		event.deviceId,
		event.deviceName,
		event.eventType,
		timestamp.toISOString(),
		JSON.stringify(event.metadata ?? {}),
		event.recordingId ?? null
	);

	return getEventById(id)!;
}

export function getEventById(id: string): EventLog | null {
	const db = getDatabase();
	const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as EventLogRow | undefined;
	return row ? rowToEvent(row) : null;
}

export function getEvents(filters: EventFilters = {}): EventLog[] {
	const db = getDatabase();

	let query = 'SELECT * FROM events WHERE 1=1';
	const params: (string | number)[] = [];

	if (filters.deviceId) {
		query += ' AND device_id = ?';
		params.push(filters.deviceId);
	}

	if (filters.eventType) {
		query += ' AND event_type = ?';
		params.push(filters.eventType);
	}

	if (filters.hasRecording !== undefined) {
		if (filters.hasRecording) {
			query += ' AND recording_id IS NOT NULL';
		} else {
			query += ' AND recording_id IS NULL';
		}
	}

	if (filters.startDate) {
		query += ' AND timestamp >= ?';
		params.push(filters.startDate.toISOString());
	}

	if (filters.endDate) {
		query += ' AND timestamp <= ?';
		params.push(filters.endDate.toISOString());
	}

	query += ' ORDER BY timestamp DESC';

	if (filters.limit) {
		query += ' LIMIT ?';
		params.push(filters.limit);
	}

	if (filters.offset) {
		query += ' OFFSET ?';
		params.push(filters.offset);
	}

	const rows = db.prepare(query).all(...params) as EventLogRow[];
	return rows.map(rowToEvent);
}

export function getEventsCount(filters: Omit<EventFilters, 'limit' | 'offset'> = {}): number {
	const db = getDatabase();

	let query = 'SELECT COUNT(*) as count FROM events WHERE 1=1';
	const params: string[] = [];

	if (filters.deviceId) {
		query += ' AND device_id = ?';
		params.push(filters.deviceId);
	}

	if (filters.eventType) {
		query += ' AND event_type = ?';
		params.push(filters.eventType);
	}

	if (filters.hasRecording !== undefined) {
		if (filters.hasRecording) {
			query += ' AND recording_id IS NOT NULL';
		} else {
			query += ' AND recording_id IS NULL';
		}
	}

	if (filters.startDate) {
		query += ' AND timestamp >= ?';
		params.push(filters.startDate.toISOString());
	}

	if (filters.endDate) {
		query += ' AND timestamp <= ?';
		params.push(filters.endDate.toISOString());
	}

	const result = db.prepare(query).get(...params) as { count: number };
	return result.count;
}

export function getTodayEventsCount(): number {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	return getEventsCount({ startDate: today });
}

export function updateEventRecording(eventId: string, recordingId: string): void {
	const db = getDatabase();
	db.prepare('UPDATE events SET recording_id = ? WHERE id = ?').run(recordingId, eventId);
}

export function getRecentEvents(limit: number = 10): EventLog[] {
	return getEvents({ limit });
}

export function deleteAllEvents(): number {
	const db = getDatabase();
	const result = db.prepare('DELETE FROM events').run();
	return result.changes;
}
