<script lang="ts">
	import { Card } from '$lib/components/index.js';
</script>

<svelte:head>
	<title>Timeline | Ring Home Security</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Event Timeline</h1>

	<Card>
		<p class="text-gray-500 dark:text-gray-400 text-center py-12">
			No events to display. Events will appear here once the Ring listener is connected.
		</p>
	</Card>
</div>
