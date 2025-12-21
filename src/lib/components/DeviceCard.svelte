<script lang="ts">
	import type { Device } from '$lib/types';
	import { Badge, Card } from './ui';

	interface Props {
		device: Device;
		onclick?: () => void;
	}

	let { device, onclick }: Props = $props();

	const deviceIcons: Record<string, string> = {
		doorbell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
		camera: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
		sensor: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z'
	};

	function formatLastSeen(date: Date | string): string {
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
		if (seconds < 60) return 'Just now';
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return dateObj.toLocaleDateString();
	}
</script>

<button
	onclick={onclick}
	class="w-full text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
>
	<Card>
		{#snippet children()}
			<div class="flex items-start justify-between">
				<div class="flex items-center gap-3">
					<div class="rounded-full p-2 {device.isOnline ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-700'}">
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={deviceIcons[device.type] ?? deviceIcons.camera} />
						</svg>
					</div>
					<div>
						<h3 class="font-medium text-zinc-900 dark:text-white">{device.name}</h3>
						<p class="text-sm text-zinc-500 dark:text-zinc-400 capitalize">{device.type}</p>
					</div>
				</div>
				<Badge variant={device.isOnline ? 'success' : 'danger'}>
					{device.isOnline ? 'Online' : 'Offline'}
				</Badge>
			</div>

			<div class="mt-4 flex items-center justify-between text-sm">
				<span class="text-zinc-500 dark:text-zinc-400">
					Last seen: {formatLastSeen(device.lastSeen)}
				</span>
				{#if device.batteryLevel !== undefined}
					<div class="flex items-center gap-1">
						<svg class="h-4 w-4 {device.batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}" fill="currentColor" viewBox="0 0 24 24">
							<path d="M17 6H4a2 2 0 00-2 2v8a2 2 0 002 2h13a2 2 0 002-2V8a2 2 0 00-2-2zm0 10H4V8h13v8zm4-8v8h-1V8h1zm-4 2H6v4h11v-4z" />
						</svg>
						<span class="{device.batteryLevel > 20 ? 'text-zinc-600 dark:text-zinc-400' : 'text-red-500'}">{device.batteryLevel}%</span>
					</div>
				{/if}
			</div>
		{/snippet}
	</Card>
</button>
