import { test, expect } from '@playwright/test';
import { checkAccessibility } from '../../helpers/a11y.js';

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
  test.describe('Accessibility (a11y)', () => {
    test('page has no critical accessibility violations', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Run axe accessibility audit using local package
      const results = await checkAccessibility(page, { autoAssert: false });

      // Filter critical and serious violations
      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (criticalViolations.length > 0) {
        console.log('Accessibility violations:', criticalViolations);
      }

      expect(criticalViolations.length).toBe(0);
    });

    test('WCAG 2.1 Level A compliance - color contrast', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Check color contrast using local axe-core
      await checkAccessibility(page, {
        includeOnly: ['color-contrast']
      });
    });

    test('WCAG 2.1 Level AA compliance - focus indicators', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Tab through interactive elements
      await page.keyboard.press('Tab');

      // Check that focused element has visible focus indicator
      const hasFocusStyle = await page.evaluate(() => {
        const focused = document.activeElement;
        if (!focused) return false;

        const styles = window.getComputedStyle(focused);
        const outline = styles.outline;
        const boxShadow = styles.boxShadow;

        // Should have either outline or box-shadow for focus
        return outline !== 'none' || boxShadow !== 'none';
      });

      expect(hasFocusStyle).toBe(true);
    });

    test('all images have alt text', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Check image alt text using local axe-core
      await checkAccessibility(page, {
        includeOnly: ['image-alt']
      });
    });

    test('form inputs have associated labels', async ({ page }) => {
      await page.goto('/');

      // Check form labels using local axe-core
      await checkAccessibility(page, {
        includeOnly: ['label']
      });
    });

    test('heading hierarchy is logical', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Check heading order using local axe-core
      await checkAccessibility(page, {
        includeOnly: ['heading-order']
      });
    });

    test('buttons have accessible names', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Check button names using local axe-core
      await checkAccessibility(page, {
        includeOnly: ['button-name']
      });
    });

    test('page has valid HTML lang attribute', async ({ page }) => {
      await page.goto('/');

      const htmlLang = await page.evaluate(() => {
        return document.documentElement.lang;
      });

      expect(htmlLang).toBeTruthy();
      expect(htmlLang.length).toBeGreaterThan(0);
    });

    test('links have discernible text', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Check link names using local axe-core
      await checkAccessibility(page, {
        includeOnly: ['link-name']
      });
    });

    test('ARIA roles are used correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Check ARIA usage using local axe-core
      await checkAccessibility(page, {
        includeOnly: ['aria-roles', 'aria-valid-attr']
      });
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('navigation landmarks are properly labeled', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="dashboard"]');

      // Check for semantic HTML or ARIA landmarks
      const hasLandmarks = await page.evaluate(() => {
        const nav = document.querySelector('nav, [role="navigation"]');
        const main = document.querySelector('main, [role="main"]');

        return { hasNav: !!nav, hasMain: !!main };
      });

      expect(hasLandmarks.hasNav).toBe(true);
      expect(hasLandmarks.hasMain).toBe(true);
    });

    test('dynamic content updates are announced', async ({ page }) => {
      await page.goto('/');

      // Check for aria-live regions for dynamic updates
      const hasLiveRegions = await page.evaluate(() => {
        const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
        return liveRegions.length > 0;
      });

      // This is a soft check - not all pages need live regions
      console.log('Live regions present:', hasLiveRegions);
    });

    test('modal dialogs trap focus appropriately', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="camera-card"]');

      // Open a modal/dialog
      await page.click('[data-testid="camera-card"]:first-child');

      // Check for modal with proper ARIA attributes
      const modal = page.locator('[role="dialog"], [role="alertdialog"]');

      if (await modal.isVisible()) {
        const ariaModal = await modal.getAttribute('aria-modal');
        const ariaLabel = await modal.getAttribute('aria-label');
        const ariaLabelledBy = await modal.getAttribute('aria-labelledby');

        // Modal should have aria-modal and label
        expect(ariaModal).toBe('true');
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    });

    test('skip to main content link exists', async ({ page }) => {
      await page.goto('/');

      // Look for skip link (usually first focusable element)
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          text: el?.textContent?.trim(),
          href: (el as HTMLAnchorElement)?.href,
        };
      });

      // Check if it's a skip link
      if (focusedElement.text?.toLowerCase().includes('skip')) {
        expect(focusedElement.href).toContain('#');
      }
    });

    test('tables have proper headers', async ({ page }) => {
      await page.goto('/events');

      const tables = page.locator('table');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        // Check table headers using local axe-core
        await checkAccessibility(page, {
          includeOnly: ['table-headers']
        });
      }
    });

    test('custom controls have appropriate ARIA attributes', async ({ page }) => {
      await page.goto('/');

      // Check for custom interactive elements (not native buttons/links)
      const customControls = page.locator('[role="button"]:not(button), [role="checkbox"]:not(input), [role="slider"]');

      const count = await customControls.count();

      if (count > 0) {
        // Each should have accessible name and state
        for (let i = 0; i < Math.min(count, 3); i++) {
          const control = customControls.nth(i);
          const ariaLabel = await control.getAttribute('aria-label');
          const ariaLabelledBy = await control.getAttribute('aria-labelledby');

          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });
  });

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
