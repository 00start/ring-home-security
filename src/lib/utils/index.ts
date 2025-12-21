// Common utility functions

/**
 * Generate a UUID v4
 */
export function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hrs > 0) {
		return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Build recording file path based on device and timestamp
 * Format: /{device}/{YYYY}/{MM}/{DD}/{timestamp}.mp4
 */
export function buildRecordingPath(
	basePath: string,
	deviceId: string,
	timestamp: Date
): string {
	const year = timestamp.getFullYear();
	const month = String(timestamp.getMonth() + 1).padStart(2, '0');
	const day = String(timestamp.getDate()).padStart(2, '0');
	const time = timestamp.toISOString().replace(/[:.]/g, '-');

	return `${basePath}/${deviceId}/${year}/${month}/${day}/${time}.mp4`;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
	fn: () => Promise<T>,
	options: {
		maxAttempts?: number;
		initialDelayMs?: number;
		maxDelayMs?: number;
	} = {}
): Promise<T> {
	const { maxAttempts = 3, initialDelayMs = 1000, maxDelayMs = 30000 } = options;

	let lastError: Error | undefined;
	let delay = initialDelayMs;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			if (attempt < maxAttempts) {
				await sleep(Math.min(delay, maxDelayMs));
				delay *= 2;
			}
		}
	}

	throw lastError;
}
