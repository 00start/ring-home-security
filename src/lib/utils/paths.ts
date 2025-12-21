import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { config } from '$lib/config';

/**
 * Get the recording path for a device at a given timestamp
 * Format: /{device}/{YYYY}/{MM}/{DD}/{timestamp}.mp4
 */
export function getRecordingPath(deviceId: string, timestamp: Date): string {
	const year = timestamp.getFullYear().toString();
	const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
	const day = timestamp.getDate().toString().padStart(2, '0');
	const filename = `${timestamp.getTime()}.mp4`;

	return join(config.recordingsPath, deviceId, year, month, day, filename);
}

/**
 * Get the thumbnail path for a recording
 */
export function getThumbnailPath(deviceId: string, timestamp: Date): string {
	const year = timestamp.getFullYear().toString();
	const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
	const day = timestamp.getDate().toString().padStart(2, '0');
	const filename = `${timestamp.getTime()}.jpg`;

	return join(config.thumbnailsPath, deviceId, year, month, day, filename);
}

/**
 * Ensure directory exists, creating it if necessary
 */
export async function ensureDir(filePath: string): Promise<void> {
	const dir = dirname(filePath);
	await mkdir(dir, { recursive: true });
}

/**
 * Get the relative path for serving via API
 */
export function getRelativePath(fullPath: string, basePath: string): string {
	return fullPath.replace(basePath, '').replace(/^\//, '');
}
