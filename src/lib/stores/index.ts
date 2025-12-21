// Svelte stores for global state management
import { writable, derived, type Writable } from 'svelte/store';
import type { Device, EventLog, Recording } from '$lib/types/index.js';

// Device store
export const devices: Writable<Device[]> = writable([]);

// Online devices count
export const onlineDevicesCount = derived(devices, ($devices) =>
	$devices.filter((d) => d.isOnline).length
);

// Events store
export const events: Writable<EventLog[]> = writable([]);

// Recordings store
export const recordings: Writable<Recording[]> = writable([]);

// Auth store
export interface AuthState {
	isAuthenticated: boolean;
	user: { id: string; username: string } | null;
}

export const auth: Writable<AuthState> = writable({
	isAuthenticated: false,
	user: null
});

// UI state
export interface UIState {
	sidebarOpen: boolean;
	darkMode: boolean;
	loading: boolean;
}

export const ui: Writable<UIState> = writable({
	sidebarOpen: true,
	darkMode: false,
	loading: false
});

// Toggle sidebar
export function toggleSidebar(): void {
	ui.update((state) => ({ ...state, sidebarOpen: !state.sidebarOpen }));
}

// Toggle dark mode
export function toggleDarkMode(): void {
	ui.update((state) => ({ ...state, darkMode: !state.darkMode }));
}

// Set loading state
export function setLoading(loading: boolean): void {
	ui.update((state) => ({ ...state, loading }));
}
