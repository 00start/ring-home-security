<script lang="ts">
	interface Props {
		title: string;
		value: string | number;
		icon: string;
		trend?: { value: number; isPositive: boolean };
		class?: string;
	}

	let { title, value, icon, trend, class: className = '' }: Props = $props();
</script>

<div
	data-testid="stat-card"
	data-stat-type={title.toLowerCase().replace(/\s+/g, '-')}
	data-stat-value={value}
	class="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800 {className}"
>
	<div class="flex items-center justify-between">
		<div>
			<p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
			<p class="mt-2 text-3xl font-semibold text-zinc-900 dark:text-white">{value}</p>
			{#if trend}
				<div class="mt-2 flex items-center text-sm">
					<svg
						class="h-4 w-4 {trend.isPositive ? 'text-green-500' : 'text-red-500'}"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						{#if trend.isPositive}
							<path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
						{:else}
							<path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
						{/if}
					</svg>
					<span class="{trend.isPositive ? 'text-green-600' : 'text-red-600'} ml-1">
						{trend.value}%
					</span>
					<span class="ml-1 text-zinc-500 dark:text-zinc-400">vs last week</span>
				</div>
			{/if}
		</div>
		<div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
			<svg class="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icon} />
			</svg>
		</div>
	</div>
</div>
