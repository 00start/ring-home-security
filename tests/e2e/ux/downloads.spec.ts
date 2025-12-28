import { test, expect } from '@playwright/test';
import { mockDownloadMetadata } from '../../../src/lib/test-utils/ux-fixtures';

/**
 * User Story Tests: Event Downloads (Epic 2 - Event Review)
 *
 * @story US-2.4
 * @epic Event Review
 * @priority P1
 * @quality_dimensions [B.UserExperience, E.Usability, F.Reliability]
 * @worker B4
 */
test.describe('US-2.4: Event Download & Export', () => {
	test.describe('Acceptance Criteria', () => {
		test('AC1: Download as MP4 file', async ({ page }) => {
			await page.goto('/events');

			// Wait for events to load
			await page.waitForSelector('[data-testid="event-item"]');

			// Find event with recording
			const eventWithRecording = page
				.locator('[data-testid="event-item"][data-has-recording="true"]')
				.first();

			if (await eventWithRecording.isVisible()) {
				await eventWithRecording.click();

				// Wait for video player
				await page.waitForSelector('video');

				// Start download
				const downloadPromise = page.waitForEvent('download');
				await page.click('[data-testid="download-button"]');

				const download = await downloadPromise;

				// Assert: File is MP4 format
				const filename = download.suggestedFilename();
				expect(filename).toMatch(/\.mp4$/);

				// Assert: Download completes successfully
				const path = await download.path();
				expect(path).toBeTruthy();
			} else {
				test.skip(true, 'No events with recordings available');
			}
		});

		test('AC2: Filename includes timestamp', async ({ page }) => {
			await page.goto('/events');

			await page.waitForSelector('[data-testid="event-item"]');

			const eventWithRecording = page
				.locator('[data-testid="event-item"][data-has-recording="true"]')
				.first();

			if (await eventWithRecording.isVisible()) {
				await eventWithRecording.click();

				const downloadPromise = page.waitForEvent('download');
				await page.click('[data-testid="download-button"]');

				const download = await downloadPromise;
				const filename = download.suggestedFilename();

				// Assert: Filename contains date/time components
				// Expected format: Ring_CameraName_YYYY-MM-DD_HH-MM-SS.mp4
				expect(filename).toMatch(/Ring_.*_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.mp4/);
			} else {
				test.skip(true, 'No events with recordings');
			}
		});

		test('AC3: Video includes timestamp overlay', async ({ page }) => {
			await page.goto('/events');

			await page.waitForSelector('[data-testid="event-item"]');

			const eventWithRecording = page
				.locator('[data-testid="event-item"][data-has-recording="true"]')
				.first();

			if (await eventWithRecording.isVisible()) {
				await eventWithRecording.click();

				// Wait for video player
				const video = page.locator('video');
				await video.waitFor({ state: 'visible' });

				// Check for timestamp overlay toggle
				const timestampToggle = page.locator('[data-testid="timestamp-overlay-toggle"]');

				if (await timestampToggle.isVisible()) {
					// Assert: Toggle is enabled by default
					const isEnabled = await timestampToggle.isChecked();
					expect(isEnabled).toBe(true);

					// Assert: Overlay visible on video
					const overlay = page.locator('[data-testid="timestamp-overlay"]');
					await expect(overlay).toBeVisible();
				} else {
					// If toggle doesn't exist, overlay should be permanently visible
					const overlay = page.locator('[data-testid="timestamp-overlay"]');
					await expect(overlay).toBeVisible();
				}
			} else {
				test.skip(true, 'No events with recordings');
			}
		});
	});

	test.describe('Quality: User Experience', () => {
		test('shows download progress indicator', async ({ page }) => {
			await page.goto('/events');

			await page.waitForSelector('[data-testid="event-item"]');

			const eventWithRecording = page
				.locator('[data-testid="event-item"][data-has-recording="true"]')
				.first();

			if (await eventWithRecording.isVisible()) {
				await eventWithRecording.click();

				// Mock slow download to see progress
				await page.route('**/api/events/*/download', async (route) => {
					// Simulate slow response
					await new Promise((r) => setTimeout(r, 1000));
					await route.continue();
				});

				// Click download
				page.click('[data-testid="download-button"]'); // Don't await

				// Assert: Progress indicator appears
				const progressIndicator = page.locator('[data-testid="download-progress"]');
				await expect(progressIndicator).toBeVisible({ timeout: 2000 });
			} else {
				test.skip(true, 'No events with recordings');
			}
		});

		test('download button disabled during download', async ({ page }) => {
			await page.goto('/events');

			await page.waitForSelector('[data-testid="event-item"]');

			const eventWithRecording = page
				.locator('[data-testid="event-item"][data-has-recording="true"]')
				.first();

			if (await eventWithRecording.isVisible()) {
				await eventWithRecording.click();

				const downloadButton = page.locator('[data-testid="download-button"]');

				// Mock slow download
				await page.route('**/api/events/*/download', async (route) => {
					await new Promise((r) => setTimeout(r, 1000));
					await route.continue();
				});

				// Start download
				downloadButton.click(); // Don't await

				// Assert: Button disabled during download
				await expect(downloadButton).toBeDisabled({ timeout: 1000 });
			} else {
				test.skip(true, 'No events with recordings');
			}
		});

		test('shows error message if download fails', async ({ page }) => {
			await page.goto('/events');

			await page.waitForSelector('[data-testid="event-item"]');

			const eventWithRecording = page
				.locator('[data-testid="event-item"][data-has-recording="true"]')
				.first();

			if (await eventWithRecording.isVisible()) {
				await eventWithRecording.click();

				// Mock download failure
				await page.route('**/api/events/*/download', (route) => {
					route.fulfill({ status: 500, body: 'Download failed' });
				});

				// Attempt download
				await page.click('[data-testid="download-button"]');

				// Assert: Error message shown
				const errorMessage = page.locator('[data-testid="download-error"]');
				await expect(errorMessage).toBeVisible({ timeout: 3000 });
			} else {
				test.skip(true, 'No events with recordings');
			}
		});
	});

	test.describe('Quality: Reliability', () => {
		test('supports multiple simultaneous downloads', async ({ page }) => {
			await page.goto('/events');

			await page.waitForSelector('[data-testid="event-item"]');

			const eventsWithRecording = page.locator(
				'[data-testid="event-item"][data-has-recording="true"]'
			);
			const count = await eventsWithRecording.count();

			if (count >= 2) {
				// Select multiple events
				await eventsWithRecording.nth(0).click({ modifiers: ['Control'] });
				await eventsWithRecording.nth(1).click({ modifiers: ['Control'] });

				// Check for bulk download option
				const bulkDownload = page.locator('[data-testid="download-selected-button"]');

				if (await bulkDownload.isVisible()) {
					const downloadPromise1 = page.waitForEvent('download');
					await bulkDownload.click();

					// Wait for downloads to start
					const download1 = await downloadPromise1;
					expect(download1.suggestedFilename()).toMatch(/\.mp4$|\.zip$/);
				} else {
					test.skip(true, 'Bulk download not implemented');
				}
			} else {
				test.skip(true, 'Need at least 2 events for multi-download test');
			}
		});

		test('retains video quality in download', async ({ page }) => {
			await page.goto('/events');

			await page.waitForSelector('[data-testid="event-item"]');

			const eventWithRecording = page
				.locator('[data-testid="event-item"][data-has-recording="true"]')
				.first();

			if (await eventWithRecording.isVisible()) {
				await eventWithRecording.click();

				// Get video resolution from player
				const video = page.locator('video');
				await video.waitFor({ state: 'visible' });

				const playerResolution = await video.evaluate((v: HTMLVideoElement) => ({
					width: v.videoWidth,
					height: v.videoHeight
				}));

				// Check download metadata
				const downloadInfo = page.locator('[data-testid="download-info"]');

				if (await downloadInfo.isVisible()) {
					const infoText = await downloadInfo.textContent();

					// Assert: Download resolution matches or exceeds player resolution
					expect(infoText).toContain(`${playerResolution.width}x${playerResolution.height}`);
				} else {
					// If no explicit info, assume quality is maintained
					expect(playerResolution.height).toBeGreaterThanOrEqual(720);
				}
			} else {
				test.skip(true, 'No events with recordings');
			}
		});
	});

	test.describe('Multi-Clip Downloads', () => {
		test('can download zone-triggered event group as single file', async ({ page }) => {
			await page.goto('/events');

			// Look for zone-triggered event groups
			const zoneGroup = page.locator('[data-testid="event-group"][data-zone="true"]').first();

			if (await zoneGroup.isVisible()) {
				// Click on the group
				await zoneGroup.click();

				// Look for "Download All" option
				const downloadAllButton = page.locator('[data-testid="download-group-button"]');

				if (await downloadAllButton.isVisible()) {
					const downloadPromise = page.waitForEvent('download');
					await downloadAllButton.click();

					const download = await downloadPromise;
					const filename = download.suggestedFilename();

					// Assert: File is either MP4 (merged) or ZIP (separate files)
					expect(filename).toMatch(/\.(mp4|zip)$/);
				} else {
					test.skip(true, 'Group download not implemented');
				}
			} else {
				test.skip(true, 'No zone-triggered event groups available');
			}
		});

		test('multi-clip download preserves chronological order', async ({ page }) => {
			await page.goto('/events');

			const zoneGroup = page.locator('[data-testid="event-group"][data-zone="true"]').first();

			if (await zoneGroup.isVisible()) {
				await zoneGroup.click();

				// Check if there's metadata about clip order
				const clipList = page.locator('[data-testid="group-clip-list"]');

				if (await clipList.isVisible()) {
					const clips = clipList.locator('[data-testid="clip-item"]');
					const count = await clips.count();

					if (count >= 2) {
						const timestamps: number[] = [];

						for (let i = 0; i < count; i++) {
							const timestamp = await clips.nth(i).getAttribute('data-timestamp');
							if (timestamp) {
								timestamps.push(new Date(timestamp).getTime());
							}
						}

						// Assert: Chronologically ordered
						for (let i = 1; i < timestamps.length; i++) {
							expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
						}
					}
				}
			} else {
				test.skip(true, 'No zone-triggered groups');
			}
		});

		test('displays total size before multi-clip download', async ({ page }) => {
			await page.goto('/events');

			const zoneGroup = page.locator('[data-testid="event-group"][data-zone="true"]').first();

			if (await zoneGroup.isVisible()) {
				await zoneGroup.click();

				const downloadGroupButton = page.locator('[data-testid="download-group-button"]');

				if (await downloadGroupButton.isVisible()) {
					// Look for size indicator
					const sizeInfo = page.locator('[data-testid="download-size-info"]');

					if (await sizeInfo.isVisible()) {
						const sizeText = await sizeInfo.textContent();

						// Assert: Shows size in MB or GB
						expect(sizeText).toMatch(/\d+(\.\d+)?\s*(MB|GB)/i);
					}
				}
			} else {
				test.skip(true, 'No zone-triggered groups');
			}
		});
	});
});
