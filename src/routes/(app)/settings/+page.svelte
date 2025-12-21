<script lang="ts">
	import { Card, Button } from '$lib/components/index.js';
</script>

<svelte:head>
	<title>Settings | Ring Home Security</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

	<div class="space-y-6">
		<Card title="Ring Connection">
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Connection Status
					</label>
					<p class="text-red-600 dark:text-red-400">Not Connected</p>
				</div>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Ring refresh token is configured via environment variables for security.
					See the documentation for setup instructions.
				</p>
			</div>
		</Card>

		<Card title="Storage">
			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Storage Used
						</label>
						<p class="text-lg font-semibold">0 GB</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Retention Period
						</label>
						<p class="text-lg font-semibold">30 days</p>
					</div>
				</div>
			</div>
		</Card>

		<Card title="System Status">
			<div class="space-y-3">
				<div class="flex justify-between items-center">
					<span class="text-gray-700 dark:text-gray-300">Web Server</span>
					<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Running</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-gray-700 dark:text-gray-300">Ring Listener</span>
					<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">Not Started</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-gray-700 dark:text-gray-300">Transcode Worker</span>
					<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">Not Started</span>
				</div>
			</div>
		</Card>
	</div>
</div>
