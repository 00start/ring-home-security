<script lang="ts">
	import { onMount } from 'svelte';
	import { DeviceCard, Badge, LiveViewModal } from '$lib/components';
	import { devices, fetchDevices, devicesByType, onlineDevices, offlineDevices } from '$lib/stores/devices';
	import type { Device } from '$lib/types';

	let showLiveViewModal = $state(false);
	let liveViewDevice = $state<Device | null>(null);

	// Sort sensors with contact sensors first
	let sortedSensors = $derived.by(() => {
		return [...$devicesByType.sensors].sort((a, b) => {
			// Contact sensors first, then others
			if (a.subtype === 'contact' && b.subtype !== 'contact') return -1;
			if (a.subtype !== 'contact' && b.subtype === 'contact') return 1;
			return 0;
		});
	});

	onMount(() => {
		fetchDevices();
	});

	function handleLiveView(device: Device) {
		liveViewDevice = device;
		showLiveViewModal = true;
	}

	function closeLiveView() {
		showLiveViewModal = false;
		liveViewDevice = null;
	}
</script>

<svelte:head>
	<title>Devices - Ring Security</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page header -->
	<div>
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Devices</h1>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Manage and monitor your Ring devices
		</p>
	</div>

	<!-- Stats -->
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total</span>
				<Badge>{$devices.length}</Badge>
			</div>
		</div>
		<div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Online</span>
				<Badge variant="success">{$onlineDevices.length}</Badge>
			</div>
		</div>
		<div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Offline</span>
				<Badge variant="danger">{$offlineDevices.length}</Badge>
			</div>
		</div>
	</div>

	{#if $devices.length === 0}
		<div class="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-800">
			<svg class="mx-auto h-12 w-12 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
			</svg>
			<p class="mt-4 text-lg font-medium text-zinc-900 dark:text-white">No devices found</p>
			<p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
				Start the Ring listener to discover your devices.
			</p>
		</div>
	{:else}
		<!-- Doorbells -->
		{#if $devicesByType.doorbells.length > 0}
			<div>
				<h2 class="mb-4 text-lg font-medium text-zinc-900 dark:text-white">
					Doorbells ({$devicesByType.doorbells.length})
				</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each $devicesByType.doorbells as device}
						<DeviceCard
							{device}
							onclick={() => window.location.href = `/devices/${device.id}`}
							onLiveView={() => handleLiveView(device)}
						/>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Cameras -->
		{#if $devicesByType.cameras.length > 0}
			<div>
				<h2 class="mb-4 text-lg font-medium text-zinc-900 dark:text-white">
					Cameras ({$devicesByType.cameras.length})
				</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each $devicesByType.cameras as device}
						<DeviceCard
							{device}
							onclick={() => window.location.href = `/devices/${device.id}`}
							onLiveView={() => handleLiveView(device)}
						/>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Sensors -->
		{#if sortedSensors.length > 0}
			<div>
				<h2 class="mb-4 text-lg font-medium text-zinc-900 dark:text-white">
					Sensors ({sortedSensors.length})
				</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each sortedSensors as device}
						<DeviceCard {device} onclick={() => window.location.href = `/devices/${device.id}`} />
					{/each}
				</div>
			</div>
		{/if}

		<!-- Misc Devices (Base Stations, Keypads, etc.) -->
		{#if $devicesByType.misc.length > 0}
			<div>
				<h2 class="mb-4 text-lg font-medium text-zinc-900 dark:text-white">
					Other Devices ({$devicesByType.misc.length})
				</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each $devicesByType.misc as device}
						<DeviceCard {device} onclick={() => window.location.href = `/devices/${device.id}`} />
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Live View Modal -->
<LiveViewModal
	device={liveViewDevice}
	bind:open={showLiveViewModal}
	onclose={closeLiveView}
/>
