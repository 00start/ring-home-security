<script lang="ts">
	import { Card, Button, Input } from '$lib/components';
	import { user } from '$lib/stores';
	import { formatBytes } from '$lib/utils';

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordError = $state('');
	let passwordSuccess = $state('');
	let isChangingPassword = $state(false);

	async function handlePasswordChange() {
		passwordError = '';
		passwordSuccess = '';

		if (newPassword !== confirmPassword) {
			passwordError = 'Passwords do not match';
			return;
		}

		if (newPassword.length < 8) {
			passwordError = 'Password must be at least 8 characters';
			return;
		}

		isChangingPassword = true;

		try {
			const response = await fetch('/api/auth/password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword })
			});

			const data = await response.json();

			if (data.success) {
				passwordSuccess = 'Password changed successfully';
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
			} else {
				passwordError = data.error || 'Failed to change password';
			}
		} catch {
			passwordError = 'Failed to change password';
		} finally {
			isChangingPassword = false;
		}
	}
</script>

<svelte:head>
	<title>Settings - Ring Security</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page header -->
	<div>
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Manage your account and application settings
		</p>
	</div>

	<!-- Account Settings -->
	<Card title="Account">
		{#snippet children()}
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Username</label>
					<p class="mt-1 text-zinc-900 dark:text-white">{$user?.username ?? 'Unknown'}</p>
				</div>
			</div>
		{/snippet}
	</Card>

	<!-- Change Password -->
	<Card title="Change Password">
		{#snippet children()}
			<form onsubmit={(e) => { e.preventDefault(); handlePasswordChange(); }} class="space-y-4">
				<Input
					type="password"
					label="Current Password"
					bind:value={currentPassword}
					required
				/>

				<Input
					type="password"
					label="New Password"
					bind:value={newPassword}
					required
				/>

				<Input
					type="password"
					label="Confirm New Password"
					bind:value={confirmPassword}
					required
				/>

				{#if passwordError}
					<p class="text-sm text-red-600">{passwordError}</p>
				{/if}

				{#if passwordSuccess}
					<p class="text-sm text-green-600">{passwordSuccess}</p>
				{/if}

				<Button type="submit" loading={isChangingPassword}>
					Change Password
				</Button>
			</form>
		{/snippet}
	</Card>

	<!-- System Information -->
	<Card title="System Information">
		{#snippet children()}
			<div class="space-y-4">
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Version</label>
						<p class="mt-1 text-zinc-900 dark:text-white">0.0.1</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Environment</label>
						<p class="mt-1 text-zinc-900 dark:text-white">Production</p>
					</div>
				</div>

				<div class="border-t border-zinc-200 pt-4 dark:border-zinc-700">
					<h4 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Configuration</h4>
					<dl class="mt-2 divide-y divide-zinc-200 dark:divide-zinc-700">
						<div class="flex justify-between py-2">
							<dt class="text-sm text-zinc-500 dark:text-zinc-400">Retention Days</dt>
							<dd class="text-sm text-zinc-900 dark:text-white">30</dd>
						</div>
						<div class="flex justify-between py-2">
							<dt class="text-sm text-zinc-500 dark:text-zinc-400">Database</dt>
							<dd class="text-sm text-zinc-900 dark:text-white">SQLite</dd>
						</div>
						<div class="flex justify-between py-2">
							<dt class="text-sm text-zinc-500 dark:text-zinc-400">Queue</dt>
							<dd class="text-sm text-zinc-900 dark:text-white">BullMQ (Redis)</dd>
						</div>
					</dl>
				</div>
			</div>
		{/snippet}
	</Card>

	<!-- Danger Zone -->
	<Card title="Danger Zone">
		{#snippet children()}
			<div class="space-y-4">
				<p class="text-sm text-zinc-500 dark:text-zinc-400">
					These actions are irreversible. Please be careful.
				</p>
				<div class="flex gap-4">
					<Button variant="danger" disabled>
						Clear All Events
					</Button>
					<Button variant="danger" disabled>
						Delete All Recordings
					</Button>
				</div>
			</div>
		{/snippet}
	</Card>
</div>
