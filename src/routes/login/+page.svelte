<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button, Input, Card } from '$lib/components';
	import { login } from '$lib/stores';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = '';
		loading = true;

		try {
			const success = await login(username, password);

			if (success) {
				goto('/');
			} else {
				error = 'Invalid username or password';
			}
		} catch {
			error = 'An error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - Ring Security</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-900">
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<svg
				class="mx-auto h-12 w-12 text-blue-600"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
				/>
			</svg>
			<h1 class="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Ring Security</h1>
			<p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Sign in to access your dashboard</p>
		</div>

		<Card>
			{#snippet children()}
				<form onsubmit={handleSubmit} class="space-y-6" data-testid="login-form">
					<Input
						type="text"
						label="Username"
						bind:value={username}
						autocomplete="username"
						data-testid="login-username-input"
						required
					/>

					<Input
						type="password"
						label="Password"
						bind:value={password}
						autocomplete="current-password"
						data-testid="login-password-input"
						required
					/>

					{#if error}
						<div class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
							<p
								data-testid="error-message"
								data-error-type="login"
								class="text-sm text-red-600 dark:text-red-400"
							>
								{error}
							</p>
						</div>
					{/if}

					<Button type="submit" {loading} class="w-full" data-testid="login-submit-button">
						Sign in
					</Button>
				</form>
			{/snippet}
		</Card>

		<p class="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
			Default credentials: admin / admin
		</p>
	</div>
</div>
