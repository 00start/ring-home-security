<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Badge, Button, Modal, VideoPlayer, Select } from '$lib/components';
	import { recordings, fetchRecordings, getThumbnailUrl } from '$lib/stores/recordings';
	import { devices, fetchDevices } from '$lib/stores/devices';
	import { formatBytes, formatDuration } from '$lib/utils';
	import type { Recording, RecordingStatus } from '$lib/types';

	let selectedRecording: Recording | null = $state(null);
	let showVideoModal = $state(false);
	let filterDevice = $state('');
	let filterStatus = $state<RecordingStatus | ''>('');
	let retryingId = $state<string | null>(null);

	onMount(async () => {
		await fetchDevices();
		await fetchRecordings();
	});

	function handleFilter() {
		fetchRecordings({
			deviceId: filterDevice || undefined,
			status: filterStatus || undefined
		});
	}

	function handleRecordingClick(recording: Recording) {
		if (recording.status === 'completed') {
			selectedRecording = recording;
			showVideoModal = true;
		}
	}

	function getStatusVariant(status: RecordingStatus): 'success' | 'warning' | 'danger' | 'info' {
		switch (status) {
			case 'completed': return 'success';
			case 'processing': return 'info';
			case 'pending': return 'warning';
			case 'failed': return 'danger';
		}
	}

	function getDeviceName(deviceId: string): string {
		const device = $devices.find((d) => d.id === deviceId);
		return device?.name ?? 'Unknown Device';
	}

	function canRetryRecording(recording: Recording): boolean {
		if (recording.status !== 'failed') return false;

		// Ring keeps recordings for 60 days (or less depending on plan)
		// After that, they're permanently deleted
		// We'll be conservative and only allow retry within 7 days
		const ageInDays = (Date.now() - new Date(recording.createdAt).getTime()) / (1000 * 60 * 60 * 24);
		return ageInDays < 7;
	}

	function getDownloadFilename(recording: Recording): string {
		const deviceName = getDeviceName(recording.deviceId);
		const date = new Date(recording.createdAt);
		const timestamp = date.toISOString()
			.replace(/:/g, '-')
			.replace(/\..+/, '')
			.replace('T', '_');
		return `${deviceName}_${timestamp}.mp4`;
	}

	async function handleRetry(e: MouseEvent, recordingId: string) {
		e.stopPropagation();
		if (retryingId) return;

		retryingId = recordingId;
		try {
			const response = await fetch(`/api/recordings/${recordingId}/retry`, {
				method: 'POST'
			});
			const data = await response.json();

			if (data.success) {
				await fetchRecordings();
			} else {
				alert(data.error || 'Failed to retry recording');
			}
		} catch (error) {
			console.error('Failed to retry recording:', error);
			alert('Failed to retry recording');
		} finally {
			retryingId = null;
		}
	}

	$effect(() => {
		if (filterDevice !== undefined || filterStatus !== undefined) {
			handleFilter();
		}
	});
</script>

<svelte:head>
	<title>Recordings - Ring Security</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page header -->
	<div>
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Recordings</h1>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			View and download video recordings
		</p>
	</div>

	<!-- Filters -->
	<div class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
		<div class="grid gap-4 sm:grid-cols-3">
			<Select
				label="Device"
				bind:value={filterDevice}
				onchange={handleFilter}
			>
				{#snippet children()}
					<option value="">All Devices</option>
					{#each $devices as device}
						<option value={device.id}>{device.name}</option>
					{/each}
				{/snippet}
			</Select>

			<Select
				label="Status"
				bind:value={filterStatus}
				onchange={handleFilter}
			>
				{#snippet children()}
					<option value="">All Status</option>
					<option value="completed">Completed</option>
					<option value="processing">Processing</option>
					<option value="pending">Pending</option>
					<option value="failed">Failed</option>
				{/snippet}
			</Select>
		</div>
	</div>

	<!-- Recordings grid -->
	{#if $recordings.length === 0}
		<div class="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-800">
			<svg class="mx-auto h-12 w-12 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
			</svg>
			<p class="mt-4 text-lg font-medium text-zinc-900 dark:text-white">No recordings found</p>
			<p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
				Recordings will appear here when events trigger video capture.
			</p>
		</div>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each $recordings as recording}
				<div
					class="overflow-hidden rounded-lg border border-zinc-200 bg-white text-left dark:border-zinc-700 dark:bg-zinc-800"
					class:opacity-60={recording.status !== 'completed' && recording.status !== 'failed'}
				>
					<!-- Thumbnail -->
					<div class="relative aspect-video bg-zinc-900">
						{#if recording.status === 'completed'}
							<!-- Clickable area for completed recordings -->
							<button
								onclick={() => handleRecordingClick(recording)}
								class="absolute inset-0 w-full h-full cursor-pointer"
							>
								{#if recording.thumbnailPath}
									<img
										src={getThumbnailUrl(recording.id)}
										alt="Recording thumbnail"
										class="h-full w-full object-cover"
									/>
								{:else}
									<div class="flex h-full items-center justify-center">
										<svg class="h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
										</svg>
									</div>
								{/if}
								<div class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
									<svg class="h-16 w-16 text-white" fill="currentColor" viewBox="0 0 24 24">
										<path d="M8 5v14l11-7z" />
									</svg>
								</div>
							</button>
						{:else}
							<!-- Non-clickable placeholder for non-completed recordings -->
							<div class="flex h-full items-center justify-center">
								<svg class="h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
								</svg>
							</div>
						{/if}

						{#if recording.status === 'failed'}
							<div class="absolute inset-0 flex items-center justify-center bg-black/50">
								{#if canRetryRecording(recording)}
									<button
										onclick={(e) => handleRetry(e, recording.id)}
										disabled={retryingId === recording.id}
										class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
									>
										{retryingId === recording.id ? 'Retrying...' : 'Retry Download'}
									</button>
								{:else}
									<div class="text-center">
										<svg class="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
										</svg>
										<p class="mt-2 text-sm text-white">Recording Expired</p>
									</div>
								{/if}
							</div>
						{/if}

						<div class="absolute bottom-2 right-2 pointer-events-none">
							<Badge variant={getStatusVariant(recording.status)}>
								{recording.status}
							</Badge>
						</div>

						{#if recording.duration > 0}
							<div class="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white pointer-events-none">
								{formatDuration(recording.duration)}
							</div>
						{/if}
					</div>

					<!-- Info -->
					<div class="p-4">
						<p class="font-medium text-zinc-900 dark:text-white">
							{getDeviceName(recording.deviceId)}
						</p>
						<p class="text-sm text-zinc-500 dark:text-zinc-400">
							{recording.createdAt.toLocaleString()}
						</p>
						{#if recording.fileSize > 0}
							<p class="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
								{formatBytes(recording.fileSize)}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Video Modal -->
<Modal bind:open={showVideoModal} title="Recording">
	{#snippet children()}
		{#if selectedRecording}
			<VideoPlayer recording={selectedRecording} />
			<div class="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
				<div>
					<p>{getDeviceName(selectedRecording.deviceId)}</p>
					<p>{selectedRecording.createdAt.toLocaleString()}</p>
				</div>
				<a
					href="/api/recordings/{selectedRecording.id}/video"
					download={getDownloadFilename(selectedRecording)}
					class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					Download
				</a>
			</div>
		{/if}
	{/snippet}
</Modal>
