/**
 * Quality Tiers for Adaptive Bitrate Streaming
 *
 * Defines video quality presets based on battery level thresholds.
 * Lower battery levels trigger lower quality to conserve power.
 *
 * @module constants/quality-tiers
 */

/**
 * Quality Tier Interface
 */
export interface QualityTier {
	/** Video resolution (e.g., '1080p', '720p', '480p') */
	resolution: string;
	/** Target bitrate in kbps */
	bitrate: number;
	/** Minimum battery level required for this tier (0-100) */
	batteryThreshold: number;
}

/**
 * Quality tier names
 */
export type QualityTierName = 'high' | 'medium' | 'low';

/**
 * Predefined quality tiers with battery thresholds
 *
 * - High Quality (1080p, 4000 kbps): Used when battery > 50%
 * - Medium Quality (720p, 2000 kbps): Used when battery 20-50%
 * - Low Quality (480p, 1000 kbps): Used when battery < 20%
 */
export const QUALITY_TIERS: Record<QualityTierName, QualityTier> = {
	high: {
		resolution: '1080p',
		bitrate: 4000,
		batteryThreshold: 50
	},
	medium: {
		resolution: '720p',
		bitrate: 2000,
		batteryThreshold: 20
	},
	low: {
		resolution: '480p',
		bitrate: 1000,
		batteryThreshold: 0
	}
};

/**
 * Default quality tier when battery level is unknown
 */
export const DEFAULT_QUALITY_TIER: QualityTierName = 'medium';

/**
 * Battery level thresholds for quality transitions
 */
export const BATTERY_THRESHOLDS = {
	/** Battery level above which high quality is used */
	HIGH_QUALITY: 50,
	/** Battery level above which medium quality is used (below this, use low) */
	MEDIUM_QUALITY: 20
} as const;

/**
 * Quality mode options
 */
export type QualityMode = 'auto' | 'manual';

/**
 * Quality preference structure
 */
export interface QualityPreference {
	/** Auto (battery-based) or manual (user-selected) */
	mode: QualityMode;
	/** Selected tier when in manual mode, null for auto */
	tier: QualityTierName | null;
}

/**
 * Default quality preference (auto mode)
 */
export const DEFAULT_QUALITY_PREFERENCE: QualityPreference = {
	mode: 'auto',
	tier: null
};
