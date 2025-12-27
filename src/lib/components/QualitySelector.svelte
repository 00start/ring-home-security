<script lang="ts">
	/**
	 * Quality Selector Component
	 *
	 * Allows users to select video quality preferences:
	 * - Auto mode: Quality adjusts based on battery level
	 * - Manual mode: User selects a fixed quality tier
	 *
	 * @component
	 */

	import { qualityPreferences } from '$lib/stores/quality-preferences.js';
	import { QUALITY_TIERS, type QualityTierName } from '$lib/constants/quality-tiers.js';

	interface Props {
		/** Current battery level (0-100), used to show recommended quality in auto mode */
		batteryLevel?: number;
		/** Optional CSS class for styling */
		class?: string;
	}

	let { batteryLevel = 100, class: className = '' }: Props = $props();

	// Get the current quality preference
	let preference = $derived($qualityPreferences);
	let isAutoMode = $derived(preference.mode === 'auto');

	// Calculate recommended quality based on battery level
	let recommendedTier = $derived(
		batteryLevel > 50 ? 'high' : batteryLevel >= 20 ? 'medium' : 'low'
	) as QualityTierName;

	// Get the effective quality tier
	let effectiveTier = $derived(
		isAutoMode ? recommendedTier : (preference.tier || 'medium')
	) as QualityTierName;

	// Get tier config for display
	let tierConfig = $derived(QUALITY_TIERS[effectiveTier]);

	/**
	 * Toggles between auto and manual mode
	 */
	function toggleMode() {
		if (isAutoMode) {
			// Switch to manual, keeping current effective tier
			qualityPreferences.setTier(effectiveTier);
		} else {
			// Switch to auto
			qualityPreferences.setMode('auto');
		}
	}

	/**
	 * Sets a specific quality tier (switches to manual mode)
	 */
	function selectTier(tier: QualityTierName) {
		qualityPreferences.setTier(tier);
	}
</script>

<div
	data-testid="quality-selector"
	data-quality-mode={preference.mode}
	data-quality-tier={effectiveTier}
	class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800 {className}"
>
	<!-- Header with mode toggle -->
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h3 class="text-sm font-medium text-zinc-900 dark:text-white">Video Quality</h3>
			<p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
				{#if isAutoMode}
					Automatically adjusts based on battery level
				{:else}
					Manually set to {tierConfig.resolution}
				{/if}
			</p>
		</div>

		<!-- Auto/Manual Toggle -->
		<button
			type="button"
			onclick={toggleMode}
			data-testid="quality-mode-toggle"
			class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {isAutoMode
				? 'bg-blue-600'
				: 'bg-zinc-200 dark:bg-zinc-600'}"
		>
			<span class="sr-only">{isAutoMode ? 'Switch to manual' : 'Switch to auto'}</span>
			<span
				class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {isAutoMode
					? 'translate-x-6'
					: 'translate-x-1'}"
			></span>
		</button>
	</div>

	<!-- Current Quality Indicator -->
	<div
		class="mb-4 rounded-md bg-zinc-50 p-3 dark:bg-zinc-700/50"
		data-testid="quality-indicator"
	>
		<div class="flex items-center justify-between">
			<div>
				<p class="text-xs text-zinc-500 dark:text-zinc-400">Current Quality</p>
				<p class="mt-1 font-semibold text-zinc-900 dark:text-white">
					{tierConfig.resolution}
				</p>
			</div>
			<div class="text-right">
				<p class="text-xs text-zinc-500 dark:text-zinc-400">Bitrate</p>
				<p class="mt-1 font-semibold text-zinc-900 dark:text-white">
					{tierConfig.bitrate} kbps
				</p>
			</div>
		</div>

		{#if isAutoMode}
			<p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
				Battery: {batteryLevel}% • Recommended: {recommendedTier.charAt(0).toUpperCase() +
					recommendedTier.slice(1)}
			</p>
		{/if}
	</div>

	<!-- Quality Tier Buttons (only show in manual mode) -->
	{#if !isAutoMode}
		<div class="space-y-2" data-testid="quality-tier-buttons">
			<p class="text-xs font-medium text-zinc-700 dark:text-zinc-300">Select Quality</p>

			<!-- High Quality -->
			<button
				type="button"
				onclick={() => selectTier('high')}
				data-testid="quality-tier-high"
				class="w-full rounded-md border px-3 py-2 text-left text-sm transition-colors {effectiveTier ===
				'high'
					? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
					: 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'}"
			>
				<div class="flex items-center justify-between">
					<div>
						<span class="font-medium">High</span>
						<span class="ml-2 text-xs text-zinc-500 dark:text-zinc-400">1080p</span>
					</div>
					<span class="text-xs text-zinc-500 dark:text-zinc-400">4000 kbps</span>
				</div>
				<p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
					Best quality, higher battery usage
				</p>
			</button>

			<!-- Medium Quality -->
			<button
				type="button"
				onclick={() => selectTier('medium')}
				data-testid="quality-tier-medium"
				class="w-full rounded-md border px-3 py-2 text-left text-sm transition-colors {effectiveTier ===
				'medium'
					? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
					: 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'}"
			>
				<div class="flex items-center justify-between">
					<div>
						<span class="font-medium">Medium</span>
						<span class="ml-2 text-xs text-zinc-500 dark:text-zinc-400">720p</span>
					</div>
					<span class="text-xs text-zinc-500 dark:text-zinc-400">2000 kbps</span>
				</div>
				<p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Balanced quality and battery</p>
			</button>

			<!-- Low Quality -->
			<button
				type="button"
				onclick={() => selectTier('low')}
				data-testid="quality-tier-low"
				class="w-full rounded-md border px-3 py-2 text-left text-sm transition-colors {effectiveTier ===
				'low'
					? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
					: 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'}"
			>
				<div class="flex items-center justify-between">
					<div>
						<span class="font-medium">Low</span>
						<span class="ml-2 text-xs text-zinc-500 dark:text-zinc-400">480p</span>
					</div>
					<span class="text-xs text-zinc-500 dark:text-zinc-400">1000 kbps</span>
				</div>
				<p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
					Lower quality, maximum battery savings
				</p>
			</button>
		</div>
	{/if}

	<!-- Battery Optimization Info -->
	{#if isAutoMode}
		<div class="mt-4 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
			<div class="flex items-start">
				<svg
					class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clip-rule="evenodd"
					/>
				</svg>
				<div class="ml-3">
					<p class="text-xs font-medium text-blue-800 dark:text-blue-300">
						Battery Optimization
					</p>
					<p class="mt-1 text-xs text-blue-700 dark:text-blue-400">
						Quality automatically adjusts:
						<br />
						• High (1080p) when battery > 50%
						<br />
						• Medium (720p) when battery 20-50%
						<br />• Low (480p) when battery &lt; 20%
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
