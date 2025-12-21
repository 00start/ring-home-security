import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../client';
import type { Device, DeviceRow, DeviceType } from '$lib/types';

function rowToDevice(row: DeviceRow): Device {
	return {
		id: row.id,
		name: row.name,
		type: row.type,
		location: row.location ?? undefined,
		batteryLevel: row.battery_level ?? undefined,
		isOnline: row.is_online === 1,
		lastSeen: new Date(row.last_seen)
	};
}

export function getAllDevices(): Device[] {
	const db = getDatabase();
	const rows = db.prepare('SELECT * FROM devices ORDER BY name').all() as DeviceRow[];
	return rows.map(rowToDevice);
}

export function getDeviceById(id: string): Device | null {
	const db = getDatabase();
	const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as DeviceRow | undefined;
	return row ? rowToDevice(row) : null;
}

export function upsertDevice(device: {
	id: string;
	name: string;
	type: DeviceType;
	location?: string;
	batteryLevel?: number;
	isOnline?: boolean;
}): Device {
	const db = getDatabase();

	const stmt = db.prepare(`
        INSERT INTO devices (id, name, type, location, battery_level, is_online, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            type = excluded.type,
            location = excluded.location,
            battery_level = excluded.battery_level,
            is_online = excluded.is_online,
            last_seen = datetime('now'),
            updated_at = datetime('now')
    `);

	stmt.run(
		device.id,
		device.name,
		device.type,
		device.location ?? null,
		device.batteryLevel ?? null,
		device.isOnline !== false ? 1 : 0
	);

	return getDeviceById(device.id)!;
}

export function updateDeviceStatus(id: string, isOnline: boolean): void {
	const db = getDatabase();
	db.prepare(
		`
        UPDATE devices
        SET is_online = ?, last_seen = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
    `
	).run(isOnline ? 1 : 0, id);
}

export function updateDeviceBattery(id: string, batteryLevel: number): void {
	const db = getDatabase();
	db.prepare(
		`
        UPDATE devices
        SET battery_level = ?, updated_at = datetime('now')
        WHERE id = ?
    `
	).run(batteryLevel, id);
}

export function getOnlineDeviceCount(): number {
	const db = getDatabase();
	const result = db.prepare('SELECT COUNT(*) as count FROM devices WHERE is_online = 1').get() as {
		count: number;
	};
	return result.count;
}

export function getTotalDeviceCount(): number {
	const db = getDatabase();
	const result = db.prepare('SELECT COUNT(*) as count FROM devices').get() as { count: number };
	return result.count;
}
