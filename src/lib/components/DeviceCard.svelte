<script lang="ts">
	import type { Device } from '$lib/types';
	import { Badge, Card } from './ui';

	interface Props {
		device: Device;
		onclick?: () => void;
		onLiveView?: () => void;
	}

	let { device, onclick, onLiveView }: Props = $props();

	const deviceIcons: Record<string, string> = {
		doorbell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
		camera: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
		sensor: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
		misc: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
	};

	// Subtype-specific icons for sensors
	const sensorSubtypeIcons: Record<string, string> = {
		contact: 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z', // lock/door
		motion: 'M13 10V3L4 14h7v7l9-11h-7z', // lightning bolt for motion
		flood: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z', // water drop
		smoke: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', // alarm
	};

	// Subtype-specific icons for misc devices
	const miscSubtypeIcons: Record<string, string> = {
		base_station: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01', // server
		keypad: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z', // grid
		range_extender: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0', // wifi
		siren: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z', // speaker
	};

	function getDeviceIcon(device: Device): string {
		// Check for subtype-specific icons first
		if (device.type === 'sensor' && device.subtype && sensorSubtypeIcons[device.subtype]) {
			return sensorSubtypeIcons[device.subtype];
		}
		if (device.type === 'misc' && device.subtype && miscSubtypeIcons[device.subtype]) {
			return miscSubtypeIcons[device.subtype];
		}
		return deviceIcons[device.type] ?? deviceIcons.misc;
	}

	function getSubtypeLabel(device: Device): string {
		if (!device.subtype) return device.type;
		const labels: Record<string, string> = {
			contact: 'Contact Sensor',
			motion: 'Motion Sensor',
			flood: 'Flood Sensor',
			smoke: 'Smoke Detector',
			co: 'CO Detector',
			base_station: 'Base Station',
			keypad: 'Keypad',
			range_extender: 'Range Extender',
			siren: 'Siren',
			hub: 'Hub',
		};
		return labels[device.subtype] || device.subtype;
	}

	const supportsLiveView = (type: string) => type === 'camera' || type === 'doorbell';

	function formatLastSeen(date: Date | string): string {
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		const seconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
		if (seconds < 60) return 'Just now';
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return dateObj.toLocaleDateString();
	}

	function handleLiveView(e: MouseEvent) {
		e.stopPropagation();
		onLiveView?.();
	}
</script>

<Card>
	{#snippet children()}
		<button
			onclick={onclick}
			data-testid="camera-card"
			data-device-id={device.id}
			data-status={device.isOnline ? 'online' : 'offline'}
			data-battery-low={device.batteryLevel !== undefined && device.batteryLevel <= 20}
			class="w-full text-left -m-6 p-6 transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
		>
			<div class="flex items-start justify-between">
				<div class="flex items-center gap-3">
					<div class="rounded-full p-2 {device.isOnline ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-700'}">
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getDeviceIcon(device)} />
						</svg>
					</div>
					<div>
						<h3 class="font-medium text-zinc-900 dark:text-white">{device.name}</h3>
						<p class="text-sm text-zinc-500 dark:text-zinc-400">{getSubtypeLabel(device)}</p>
					</div>
				</div>
				<div class="flex flex-col items-end gap-1">
					<Badge variant={device.isOnline ? 'success' : 'danger'}>
						<span data-testid="status-indicator" data-status={device.isOnline ? 'online' : 'offline'}>
						{device.isOnline ? 'Online' : 'Offline'}
					</Badge>
					{#if device.type === 'sensor' && device.subtype === 'contact' && device.faulted !== undefined}
						<Badge variant={device.faulted ? 'warning' : 'info'}>
							{device.faulted ? 'Open' : 'Closed'}
						</Badge>
					{/if}
				</div>
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
		</button>

		{#if supportsLiveView(device.type) && device.isOnline}
			<div class="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
				<button
					data-testid="live-view-button"
					data-device-id={device.id}
					onclick={handleLiveView}
					type="button"
					class="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer"
				>
					<svg class="h-4 w-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Live View
				</button>
			</div>
		{/if}
	{/snippet}
</Card>
