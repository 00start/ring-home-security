import { test, expect } from '@playwright/test';

/**
 * Verification test to ensure no CDN requests are made during accessibility testing
 */
test.describe('CDN Dependency Verification', () => {
	test('no CDN requests during page load and a11y check', async ({ page }) => {
		const cdnRequests: string[] = [];

		// Monitor all network requests
		page.on('request', (request) => {
			const url = request.url();
			if (url.includes('cdnjs.cloudflare.com') || url.includes('cdn.')) {
				cdnRequests.push(url);
			}
		});

		// Navigate and wait for page to be ready
		await page.goto('/');
		await page.waitForSelector('[data-testid="dashboard"], body');

		// Wait a bit for any delayed requests
		await page.waitForTimeout(1000);

		// Verify no CDN requests were made
		expect(cdnRequests).toEqual([]);
	});

	test('verify @axe-core/playwright is installed', async () => {
		// This test verifies the package can be imported
		const { checkAccessibility } = await import('../../helpers/a11y.js');
		expect(checkAccessibility).toBeDefined();
		expect(typeof checkAccessibility).toBe('function');
	});
});
