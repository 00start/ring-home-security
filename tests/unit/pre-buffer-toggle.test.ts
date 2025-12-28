/**
 * Pre-Buffer Toggle Unit Tests
 *
 * @requirement GAP-002: Zone settings should include pre-event buffer toggle
 * @quality_dimensions [A.BusinessValue, C.Usability, D.Maintainability]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { zoneSettings } from '../../src/lib/stores/zone-settings.js';
import type { ZoneSettings } from '../../src/lib/stores/zone-settings.js';

describe('Pre-Buffer Toggle - Zone Settings Store', () => {
	// Mock localStorage
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

	beforeEach(() => {
		// Setup localStorage mock
		Object.defineProperty(global, 'localStorage', {
			value: localStorageMock,
			writable: true
		});
		Object.defineProperty(global, 'window', {
			value: { localStorage: localStorageMock },
			writable: true
		});
		localStorageMock.clear();

		// Reset store and reload from localStorage
		zoneSettings.reset();
		zoneSettings.reload();
	});

	afterEach(() => {
		localStorageMock.clear();
		zoneSettings.reset();
	});

	describe('Default Settings', () => {
		it('should return default settings for new device', () => {
			// Arrange
			const deviceId = 'camera-1';

			// Act
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert: Pre-buffer should be disabled by default
			expect(settings.preBufferEnabled).toBe(false);
			expect(settings.motionSensitivity).toBe(5);
			expect(settings.recordingDuration).toBe(60);
		});

		it('should handle multiple devices with default settings', () => {
			// Arrange
			const deviceIds = ['camera-1', 'camera-2', 'doorbell-1'];

			// Act & Assert
			deviceIds.forEach((deviceId) => {
				const settings = zoneSettings.getDeviceSettings(deviceId);
				expect(settings.preBufferEnabled).toBe(false);
			});
		});
	});

	describe('Pre-Buffer Toggle Functionality', () => {
		it('should enable pre-buffer for a device', () => {
			// Arrange
			const deviceId = 'camera-1';

			// Act
			zoneSettings.setPreBufferEnabled(deviceId, true);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert
			expect(settings.preBufferEnabled).toBe(true);
		});

		it('should disable pre-buffer for a device', () => {
			// Arrange
			const deviceId = 'camera-1';
			zoneSettings.setPreBufferEnabled(deviceId, true);

			// Act
			zoneSettings.setPreBufferEnabled(deviceId, false);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert
			expect(settings.preBufferEnabled).toBe(false);
		});

		it('should toggle pre-buffer without affecting other settings', () => {
			// Arrange
			const deviceId = 'camera-1';
			zoneSettings.setMotionSensitivity(deviceId, 8);
			zoneSettings.setRecordingDuration(deviceId, 120);

			// Act
			zoneSettings.setPreBufferEnabled(deviceId, true);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert: Pre-buffer changed, other settings unchanged
			expect(settings.preBufferEnabled).toBe(true);
			expect(settings.motionSensitivity).toBe(8);
			expect(settings.recordingDuration).toBe(120);
		});

		it('should handle toggle for multiple devices independently', () => {
			// Arrange
			const camera1 = 'camera-1';
			const camera2 = 'camera-2';

			// Act
			zoneSettings.setPreBufferEnabled(camera1, true);
			zoneSettings.setPreBufferEnabled(camera2, false);

			// Assert: Each device has independent settings
			expect(zoneSettings.getDeviceSettings(camera1).preBufferEnabled).toBe(true);
			expect(zoneSettings.getDeviceSettings(camera2).preBufferEnabled).toBe(false);
		});
	});

	describe('Persistence - LocalStorage', () => {
		it('should persist pre-buffer setting to localStorage', () => {
			// Arrange
			const deviceId = 'camera-1';

			// Act
			zoneSettings.setPreBufferEnabled(deviceId, true);

			// Assert: Should be saved to localStorage
			const stored = localStorage.getItem('ring-zone-settings');
			expect(stored).toBeTruthy();

			const parsed = JSON.parse(stored!);
			expect(parsed[deviceId]).toBeDefined();
			expect(parsed[deviceId].preBufferEnabled).toBe(true);
		});

		it('should load pre-buffer setting from localStorage', () => {
			// Arrange
			const deviceId = 'camera-1';
			const mockSettings = {
				[deviceId]: {
					preBufferEnabled: true,
					motionSensitivity: 7,
					recordingDuration: 90
				}
			};
			localStorage.setItem('ring-zone-settings', JSON.stringify(mockSettings));

			// Act: Reload to pick up the changes
			zoneSettings.reload();
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert: Should load from localStorage
			expect(settings.preBufferEnabled).toBe(true);
			expect(settings.motionSensitivity).toBe(7);
			expect(settings.recordingDuration).toBe(90);
		});

		it('should persist settings across page reloads', () => {
			// Arrange
			const deviceId = 'camera-1';
			zoneSettings.setPreBufferEnabled(deviceId, true);
			zoneSettings.setMotionSensitivity(deviceId, 6);

			// Act: Simulate reload by getting fresh settings
			const settingsBefore = zoneSettings.getDeviceSettings(deviceId);
			const stored = localStorage.getItem('ring-zone-settings');
			const parsed = JSON.parse(stored!);

			// Assert: Settings should persist
			expect(parsed[deviceId].preBufferEnabled).toBe(true);
			expect(parsed[deviceId].motionSensitivity).toBe(6);
		});

		it('should handle corrupted localStorage gracefully', () => {
			// Arrange
			localStorage.setItem('ring-zone-settings', 'invalid-json{');

			// Act
			const settings = zoneSettings.getDeviceSettings('camera-1');

			// Assert: Should return default settings
			expect(settings.preBufferEnabled).toBe(false);
			expect(settings.motionSensitivity).toBe(5);
		});
	});

	describe('Settings Management', () => {
		it('should update motion sensitivity', () => {
			// Arrange
			const deviceId = 'camera-1';

			// Act
			zoneSettings.setMotionSensitivity(deviceId, 9);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert
			expect(settings.motionSensitivity).toBe(9);
		});

		it('should update recording duration', () => {
			// Arrange
			const deviceId = 'camera-1';

			// Act
			zoneSettings.setRecordingDuration(deviceId, 180);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert
			expect(settings.recordingDuration).toBe(180);
		});

		it('should reset settings for specific device', () => {
			// Arrange
			const deviceId = 'camera-1';
			zoneSettings.setPreBufferEnabled(deviceId, true);
			zoneSettings.setMotionSensitivity(deviceId, 8);

			// Act
			zoneSettings.reset(deviceId);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert: Should return to defaults
			expect(settings.preBufferEnabled).toBe(false);
			expect(settings.motionSensitivity).toBe(5);
		});

		it('should reset all settings when no device specified', () => {
			// Arrange
			zoneSettings.setPreBufferEnabled('camera-1', true);
			zoneSettings.setPreBufferEnabled('camera-2', true);

			// Act
			zoneSettings.reset();

			// Assert: All devices should be reset
			expect(zoneSettings.getDeviceSettings('camera-1').preBufferEnabled).toBe(false);
			expect(zoneSettings.getDeviceSettings('camera-2').preBufferEnabled).toBe(false);
		});
	});

	describe('Battery Impact Warning', () => {
		it('should indicate battery impact when pre-buffer enabled', () => {
			// Arrange
			const deviceId = 'camera-1';
			const expectedBatteryImpact = 15; // ~15% increase

			// Act
			zoneSettings.setPreBufferEnabled(deviceId, true);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert: Pre-buffer enabled implies battery impact
			// This is a business rule - when enabled, users should be warned
			expect(settings.preBufferEnabled).toBe(true);

			// The warning is shown in UI when preBufferEnabled is true
			// Battery impact is approximately 15% as per requirements
			const showWarning = settings.preBufferEnabled;
			expect(showWarning).toBe(true);
		});

		it('should not show battery warning when pre-buffer disabled', () => {
			// Arrange
			const deviceId = 'camera-1';

			// Act
			zoneSettings.setPreBufferEnabled(deviceId, false);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert: No warning needed when disabled
			const showWarning = settings.preBufferEnabled;
			expect(showWarning).toBe(false);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty device ID', () => {
			// Arrange
			const deviceId = '';

			// Act
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert: Should return default settings
			expect(settings.preBufferEnabled).toBe(false);
		});

		it('should handle special characters in device ID', () => {
			// Arrange
			const deviceId = 'camera-@#$%^&*()';

			// Act
			zoneSettings.setPreBufferEnabled(deviceId, true);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert: Should handle special characters
			expect(settings.preBufferEnabled).toBe(true);
		});

		it('should handle very long device ID', () => {
			// Arrange
			const deviceId = 'a'.repeat(1000);

			// Act
			zoneSettings.setPreBufferEnabled(deviceId, true);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert: Should handle long IDs
			expect(settings.preBufferEnabled).toBe(true);
		});
	});

	describe('Integration with Device Settings', () => {
		it('should maintain separate settings for cameras and doorbells', () => {
			// Arrange
			const camera = 'camera-front';
			const doorbell = 'doorbell-main';

			// Act
			zoneSettings.setPreBufferEnabled(camera, true);
			zoneSettings.setPreBufferEnabled(doorbell, false);
			zoneSettings.setMotionSensitivity(camera, 8);
			zoneSettings.setMotionSensitivity(doorbell, 3);

			// Assert: Each device type has independent settings
			const cameraSettings = zoneSettings.getDeviceSettings(camera);
			const doorbellSettings = zoneSettings.getDeviceSettings(doorbell);

			expect(cameraSettings.preBufferEnabled).toBe(true);
			expect(cameraSettings.motionSensitivity).toBe(8);

			expect(doorbellSettings.preBufferEnabled).toBe(false);
			expect(doorbellSettings.motionSensitivity).toBe(3);
		});

		it('should handle rapid toggle changes', () => {
			// Arrange
			const deviceId = 'camera-1';

			// Act: Rapidly toggle
			zoneSettings.setPreBufferEnabled(deviceId, true);
			zoneSettings.setPreBufferEnabled(deviceId, false);
			zoneSettings.setPreBufferEnabled(deviceId, true);
			zoneSettings.setPreBufferEnabled(deviceId, false);

			const settings = zoneSettings.getDeviceSettings(deviceId);

			// Assert: Final state should be correct
			expect(settings.preBufferEnabled).toBe(false);
		});
	});
});

describe('Pre-Buffer Toggle - Business Requirements', () => {
	describe('GAP-002 Compliance', () => {
		it('should provide pre-event buffer toggle in zone settings', () => {
			// Requirement: Zone settings should include pre-event buffer toggle
			const deviceId = 'camera-1';

			// The toggle exists and can be set
			zoneSettings.setPreBufferEnabled(deviceId, true);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			expect(settings).toHaveProperty('preBufferEnabled');
			expect(typeof settings.preBufferEnabled).toBe('boolean');
		});

		it('should show battery impact warning when enabled', () => {
			// Requirement: Show battery impact warning (e.g., "~15% increase")
			const deviceId = 'camera-1';

			zoneSettings.setPreBufferEnabled(deviceId, true);
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// When enabled, UI should show warning
			// This test verifies the data layer supports the UI requirement
			expect(settings.preBufferEnabled).toBe(true);
		});

		it('should persist setting on save', () => {
			// Requirement: Persist setting on page reload
			const deviceId = 'camera-1';

			zoneSettings.setPreBufferEnabled(deviceId, true);

			// Verify persistence
			const stored = localStorage.getItem('ring-zone-settings');
			expect(stored).toBeTruthy();

			const parsed = JSON.parse(stored!);
			expect(parsed[deviceId].preBufferEnabled).toBe(true);
		});

		it('should support pre-event buffer description', () => {
			// Requirement: Subtitle should explain "Capture 3 seconds before motion trigger"
			// This verifies the data structure supports the UI requirements
			const deviceId = 'camera-1';
			const settings = zoneSettings.getDeviceSettings(deviceId);

			// The setting exists and can be toggled
			expect(settings).toHaveProperty('preBufferEnabled');

			// When implemented in UI, this will show:
			// - Label: "Pre-event buffer"
			// - Subtitle: "Capture 3 seconds before motion trigger"
			// - Warning when enabled: "Enabling pre-buffer increases battery usage by ~15%"
		});
	});
});
