<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { EventCard, Badge, Card, Button } from '$lib/components';
	import { zoneSettings } from '$lib/stores';
	import type { Device, EventLog } from '$lib/types';

	let device = $state<Device | null>(null);
	let events = $state<EventLog[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let preBufferEnabled = $state(false);
	let showTooltip = $state(false);

	onMount(async () => {
		await fetchDevice();
		await fetchDeviceEvents();
		// Load pre-buffer setting for this device
		const deviceId = $page.params.id ?? '';
		const settings = zoneSettings.getDeviceSettings(deviceId);
		preBufferEnabled = settings.preBufferEnabled;
	});

	function handlePreBufferToggle(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		preBufferEnabled = target.checked;
		const deviceId = $page.params.id ?? '';
		zoneSettings.setPreBufferEnabled(deviceId, preBufferEnabled);
	}

	async function fetchDevice() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/devices/${$page.params.id}`);
			const data = await response.json();

			if (data.success) {
				// Convert string date to Date object
				device = {
					...data.data,
					lastSeen: typeof data.data.lastSeen === 'string'
						? new Date(data.data.lastSeen)
						: data.data.lastSeen
				};
			} else {
				error = data.error || 'Failed to fetch device';
			}
		} catch (err) {
			console.error('Failed to fetch device:', err);
			error = 'Failed to fetch device';
		} finally {
			loading = false;
		}
	}

	async function fetchDeviceEvents() {
		try {
			const response = await fetch(`/api/events?deviceId=${$page.params.id}&limit=20`);
			const data = await response.json();

			if (data.success) {
				// Convert string dates to Date objects
				events = data.data.map((event: any) => ({
					...event,
					timestamp: typeof event.timestamp === 'string'
						? new Date(event.timestamp)
						: event.timestamp
				}));
			}
		} catch (err) {
			console.error('Failed to fetch device events:', err);
		}
	}

	function formatLastSeen(date: Date | string): string {
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
		if (seconds < 60) return 'Just now';
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return dateObj.toLocaleDateString();
	}

	const deviceIcons: Record<string, string> = {
		doorbell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
		camera: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
		sensor: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z'
	};
</script>

<svelte:head>
	<title>{device?.name ?? 'Device'} - Ring Security</title>
</svelte:head>

{#if loading}
	<div class="flex h-96 items-center justify-center">
		<svg class="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	</div>
{:else if error}
	<div class="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
		<p class="text-red-600 dark:text-red-400">{error}</p>
		<Button onclick={() => window.location.href = '/devices'} class="mt-4">
			Back to Devices
		</Button>
	</div>
{:else if device}
	{@const currentDevice = device}
	<div class="space-y-6">
		<!-- Back button -->
		<div>
			<a
				href="/devices"
				class="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
			>
				<svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Back to Devices
			</a>
		</div>

		<!-- Device header -->
		<Card>
			{#snippet children()}
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-4">
						<div class="rounded-full p-3 {currentDevice.isOnline ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-700'}">
							<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={deviceIcons[currentDevice.type] ?? deviceIcons.camera} />
							</svg>
						</div>
						<div>
							<h1 class="text-2xl font-bold text-zinc-900 dark:text-white">{currentDevice.name}</h1>
							<p class="text-sm text-zinc-500 dark:text-zinc-400 capitalize">{currentDevice.type}</p>
						</div>
					</div>
					<Badge variant={currentDevice.isOnline ? 'success' : 'danger'}>
						{currentDevice.isOnline ? 'Online' : 'Offline'}
					</Badge>
				</div>

				<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div>
						<p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Device ID</p>
						<p class="mt-1 font-mono text-sm text-zinc-900 dark:text-white">{currentDevice.id}</p>
					</div>
					{#if currentDevice.location}
						<div>
							<p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Location</p>
							<p class="mt-1 text-sm text-zinc-900 dark:text-white">{currentDevice.location}</p>
						</div>
					{/if}
					<div>
						<p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Last Seen</p>
						<p class="mt-1 text-sm text-zinc-900 dark:text-white">{formatLastSeen(currentDevice.lastSeen)}</p>
					</div>
					{#if currentDevice.batteryLevel !== undefined}
						<div>
							<p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Battery</p>
							<div class="mt-1 flex items-center gap-2">
								<svg class="h-5 w-5 {currentDevice.batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}" fill="currentColor" viewBox="0 0 24 24">
									<path d="M17 6H4a2 2 0 00-2 2v8a2 2 0 002 2h13a2 2 0 002-2V8a2 2 0 00-2-2zm0 10H4V8h13v8zm4-8v8h-1V8h1zm-4 2H6v4h11v-4z" />
								</svg>
								<span class="text-sm {currentDevice.batteryLevel > 20 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}">{currentDevice.batteryLevel}%</span>
							</div>
						</div>
					{/if}
				</div>
			{/snippet}
		</Card>

		<!-- Camera/Zone Settings -->
		{#if currentDevice.type === 'camera' || currentDevice.type === 'doorbell'}
			<Card title="Camera Settings" data-testid="camera-settings-section">
				{#snippet children()}
					<div class="space-y-6">
						<!-- Pre-event Buffer Toggle -->
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<h4 class="text-sm font-medium text-zinc-900 dark:text-white">Pre-event buffer</h4>
									<!-- Tooltip Icon -->
									<div class="relative">
										<button
											type="button"
											class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
											onmouseenter={() => showTooltip = true}
											onmouseleave={() => showTooltip = false}
											onclick={() => showTooltip = !showTooltip}
										>
											<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
											</svg>
										</button>
										{#if showTooltip}
											<div class="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform">
												<div class="w-64 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-zinc-700">
													Pre-event buffer continuously records video in memory, allowing the system to capture footage from before a motion event is triggered. This provides better context for security events.
													<div class="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700"></div>
												</div>
											</div>
										{/if}
									</div>
								</div>
								<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
									Capture 3 seconds before motion trigger
								</p>
								{#if preBufferEnabled}
									<div class="mt-2 rounded-md bg-amber-50 p-3 dark:bg-amber-900/20" data-testid="battery-impact-warning">
										<div class="flex">
											<svg class="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
											</svg>
											<div class="ml-3">
												<p class="text-sm text-amber-800 dark:text-amber-200">
													Enabling pre-buffer increases battery usage by ~15%
												</p>
											</div>
										</div>
									</div>
								{/if}
							</div>
							<label class="relative inline-flex cursor-pointer items-center" data-testid="pre-buffer-toggle">
								<input
									type="checkbox"
									class="peer sr-only"
									checked={preBufferEnabled}
									onchange={handlePreBufferToggle}
								/>
								<div class="peer h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-zinc-600 dark:bg-zinc-700"></div>
							</label>
						</div>
					</div>
				{/snippet}
			</Card>
		{/if}

		<!-- Recent events -->
		<div>
			<h2 class="mb-4 text-lg font-medium text-zinc-900 dark:text-white">
				Recent Events ({events.length})
			</h2>
			<div class="space-y-3">
				{#if events.length === 0}
					<div class="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
						<svg class="mx-auto h-12 w-12 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
							No events recorded for this device yet.
						</p>
					</div>
				{:else}
					{#each events as event}
						<EventCard {event} onclick={() => window.location.href = `/timeline?event=${event.id}`} />
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
