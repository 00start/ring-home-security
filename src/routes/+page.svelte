<script lang="ts">
	import { Card, Button } from '$lib/components/index.js';
</script>

<svelte:head>
	<title>Ring Home Security</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Ring Home Security</h1>
		<p class="mt-2 text-gray-600 dark:text-gray-400">
			Self-hosted surveillance dashboard for Ring devices
		</p>
	</header>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
		<Card>
			<div class="text-center">
				<p class="text-4xl font-bold text-blue-600">0</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">Devices Online</p>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<p class="text-4xl font-bold text-green-600">0</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">Events Today</p>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<p class="text-4xl font-bold text-purple-600">0</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">Recordings</p>
			</div>
		</Card>

		<Card>
			<div class="text-center">
				<p class="text-4xl font-bold text-orange-600">0 GB</p>
				<p class="text-sm text-gray-500 dark:text-gray-400">Storage Used</p>
			</div>
		</Card>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<Card title="Recent Events">
			<p class="text-gray-500 dark:text-gray-400 text-center py-8">
				No events recorded yet. Connect your Ring devices to get started.
			</p>
		</Card>

		<Card title="Devices">
			<p class="text-gray-500 dark:text-gray-400 text-center py-8">
				No devices connected. Configure your Ring refresh token in the settings.
			</p>
		</Card>
	</div>

	<div class="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
		<h3 class="font-semibold text-yellow-800 dark:text-yellow-200">Setup Required</h3>
		<p class="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
			This is the initial scaffolding. To complete setup:
		</p>
		<ol class="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-decimal list-inside space-y-1">
			<li>Configure your Ring refresh token in environment variables</li>
			<li>Set up Redis for the job queue</li>
			<li>Start the ring-listener and transcode-worker processes</li>
		</ol>
	</div>
</div>
