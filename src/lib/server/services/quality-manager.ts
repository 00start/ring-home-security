/**
 * Quality Manager Service
 *
 * Manages video quality tier selection based on battery levels
 * and user preferences. Provides server-side logic for adaptive
 * bitrate streaming.
 *
 * @module server/services/quality-manager
 */

import {
	QUALITY_TIERS,
	BATTERY_THRESHOLDS,
	DEFAULT_QUALITY_TIER,
	type QualityTierName,
	type QualityTier,
	type QualityPreference
} from '$lib/constants/quality-tiers.js';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('quality-manager');

/**
 * In-memory cache for user quality preferences
 * In production, this would be stored in a database
 */
const userPreferences = new Map<string, QualityPreference>();

/**
 * Determines the appropriate quality tier based on battery level
 *
 * - Battery > 50%: High quality (1080p, 4000 kbps)
 * - Battery 20-50%: Medium quality (720p, 2000 kbps)
 * - Battery < 20%: Low quality (480p, 1000 kbps)
 *
 * @param batteryLevel - Current battery level (0-100)
 * @returns Quality tier name
 *
 * @example
 * ```typescript
 * const tier = getQualityForBattery(75); // Returns 'high'
 * const tier = getQualityForBattery(30); // Returns 'medium'
 * const tier = getQualityForBattery(15); // Returns 'low'
 * ```
 */
export function getQualityForBattery(batteryLevel: number): QualityTierName {
	// Validate battery level
	if (batteryLevel < 0 || batteryLevel > 100) {
		logger.warn({ batteryLevel }, 'Invalid battery level, using default quality');
		return DEFAULT_QUALITY_TIER;
	}

	// Determine tier based on battery thresholds
	if (batteryLevel > BATTERY_THRESHOLDS.HIGH_QUALITY) {
		return 'high';
	} else if (batteryLevel >= BATTERY_THRESHOLDS.MEDIUM_QUALITY) {
		return 'medium';
	} else {
		return 'low';
	}
}

/**
 * Gets the quality tier configuration for a given tier name
 *
 * @param tierName - Quality tier name
 * @returns Quality tier configuration
 *
 * @example
 * ```typescript
 * const config = getQualityTierConfig('high');
 * // Returns: { resolution: '1080p', bitrate: 4000, batteryThreshold: 50 }
 * ```
 */
export function getQualityTierConfig(tierName: QualityTierName): QualityTier {
	return QUALITY_TIERS[tierName];
}

/**
 * Gets user's quality preference override
 *
 * @param userId - User identifier
 * @returns User's quality preference or null if not set
 *
 * @example
 * ```typescript
 * const preference = getUserOverride('user123');
 * if (preference && preference.mode === 'manual') {
 *   // Use manual tier selection
 * }
 * ```
 */
export function getUserOverride(userId: string): QualityPreference | null {
	return userPreferences.get(userId) || null;
}

/**
 * Sets user's quality preference override
 *
 * @param userId - User identifier
 * @param preference - Quality preference to set
 *
 * @example
 * ```typescript
 * // Set manual high quality
 * setUserOverride('user123', { mode: 'manual', tier: 'high' });
 *
 * // Set auto mode
 * setUserOverride('user123', { mode: 'auto', tier: null });
 * ```
 */
export function setUserOverride(userId: string, preference: QualityPreference): void {
	// Validate preference
	if (preference.mode === 'manual' && !preference.tier) {
		throw new Error('Manual mode requires a tier selection');
	}

	if (preference.mode === 'auto' && preference.tier !== null) {
		logger.warn('Auto mode should not have a tier, clearing tier');
		preference.tier = null;
	}

	userPreferences.set(userId, preference);
}

/**
 * Clears user's quality preference override
 *
 * @param userId - User identifier
 *
 * @example
 * ```typescript
 * clearUserOverride('user123');
 * ```
 */
export function clearUserOverride(userId: string): void {
	userPreferences.delete(userId);
}

/**
 * Gets the effective quality tier for a user, considering both
 * battery level and user preferences
 *
 * @param userId - User identifier
 * @param batteryLevel - Current battery level (0-100)
 * @returns Effective quality tier name
 *
 * @example
 * ```typescript
 * // With no override, uses battery-based quality
 * const tier1 = getEffectiveQuality('user123', 75); // Returns 'high'
 *
 * // With manual override, ignores battery level
 * setUserOverride('user123', { mode: 'manual', tier: 'low' });
 * const tier2 = getEffectiveQuality('user123', 75); // Returns 'low'
 * ```
 */
export function getEffectiveQuality(userId: string, batteryLevel: number): QualityTierName {
	const preference = getUserOverride(userId);

	// If user has manual override, use it
	if (preference && preference.mode === 'manual' && preference.tier) {
		return preference.tier;
	}

	// Otherwise, use battery-based quality
	return getQualityForBattery(batteryLevel);
}

/**
 * Gets the effective quality tier configuration for a user
 *
 * @param userId - User identifier
 * @param batteryLevel - Current battery level (0-100)
 * @returns Quality tier configuration
 *
 * @example
 * ```typescript
 * const config = getEffectiveQualityConfig('user123', 30);
 * console.log(config.resolution); // '720p'
 * console.log(config.bitrate); // 2000
 * ```
 */
export function getEffectiveQualityConfig(userId: string, batteryLevel: number): QualityTier {
	const tierName = getEffectiveQuality(userId, batteryLevel);
	return getQualityTierConfig(tierName);
}

/**
 * Checks if quality should transition based on battery level change
 *
 * @param oldBattery - Previous battery level
 * @param newBattery - New battery level
 * @returns True if quality tier should change
 *
 * @example
 * ```typescript
 * const shouldTransition = shouldTransitionQuality(55, 45);
 * // Returns true (crosses 50% threshold)
 * ```
 */
export function shouldTransitionQuality(oldBattery: number, newBattery: number): boolean {
	const oldTier = getQualityForBattery(oldBattery);
	const newTier = getQualityForBattery(newBattery);
	return oldTier !== newTier;
}

/**
 * Clears all user preferences (for testing)
 */
export function clearAllPreferences(): void {
	userPreferences.clear();
}
