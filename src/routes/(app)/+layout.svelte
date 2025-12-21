<script lang="ts">
	import { onMount } from 'svelte';
	import { Navbar } from '$lib/components';
	import { checkAuth, subscribeToEvents, unsubscribeFromEvents } from '$lib/stores';

	let { children } = $props();

	onMount(() => {
		checkAuth();
		subscribeToEvents();

		return () => {
			unsubscribeFromEvents();
		};
	});
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-900">
	<Navbar />
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{@render children()}
	</main>
</div>
