<script lang="ts">
	import type { Device } from '$lib/types';
	import { onMount } from 'svelte';

	interface Props {
		devices: Device[];
	}

	let { devices }: Props = $props();

	// Snooze state
	let snoozedUntil = $state<Date | null>(null);
	let isDismissed = $state(false);

	// Calculate low battery devices
	let lowBatteryDevices = $derived.by(() => {
		return devices.filter(
			(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
		);
	});

	// Determine if any device is critical (< 10%)
	let isCritical = $derived.by(() => {
		return lowBatteryDevices.some((device) => device.batteryLevel! < 10);
	});

	// Determine if banner should be shown
	let shouldShowBanner = $derived.by(() => {
		if (lowBatteryDevices.length === 0) return false;
		if (isDismissed) return false;
		if (snoozedUntil && new Date() < snoozedUntil) return false;
		return true;
	});

	// Load snooze state from localStorage on mount
	onMount(() => {
		const stored = localStorage.getItem('batteryWarningSnooze');
		if (stored) {
			const snoozeDate = new Date(stored);
			if (snoozeDate > new Date()) {
				snoozedUntil = snoozeDate;
			} else {
				localStorage.removeItem('batteryWarningSnooze');
			}
		}
	});

	function dismiss() {
		isDismissed = true;
	}

	function snooze(hours: number) {
		const snoozeDate = new Date();
		snoozeDate.setHours(snoozeDate.getHours() + hours);
		snoozedUntil = snoozeDate;
		localStorage.setItem('batteryWarningSnooze', snoozeDate.toISOString());
		isDismissed = true;
	}
</script>

{#if shouldShowBanner}
	<div
		data-testid="battery-warning-banner"
		data-severity={isCritical ? 'critical' : 'warning'}
		class="mb-6 rounded-lg border p-4 {isCritical
			? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
			: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'}"
		role="alert"
		aria-live="polite"
	>
		<div class="flex items-start gap-3">
			<!-- Icon -->
			<div
				class="flex-shrink-0 rounded-full p-2 {isCritical
					? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
					: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400'}"
			>
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M17 6H4a2 2 0 00-2 2v8a2 2 0 002 2h13a2 2 0 002-2V8a2 2 0 00-2-2zm0 10H4V8h13v8zm4-8v8h-1V8h1zm-4 2H6v4h11v-4z"
					/>
				</svg>
			</div>

			<!-- Content -->
			<div class="min-w-0 flex-1">
				<h3
					class="text-sm font-semibold {isCritical
						? 'text-red-800 dark:text-red-200'
						: 'text-yellow-800 dark:text-yellow-200'}"
				>
					{isCritical ? 'Critical Battery Warning' : 'Low Battery Warning'}
				</h3>
				<div
					class="mt-1 text-sm {isCritical
						? 'text-red-700 dark:text-red-300'
						: 'text-yellow-700 dark:text-yellow-300'}"
				>
					<p>
						{lowBatteryDevices.length === 1
							? 'One device has'
							: `${lowBatteryDevices.length} devices have`} low battery:
					</p>
					<ul class="mt-2 list-inside list-disc space-y-1">
						{#each lowBatteryDevices as device}
							<li data-testid="low-battery-device" data-device-id={device.id}>
								<span class="font-medium">{device.name}</span> - {device.batteryLevel}%
								{#if device.batteryLevel! < 10}
									<span
										class="ml-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-300"
									>
										Critical
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>

				<!-- Action Buttons -->
				<div class="mt-3 flex flex-wrap gap-2">
					<button
						data-testid="snooze-1-hour"
						onclick={() => snooze(1)}
						type="button"
						class="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors {isCritical
							? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800'
							: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800'}"
					>
						Snooze 1 hour
					</button>
					<button
						data-testid="snooze-1-day"
						onclick={() => snooze(24)}
						type="button"
						class="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors {isCritical
							? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800'
							: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800'}"
					>
						Snooze 1 day
					</button>
				</div>
			</div>

			<!-- Dismiss Button -->
			<button
				data-testid="dismiss-banner"
				onclick={dismiss}
				type="button"
				class="flex-shrink-0 rounded-md p-1.5 transition-colors {isCritical
					? 'text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900'
					: 'text-yellow-500 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900'}"
				aria-label="Dismiss banner"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	</div>
{/if}
