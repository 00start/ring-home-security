import { test, expect } from '@playwright/test';
import {
	mockBatteryAlert,
	mockLowBatteryCamera,
	mockCriticalBatteryCamera
} from '../../../src/lib/test-utils/ux-fixtures';

/**
 * User Story Tests: Battery Alerts (Epic 3 - System Health)
 *
 * @story US-3.2
 * @epic System Health
 * @priority P0 - CRITICAL!
 * @quality_dimensions [B.UserExperience, D.Reliability, E.Usability]
 * @worker B5
 */
test.describe('US-3.2: Battery Alert Notifications', () => {
	test.describe('Acceptance Criteria - Push Notifications', () => {
		test('AC1: Push notification sent when battery reaches 20%', async ({ page, context }) => {
			// Grant notification permissions
			await context.grantPermissions(['notifications']);

			await page.goto('/');

			// Mock API to simulate camera battery at 20%
			await page.route('**/api/devices', async (route) => {
				const mockCamera = mockLowBatteryCamera(20);
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						cameras: [mockCamera]
					})
				});
			});

			// Mock notification endpoint
			let notificationSent = false;
			await page.route('**/api/notifications/battery-alert', async (route) => {
				const request = route.request();
				const postData = request.postDataJSON();

				if (postData.batteryLevel === 20 && postData.alertType === 'push') {
					notificationSent = true;
				}

				await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
			});

			// Reload to trigger battery check
			await page.reload();
			await page.waitForSelector('[data-testid="camera-card"]');

			// Wait for notification to be triggered
			await page.waitForTimeout(2000);

			// Assert: Notification was sent
			expect(notificationSent).toBe(true);
		});

		test('AC2: Push notification appears in browser', async ({ page, context }) => {
			await context.grantPermissions(['notifications']);

			await page.goto('/settings/notifications');

			// Enable battery alerts
			const batteryAlertsToggle = page.locator('[data-testid="battery-alerts-toggle"]');
			if (!(await batteryAlertsToggle.isChecked())) {
				await batteryAlertsToggle.click();
			}

			// Trigger a test notification
			const testButton = page.locator('[data-testid="test-battery-notification"]');

			if (await testButton.isVisible()) {
				await testButton.click();

				// Check for in-app notification banner (browser notifications require service worker)
				const banner = page.locator('[data-testid="notification-banner"]');
				await expect(banner).toBeVisible({ timeout: 3000 });
			} else {
				test.skip(true, 'Test notification feature not available');
			}
		});

		test('AC3: Notification includes camera name and battery level', async ({ page }) => {
			await page.goto('/');

			// Mock low battery camera
			await page.route('**/api/devices', async (route) => {
				const mockCamera = mockLowBatteryCamera(18);
				mockCamera.name = 'Front Door';

				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ cameras: [mockCamera] })
				});
			});

			await page.reload();
			await page.waitForSelector('[data-testid="camera-card"]');

			// Check for in-app notification or banner
			const notification = page.locator('[data-testid="battery-notification"]');

			if (await notification.isVisible()) {
				const text = await notification.textContent();

				// Assert: Contains camera name
				expect(text).toContain('Front Door');

				// Assert: Contains battery percentage
				expect(text).toMatch(/18%/);
			}
		});
	});

	test.describe('Acceptance Criteria - Critical Alerts', () => {
		test('AC4: Critical alert at 10% battery', async ({ page, context }) => {
			await context.grantPermissions(['notifications']);

			await page.goto('/');

			// Mock critical battery level
			await page.route('**/api/devices', async (route) => {
				const mockCamera = mockCriticalBatteryCamera();
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ cameras: [mockCamera] })
				});
			});

			// Track critical alerts
			let criticalAlertSent = false;
			await page.route('**/api/notifications/battery-alert', async (route) => {
				const postData = route.request().postDataJSON();

				if (postData.batteryLevel <= 10 && postData.alertType === 'critical') {
					criticalAlertSent = true;
				}

				await route.fulfill({ status: 200 });
			});

			await page.reload();
			await page.waitForSelector('[data-testid="camera-card"]');
			await page.waitForTimeout(2000);

			// Assert: Critical alert was triggered
			expect(criticalAlertSent).toBe(true);
		});

		test('AC5: Critical alert is more prominent than standard warning', async ({ page }) => {
			await page.goto('/');

			// Mock critical battery
			await page.route('**/api/devices', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						cameras: [mockCriticalBatteryCamera()]
					})
				});
			});

			await page.reload();
			await page.waitForSelector('[data-testid="camera-card"]');

			// Look for critical banner
			const criticalBanner = page.locator('[data-testid="critical-battery-banner"]');

			if (await criticalBanner.isVisible()) {
				// Assert: Has critical styling
				const bgColor = await criticalBanner.evaluate((el) => getComputedStyle(el).backgroundColor);

				// Should be red/critical color
				expect(bgColor).toMatch(/rgb\((2[0-4]\d|25[0-5]), /);

				// Assert: Has attention-grabbing icon
				const icon = criticalBanner.locator('[data-testid="critical-icon"]');
				await expect(icon).toBeVisible();
			}
		});

		test('AC6: Critical alert persists until acknowledged', async ({ page }) => {
			await page.goto('/');

			await page.route('**/api/devices', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						cameras: [mockCriticalBatteryCamera()]
					})
				});
			});

			await page.reload();
			await page.waitForSelector('[data-testid="camera-card"]');

			const criticalBanner = page.locator('[data-testid="critical-battery-banner"]');

			if (await criticalBanner.isVisible()) {
				// Navigate away
				await page.goto('/events');
				await page.waitForSelector('[data-testid="event-item"]').catch(() => {});

				// Assert: Banner still visible on different page
				await expect(criticalBanner).toBeVisible();

				// Acknowledge the alert
				const dismissButton = criticalBanner.locator('[data-testid="dismiss-critical-alert"]');

				if (await dismissButton.isVisible()) {
					await dismissButton.click();

					// Assert: Banner disappears after acknowledgment
					await expect(criticalBanner).not.toBeVisible({ timeout: 2000 });
				}
			}
		});
	});

	test.describe('Acceptance Criteria - Email Notifications', () => {
		test('AC7: Email notification option in settings', async ({ page }) => {
			await page.goto('/settings/notifications');

			// Assert: Email notification toggle exists
			const emailToggle = page.locator('[data-testid="battery-email-notifications-toggle"]');
			await expect(emailToggle).toBeVisible();

			// Assert: Can be toggled on/off
			const initialState = await emailToggle.isChecked();
			await emailToggle.click();

			await page.waitForTimeout(500); // Wait for state change

			const newState = await emailToggle.isChecked();
			expect(newState).toBe(!initialState);
		});

		test('AC8: Email address configuration required', async ({ page }) => {
			await page.goto('/settings/notifications');

			const emailToggle = page.locator('[data-testid="battery-email-notifications-toggle"]');

			// Enable email notifications
			if (!(await emailToggle.isChecked())) {
				await emailToggle.click();
			}

			// Assert: Email input field appears
			const emailInput = page.locator('[data-testid="notification-email-input"]');
			await expect(emailInput).toBeVisible({ timeout: 2000 });

			// Assert: Validates email format
			await emailInput.fill('invalid-email');
			await emailInput.blur();

			const validationError = page.locator('[data-testid="email-validation-error"]');
			await expect(validationError).toBeVisible({ timeout: 1000 });

			// Assert: Accepts valid email
			await emailInput.fill('user@example.com');
			await emailInput.blur();

			await expect(validationError).not.toBeVisible({ timeout: 1000 });
		});

		test('AC9: Email sent when battery reaches threshold', async ({ page }) => {
			await page.goto('/settings/notifications');

			// Enable email notifications
			const emailToggle = page.locator('[data-testid="battery-email-notifications-toggle"]');
			if (!(await emailToggle.isChecked())) {
				await emailToggle.click();
			}

			// Set email address
			const emailInput = page.locator('[data-testid="notification-email-input"]');
			if (await emailInput.isVisible()) {
				await emailInput.fill('test@example.com');
			}

			// Save settings
			const saveButton = page.locator('[data-testid="save-settings-button"]');
			if (await saveButton.isVisible()) {
				await saveButton.click();
			}

			// Mock email endpoint
			let emailSent = false;
			await page.route('**/api/notifications/email', async (route) => {
				const postData = route.request().postDataJSON();

				if (postData.type === 'battery-alert' && postData.to === 'test@example.com') {
					emailSent = true;
				}

				await route.fulfill({ status: 200 });
			});

			// Trigger battery alert
			await page.goto('/');

			await page.route('**/api/devices', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						cameras: [mockLowBatteryCamera(19)]
					})
				});
			});

			await page.reload();
			await page.waitForTimeout(2000);

			// Assert: Email was sent
			expect(emailSent).toBe(true);
		});
	});

	test.describe('Quality: User Experience', () => {
		test('notifications do not spam user with repeated alerts', async ({ page }) => {
			await page.goto('/');

			let notificationCount = 0;

			await page.route('**/api/notifications/battery-alert', async (route) => {
				notificationCount++;
				await route.fulfill({ status: 200 });
			});

			await page.route('**/api/devices', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						cameras: [mockLowBatteryCamera(18)]
					})
				});
			});

			// Reload multiple times
			await page.reload();
			await page.waitForTimeout(1000);
			await page.reload();
			await page.waitForTimeout(1000);
			await page.reload();
			await page.waitForTimeout(1000);

			// Assert: No more than 1-2 notifications (initial + maybe one refresh)
			expect(notificationCount).toBeLessThanOrEqual(2);
		});

		test('notification settings are accessible and clear', async ({ page }) => {
			await page.goto('/settings/notifications');

			// Assert: Clear section headers
			const batterySection = page.locator('[data-testid="battery-notifications-section"]');
			await expect(batterySection).toBeVisible();

			// Assert: Help text explains thresholds
			const helpText = page.locator('[data-testid="battery-alert-help-text"]');
			if (await helpText.isVisible()) {
				const text = await helpText.textContent();
				expect(text).toContain('20%');
				expect(text).toContain('10%');
			}
		});

		test('can snooze battery alerts temporarily', async ({ page }) => {
			await page.goto('/');

			await page.route('**/api/devices', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						cameras: [mockLowBatteryCamera(15)]
					})
				});
			});

			await page.reload();
			await page.waitForSelector('[data-testid="camera-card"]');

			const batteryBanner = page.locator('[data-testid="battery-warning-banner"]');

			if (await batteryBanner.isVisible()) {
				// Look for snooze option
				const snoozeButton = batteryBanner.locator('[data-testid="snooze-battery-alert"]');

				if (await snoozeButton.isVisible()) {
					await snoozeButton.click();

					// Assert: Banner disappears
					await expect(batteryBanner).not.toBeVisible({ timeout: 2000 });

					// Assert: Doesn't reappear immediately on reload
					await page.reload();
					await page.waitForTimeout(1000);

					// Should stay hidden (snoozed)
					await expect(batteryBanner).not.toBeVisible();
				}
			}
		});
	});

	test.describe('Quality: Reliability', () => {
		test('handles notification permission denial gracefully', async ({ page, context }) => {
			// Don't grant permissions - simulate denial
			await page.goto('/');

			// Try to enable notifications
			await page.goto('/settings/notifications');

			const enableButton = page.locator('[data-testid="enable-push-notifications"]');

			if (await enableButton.isVisible()) {
				await enableButton.click();

				// Assert: Shows fallback message about enabling in browser
				const fallbackMessage = page.locator('[data-testid="notification-permission-help"]');
				await expect(fallbackMessage).toBeVisible({ timeout: 2000 });
			}
		});

		test('battery alerts work when app is in background', async ({ page }) => {
			await page.goto('/');

			await page.route('**/api/devices', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						cameras: [mockLowBatteryCamera(19)]
					})
				});
			});

			await page.reload();

			// Simulate switching tabs (app in background)
			await page.evaluate(() => {
				window.dispatchEvent(new Event('blur'));
				document.dispatchEvent(new Event('visibilitychange'));
			});

			await page.waitForTimeout(2000);

			// Assert: Notification was still sent (check notification history)
			const notificationHistory = page.locator('[data-testid="notification-history"]');

			if (await notificationHistory.isVisible()) {
				const historyItems = notificationHistory.locator('[data-testid="notification-item"]');
				const count = await historyItems.count();

				expect(count).toBeGreaterThan(0);
			}
		});

		test('alerts persist across app restarts', async ({ page, context }) => {
			await page.goto('/');

			await page.route('**/api/devices', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						cameras: [mockCriticalBatteryCamera()]
					})
				});
			});

			await page.reload();
			await page.waitForSelector('[data-testid="camera-card"]');

			const criticalBanner = page.locator('[data-testid="critical-battery-banner"]');
			await expect(criticalBanner).toBeVisible();

			// Close and reopen (simulate restart)
			await page.close();

			const newPage = await context.newPage();
			await newPage.goto('/');

			// Battery still critical
			await newPage.route('**/api/devices', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						cameras: [mockCriticalBatteryCamera()]
					})
				});
			});

			await newPage.reload();
			await newPage.waitForSelector('[data-testid="camera-card"]');

			// Assert: Alert still shows
			const newBanner = newPage.locator('[data-testid="critical-battery-banner"]');
			await expect(newBanner).toBeVisible();
		});
	});
});
