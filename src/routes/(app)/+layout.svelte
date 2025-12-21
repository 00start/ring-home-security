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
	<!-- Background that extends beyond viewport -->
	<div class="fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-900"></div>

	<Navbar />
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{@render children()}
	</main>
</div>

<!-- Toast notifications -->
<ToastContainer />
