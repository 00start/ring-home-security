<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { EventCard, Badge, Card, Button } from '$lib/components';
	import type { Device, EventLog } from '$lib/types';

	let device = $state<Device | null>(null);
	let events = $state<EventLog[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		await fetchDevice();
		await fetchDeviceEvents();
	});

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
						<div class="rounded-full p-3 {device.isOnline ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-700'}">
							<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={deviceIcons[device.type] ?? deviceIcons.camera} />
							</svg>
						</div>
						<div>
							<h1 class="text-2xl font-bold text-zinc-900 dark:text-white">{device.name}</h1>
							<p class="text-sm text-zinc-500 dark:text-zinc-400 capitalize">{device.type}</p>
						</div>
					</div>
					<Badge variant={device.isOnline ? 'success' : 'danger'}>
						{device.isOnline ? 'Online' : 'Offline'}
					</Badge>
				</div>

				<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div>
						<p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Device ID</p>
						<p class="mt-1 font-mono text-sm text-zinc-900 dark:text-white">{device.id}</p>
					</div>
					{#if device.location}
						<div>
							<p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Location</p>
							<p class="mt-1 text-sm text-zinc-900 dark:text-white">{device.location}</p>
						</div>
					{/if}
					<div>
						<p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Last Seen</p>
						<p class="mt-1 text-sm text-zinc-900 dark:text-white">{formatLastSeen(device.lastSeen)}</p>
					</div>
					{#if device.batteryLevel !== undefined}
						<div>
							<p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Battery</p>
							<div class="mt-1 flex items-center gap-2">
								<svg class="h-5 w-5 {device.batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}" fill="currentColor" viewBox="0 0 24 24">
									<path d="M17 6H4a2 2 0 00-2 2v8a2 2 0 002 2h13a2 2 0 002-2V8a2 2 0 00-2-2zm0 10H4V8h13v8zm4-8v8h-1V8h1zm-4 2H6v4h11v-4z" />
								</svg>
								<span class="text-sm {device.batteryLevel > 20 ? 'text-zinc-900 dark:text-white' : 'text-red-500'}">{device.batteryLevel}%</span>
							</div>
						</div>
					{/if}
				</div>
			{/snippet}
		</Card>

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
