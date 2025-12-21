import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../client';
import type { Device, DeviceRow, DeviceType, SensorSubtype, MiscSubtype } from '$lib/types';

function rowToDevice(row: DeviceRow): Device {
	return {
		id: row.id,
		name: row.name,
		type: row.type,
		subtype: (row.subtype as SensorSubtype | MiscSubtype) ?? undefined,
		location: row.location ?? undefined,
		batteryLevel: row.battery_level ?? undefined,
		isOnline: row.is_online === 1,
		lastSeen: new Date(row.last_seen),
		faulted: row.faulted !== null ? row.faulted === 1 : undefined,
		tamperStatus: row.tamper_status ?? undefined
	};
}

export function getAllDevices(): Device[] {
	const db = getDatabase();
	const rows = db.prepare('SELECT * FROM devices ORDER BY type, name').all() as DeviceRow[];
	return rows.map(rowToDevice);
}

export function getDevicesByType(type: DeviceType): Device[] {
	const db = getDatabase();
	const rows = db.prepare('SELECT * FROM devices WHERE type = ? ORDER BY name').all(type) as DeviceRow[];
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
	subtype?: string;
	location?: string;
	batteryLevel?: number;
	isOnline?: boolean;
	faulted?: boolean;
	tamperStatus?: string;
}): Device {
	const db = getDatabase();

	const stmt = db.prepare(`
        INSERT INTO devices (id, name, type, subtype, location, battery_level, is_online, faulted, tamper_status, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            type = excluded.type,
            subtype = excluded.subtype,
            location = excluded.location,
            battery_level = excluded.battery_level,
            is_online = excluded.is_online,
            faulted = COALESCE(excluded.faulted, devices.faulted),
            tamper_status = COALESCE(excluded.tamper_status, devices.tamper_status),
            last_seen = datetime('now'),
            updated_at = datetime('now')
    `);

	stmt.run(
		device.id,
		device.name,
		device.type,
		device.subtype ?? null,
		device.location ?? null,
		device.batteryLevel ?? null,
		device.isOnline !== false ? 1 : 0,
		device.faulted !== undefined ? (device.faulted ? 1 : 0) : null,
		device.tamperStatus ?? null
	);

	return getDeviceById(device.id)!;
}

export function updateDeviceFaulted(id: string, faulted: boolean): void {
	const db = getDatabase();
	db.prepare(
		`
        UPDATE devices
        SET faulted = ?, last_seen = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
    `
	).run(faulted ? 1 : 0, id);
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
