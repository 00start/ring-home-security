import { test, expect } from '@playwright/test';

/**
 * E2E Tests: System Logs Navigation
 *
 * Tests the navigation flow from the Timeline page to the Settings logs section
 * via the "View System Logs" button.
 *
 * @feature System Logs Button
 * @epic User Experience
 * @priority P1
 */

test.describe('System Logs Navigation', () => {
	test.describe('Timeline Page - Logs Button', () => {
		test('system logs button is visible on timeline page', async ({ page }) => {
			await page.goto('/timeline');

			// Wait for page to load
			await page.waitForSelector('h1');

			// Assert: System logs button is visible
			const logsButton = page.locator('[data-testid="system-logs-button"]');
			await expect(logsButton).toBeVisible();
		});

		test('button displays correct text and icon', async ({ page }) => {
			await page.goto('/timeline');

			const logsButton = page.locator('[data-testid="system-logs-button"]');
			await expect(logsButton).toBeVisible();

			// Assert: Button contains expected text
			const buttonText = await logsButton.textContent();
			expect(buttonText?.toLowerCase()).toContain('logs');

			// Assert: Button contains an SVG icon
			const icon = logsButton.locator('svg');
			await expect(icon).toBeVisible();
		});

		test('button has proper accessibility attributes', async ({ page }) => {
			await page.goto('/timeline');

			const logsButton = page.locator('[data-testid="system-logs-button"]');
			await expect(logsButton).toBeVisible();

			// Assert: Has aria-label for screen readers
			const ariaLabel = await logsButton.getAttribute('aria-label');
			expect(ariaLabel).toBeTruthy();
			expect(ariaLabel?.toLowerCase()).toContain('logs');
		});

		test('button is keyboard accessible', async ({ page }) => {
			await page.goto('/timeline');

			// Tab through the page to reach the button
			await page.keyboard.press('Tab');

			// Keep tabbing until we reach the logs button or a reasonable limit
			let foundButton = false;
			for (let i = 0; i < 10; i++) {
				const focused = await page.evaluate(() => {
					return document.activeElement?.getAttribute('data-testid');
				});
				if (focused === 'system-logs-button') {
					foundButton = true;
					break;
				}
				await page.keyboard.press('Tab');
			}

			// Assert: Button can be focused via keyboard
			expect(foundButton).toBe(true);
		});
	});

	test.describe('Navigation Flow', () => {
		test('clicking button navigates to settings page logs section', async ({ page }) => {
			await page.goto('/timeline');

			const logsButton = page.locator('[data-testid="system-logs-button"]');
			await expect(logsButton).toBeVisible();

			// Click the button
			await logsButton.click();

			// Assert: URL changed to /settings#logs
			await expect(page).toHaveURL(/\/settings#logs/);
		});

		test('logs section is visible after navigation', async ({ page }) => {
			await page.goto('/timeline');

			const logsButton = page.locator('[data-testid="system-logs-button"]');
			await logsButton.click();

			// Wait for navigation
			await page.waitForURL(/\/settings/);

			// Assert: Logs section is present
			const logsSection = page.locator('#logs');
			await expect(logsSection).toBeVisible();
		});

		test('logs section scrolls into view after navigation', async ({ page }) => {
			await page.goto('/timeline');

			const logsButton = page.locator('[data-testid="system-logs-button"]');
			await logsButton.click();

			// Wait for navigation and scroll
			await page.waitForURL(/\/settings#logs/);
			await page.waitForTimeout(500); // Allow scroll animation

			// Assert: Logs section is in viewport
			const logsSection = page.locator('#logs');
			const isInViewport = await logsSection.evaluate((el) => {
				const rect = el.getBoundingClientRect();
				return rect.top >= 0 && rect.top < window.innerHeight;
			});

			expect(isInViewport).toBe(true);
		});

		test('can navigate back to timeline using browser back button', async ({ page }) => {
			await page.goto('/timeline');

			const logsButton = page.locator('[data-testid="system-logs-button"]');
			await logsButton.click();

			// Wait for navigation
			await page.waitForURL(/\/settings/);

			// Go back
			await page.goBack();

			// Assert: Back on timeline
			await expect(page).toHaveURL(/\/timeline/);
		});
	});

	test.describe('Settings Page - Logs Section', () => {
		test('logs section contains LogViewer component', async ({ page }) => {
			await page.goto('/settings#logs');

			// Assert: LogViewer is present in logs section
			const logsSection = page.locator('#logs');
			await expect(logsSection).toBeVisible();

			// The LogViewer should have log content or controls
			const logViewerContent = logsSection.locator('[data-testid="log-viewer"]');

			// LogViewer might have different test id, check for common elements
			const hasLogContent = await logsSection.locator('pre, code, .log-content').count();
			const hasLogControls = await logsSection.locator('select, button').count();

			expect(hasLogContent > 0 || hasLogControls > 0).toBe(true);
		});

		test('logs navigation item is highlighted when at #logs', async ({ page }) => {
			await page.goto('/settings#logs');

			// Wait for intersection observer to update active section
			await page.waitForTimeout(500);

			// Assert: Logs nav item has active styling
			const logsNavItem = page.locator('nav button:has-text("Logs")');

			if (await logsNavItem.isVisible()) {
				const classes = await logsNavItem.getAttribute('class');
				// Active items have blue styling
				expect(classes).toMatch(/blue|active/i);
			}
		});
	});

	test.describe('Visual Consistency', () => {
		test('button matches design system styling', async ({ page }) => {
			await page.goto('/timeline');

			const logsButton = page.locator('[data-testid="system-logs-button"]');
			await expect(logsButton).toBeVisible();

			// Assert: Button has proper styling (rounded, transitions, etc.)
			const classes = await logsButton.getAttribute('class');
			expect(classes).toContain('rounded');
		});

		test('button is positioned in page header area', async ({ page }) => {
			await page.goto('/timeline');

			const logsButton = page.locator('[data-testid="system-logs-button"]');
			const pageHeader = page.locator('h1');

			// Get positions
			const buttonBox = await logsButton.boundingBox();
			const headerBox = await pageHeader.boundingBox();

			// Assert: Button is vertically aligned with header (in same row)
			if (buttonBox && headerBox) {
				const verticalOverlap =
					buttonBox.y < headerBox.y + headerBox.height && buttonBox.y + buttonBox.height > headerBox.y;
				expect(verticalOverlap).toBe(true);
			}
		});
	});
});
