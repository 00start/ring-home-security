import { test, expect } from '@playwright/test';

/**
 * User Story Tests: Dashboard (Epic 1 - Real-Time Monitoring)
 *
 * @story US-1.1
 * @epic Real-Time Monitoring
 * @priority P0
 * @quality_dimensions [B.UserExperience, C.Responsiveness, E.Usability]
 */
test.describe('US-1.1: Dashboard Camera View', () => {
	test.describe('Acceptance Criteria', () => {
		test('AC1: Dashboard loads within 2 seconds', async ({ page }) => {
			const startTime = Date.now();

			await page.goto('/');

			// Wait for dashboard content
			await page.waitForSelector('[data-testid="dashboard"]');

			const elapsed = Date.now() - startTime;

			// Assert: Load time under 2 seconds
			expect(elapsed).toBeLessThan(2000);
		});

		test('AC2: All cameras displayed with status indicators', async ({ page }) => {
			await page.goto('/');

			// Wait for cameras to load
			await page.waitForSelector('[data-testid="camera-card"]');

			// Get all camera cards
			const cameras = page.locator('[data-testid="camera-card"]');
			const count = await cameras.count();

			// Assert: At least one camera displayed
			expect(count).toBeGreaterThan(0);

			// Assert: Each camera has status indicator
			for (let i = 0; i < count; i++) {
				const camera = cameras.nth(i);
				const statusIndicator = camera.locator('[data-testid="status-indicator"]');
				await expect(statusIndicator).toBeVisible();
			}
		});

		test('AC3: Battery levels visible for each camera', async ({ page }) => {
			await page.goto('/');

			await page.waitForSelector('[data-testid="camera-card"]');

			const cameras = page.locator('[data-testid="camera-card"]');
			const count = await cameras.count();

			for (let i = 0; i < count; i++) {
				const camera = cameras.nth(i);
				// Battery level should be visible (or "Wired" indicator for AC-powered)
				const batteryOrWired = camera.locator(
					'[data-testid="battery-level"], [data-testid="wired-indicator"]'
				);
				await expect(batteryOrWired).toBeVisible();
			}
		});
	});

	test.describe('Quality: User Experience', () => {
		test('shows loading skeleton while fetching cameras', async ({ page }) => {
			// Slow down network to see loading state
			await page.route('**/api/devices**', async (route) => {
				await new Promise((r) => setTimeout(r, 500));
				await route.continue();
			});

			await page.goto('/');

			// Assert: Loading skeleton visible
			const skeleton = page.locator('[data-testid="camera-skeleton"]');
			await expect(skeleton.first()).toBeVisible();

			// Wait for actual content
			await page.waitForSelector('[data-testid="camera-card"]');
		});

		test('displays friendly error when API fails', async ({ page }) => {
			// Mock API failure
			await page.route('**/api/devices**', (route) => {
				route.fulfill({ status: 500, body: 'Server Error' });
			});

			await page.goto('/');

			// Assert: Error message displayed
			const error = page.locator('[data-testid="error-message"]');
			await expect(error).toBeVisible();
		});
	});

	test.describe('Quality: Usability', () => {
		test('cameras are accessible via keyboard navigation', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="camera-card"]');

			// Tab to first camera
			await page.keyboard.press('Tab');
			await page.keyboard.press('Tab'); // May need multiple tabs

			// Assert: Camera is focused
			const focused = await page.evaluate(() =>
				document.activeElement?.getAttribute('data-testid')
			);
			expect(['camera-card', 'camera-link']).toContain(focused);
		});
	});
});

/**
 * @story US-1.2
 * @epic Real-Time Monitoring
 * @priority P0
 * @quality_dimensions [B.UserExperience, C.Responsiveness, E.Usability]
 */
test.describe('US-1.2: Live View', () => {
	test.describe('Acceptance Criteria', () => {
		test('AC1: Live view starts within 3 seconds', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="camera-card"]');

			// Click first camera
			await page.click('[data-testid="camera-card"]:first-child');

			const startTime = Date.now();

			// Click live view button
			await page.click('[data-testid="live-view-button"]');

			// Wait for video to start playing
			await page.waitForSelector('video[data-playing="true"]', { timeout: 5000 });

			const elapsed = Date.now() - startTime;

			// Assert: Started within 3 seconds
			expect(elapsed).toBeLessThan(3000);
		});

		test('AC2: Video streams at minimum 720p', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="camera-card"]');
			await page.click('[data-testid="camera-card"]:first-child');
			await page.click('[data-testid="live-view-button"]');

			// Wait for video element
			const video = page.locator('video');
			await video.waitFor({ state: 'visible' });

			// Get video dimensions
			const height = await video.evaluate((v: HTMLVideoElement) => v.videoHeight);

			// Assert: At least 720p
			expect(height).toBeGreaterThanOrEqual(720);
		});

		test('AC3: Audio is included', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('[data-testid="camera-card"]');
			await page.click('[data-testid="camera-card"]:first-child');
			await page.click('[data-testid="live-view-button"]');

			const video = page.locator('video');
			await video.waitFor({ state: 'visible' });

			// Check audio is not muted
			const audioEnabled = await video.evaluate((v: HTMLVideoElement) => !v.muted);

			expect(audioEnabled).toBe(true);
		});

		test('AC4: Battery warning shown if <20%', async ({ page }) => {
			// This test would require a camera with low battery
			await page.goto('/');

			// Look for low battery camera
			const lowBattery = page.locator('[data-testid="camera-card"][data-battery-low="true"]');

			if ((await lowBattery.count()) > 0) {
				await lowBattery.first().click();
				await page.click('[data-testid="live-view-button"]');

				// Assert: Warning visible
				await expect(page.locator('[data-testid="battery-warning-banner"]')).toBeVisible();
			} else {
				test.skip(true, 'No low battery cameras available');
			}
		});
	});
});

/**
 * @story US-1.3
 * @epic Real-Time Monitoring
 * @priority P0
 */
test.describe('US-1.3: Camera Online/Offline Status', () => {
	test('AC1: Online cameras show green indicator', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('[data-testid="camera-card"]');

		const onlineCamera = page.locator('[data-testid="camera-card"][data-status="online"]');

		if ((await onlineCamera.count()) > 0) {
			const indicator = onlineCamera.first().locator('[data-testid="status-indicator"]');
			const color = await indicator.evaluate((el) => getComputedStyle(el).backgroundColor);

			// Assert: Green color (various shades)
			expect(color).toMatch(/rgb\((0|34|22), (1\d{2}|2[0-4]\d|25[0-5]), (0|34|22)\)/);
		}
	});

	test('AC2: Offline cameras show red indicator', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('[data-testid="camera-card"]');

		const offlineCamera = page.locator('[data-testid="camera-card"][data-status="offline"]');

		if ((await offlineCamera.count()) > 0) {
			const indicator = offlineCamera.first().locator('[data-testid="status-indicator"]');
			const color = await indicator.evaluate((el) => getComputedStyle(el).backgroundColor);

			// Assert: Red color
			expect(color).toMatch(/rgb\((1\d{2}|2[0-4]\d|25[0-5]), (0|\d{1,2}), (0|\d{1,2})\)/);
		} else {
			test.skip(true, 'No offline cameras available');
		}
	});

	test('AC3: Last seen timestamp for offline cameras', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('[data-testid="camera-card"]');

		const offlineCamera = page.locator('[data-testid="camera-card"][data-status="offline"]');

		if ((await offlineCamera.count()) > 0) {
			const lastSeen = offlineCamera.first().locator('[data-testid="last-seen"]');
			await expect(lastSeen).toBeVisible();
		} else {
			test.skip(true, 'No offline cameras available');
		}
	});
});
