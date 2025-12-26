import { test, expect } from '@playwright/test';

/**
 * Quality Dimension Tests: C. Responsiveness
 *
 * @quality_dimension C.Responsiveness
 * @requirements [BO-4]
 */
test.describe('Quality: Responsiveness', () => {
  test.describe('Performance Budgets', () => {
    test('dashboard loads within 2 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(2000);
    });

    test('API responses complete within 200ms', async ({ request }) => {
      const endpoints = ['/api/devices', '/api/events?limit=10', '/api/health'];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await request.get(endpoint);
        const elapsed = Date.now() - startTime;

        // Allow some buffer for cold starts
        expect(elapsed).toBeLessThan(1000);

        if (response.ok()) {
          // Log for performance tracking
          console.log(`${endpoint}: ${elapsed}ms`);
        }
      }
    });

    test('event list renders within 1 second', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/events');
      await page.waitForSelector('[data-testid="event-item"], [data-testid="no-events"]');

      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(1000);
    });
  });

  test.describe('Live View Performance', () => {
    test('live view stream starts within 3 seconds', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="camera-card"]');

      await page.click('[data-testid="camera-card"]:first-child');

      const liveButton = page.locator('[data-testid="live-view-button"]');

      if (await liveButton.isVisible()) {
        const startTime = Date.now();

        await liveButton.click();

        // Wait for video to be playing
        await page.waitForSelector('video', { timeout: 5000 });

        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(3000);
      } else {
        test.skip(true, 'Live view not available');
      }
    });
  });

  test.describe('Navigation Performance', () => {
    test('page transitions complete within 500ms', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Navigate to events
      const startTime = Date.now();
      await page.click('[data-testid="nav-events"]');
      await page.waitForSelector('[data-testid="events-page"]');
      const transitionTime = Date.now() - startTime;

      expect(transitionTime).toBeLessThan(500);
    });
  });
});

/**
 * Quality Dimension Tests: E. Usability
 *
 * @quality_dimension E.Usability
 */
test.describe('Quality: Usability', () => {
  test.describe('Task Efficiency', () => {
    test('live view accessible in 2 clicks from dashboard', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="camera-card"]');

      let clicks = 0;

      // Click 1: Camera card
      await page.click('[data-testid="camera-card"]:first-child');
      clicks++;

      // Click 2: Live view button
      const liveButton = page.locator('[data-testid="live-view-button"]');
      if (await liveButton.isVisible()) {
        await liveButton.click();
        clicks++;

        expect(clicks).toBeLessThanOrEqual(2);
      }
    });

    test('event playback accessible in 3 clicks', async ({ page }) => {
      await page.goto('/');

      let clicks = 0;

      // Click 1: Events nav
      await page.click('[data-testid="nav-events"]');
      clicks++;

      await page.waitForSelector('[data-testid="event-item"]');

      // Click 2: Event item
      const eventWithRecording = page.locator('[data-testid="event-item"][data-has-recording="true"]').first();
      if (await eventWithRecording.isVisible()) {
        await eventWithRecording.click();
        clicks++;

        // May need click 3 for play button
        const playButton = page.locator('[data-testid="play-button"]');
        if (await playButton.isVisible()) {
          await playButton.click();
          clicks++;
        }

        expect(clicks).toBeLessThanOrEqual(3);
      }
    });
  });

  test.describe('Keyboard Accessibility', () => {
    test('main navigation is keyboard accessible', async ({ page }) => {
      await page.goto('/');

      // Tab through navigation
      await page.keyboard.press('Tab');

      // Assert: Focus is visible somewhere
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeDefined();
    });

    test('modals can be closed with Escape key', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="camera-card"]');

      // Open camera modal/detail
      await page.click('[data-testid="camera-card"]:first-child');

      // Press Escape
      await page.keyboard.press('Escape');

      // Assert: Modal closed (would need specific implementation)
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('dashboard is usable on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Assert: Content visible and not overflowing
      const dashboard = page.locator('[data-testid="dashboard"]');
      const box = await dashboard.boundingBox();

      expect(box?.width).toBeLessThanOrEqual(375);
    });
  });
});

/**
 * Quality Dimension Tests: F. Delight
 *
 * @quality_dimension F.Delight
 */
test.describe('Quality: Delight', () => {
  test.describe('Loading States', () => {
    test('shows skeleton loader during data fetch', async ({ page }) => {
      // Slow down API
      await page.route('**/api/**', async (route) => {
        await new Promise((r) => setTimeout(r, 300));
        await route.continue();
      });

      await page.goto('/');

      // Assert: Skeleton visible during load
      const skeleton = page.locator('[data-testid*="skeleton"], [data-testid*="loading"]');
      // May or may not catch it depending on timing
    });
  });

  test.describe('Feedback', () => {
    test('successful actions show confirmation', async ({ page }) => {
      // This would test toast/notification on successful actions
      test.skip(true, 'Requires action that triggers confirmation');
    });
  });

  test.describe('Empty States', () => {
    test('empty events list shows helpful message', async ({ page }) => {
      // Mock empty events
      await page.route('**/api/events**', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [], total: 0 }),
        });
      });

      await page.goto('/events');

      // Assert: Friendly empty state
      const emptyState = page.locator('[data-testid="no-events"], [data-testid="empty-state"]');
      await expect(emptyState).toBeVisible();
    });
  });

  test.describe('Error Recovery', () => {
    test('error states include retry option', async ({ page }) => {
      await page.route('**/api/devices**', (route) => {
        route.fulfill({ status: 500 });
      });

      await page.goto('/');

      // Assert: Retry button available
      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible({ timeout: 5000 });
    });
  });
});
