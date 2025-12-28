<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, Button, Select } from '$lib/components';

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
	let lineCount = $state(100);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;
	let logContainer: HTMLElement | null = null;

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
			const response = await fetch(`/api/logs?file=${selectedFile}&lines=${lineCount}`);
			const data = await response.json();

			if (data.success) {
				logData = data.data;
				// Auto-scroll to bottom on update
				setTimeout(() => {
					if (logContainer) {
						logContainer.scrollTop = logContainer.scrollHeight;
					}
				}, 0);
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

	$effect(() => {
		if (lineCount && selectedFile) {
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

	// Parse and format JSON log lines
	function parseLogLine(
		line: string
	): { level: string; time: string; msg: string; rest: Record<string, unknown> } | null {
		try {
			const parsed = JSON.parse(line);
			const levelMap: Record<number, string> = {
				10: 'TRACE',
				20: 'DEBUG',
				30: 'INFO',
				40: 'WARN',
				50: 'ERROR',
				60: 'FATAL'
			};
			const level = levelMap[parsed.level] || 'INFO';
			const time = new Date(parsed.time).toLocaleTimeString();
			const msg = parsed.msg || '';
			const { level: _, time: __, msg: ___, ...rest } = parsed;
			return { level, time, msg, rest };
		} catch {
			return null;
		}
	}

	function getLevelColor(level: string): string {
		switch (level) {
			case 'ERROR':
			case 'FATAL':
				return 'text-red-400';
			case 'WARN':
				return 'text-yellow-400';
			case 'INFO':
				return 'text-blue-400';
			case 'DEBUG':
				return 'text-zinc-400';
			case 'TRACE':
				return 'text-zinc-500';
			default:
				return 'text-zinc-300';
		}
	}

	function getLevelBg(level: string): string {
		switch (level) {
			case 'ERROR':
			case 'FATAL':
				return 'bg-red-900/30';
			case 'WARN':
				return 'bg-yellow-900/30';
			case 'INFO':
				return 'bg-blue-900/30';
			case 'DEBUG':
				return 'bg-zinc-800/30';
			default:
				return 'bg-zinc-800/30';
		}
	}
</script>

<Card title="System Logs" data-testid="log-viewer" id="logs">
	{#snippet children()}
		<div class="space-y-4">
			<!-- Controls -->
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="flex flex-wrap items-center gap-3">
					<Select
						label=""
						value={selectedFile}
						onchange={(e) => {
							selectedFile = (e.target as HTMLSelectElement).value;
						}}
					>
						{#snippet children()}
							{#each logFiles as file}
								<option value={file.name}>{file.process}</option>
							{/each}
						{/snippet}
					</Select>

					<Select
						label=""
						value={lineCount.toString()}
						onchange={(e) => {
							lineCount = parseInt((e.target as HTMLSelectElement).value);
						}}
					>
						{#snippet children()}
							<option value="50">50 lines</option>
							<option value="100">100 lines</option>
							<option value="200">200 lines</option>
							<option value="500">500 lines</option>
							<option value="1000">1000 lines</option>
						{/snippet}
					</Select>

					<div class="flex gap-2">
						<Button size="sm" variant="ghost" onclick={() => fetchLogContent()} {loading}>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
						</Button>
						<Button
							size="sm"
							variant={autoRefresh ? 'primary' : 'ghost'}
							onclick={toggleAutoRefresh}
						>
							{#if autoRefresh}
								<svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{/if}
							Auto-Refresh
						</Button>
					</div>
				</div>

				{#if logData}
					<span class="text-xs text-zinc-500 dark:text-zinc-400">
						Last {lineCount} of {logData.totalLines.toLocaleString()} lines
					</span>
				{/if}
			</div>

			{#if error}
				<div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
					<div class="flex items-center gap-2">
						<svg
							class="h-5 w-5 text-red-600 dark:text-red-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p
							data-testid="error-message"
							data-error-type="log-viewer"
							class="text-sm text-red-600 dark:text-red-400"
						>
							{error}
						</p>
					</div>
				</div>
			{/if}

			<!-- Log content -->
			{#if logData}
				<div
					bind:this={logContainer}
					class="overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4 font-mono text-xs"
					style="max-height: 500px;"
				>
					{#if logData.lines.length === 0}
						<div class="flex flex-col items-center justify-center py-12 text-zinc-500">
							<svg class="mb-3 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							<p>No log entries</p>
						</div>
					{:else}
						{#each logData.lines as line}
							{@const parsed = parseLogLine(line)}
							{#if parsed}
								<div class="group mb-1 rounded px-2 py-1 transition-colors hover:bg-zinc-800/50">
									<div class="flex items-start gap-3">
										<span class="shrink-0 text-zinc-500">{parsed.time}</span>
										<span
											class="w-14 shrink-0 text-right font-semibold {getLevelColor(
												parsed.level
											)} {getLevelBg(parsed.level)} rounded px-1.5 py-0.5 text-[10px]"
										>
											{parsed.level}
										</span>
										<span class="flex-1 text-zinc-300">{parsed.msg}</span>
									</div>
									{#if Object.keys(parsed.rest).length > 0}
										<div class="mt-1 ml-24 hidden text-[10px] text-zinc-500 group-hover:block">
											{JSON.stringify(parsed.rest, null, 2)}
										</div>
									{/if}
								</div>
							{:else}
								<div
									class="mb-1 rounded px-2 py-1 text-zinc-400 transition-colors hover:bg-zinc-800/50"
								>
									{line}
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			{:else if loading}
				<div class="flex items-center justify-center py-12">
					<div class="flex flex-col items-center gap-3">
						<div
							class="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
						></div>
						<p class="text-sm text-zinc-500 dark:text-zinc-400">Loading logs...</p>
					</div>
				</div>
			{:else}
				<div class="flex items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
					<div class="flex flex-col items-center gap-3">
						<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<p>Select a log file to view</p>
					</div>
				</div>
			{/if}
		</div>
	{/snippet}
</Card>
