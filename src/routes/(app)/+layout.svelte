<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ui, toggleSidebar } from '$lib/stores/index.js';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const navItems = [
		{ href: '/', label: 'Dashboard', icon: 'home' },
		{ href: '/timeline', label: 'Timeline', icon: 'clock' },
		{ href: '/devices', label: 'Devices', icon: 'video' },
		{ href: '/recordings', label: 'Recordings', icon: 'film' },
		{ href: '/settings', label: 'Settings', icon: 'settings' }
	];
</script>

<div class="flex h-screen">
	<!-- Sidebar -->
	<aside
		class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0"
		class:hidden={!$ui.sidebarOpen}
	>
		<div class="p-4 border-b border-gray-200 dark:border-gray-700">
			<h2 class="text-xl font-bold text-gray-900 dark:text-white">Ring Security</h2>
		</div>
		<nav class="p-4">
			<ul class="space-y-2">
				{#each navItems as item}
					<li>
						<a
							href={item.href}
							class="flex items-center px-4 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>

	<!-- Main content -->
	<main class="flex-1 overflow-auto">
		{@render children()}
	</main>
</div>
