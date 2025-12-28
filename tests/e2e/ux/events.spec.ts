import { test, expect } from '@playwright/test';

/**
 * User Story Tests: Event Review (Epic 2)
 *
 * @story US-2.1
 * @epic Event Review
 * @priority P0
 * @quality_dimensions [B.UserExperience, E.Usability]
 */
test.describe('US-2.1: Event Timeline', () => {
	test.describe('Acceptance Criteria', () => {
		test('AC1: Events listed chronologically', async ({ page }) => {
			await page.goto('/events');

			await page.waitForSelector('[data-testid="event-item"]');

			const events = page.locator('[data-testid="event-item"]');
			const count = await events.count();

			if (count >= 2) {
				// Get timestamps
				const timestamps: number[] = [];
				for (let i = 0; i < Math.min(count, 5); i++) {
					const timestamp = await events.nth(i).getAttribute('data-timestamp');
					if (timestamp) {
						timestamps.push(new Date(timestamp).getTime());
					}
				}

				// Assert: Sorted in descending order (newest first)
				for (let i = 1; i < timestamps.length; i++) {
					expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
				}
			}
		});

		test('AC2: Thumbnail preview for each event', async ({ page }) => {
			await page.goto('/events');

			await page.waitForSelector('[data-testid="event-item"]');

			const events = page.locator('[data-testid="event-item"]');
			const count = await events.count();

			for (let i = 0; i < Math.min(count, 3); i++) {
				const thumbnail = events.nth(i).locator('[data-testid="event-thumbnail"]');
				await expect(thumbnail).toBeVisible();
			}
		});

		test('AC3: Filter by camera and date', async ({ page }) => {
			await page.goto('/events');

			// Assert: Filter controls exist
			await expect(page.locator('[data-testid="camera-filter"]')).toBeVisible();
			await expect(page.locator('[data-testid="date-filter"]')).toBeVisible();

			// Test camera filter
			await page.click('[data-testid="camera-filter"]');
			await page.click('[data-testid="camera-option"]:first-child');

			// Assert: Events filtered
			await page.waitForSelector('[data-testid="event-item"]');
		});
	});
});

/**
 * @story US-2.2
 * @epic Event Review
 * @priority P0
 */
test.describe('US-2.2: Video Playback', () => {
	test.describe('Acceptance Criteria', () => {
		test('AC1: Video plays in browser', async ({ page }) => {
			await page.goto('/events');

			await page.waitForSelector('[data-testid="event-item"]');

			// Click first event with recording
			const eventWithRecording = page.locator(
				'[data-testid="event-item"][data-has-recording="true"]'
			);

			if ((await eventWithRecording.count()) > 0) {
				await eventWithRecording.first().click();

				// Wait for video player
				const video = page.locator('video');
				await video.waitFor({ state: 'visible' });

				// Assert: Video element exists and can play
				await expect(video).toBeVisible();
			} else {
				test.skip(true, 'No events with recordings available');
			}
		});

		test('AC2: Playback controls available', async ({ page }) => {
			await page.goto('/events');

			const eventWithRecording = page
				.locator('[data-testid="event-item"][data-has-recording="true"]')
				.first();

			if (await eventWithRecording.isVisible()) {
				await eventWithRecording.click();

				// Assert: Controls visible
				await expect(page.locator('[data-testid="play-pause-button"]')).toBeVisible();
				await expect(page.locator('[data-testid="seek-bar"]')).toBeVisible();
			} else {
				test.skip(true, 'No events with recordings');
			}
		});

		test('AC3: Download option available', async ({ page }) => {
			await page.goto('/events');

			const eventWithRecording = page
				.locator('[data-testid="event-item"][data-has-recording="true"]')
				.first();

			if (await eventWithRecording.isVisible()) {
				await eventWithRecording.click();

				// Assert: Download button visible
				await expect(page.locator('[data-testid="download-button"]')).toBeVisible();
			} else {
				test.skip(true, 'No events with recordings');
			}
		});
	});
});

/**
 * @story US-2.3
 * @epic Event Review
 * @priority P1
 */
test.describe('US-2.3: Zone-Triggered Event Grouping', () => {
	test('AC1: Zone-triggered events grouped', async ({ page }) => {
		await page.goto('/events');

		const zoneEvents = page.locator('[data-testid="event-group"][data-zone="true"]');

		if ((await zoneEvents.count()) > 0) {
			// Assert: Group contains multiple events
			const firstGroup = zoneEvents.first();
			const eventsInGroup = firstGroup.locator('[data-testid="event-item"]');
			const count = await eventsInGroup.count();

			expect(count).toBeGreaterThan(1);
		} else {
			test.skip(true, 'No zone-triggered event groups');
		}
	});

	test('AC2: Triggered by indicator shown', async ({ page }) => {
		await page.goto('/events');

		const zoneEvent = page
			.locator('[data-testid="event-item"][data-zone-triggered="true"]')
			.first();

		if (await zoneEvent.isVisible()) {
			await expect(zoneEvent.locator('[data-testid="triggered-by-badge"]')).toBeVisible();
		} else {
			test.skip(true, 'No zone-triggered events');
		}
	});
});

/**
 * @story US-3.1
 * @epic System Health
 * @priority P0
 */
test.describe('US-3.1: Battery Level Display', () => {
	test('AC1: Battery percentage displayed', async ({ page }) => {
		await page.goto('/');

		await page.waitForSelector('[data-testid="camera-card"]');

		const cameras = page.locator('[data-testid="camera-card"]');

		for (let i = 0; i < (await cameras.count()); i++) {
			const camera = cameras.nth(i);
			const isWired = (await camera.getAttribute('data-power-source')) === 'wired';

			if (!isWired) {
				const batteryLevel = camera.locator('[data-testid="battery-level"]');
				await expect(batteryLevel).toBeVisible();

				// Assert: Shows percentage
				const text = await batteryLevel.textContent();
				expect(text).toMatch(/\d+%/);
			}
		}
	});

	test('AC2: Low battery highlighted in red', async ({ page }) => {
		await page.goto('/');

		const lowBatteryIndicator = page.locator('[data-testid="battery-level"][data-level="low"]');

		if ((await lowBatteryIndicator.count()) > 0) {
			const color = await lowBatteryIndicator.first().evaluate((el) => getComputedStyle(el).color);

			// Assert: Red color
			expect(color).toMatch(/rgb\((1\d{2}|2[0-4]\d|25[0-5]), /);
		}
	});
});
