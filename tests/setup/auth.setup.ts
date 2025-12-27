import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

/**
 * Authentication Setup
 *
 * This runs before all tests to authenticate and save session state.
 * Default credentials: admin/admin (created on first app start)
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Fill in default credentials using data-testid
  await page.fill('[data-testid="login-username-input"]', 'admin');
  await page.fill('[data-testid="login-password-input"]', 'admin');

  // Submit login form and wait for navigation
  await Promise.all([
    page.waitForURL('/', { timeout: 30000 }),
    page.click('[data-testid="login-submit-button"]')
  ]);

  // Verify we're on the dashboard
  await expect(page.locator('[data-testid="dashboard"], .space-y-8')).toBeVisible({ timeout: 10000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
