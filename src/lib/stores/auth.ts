import { writable, derived } from 'svelte/store';
import type { User } from '$lib/types';

export const user = writable<User | null>(null);
export const isAuthenticated = derived(user, ($user) => $user !== null);

export async function checkAuth(): Promise<User | null> {
	try {
		const response = await fetch('/api/auth/me');
		if (response.ok) {
			const data = await response.json();
			if (data.success) {
				user.set(data.data);
				return data.data;
			}
		}
		user.set(null);
		return null;
	} catch {
		user.set(null);
		return null;
	}
}

export async function login(username: string, password: string): Promise<boolean> {
	try {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});

		const data = await response.json();

		if (data.success) {
			user.set(data.data);
			return true;
		}

		return false;
	} catch {
		return false;
	}
}

export async function logout(): Promise<void> {
	await fetch('/api/auth/logout', { method: 'POST' });
	user.set(null);
}
