<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Input, LogViewer } from '$lib/components';
	import { user } from '$lib/stores';
	import { notificationPreferences } from '$lib/stores/preferences';
	import { notificationService } from '$lib/services/notifications';
	import { toasts } from '$lib/stores/toast';
	import type { EventType } from '$lib/types';

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordError = $state('');
	let passwordSuccess = $state('');
	let isChangingPassword = $state(false);

	// Notification settings
	let notificationPermission = $state<'default' | 'granted' | 'denied'>('default');

	// Account management
	let users = $state<Array<{ id: string; username: string; createdAt: string }>>([]);
	let newUsername = $state('');
	let newUserPassword = $state('');
	let isCreatingUser = $state(false);
	let createUserError = $state('');
	let isDeletingUser = $state<string | null>(null);

	// Danger zone
	let isClearingEvents = $state(false);
	let isDeletingRecordings = $state(false);

	const eventTypeLabels: Record<EventType, string> = {
		ding: 'Doorbell Ring',
		motion: 'Motion Detected',
		door_open: 'Door Opened',
		door_close: 'Door Closed',
		device_offline: 'Device Offline',
		device_online: 'Device Online'
	};

	onMount(() => {
		notificationPermission = notificationService.getPermission();
		loadUsers();
	});

	async function requestNotificationPermission() {
		const result = await notificationService.requestPermission();
		notificationPermission = result;
		if (result === 'granted') {
			toasts.success('Notifications Enabled', 'You will now receive browser notifications for events.');
		} else if (result === 'denied') {
			toasts.error('Notifications Blocked', 'Please enable notifications in your browser settings.');
		}
	}

	async function loadUsers() {
		try {
			const response = await fetch('/api/users');
			const data = await response.json();
			if (data.success) {
				users = data.data;
			}
		} catch {
			// Ignore errors
		}
	}

	async function handleCreateUser() {
		createUserError = '';

		if (!newUsername.trim()) {
			createUserError = 'Username is required';
			return;
		}

		if (newUserPassword.length < 8) {
			createUserError = 'Password must be at least 8 characters';
			return;
		}

		isCreatingUser = true;

		try {
			const response = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: newUsername, password: newUserPassword })
			});

			const data = await response.json();

			if (data.success) {
				toasts.success('User Created', `Account "${newUsername}" has been created.`);
				newUsername = '';
				newUserPassword = '';
				await loadUsers();
			} else {
				createUserError = data.error || 'Failed to create user';
			}
		} catch {
			createUserError = 'Failed to create user';
		} finally {
			isCreatingUser = false;
		}
	}

	async function handleDeleteUser(userId: string, username: string) {
		if (!confirm(`Are you sure you want to delete the user "${username}"? This cannot be undone.`)) {
			return;
		}

		isDeletingUser = userId;

		try {
			const response = await fetch(`/api/users/${userId}`, {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				toasts.success('User Deleted', `Account "${username}" has been deleted.`);
				await loadUsers();
			} else {
				toasts.error('Delete Failed', data.error || 'Failed to delete user');
			}
		} catch {
			toasts.error('Delete Failed', 'Failed to delete user');
		} finally {
			isDeletingUser = null;
		}
	}

	async function handleClearEvents() {
		if (!confirm('Are you sure you want to delete ALL events? This cannot be undone.')) {
			return;
		}

		isClearingEvents = true;

		try {
			const response = await fetch('/api/admin/clear-events', {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				toasts.success('Events Cleared', `${data.data.deleted} events have been deleted.`);
			} else {
				toasts.error('Clear Failed', data.error || 'Failed to clear events');
			}
		} catch {
			toasts.error('Clear Failed', 'Failed to clear events');
		} finally {
			isClearingEvents = false;
		}
	}

	async function handleDeleteRecordings() {
		if (!confirm('Are you sure you want to delete ALL recordings? This will also delete the video files. This cannot be undone.')) {
			return;
		}

		isDeletingRecordings = true;

		try {
			const response = await fetch('/api/admin/clear-recordings', {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				toasts.success(
					'Recordings Deleted',
					`${data.data.recordsDeleted} recordings deleted, ${data.data.filesDeleted} files removed.`
				);
			} else {
				toasts.error('Delete Failed', data.error || 'Failed to delete recordings');
			}
		} catch {
			toasts.error('Delete Failed', 'Failed to delete recordings');
		} finally {
			isDeletingRecordings = false;
		}
	}

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
	<Card title="Account" data-testid="settings-account-section">
		{#snippet children()}
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Username</label>
					<p class="mt-1 text-zinc-900 dark:text-white">{$user?.username ?? 'Unknown'}</p>
				</div>
			</div>
		{/snippet}
	</Card>

	<!-- Notification Settings -->
	<Card title="Notifications" data-testid="settings-notifications-section">
		{#snippet children()}
			<div class="space-y-6">
				<!-- Browser Permission -->
				<div class="flex items-center justify-between">
					<div>
						<h4 class="text-sm font-medium text-zinc-900 dark:text-white">Browser Notifications</h4>
						<p class="text-sm text-zinc-500 dark:text-zinc-400">
							{#if notificationPermission === 'granted'}
								Notifications are enabled
							{:else if notificationPermission === 'denied'}
								Notifications are blocked in your browser
							{:else}
								Allow notifications to get alerts for events
							{/if}
						</p>
					</div>
					{#if notificationPermission === 'granted'}
						<span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
							Enabled
						</span>
					{:else if notificationPermission === 'denied'}
						<span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
							Blocked
						</span>
					{:else}
						<Button onclick={requestNotificationPermission}>
							Enable
						</Button>
					{/if}
				</div>

				<!-- Master Toggle -->
				<div class="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-700">
					<div>
						<h4 class="text-sm font-medium text-zinc-900 dark:text-white">Enable Notifications</h4>
						<p class="text-sm text-zinc-500 dark:text-zinc-400">Show notifications for Ring events</p>
					</div>
					<label class="relative inline-flex cursor-pointer items-center">
						<input
							type="checkbox"
							class="peer sr-only"
							checked={$notificationPreferences.enabled}
							onchange={(e) => notificationPreferences.setEnabled(e.currentTarget.checked)}
						/>
						<div class="peer h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-zinc-600 dark:bg-zinc-700"></div>
					</label>
				</div>

				<!-- Sound Toggle -->
				<div class="flex items-center justify-between">
					<div>
						<h4 class="text-sm font-medium text-zinc-900 dark:text-white">Sound Alerts</h4>
						<p class="text-sm text-zinc-500 dark:text-zinc-400">Play sound for doorbell and important events</p>
					</div>
					<label class="relative inline-flex cursor-pointer items-center">
						<input
							type="checkbox"
							class="peer sr-only"
							checked={$notificationPreferences.soundEnabled}
							onchange={(e) => notificationPreferences.setSoundEnabled(e.currentTarget.checked)}
						/>
						<div class="peer h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-zinc-600 dark:bg-zinc-700"></div>
					</label>
				</div>

				<!-- Event Type Toggles -->
				<div class="border-t border-zinc-200 pt-4 dark:border-zinc-700">
					<h4 class="mb-3 text-sm font-medium text-zinc-900 dark:text-white">Event Types</h4>
					<div class="space-y-3">
						{#each Object.entries(eventTypeLabels) as [eventType, label]}
							<div class="flex items-center justify-between">
								<span class="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
								<label class="relative inline-flex cursor-pointer items-center">
									<input
										type="checkbox"
										class="peer sr-only"
										checked={$notificationPreferences.eventTypes[eventType as EventType]}
										onchange={(e) => notificationPreferences.setEventTypeEnabled(eventType as EventType, e.currentTarget.checked)}
									/>
									<div class="peer h-5 w-9 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-zinc-600 dark:bg-zinc-700"></div>
								</label>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/snippet}
	</Card>

	<!-- Change Password -->
	<Card title="Change Password" data-testid="settings-password-section">
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
					<p data-testid="error-message" data-error-type="password" class="text-sm text-red-600">{passwordError}</p>
				{/if}

				{#if passwordSuccess}
					<p data-testid="success-message" data-success-type="password" class="text-sm text-green-600">{passwordSuccess}</p>
				{/if}

				<Button type="submit" loading={isChangingPassword}>
					Change Password
				</Button>
			</form>
		{/snippet}
	</Card>

	<!-- System Information -->
	<Card title="System Information" data-testid="settings-system-section">
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

	<!-- User Management -->
	<Card title="User Management" data-testid="settings-users-section">
		{#snippet children()}
			<div class="space-y-6">
				<!-- Existing Users -->
				<div>
					<h4 class="mb-3 text-sm font-medium text-zinc-900 dark:text-white">Existing Users</h4>
					{#if users.length === 0}
						<p class="text-sm text-zinc-500 dark:text-zinc-400">No users found</p>
					{:else}
						<div class="divide-y divide-zinc-200 dark:divide-zinc-700">
							{#each users as u}
								<div class="flex items-center justify-between py-3">
									<div>
										<p class="text-sm font-medium text-zinc-900 dark:text-white">{u.username}</p>
										<p class="text-xs text-zinc-500 dark:text-zinc-400">
											Created {new Date(u.createdAt).toLocaleDateString()}
										</p>
									</div>
									{#if u.username !== $user?.username}
										<Button
											variant="danger"
											size="sm"
											loading={isDeletingUser === u.id}
											onclick={() => handleDeleteUser(u.id, u.username)}
										>
											Delete
										</Button>
									{:else}
										<span class="text-xs text-zinc-500 dark:text-zinc-400">(current)</span>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Create New User -->
				<div class="border-t border-zinc-200 pt-4 dark:border-zinc-700">
					<h4 class="mb-3 text-sm font-medium text-zinc-900 dark:text-white">Create New User</h4>
					<form onsubmit={(e) => { e.preventDefault(); handleCreateUser(); }} class="space-y-4">
						<Input
							label="Username"
							bind:value={newUsername}
							required
						/>

						<Input
							type="password"
							label="Password"
							bind:value={newUserPassword}
							required
						/>

						{#if createUserError}
							<p data-testid="error-message" data-error-type="create-user" class="text-sm text-red-600">{createUserError}</p>
						{/if}

						<Button type="submit" loading={isCreatingUser}>
							Create User
						</Button>
					</form>
				</div>
			</div>
		{/snippet}
	</Card>

	<!-- Log Viewer -->
	<LogViewer />

	<!-- Danger Zone -->
	<Card title="Danger Zone" data-testid="settings-danger-section">
		{#snippet children()}
			<div class="space-y-4">
				<p class="text-sm text-zinc-500 dark:text-zinc-400">
					These actions are irreversible. Please be careful.
				</p>
				<div class="flex flex-wrap gap-4">
					<Button variant="danger" loading={isClearingEvents} onclick={handleClearEvents}>
						Clear All Events
					</Button>
					<Button variant="danger" loading={isDeletingRecordings} onclick={handleDeleteRecordings}>
						Delete All Recordings
					</Button>
				</div>
			</div>
		{/snippet}
	</Card>
</div>
