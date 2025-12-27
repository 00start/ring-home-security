/**
 * Quality Preferences Store
 *
 * Manages video quality preferences with localStorage persistence.
 * Supports both auto (battery-based) and manual quality selection.
 *
 * @module stores/quality-preferences
 */

import { writable, get } from 'svelte/store';
import {
	DEFAULT_QUALITY_PREFERENCE,
	type QualityPreference,
	type QualityMode,
	type QualityTierName,
} from '$lib/constants/quality-tiers.js';

const STORAGE_KEY = 'ring-quality-preferences';

/**
 * Loads quality preferences from localStorage
 */
function loadPreferences(): QualityPreference {
	if (typeof window === 'undefined') {
		return DEFAULT_QUALITY_PREFERENCE;
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as QualityPreference;

			// Validate the stored preference
			if (
				parsed.mode &&
				(parsed.mode === 'auto' || parsed.mode === 'manual') &&
				(parsed.tier === null ||
					parsed.tier === 'high' ||
					parsed.tier === 'medium' ||
					parsed.tier === 'low')
			) {
				return parsed;
			}
		}
	} catch {
		// Ignore parse errors
	}

	return DEFAULT_QUALITY_PREFERENCE;
}

/**
 * Creates the quality preferences store
 */
function createQualityPreferencesStore() {
	const { subscribe, set, update } = writable<QualityPreference>(DEFAULT_QUALITY_PREFERENCE);

	// Initialize from localStorage on client
	if (typeof window !== 'undefined') {
		set(loadPreferences());
	}

	/**
	 * Saves preferences to localStorage
	 */
	function save(prefs: QualityPreference): void {
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
		}
	}

	/**
	 * Sets the quality mode (auto or manual)
	 *
	 * @param mode - Quality mode to set
	 *
	 * @example
	 * ```typescript
	 * qualityPreferences.setMode('auto');
	 * qualityPreferences.setMode('manual');
	 * ```
	 */
	function setMode(mode: QualityMode): void {
		update((prefs) => {
			const updated: QualityPreference = {
				mode,
				tier: mode === 'auto' ? null : prefs.tier || 'medium',
			};
			save(updated);
			return updated;
		});
	}

	/**
	 * Sets the quality tier (for manual mode)
	 *
	 * @param tier - Quality tier to set
	 *
	 * @example
	 * ```typescript
	 * qualityPreferences.setTier('high');
	 * qualityPreferences.setTier('medium');
	 * qualityPreferences.setTier('low');
	 * ```
	 */
	function setTier(tier: QualityTierName): void {
		update((prefs) => {
			const updated: QualityPreference = {
				mode: 'manual',
				tier,
			};
			save(updated);
			return updated;
		});
	}

	/**
	 * Sets both mode and tier at once
	 *
	 * @param preference - Complete preference object
	 *
	 * @example
	 * ```typescript
	 * qualityPreferences.setPreference({ mode: 'auto', tier: null });
	 * qualityPreferences.setPreference({ mode: 'manual', tier: 'high' });
	 * ```
	 */
	function setPreference(preference: QualityPreference): void {
		// Validate preference
		if (preference.mode === 'manual' && !preference.tier) {
			console.warn('Manual mode requires a tier, setting to medium');
			preference.tier = 'medium';
		}

		if (preference.mode === 'auto') {
			preference.tier = null;
		}

		set(preference);
		save(preference);
	}

	/**
	 * Gets the current preference value (synchronous)
	 *
	 * @returns Current quality preference
	 *
	 * @example
	 * ```typescript
	 * const current = qualityPreferences.getCurrent();
	 * if (current.mode === 'auto') {
	 *   // Use battery-based quality
	 * }
	 * ```
	 */
	function getCurrent(): QualityPreference {
		return get({ subscribe });
	}

	/**
	 * Checks if currently in auto mode
	 *
	 * @returns True if in auto mode
	 *
	 * @example
	 * ```typescript
	 * if (qualityPreferences.isAutoMode()) {
	 *   // Adjust quality based on battery
	 * }
	 * ```
	 */
	function isAutoMode(): boolean {
		const prefs = get({ subscribe });
		return prefs.mode === 'auto';
	}

	/**
	 * Checks if currently in manual mode
	 *
	 * @returns True if in manual mode
	 */
	function isManualMode(): boolean {
		const prefs = get({ subscribe });
		return prefs.mode === 'manual';
	}

	/**
	 * Gets the manual tier selection (if any)
	 *
	 * @returns Manual tier or null if in auto mode
	 *
	 * @example
	 * ```typescript
	 * const tier = qualityPreferences.getManualTier();
	 * if (tier) {
	 *   // Use manual tier
	 * }
	 * ```
	 */
	function getManualTier(): QualityTierName | null {
		const prefs = get({ subscribe });
		return prefs.mode === 'manual' ? prefs.tier : null;
	}

	/**
	 * Resets preferences to default (auto mode)
	 *
	 * @example
	 * ```typescript
	 * qualityPreferences.reset();
	 * ```
	 */
	function reset(): void {
		set(DEFAULT_QUALITY_PREFERENCE);
		save(DEFAULT_QUALITY_PREFERENCE);
	}

	return {
		subscribe,
		setMode,
		setTier,
		setPreference,
		getCurrent,
		isAutoMode,
		isManualMode,
		getManualTier,
		reset,
	};
}

/**
 * Quality preferences store instance
 *
 * @example
 * ```svelte
 * <script>
 *   import { qualityPreferences } from '$lib/stores/quality-preferences';
 *
 *   // Subscribe to changes
 *   $: mode = $qualityPreferences.mode;
 *
 *   // Set to auto mode
 *   function enableAuto() {
 *     qualityPreferences.setMode('auto');
 *   }
 *
 *   // Set to manual high quality
 *   function setHighQuality() {
 *     qualityPreferences.setTier('high');
 *   }
 * </script>
 * ```
 */
export const qualityPreferences = createQualityPreferencesStore();
