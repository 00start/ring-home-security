<script lang="ts">
	import { onMount } from 'svelte';
	import { Navbar, ToastContainer } from '$lib/components';
	import { checkAuth, subscribeToEvents, unsubscribeFromEvents } from '$lib/stores';
	import { notificationService } from '$lib/services/notifications';

	let { children } = $props();

	onMount(() => {
		checkAuth();
		subscribeToEvents();

		// Request notification permission on first load
		if (notificationService.getPermission() === 'default') {
			// Delay permission request slightly to avoid immediate popup
			setTimeout(() => {
				notificationService.requestPermission();
			}, 3000);
		}

		return () => {
			unsubscribeFromEvents();
		};
	});
</script>

<div class="relative min-h-screen">
	<!-- Skip to main content link for keyboard navigation -->
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
	>
		Skip to main content
	</a>

	<!-- Background that extends beyond viewport -->
	<div class="fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-900"></div>

	<Navbar />
	<main id="main-content" class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" tabindex="-1">
		{@render children()}
	</main>
</div>

<!-- Toast notifications -->
<ToastContainer />
