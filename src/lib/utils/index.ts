export { logger, createLogger } from './logger';
// Path utilities are server-only - import directly from './paths' when needed on server

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
	fn: () => Promise<T>,
	options: { maxRetries?: number; baseDelay?: number; maxDelay?: number } = {}
): Promise<T> {
	const { maxRetries = 3, baseDelay = 1000, maxDelay = 30000 } = options;

	let lastError: Error | undefined;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt === maxRetries) {
				throw lastError;
			}

			const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
			await sleep(delay);
		}
	}

	throw lastError;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';

	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);

	if (h > 0) {
		return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}
	return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Calculate time ago string
 */
export function timeAgo(date: Date): string {
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

	if (seconds < 60) return 'just now';
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

	return date.toLocaleDateString();
}
