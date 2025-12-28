<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { EventCard, Button, Select, Modal, VideoPlayer, LogViewer } from '$lib/components';
	import {
		events,
		fetchEvents,
		loading,
		hasMore,
		loadMore,
		setFilters,
		resetFilters,
		filters
	} from '$lib/stores/events';
	import { devices, fetchDevices } from '$lib/stores/devices';
	import { recordings, fetchRecordings } from '$lib/stores/recordings';
	import type { EventLog, Recording, EventType } from '$lib/types';

	let selectedEvent: EventLog | null = $state(null);
	let selectedRecording: Recording | null = $state(null);
	let showVideoModal = $state(false);

	onMount(async () => {
		await fetchDevices();
		await fetchEvents();
		await fetchRecordings();

		// Check for event query param
		const eventId = $page.url.searchParams.get('event');
		if (eventId) {
			const event = $events.find((e) => e.id === eventId);
			if (event) {
				handleEventClick(event);
			}
		}
	});

	function handleEventClick(event: EventLog) {
		selectedEvent = event;
		if (event.recordingId) {
			const recording = $recordings.find((r) => r.id === event.recordingId);
			if (recording && recording.status === 'completed') {
				selectedRecording = recording;
				showVideoModal = true;
			}
		}
	}

	function handleFilterChange(key: string, value: string) {
		if (key === 'deviceId') {
			setFilters({ deviceId: value || undefined });
		} else if (key === 'eventType') {
			setFilters({ eventType: (value || undefined) as EventType | undefined });
		} else if (key === 'hasRecording') {
			setFilters({ hasRecording: value ? value === 'true' : undefined });
		}
		fetchEvents();
	}

	function handleDateChange(key: string, value: string) {
		if (key === 'startDate') {
			setFilters({ startDate: value ? new Date(value) : undefined });
		} else if (key === 'endDate') {
			setFilters({ endDate: value ? new Date(value) : undefined });
		}
		fetchEvents();
	}

	function handleReset() {
		resetFilters();
		fetchEvents();
	}
</script>

<svelte:head>
	<title>Timeline - Ring Security</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Event Timeline</h1>
			<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
				View and filter all security events
			</p>
		</div>
		<LogViewer compact defaultFile="ring-listener.log" />
	</div>

	<!-- Filters -->
	<div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
			<Select
				label="Device"
				value={$filters.deviceId ?? ''}
				onchange={(e) => handleFilterChange('deviceId', (e.target as HTMLSelectElement).value)}
			>
				{#snippet children()}
					<option value="">All Devices</option>
					{#each $devices as device}
						<option value={device.id}>{device.name}</option>
					{/each}
				{/snippet}
			</Select>

			<Select
				label="Event Type"
				value={$filters.eventType ?? ''}
				onchange={(e) => handleFilterChange('eventType', (e.target as HTMLSelectElement).value)}
			>
				{#snippet children()}
					<option value="">All Events</option>
					<option value="motion">Motion</option>
					<option value="ding">Doorbell Ring</option>
					<option value="door_open">Door Open</option>
					<option value="door_close">Door Close</option>
					<option value="device_online">Device Online</option>
					<option value="device_offline">Device Offline</option>
				{/snippet}
			</Select>

			<Select
				label="Video Status"
				value={$filters.hasRecording ?? ''}
				onchange={(e) => handleFilterChange('hasRecording', (e.target as HTMLSelectElement).value)}
			>
				{#snippet children()}
					<option value="">All Events</option>
					<option value="true">Has Recording</option>
					<option value="false">No Recording</option>
				{/snippet}
			</Select>

			<div>
				<label
					for="timeline-start-date"
					class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Start Date</label
				>
				<input
					id="timeline-start-date"
					type="date"
					class="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
					onchange={(e) => handleDateChange('startDate', (e.target as HTMLInputElement).value)}
				/>
			</div>

			<div>
				<label
					for="timeline-end-date"
					class="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">End Date</label
				>
				<input
					id="timeline-end-date"
					type="date"
					class="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
					onchange={(e) => handleDateChange('endDate', (e.target as HTMLInputElement).value)}
				/>
			</div>

			<div class="flex items-end">
				<Button variant="secondary" onclick={handleReset}>Reset Filters</Button>
			</div>
		</div>
	</div>

	<!-- Events list -->
	<div class="space-y-3">
		{#if $events.length === 0 && !$loading}
			<div
				class="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-800"
			>
				<svg
					class="mx-auto h-12 w-12 text-zinc-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<p class="mt-4 text-lg font-medium text-zinc-900 dark:text-white">No events found</p>
				<p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
					Try adjusting your filters or wait for new events.
				</p>
			</div>
		{:else}
			{#each $events as event}
				<EventCard {event} onclick={() => handleEventClick(event)} />
			{/each}
		{/if}

		{#if $loading}
			<div class="flex justify-center py-8">
				<svg class="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			</div>
		{/if}

		{#if $hasMore && !$loading}
			<div class="flex justify-center py-4">
				<Button onclick={loadMore}>Load More</Button>
			</div>
		{/if}
	</div>
</div>

<!-- Video Modal -->
<Modal bind:open={showVideoModal} title={selectedEvent?.deviceName}>
	{#snippet children()}
		{#if selectedRecording}
			<VideoPlayer recording={selectedRecording} />
			<div class="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
				<p>Event: {selectedEvent?.eventType}</p>
				<p>Time: {selectedEvent?.timestamp.toLocaleString()}</p>
			</div>
		{/if}
	{/snippet}
</Modal>
