<script lang="ts">
	import type { EventLog } from '$lib/types';
	import { Badge } from './ui';

	interface Props {
		event: EventLog;
		onclick?: () => void;
	}

	let { event, onclick }: Props = $props();

	const eventIcons: Record<string, { icon: string; color: string }> = {
		motion: { icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'text-yellow-500' },
		ding: { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: 'text-blue-500' },
		door_open: { icon: 'M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-orange-500' },
		door_close: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-green-500' },
		device_offline: { icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', color: 'text-red-500' },
		device_online: { icon: 'M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z', color: 'text-green-500' }
	};

	const eventLabels: Record<string, string> = {
		motion: 'Motion Detected',
		ding: 'Doorbell Ring',
		door_open: 'Door Opened',
		door_close: 'Door Closed',
		device_offline: 'Device Offline',
		device_online: 'Device Online'
	};

	function formatTime(date: Date): string {
		return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}

	function formatDate(date: Date): string {
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		}
		if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		}
		return date.toLocaleDateString();
	}

	const eventInfo = eventIcons[event.eventType] ?? eventIcons.motion;
</script>

<button
	onclick={onclick}
	class="w-full rounded-lg border border-zinc-200 bg-white p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 focus:outline-none focus:ring-2 focus:ring-blue-500"
>
	<div class="flex items-center gap-4">
		<div class="flex-shrink-0 rounded-full bg-zinc-100 p-2 dark:bg-zinc-700">
			<svg class="h-5 w-5 {eventInfo.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={eventInfo.icon} />
			</svg>
		</div>

		<div class="min-w-0 flex-1">
			<div class="flex items-center justify-between">
				<p class="font-medium text-zinc-900 dark:text-white truncate">
					{eventLabels[event.eventType] ?? event.eventType}
				</p>
				{#if event.recordingId}
					<Badge variant="info">Video</Badge>
				{/if}
			</div>
			<p class="text-sm text-zinc-500 dark:text-zinc-400 truncate">
				{event.deviceName}
			</p>
		</div>

		<div class="flex-shrink-0 text-right text-sm text-zinc-500 dark:text-zinc-400">
			<p>{formatTime(event.timestamp)}</p>
			<p>{formatDate(event.timestamp)}</p>
		</div>
	</div>
</button>
