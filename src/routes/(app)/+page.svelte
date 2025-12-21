<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { StatCard, DeviceCard, EventCard, Modal } from '$lib/components';
	import {
		stats,
		fetchStats,
		devices,
		fetchDevices,
		events,
		fetchEvents
	} from '$lib/stores';
	import { formatBytes } from '$lib/utils';
	import type { Device } from '$lib/types';
	import type mpegtsType from 'mpegts.js';

	let showLiveViewModal = $state(false);
	let liveViewDevice = $state<Device | null>(null);
	let liveViewLoading = $state(true);
	let liveViewError = $state<string | null>(null);
	let videoElement = $state<HTMLVideoElement | null>(null);
	let mpegtsReady = $state(false);
	let mpegtsPlayer: mpegtsType.Player | null = null;
	let mpegtsModule: typeof mpegtsType | null = null;

	// Prioritized devices: doorbells first, then cameras, then sensors
	let prioritizedDevices = $derived.by(() => {
		const sorted = [...$devices].sort((a, b) => {
			const priority = { doorbell: 0, camera: 1, sensor: 2 };
			return priority[a.type] - priority[b.type];
		});
		return sorted;
	});

	onMount(async () => {
		fetchStats();
		fetchDevices();
		fetchEvents();

		// Dynamically import mpegts.js (requires window)
		mpegtsModule = (await import('mpegts.js')).default;
		mpegtsReady = true;
	});

	// Start mpegts player when video element and device are ready
	$effect(() => {
		if (showLiveViewModal && videoElement && liveViewDevice && mpegtsReady) {
			untrack(() => startMpegtsPlayer());
		}
	});

	function handleLiveView(device: Device) {
		liveViewDevice = device;
		showLiveViewModal = true;
		liveViewError = null;
		liveViewLoading = true;
	}

	function startMpegtsPlayer() {
		if (!videoElement || !liveViewDevice || !mpegtsModule) return;

		// Clean up existing player
		if (mpegtsPlayer) {
			mpegtsPlayer.destroy();
			mpegtsPlayer = null;
		}

		if (!mpegtsModule.isSupported()) {
			liveViewError = 'MPEG-TS playback is not supported in this browser.';
			liveViewLoading = false;
			return;
		}

		// Use absolute URL for Web Worker compatibility
		const streamUrl = new URL(`/api/devices/${liveViewDevice.id}/live`, window.location.origin).href;

		mpegtsPlayer = mpegtsModule.createPlayer({
			type: 'mpegts',
			isLive: true,
			url: streamUrl
		}, {
			enableWorker: true,
			liveBufferLatencyChasing: true,
			liveBufferLatencyMaxLatency: 1.5,
			liveBufferLatencyMinRemain: 0.3
		});

		mpegtsPlayer.attachMediaElement(videoElement);

		mpegtsPlayer.on(mpegtsModule.Events.ERROR, (errorType: string, errorDetail: string) => {
			console.error('mpegts.js error:', errorType, errorDetail);
			liveViewError = `Stream error: ${errorDetail}`;
			liveViewLoading = false;
		});

		mpegtsPlayer.on(mpegtsModule.Events.LOADING_COMPLETE, () => {
			console.log('Loading complete');
		});

		mpegtsPlayer.load();
		mpegtsPlayer.play();
	}

	function closeLiveView() {
		if (mpegtsPlayer) {
			mpegtsPlayer.destroy();
			mpegtsPlayer = null;
		}

		if (videoElement) {
			videoElement.pause();
			videoElement.src = '';
		}

		showLiveViewModal = false;
		liveViewDevice = null;
		liveViewError = null;
		liveViewLoading = true;
	}

	function handleVideoLoaded() {
		liveViewLoading = false;
	}

	function handleVideoError() {
		// Only show error if mpegts player didn't already set one
		if (!liveViewError) {
			liveViewLoading = false;
			liveViewError = 'Failed to load live stream. Please try again.';
		}
	}
</script>

<svelte:head>
	<title>Dashboard - Ring Security</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page header -->
	<div>
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Monitor your home security devices and events
		</p>
	</div>

	<!-- Stats -->
	{#if $stats}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			<StatCard
				title="Total Devices"
				value={$stats.totalDevices}
				icon="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
			/>
			<StatCard
				title="Online"
				value="{$stats.onlineDevices} / {$stats.totalDevices}"
				icon="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
			/>
			<StatCard
				title="Events Today"
				value={$stats.totalEventsToday}
				icon="M13 10V3L4 14h7v7l9-11h-7z"
			/>
			<StatCard
				title="Storage Used"
				value={formatBytes($stats.storageUsed)}
				icon="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
			/>
		</div>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _}
				<div class="h-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700"></div>
			{/each}
		</div>
	{/if}

	<div class="grid gap-8 lg:grid-cols-2">
		<!-- Devices -->
		<div>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-medium text-zinc-900 dark:text-white">Devices</h2>
				<a
					href="/devices"
					class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
				>
					View all
				</a>
			</div>
			<div class="space-y-4">
				{#if $devices.length === 0}
					<div class="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
						<svg class="mx-auto h-12 w-12 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
						</svg>
						<p class="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
							No devices found. Start the Ring listener to discover devices.
						</p>
					</div>
				{:else}
					{#each prioritizedDevices.slice(0, 4) as device}
						<DeviceCard
							{device}
							onclick={() => window.location.href = `/devices/${device.id}`}
							onLiveView={() => handleLiveView(device)}
						/>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Recent Events -->
		<div>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-medium text-zinc-900 dark:text-white">Recent Events</h2>
				<a
					href="/timeline"
					class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
				>
					View all
				</a>
			</div>
			<div class="space-y-3">
				{#if $events.length === 0}
					<div class="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
						<svg class="mx-auto h-12 w-12 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
							No events yet. Events will appear here when detected.
						</p>
					</div>
				{:else}
					{#each $events.slice(0, 5) as event}
						<EventCard {event} onclick={() => window.location.href = `/timeline?event=${event.id}`} />
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Live View Modal -->
<Modal bind:open={showLiveViewModal} title="Live View - {liveViewDevice?.name ?? ''}" onclose={closeLiveView}>
	{#snippet children()}
		{#if liveViewDevice}
			<div class="space-y-4">
				<div class="aspect-video bg-zinc-900 rounded-lg overflow-hidden relative">
					{#if liveViewError}
						<div class="absolute inset-0 flex items-center justify-center">
							<div class="text-center p-6">
								<svg class="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								<p class="mt-4 text-sm text-red-500">{liveViewError}</p>
							</div>
						</div>
					{:else}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							bind:this={videoElement}
							id="liveViewVideo"
							class="w-full h-full"
							autoplay
							muted
							playsinline
							controls
							onloadeddata={handleVideoLoaded}
							onerror={handleVideoError}
						></video>

						{#if liveViewLoading}
							<div class="absolute top-4 right-4 bg-zinc-700 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
								<svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								LOADING...
							</div>
						{:else}
							<div class="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
								<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
								LIVE
							</div>
						{/if}
					{/if}
				</div>
				<div class="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
					<span>{liveViewDevice.name}</span>
					<span class="capitalize">{liveViewDevice.type}</span>
				</div>
			</div>
		{/if}
	{/snippet}
</Modal>
