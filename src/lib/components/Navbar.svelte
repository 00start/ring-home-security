<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { logout, user } from '$lib/stores';

	let locationName = $state<string>('Ring Security');

	onMount(async () => {
		try {
			const response = await fetch('/api/location');
			const data = await response.json();
			if (data.success) {
				locationName = data.data.name;
			}
		} catch (error) {
			console.error('Failed to fetch location:', error);
		}
	});

	const navItems = [
		{ href: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ href: '/timeline', label: 'Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
		{ href: '/devices', label: 'Devices', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
		{ href: '/recordings', label: 'Recordings', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
		{ href: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
	];

	async function handleLogout() {
		await logout();
		window.location.href = '/login';
	}
</script>

<nav class="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 justify-between">
			<div class="flex">
				<div class="flex flex-shrink-0 items-center">
					<svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
					<span class="ml-2 text-xl font-bold text-zinc-900 dark:text-white">{locationName}</span>
				</div>
				<div class="hidden sm:ml-6 sm:flex sm:space-x-4">
					{#each navItems as item}
						<a
							href={item.href}
							class="inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors
								{$page.url.pathname === item.href
									? 'border-blue-500 text-zinc-900 dark:text-white'
									: 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}"
						>
							<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
							</svg>
							{item.label}
						</a>
					{/each}
				</div>
			</div>
			<div class="flex items-center">
				{#if $user}
					<span class="mr-4 text-sm text-zinc-500 dark:text-zinc-400">
						{$user.username}
					</span>
				{/if}
				<button
					onclick={handleLogout}
					class="rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
				>
					Logout
				</button>
			</div>
		</div>
	</div>

	<!-- Mobile menu -->
	<div class="sm:hidden">
		<div class="flex space-x-1 overflow-x-auto px-2 pb-3 pt-2">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex items-center rounded-md px-3 py-2 text-sm font-medium
						{$page.url.pathname === item.href
							? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
							: 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700'}"
				>
					<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
					</svg>
					{item.label}
				</a>
			{/each}
		</div>
	</div>
</nav>
