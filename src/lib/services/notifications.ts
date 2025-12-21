/**
 * Browser Notifications Service
 *
 * Handles browser push notifications for Ring events.
 * Uses the Web Notifications API for native OS notifications.
 */

import type { EventLog, EventType } from '$lib/types';

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface NotificationOptions {
	body?: string;
	icon?: string;
	tag?: string;
	requireInteraction?: boolean;
	silent?: boolean;
}

// Event type display configuration
const EVENT_CONFIG: Record<EventType, { title: string; icon: string; sound: boolean }> = {
	ding: {
		title: 'Doorbell Ring',
		icon: '/icons/doorbell.png',
		sound: true
	},
	motion: {
		title: 'Motion Detected',
		icon: '/icons/motion.png',
		sound: false
	},
	door_open: {
		title: 'Door Opened',
		icon: '/icons/door-open.png',
		sound: true
	},
	door_close: {
		title: 'Door Closed',
		icon: '/icons/door-close.png',
		sound: false
	},
	device_offline: {
		title: 'Device Offline',
		icon: '/icons/offline.png',
		sound: true
	},
	device_online: {
		title: 'Device Online',
		icon: '/icons/online.png',
		sound: false
	}
};

class NotificationService {
	private permission: NotificationPermission = 'default';
	private audioContext: AudioContext | null = null;

	constructor() {
		if (typeof window !== 'undefined' && 'Notification' in window) {
			this.permission = Notification.permission as NotificationPermission;
		}
	}

	/**
	 * Check if notifications are supported
	 */
	isSupported(): boolean {
		return typeof window !== 'undefined' && 'Notification' in window;
	}

	/**
	 * Get current permission status
	 */
	getPermission(): NotificationPermission {
		if (!this.isSupported()) return 'denied';
		return Notification.permission as NotificationPermission;
	}

	/**
	 * Request notification permission from user
	 */
	async requestPermission(): Promise<NotificationPermission> {
		if (!this.isSupported()) {
			return 'denied';
		}

		try {
			const result = await Notification.requestPermission();
			this.permission = result as NotificationPermission;
			return this.permission;
		} catch {
			return 'denied';
		}
	}

	/**
	 * Show a notification for an event
	 */
	showEventNotification(event: EventLog, options?: { playSound?: boolean }): void {
		if (!this.isSupported() || this.permission !== 'granted') {
			return;
		}

		const config = EVENT_CONFIG[event.eventType];
		const title = `${config.title} - ${event.deviceName}`;
		const body = this.getEventBody(event);

		const notification = new Notification(title, {
			body,
			icon: config.icon,
			tag: `ring-event-${event.id}`,
			requireInteraction: event.eventType === 'ding',
			silent: !options?.playSound
		});

		// Handle notification click
		notification.onclick = () => {
			window.focus();
			// Navigate to events page or specific event
			if (event.recordingId) {
				window.location.href = `/recordings?id=${event.recordingId}`;
			} else {
				window.location.href = '/events';
			}
			notification.close();
		};

		// Auto-close after 10 seconds (unless requireInteraction)
		if (event.eventType !== 'ding') {
			setTimeout(() => notification.close(), 10000);
		}

		// Play sound if enabled
		if (options?.playSound && config.sound) {
			this.playNotificationSound(event.eventType);
		}
	}

	/**
	 * Show a custom notification
	 */
	show(title: string, options?: NotificationOptions): Notification | null {
		if (!this.isSupported() || this.permission !== 'granted') {
			return null;
		}

		return new Notification(title, options);
	}

	/**
	 * Generate notification body text
	 */
	private getEventBody(event: EventLog): string {
		const time = new Date(event.timestamp).toLocaleTimeString();

		switch (event.eventType) {
			case 'ding':
				return `Someone is at the ${event.deviceName} - ${time}`;
			case 'motion':
				return `Motion detected at ${event.deviceName} - ${time}`;
			case 'door_open':
				return `${event.deviceName} was opened - ${time}`;
			case 'door_close':
				return `${event.deviceName} was closed - ${time}`;
			case 'device_offline':
				return `${event.deviceName} went offline - ${time}`;
			case 'device_online':
				return `${event.deviceName} is back online - ${time}`;
			default:
				return `Event at ${event.deviceName} - ${time}`;
		}
	}

	/**
	 * Play notification sound
	 */
	private playNotificationSound(eventType: EventType): void {
		try {
			// Use Web Audio API for reliable audio playback
			if (!this.audioContext) {
				this.audioContext = new AudioContext();
			}

			// Generate a simple chime sound
			const oscillator = this.audioContext.createOscillator();
			const gainNode = this.audioContext.createGain();

			oscillator.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			// Different sounds for different events
			if (eventType === 'ding') {
				// Doorbell sound: two-tone chime
				oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
				oscillator.frequency.setValueAtTime(660, this.audioContext.currentTime + 0.15);
				gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
				oscillator.start(this.audioContext.currentTime);
				oscillator.stop(this.audioContext.currentTime + 0.4);
			} else {
				// Alert sound: single tone
				oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
				gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
				oscillator.start(this.audioContext.currentTime);
				oscillator.stop(this.audioContext.currentTime + 0.2);
			}
		} catch {
			// Audio playback failed, ignore
		}
	}
}

// Singleton instance
export const notificationService = new NotificationService();
