<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, Button } from '$lib/components';

	interface Props {
		compact?: boolean;
		defaultFile?: string;
	}

	let { compact = false, defaultFile }: Props = $props();

	interface LogFile {
		name: string;
		process: string;
	}

	interface LogData {
		file: string;
		lines: string[];
		totalLines: number;
	}

	let logFiles = $state<LogFile[]>([]);
	let selectedFile = $state<string>('');
	let logData = $state<LogData | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let autoRefresh = $state(true);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	async function fetchLogFiles() {
		try {
			const response = await fetch('/api/logs');
			const data = await response.json();

			if (data.success) {
				logFiles = data.data;
				if (!selectedFile && logFiles.length > 0) {
					selectedFile = defaultFile || logFiles[0].name;
				}
			} else {
				error = data.error || 'Failed to fetch log files';
			}
		} catch (err) {
			error = 'Failed to fetch log files';
		}
	}

	async function fetchLogContent() {
		if (!selectedFile) return;

		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/logs?file=${selectedFile}&lines=100`);
			const data = await response.json();

			if (data.success) {
				logData = data.data;
			} else {
				error = data.error || 'Failed to fetch log content';
			}
		} catch (err) {
			error = 'Failed to fetch log content';
		} finally {
			loading = false;
		}
	}

	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;
		if (autoRefresh) {
			startAutoRefresh();
		} else {
			stopAutoRefresh();
		}
	}

	function startAutoRefresh() {
		if (refreshInterval) return;
		refreshInterval = setInterval(fetchLogContent, 5000);
	}

	function stopAutoRefresh() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}

	$effect(() => {
		if (selectedFile) {
			fetchLogContent();
		}
	});

	onMount(() => {
		fetchLogFiles();
		if (autoRefresh) {
			startAutoRefresh();
		}
	});

	onDestroy(() => {
		stopAutoRefresh();
	});

	// Format log line with basic syntax highlighting
	function formatLogLine(line: string): string {
		// Add basic color classes for different log levels
		if (line.includes('ERROR') || line.includes('"level":50')) {
			return `<span class="text-red-600 dark:text-red-400">${line}</span>`;
		} else if (line.includes('WARN') || line.includes('"level":40')) {
			return `<span class="text-yellow-600 dark:text-yellow-400">${line}</span>`;
		} else if (line.includes('INFO') || line.includes('"level":30')) {
			return `<span class="text-blue-600 dark:text-blue-400">${line}</span>`;
		} else if (line.includes('DEBUG') || line.includes('"level":20')) {
			return `<span class="text-zinc-500 dark:text-zinc-400">${line}</span>`;
		}
		return line;
	}
</script>

{#if compact}
	<div class="inline-flex items-center gap-2">
		<select
			bind:value={selectedFile}
			class="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
		>
			{#each logFiles as file}
				<option value={file.name}>{file.process}</option>
			{/each}
		</select>
		<Button
			size="sm"
			variant="secondary"
			onclick={() => fetchLogContent()}
			loading={loading}
		>
			View Logs
		</Button>
	</div>
{:else}
	<Card title="Log Viewer" data-testid="log-viewer">
		{#snippet children()}
			<div class="space-y-4">
				<!-- Controls -->
				<div class="flex flex-wrap items-center gap-4">
					<select
						bind:value={selectedFile}
						class="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
					>
						{#each logFiles as file}
							<option value={file.name}>{file.process}</option>
						{/each}
					</select>

					<div class="flex gap-2">
						<Button
							size="sm"
							variant="secondary"
							onclick={() => fetchLogContent()}
							loading={loading}
						>
							Refresh
						</Button>
						<Button
							size="sm"
							variant={autoRefresh ? 'primary' : 'secondary'}
							onclick={toggleAutoRefresh}
						>
							{autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
						</Button>
					</div>

					{#if logData}
						<span class="text-sm text-zinc-500 dark:text-zinc-400">
							Showing last 100 of {logData.totalLines.toLocaleString()} lines
						</span>
					{/if}
				</div>

				{#if error}
					<p data-testid="error-message" data-error-type="log-viewer" class="text-sm text-red-600">{error}</p>
				{/if}

				<!-- Log content -->
				{#if logData}
					<div class="relative">
						<pre class="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100"><code>{#each logData.lines as line}{@html formatLogLine(line)}
{/each}</code></pre>
					</div>
				{:else if loading}
					<div class="flex items-center justify-center py-8">
						<div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
					</div>
				{/if}
			</div>
		{/snippet}
	</Card>
{/if}
