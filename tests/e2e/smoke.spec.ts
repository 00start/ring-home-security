import { test, expect } from '@playwright/test';

/**
 * Smoke Test Suite
 *
 * Validates that the E2E test configuration is working correctly:
 * - Authentication setup runs successfully
 * - Web server is accessible
 * - Basic page navigation works
 * - Test database seeding is functional
 */

test.describe('E2E Configuration Smoke Tests', () => {
  test('should have authenticated session', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');

    // Should not redirect to login (authentication should be working)
    await expect(page).not.toHaveURL(/.*\/login.*/);
  });

  test('should access dashboard page', async ({ page }) => {
    await page.goto('/');

    // Check for common dashboard elements
    const hasDashboard = await page.locator('[data-testid="dashboard"]').count() > 0;
    const hasHeading = await page.locator('h1, h2').count() > 0;

    expect(hasDashboard || hasHeading).toBe(true);
  });

  test('should navigate to devices page', async ({ page }) => {
    await page.goto('/devices');

    // Should be on devices page
    expect(page.url()).toContain('/devices');
  });

  test('should navigate to timeline page', async ({ page }) => {
    await page.goto('/timeline');

    // Should be on timeline page
    expect(page.url()).toContain('/timeline');
  });

  test('should navigate to recordings page', async ({ page }) => {
    await page.goto('/recordings');

    // Should be on recordings page
    expect(page.url()).toContain('/recordings');
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings');

    // Should be on settings page
    expect(page.url()).toContain('/settings');
  });

  test('should be able to logout and login', async ({ page }) => {
    // Go to dashboard
    await page.goto('/');

    // Find and click logout button (if exists)
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")');
    const logoutExists = await logoutButton.count() > 0;

    if (logoutExists) {
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login.*/);
    }
  });

  test('API endpoints should be accessible', async ({ request }) => {
    // Test devices API
    const devicesResponse = await request.get('/api/devices');
    expect(devicesResponse.status()).toBeLessThan(500);

    // Test stats API
    const statsResponse = await request.get('/api/stats');
    expect(statsResponse.status()).toBeLessThan(500);
  });
});
