/**
 * Performance utilities for caching, debouncing, throttling, and lazy loading
 */

// ============================================================================
// API Response Cache
// ============================================================================

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

interface CacheOptions {
	/**
	 * Time to live in milliseconds
	 * @default 60000 (1 minute)
	 */
	ttl?: number;
	/**
	 * Maximum number of entries to store
	 * @default 100
	 */
	maxSize?: number;
}

/**
 * Simple in-memory cache with TTL support
 */
export class ApiCache<T = unknown> {
	private cache = new Map<string, CacheEntry<T>>();
	private ttl: number;
	private maxSize: number;

	constructor(options: CacheOptions = {}) {
		this.ttl = options.ttl ?? 60000; // Default 1 minute
		this.maxSize = options.maxSize ?? 100;
	}

	/**
	 * Get a value from the cache
	 */
	get(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		// Check if expired
		if (Date.now() - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	/**
	 * Set a value in the cache
	 */
	set(key: string, data: T): void {
		// Enforce max size - remove oldest entry
		if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey) this.cache.delete(firstKey);
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now()
		});
	}

	/**
	 * Check if a key exists and is not expired
	 */
	has(key: string): boolean {
		return this.get(key) !== null;
	}

	/**
	 * Clear a specific key
	 */
	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get cache size
	 */
	get size(): number {
		return this.cache.size;
	}
}

/**
 * Create a cached fetch function
 */
export function createCachedFetch<T>(cache: ApiCache<T>, options: { ttl?: number } = {}) {
	return async (url: string, init?: RequestInit): Promise<T> => {
		// Create cache key from URL and relevant request options
		const cacheKey = `${url}:${init?.method || 'GET'}`;

		// Check cache first
		const cached = cache.get(cacheKey);
		if (cached !== null) {
			return cached;
		}

		// Fetch fresh data
		const response = await fetch(url, init);
		const data = await response.json();

		// Cache the response
		cache.set(cacheKey, data);

		return data;
	};
}

// ============================================================================
// Debounce & Throttle
// ============================================================================

/**
 * Debounce function - delays execution until after wait milliseconds have elapsed
 * since the last time it was invoked
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return function debounced(...args: Parameters<T>) {
		if (timeout !== null) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => {
			func(...args);
		}, wait);
	};
}

/**
 * Throttle function - ensures a function is only called once per specified time period
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: Parameters<T> | null = null;

	return function throttled(...args: Parameters<T>) {
		lastArgs = args;

		if (timeout === null) {
			func(...args);
			lastArgs = null;

			timeout = setTimeout(() => {
				timeout = null;
				if (lastArgs !== null) {
					func(...lastArgs);
					lastArgs = null;
				}
			}, wait);
		}
	};
}

// ============================================================================
// Lazy Loading
// ============================================================================

/**
 * Options for lazy loading
 */
export interface LazyLoadOptions {
	/**
	 * Root margin for intersection observer
	 * @default "50px"
	 */
	rootMargin?: string;
	/**
	 * Threshold for intersection observer
	 * @default 0.01
	 */
	threshold?: number;
	/**
	 * Callback when element becomes visible
	 */
	onVisible?: (element: HTMLElement) => void;
}

/**
 * Create a Svelte action for lazy loading images
 * Usage: <img use:lazyLoad={{ src: "image.jpg" }} alt="..." />
 */
export function lazyLoad(
	element: HTMLImageElement,
	options: LazyLoadOptions & { src: string; srcset?: string }
) {
	const { src, srcset, rootMargin = '50px', threshold = 0.01, onVisible } = options;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const img = entry.target as HTMLImageElement;

					// Set the actual src
					img.src = src;
					if (srcset) {
						img.srcset = srcset;
					}

					// Add loading class
					img.classList.add('loading');

					// Handle load event
					img.addEventListener('load', () => {
						img.classList.remove('loading');
						img.classList.add('loaded');
					});

					// Handle error event
					img.addEventListener('error', () => {
						img.classList.remove('loading');
						img.classList.add('error');
					});

					// Callback
					onVisible?.(img);

					// Stop observing this element
					observer.unobserve(img);
				}
			});
		},
		{
			rootMargin,
			threshold
		}
	);

	observer.observe(element);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}

/**
 * Preload an image
 */
export function preloadImage(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve();
		img.onerror = reject;
		img.src = src;
	});
}

/**
 * Preload multiple images
 */
export async function preloadImages(srcs: string[]): Promise<void> {
	await Promise.all(srcs.map(preloadImage));
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Measure performance of an async function
 */
export async function measurePerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
	const start = performance.now();
	try {
		const result = await fn();
		const end = performance.now();
		console.debug(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
		return result;
	} catch (error) {
		const end = performance.now();
		console.error(`[Performance] ${name} failed after ${(end - start).toFixed(2)}ms:`, error);
		throw error;
	}
}

/**
 * Create a performance mark
 */
export function mark(name: string): void {
	if (typeof performance !== 'undefined' && performance.mark) {
		performance.mark(name);
	}
}

/**
 * Measure between two marks
 */
export function measure(name: string, startMark: string, endMark: string): number | null {
	if (typeof performance !== 'undefined' && performance.measure) {
		try {
			performance.measure(name, startMark, endMark);
			const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure;
			return measure?.duration ?? null;
		} catch (error) {
			console.warn(`Failed to measure ${name}:`, error);
			return null;
		}
	}
	return null;
}
