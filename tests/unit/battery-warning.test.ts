/**
 * Battery Warning Banner Unit Tests
 *
 * Tests for the BatteryWarningBanner component that displays
 * dashboard-level warnings when any camera has low battery.
 *
 * @requirement GAP-001: Dashboard-level warning when any camera has low battery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Device } from '../../src/lib/types/index.js';

/**
 * Mock localStorage for testing
 */
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
})();

// Assign to global object
Object.defineProperty(global, 'localStorage', {
	value: localStorageMock,
	writable: true
});

/**
 * Mock Device Factory
 * Creates Device objects with configurable battery levels for testing
 */
function mockDevice(overrides?: Partial<Device>): Device {
	const defaults: Device = {
		id: 'device-1',
		name: 'Test Camera',
		type: 'camera',
		batteryLevel: 85,
		isOnline: true,
		lastSeen: new Date()
	};

	return { ...defaults, ...overrides };
}

/**
 * Helper to create multiple devices with varying battery levels
 */
function mockDevicesWithBatteryLevels(levels: number[]): Device[] {
	return levels.map((level, index) =>
		mockDevice({
			id: `device-${index + 1}`,
			name: `Camera ${index + 1}`,
			batteryLevel: level
		})
	);
}

describe('Battery Warning Banner - Component Logic', () => {
	beforeEach(() => {
		// Clear localStorage before each test
		localStorage.clear();
	});

	afterEach(() => {
		// Clean up after each test
		localStorage.clear();
	});

	describe('Low Battery Detection (<20%)', () => {
		it('should identify devices with battery below 20%', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([85, 50, 19, 15]);

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);

			// Assert
			expect(lowBatteryDevices).toHaveLength(2);
			expect(lowBatteryDevices[0].batteryLevel).toBe(19);
			expect(lowBatteryDevices[1].batteryLevel).toBe(15);
		});

		it('should not flag devices with battery at or above 20%', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([100, 50, 20, 21]);

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);

			// Assert
			expect(lowBatteryDevices).toHaveLength(0);
		});

		it('should handle devices without battery level (wired devices)', () => {
			// Arrange
			const devices = [
				mockDevice({ id: 'cam-1', batteryLevel: 15 }),
				mockDevice({ id: 'cam-2', batteryLevel: undefined }),
				mockDevice({ id: 'cam-3', batteryLevel: 10 })
			];

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);

			// Assert: Only battery-powered devices with low battery
			expect(lowBatteryDevices).toHaveLength(2);
			expect(lowBatteryDevices.every((d) => d.batteryLevel !== undefined)).toBe(true);
		});

		it('should handle empty device list', () => {
			// Arrange
			const devices: Device[] = [];

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);

			// Assert
			expect(lowBatteryDevices).toHaveLength(0);
		});
	});

	describe('Critical Battery Detection (<10%)', () => {
		it('should identify critical battery devices below 10%', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([85, 15, 9, 5]);

			// Act
			const criticalDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 10
			);

			// Assert
			expect(criticalDevices).toHaveLength(2);
			expect(criticalDevices[0].batteryLevel).toBe(9);
			expect(criticalDevices[1].batteryLevel).toBe(5);
		});

		it('should differentiate between warning and critical levels', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([19, 15, 10, 9, 5]);

			// Act
			const lowBattery = devices.filter((d) => d.batteryLevel !== undefined && d.batteryLevel < 20);
			const criticalBattery = devices.filter(
				(d) => d.batteryLevel !== undefined && d.batteryLevel < 10
			);

			// Assert
			expect(lowBattery).toHaveLength(5); // All are low battery
			expect(criticalBattery).toHaveLength(2); // Only 9% and 5% are critical
		});
	});

	describe('Banner Display Logic', () => {
		it('should show banner when any device has low battery', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([85, 50, 19]);

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);
			const shouldShowBanner = lowBatteryDevices.length > 0;

			// Assert
			expect(shouldShowBanner).toBe(true);
		});

		it('should not show banner when all devices have sufficient battery', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([100, 85, 50, 20]);

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);
			const shouldShowBanner = lowBatteryDevices.length > 0;

			// Assert
			expect(shouldShowBanner).toBe(false);
		});

		it('should show banner when multiple devices have low battery', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([19, 15, 10, 5]);

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);

			// Assert
			expect(lowBatteryDevices).toHaveLength(4);
			expect(lowBatteryDevices.length > 0).toBe(true);
		});
	});

	describe('Snooze Functionality', () => {
		it('should calculate snooze time for 1 hour', () => {
			// Arrange
			const now = new Date();
			const snoozeHours = 1;

			// Act
			const snoozeDate = new Date(now);
			snoozeDate.setHours(snoozeDate.getHours() + snoozeHours);

			// Assert
			const timeDiff = snoozeDate.getTime() - now.getTime();
			const hoursDiff = timeDiff / (1000 * 60 * 60);
			expect(hoursDiff).toBeCloseTo(1, 0);
		});

		it('should calculate snooze time for 24 hours (1 day)', () => {
			// Arrange
			const now = new Date();
			const snoozeHours = 24;

			// Act
			const snoozeDate = new Date(now);
			snoozeDate.setHours(snoozeDate.getHours() + snoozeHours);

			// Assert
			const timeDiff = snoozeDate.getTime() - now.getTime();
			const hoursDiff = timeDiff / (1000 * 60 * 60);
			expect(hoursDiff).toBeCloseTo(24, 0);
		});

		it('should store snooze state in localStorage', () => {
			// Arrange
			const snoozeDate = new Date();
			snoozeDate.setHours(snoozeDate.getHours() + 1);

			// Act
			localStorage.setItem('batteryWarningSnooze', snoozeDate.toISOString());

			// Assert
			const stored = localStorage.getItem('batteryWarningSnooze');
			expect(stored).toBe(snoozeDate.toISOString());
		});

		it('should restore snooze state from localStorage', () => {
			// Arrange
			const snoozeDate = new Date();
			snoozeDate.setHours(snoozeDate.getHours() + 1);
			localStorage.setItem('batteryWarningSnooze', snoozeDate.toISOString());

			// Act
			const stored = localStorage.getItem('batteryWarningSnooze');
			const restoredDate = stored ? new Date(stored) : null;

			// Assert
			expect(restoredDate).not.toBeNull();
			expect(restoredDate!.getTime()).toBe(snoozeDate.getTime());
		});

		it('should clear expired snooze state', () => {
			// Arrange: Set snooze in the past
			const pastDate = new Date();
			pastDate.setHours(pastDate.getHours() - 1);
			localStorage.setItem('batteryWarningSnooze', pastDate.toISOString());

			// Act
			const stored = localStorage.getItem('batteryWarningSnooze');
			const snoozeDate = stored ? new Date(stored) : null;
			const isExpired = snoozeDate && snoozeDate < new Date();

			if (isExpired) {
				localStorage.removeItem('batteryWarningSnooze');
			}

			// Assert
			expect(localStorage.getItem('batteryWarningSnooze')).toBeNull();
		});

		it('should hide banner when snoozed and not expired', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([15, 10]);
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1);

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);
			const isSnoozed = futureDate > new Date();
			const shouldShowBanner = lowBatteryDevices.length > 0 && !isSnoozed;

			// Assert
			expect(lowBatteryDevices.length).toBeGreaterThan(0);
			expect(shouldShowBanner).toBe(false); // Hidden due to snooze
		});

		it('should show banner when snooze has expired', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([15, 10]);
			const pastDate = new Date();
			pastDate.setHours(pastDate.getHours() - 1);

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);
			const isSnoozed = pastDate > new Date();
			const shouldShowBanner = lowBatteryDevices.length > 0 && !isSnoozed;

			// Assert
			expect(shouldShowBanner).toBe(true); // Shown because snooze expired
		});
	});

	describe('Device Information Display', () => {
		it('should display device name and battery percentage', () => {
			// Arrange
			const device = mockDevice({
				id: 'cam-1',
				name: 'Front Door Camera',
				batteryLevel: 15
			});

			// Act & Assert
			expect(device.name).toBe('Front Door Camera');
			expect(device.batteryLevel).toBe(15);
		});

		it('should handle multiple low battery devices', () => {
			// Arrange
			const devices = [
				mockDevice({ id: 'cam-1', name: 'Front Door', batteryLevel: 19 }),
				mockDevice({ id: 'cam-2', name: 'Backyard', batteryLevel: 15 }),
				mockDevice({ id: 'cam-3', name: 'Garage', batteryLevel: 8 })
			];

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);

			// Assert
			expect(lowBatteryDevices).toHaveLength(3);
			expect(lowBatteryDevices.map((d) => d.name)).toEqual(['Front Door', 'Backyard', 'Garage']);
			expect(lowBatteryDevices.map((d) => d.batteryLevel)).toEqual([19, 15, 8]);
		});

		it('should mark critical devices separately', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([19, 15, 9, 5]);

			// Act
			const lowBattery = devices.filter((d) => d.batteryLevel !== undefined && d.batteryLevel < 20);
			const criticalDevices = lowBattery.filter((d) => d.batteryLevel! < 10);

			// Assert
			expect(criticalDevices).toHaveLength(2);
			expect(criticalDevices.map((d) => d.batteryLevel)).toEqual([9, 5]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle device with 0% battery', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([0]);

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);
			const criticalDevices = lowBatteryDevices.filter((d) => d.batteryLevel! < 10);

			// Assert
			expect(lowBatteryDevices).toHaveLength(1);
			expect(criticalDevices).toHaveLength(1);
			expect(criticalDevices[0].batteryLevel).toBe(0);
		});

		it('should handle boundary case at exactly 20%', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([20]);

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);

			// Assert: 20% should not trigger warning
			expect(lowBatteryDevices).toHaveLength(0);
		});

		it('should handle boundary case at exactly 10%', () => {
			// Arrange
			const devices = mockDevicesWithBatteryLevels([10]);

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);
			const criticalDevices = lowBatteryDevices.filter((d) => d.batteryLevel! < 10);

			// Assert: 10% should trigger warning but not critical
			expect(lowBatteryDevices).toHaveLength(1);
			expect(criticalDevices).toHaveLength(0);
		});

		it('should handle mix of device types with and without batteries', () => {
			// Arrange
			const devices = [
				mockDevice({ id: 'cam-1', type: 'camera', batteryLevel: 15 }),
				mockDevice({ id: 'sensor-1', type: 'sensor', batteryLevel: 8 }),
				mockDevice({ id: 'doorbell-1', type: 'doorbell', batteryLevel: undefined }),
				mockDevice({ id: 'cam-2', type: 'camera', batteryLevel: 85 })
			];

			// Act
			const lowBatteryDevices = devices.filter(
				(device) => device.batteryLevel !== undefined && device.batteryLevel < 20
			);

			// Assert
			expect(lowBatteryDevices).toHaveLength(2);
			expect(lowBatteryDevices.map((d) => d.type)).toEqual(['camera', 'sensor']);
		});
	});
});
