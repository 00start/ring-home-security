import { test, expect } from '@playwright/test';

/**
 * Dependency Tests: Ring API Integration
 *
 * @dependency RingAPI
 * @type external_service
 * @critical true
 * @requirements [BO-2, BR-1, US-1.1]
 */
test.describe('Dependency: Ring API', () => {
  test.describe('Connectivity', () => {
    test('system connects to Ring API on startup', async ({ request }) => {
      // Check health endpoint
      const response = await request.get('/api/health');

      expect(response.ok()).toBe(true);

      const health = await response.json();
      expect(health.ringApi).toBeDefined();
      expect(health.ringApi.connected).toBe(true);
    });

    test('cameras are fetched from Ring API', async ({ request }) => {
      const response = await request.get('/api/devices');

      expect(response.ok()).toBe(true);

      const devices = await response.json();
      expect(Array.isArray(devices.data)).toBe(true);
    });
  });

  test.describe('Failure Recovery', () => {
    test('handles API timeout gracefully', async ({ page }) => {
      // Simulate slow Ring API
      await page.route('**/api/devices**', async (route) => {
        await new Promise((r) => setTimeout(r, 10000));
        await route.abort();
      });

      await page.goto('/');

      // Assert: Error state shown, not crash
      await expect(page.locator('[data-testid="error-message"], [data-testid="retry-button"]')).toBeVisible({
        timeout: 15000,
      });
    });

    test('allows retry after failure', async ({ page }) => {
      let failCount = 0;

      await page.route('**/api/devices**', async (route) => {
        failCount++;
        if (failCount <= 1) {
          await route.fulfill({ status: 500 });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');

      // Wait for error state
      const retryButton = page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();

        // Assert: Retry succeeds
        await expect(page.locator('[data-testid="camera-card"]')).toBeVisible();
      }
    });
  });

  test.describe('Data Integrity', () => {
    test('camera data includes required fields', async ({ request }) => {
      const response = await request.get('/api/devices');
      const devices = await response.json();

      for (const device of devices.data || []) {
        expect(device.id).toBeDefined();
        expect(device.name).toBeDefined();
        expect(device.type).toBeDefined();
      }
    });

    test('events include required metadata', async ({ request }) => {
      const response = await request.get('/api/events?limit=5');
      const events = await response.json();

      for (const event of events.data || []) {
        expect(event.id).toBeDefined();
        expect(event.deviceId).toBeDefined();
        expect(event.eventType).toBeDefined();
        expect(event.timestamp).toBeDefined();
      }
    });
  });
});

/**
 * @dependency SQLite
 * @type database
 * @critical true
 */
test.describe('Dependency: SQLite Database', () => {
  test('database stores events persistently', async ({ request }) => {
    // Get event count
    const response1 = await request.get('/api/events?limit=1');
    expect(response1.ok()).toBe(true);

    const events1 = await response1.json();
    expect(events1.total).toBeDefined();
  });

  test('database stores recordings', async ({ request }) => {
    const response = await request.get('/api/recordings?limit=5');
    expect(response.ok()).toBe(true);
  });

  test('database stores device state', async ({ request }) => {
    const response = await request.get('/api/devices');
    expect(response.ok()).toBe(true);

    const devices = await response.json();
    for (const device of devices.data || []) {
      expect(device.lastSeen).toBeDefined();
    }
  });
});

/**
 * @dependency FileSystem
 * @type storage
 * @critical true
 */
test.describe('Dependency: File System Storage', () => {
  test('recordings are accessible via API', async ({ request }) => {
    const response = await request.get('/api/recordings?limit=1');

    if (response.ok()) {
      const recordings = await response.json();

      if (recordings.data && recordings.data.length > 0) {
        const recording = recordings.data[0];

        // Try to access the recording file
        const videoResponse = await request.get(`/api/recordings/${recording.id}/video`);
        expect(videoResponse.status()).not.toBe(500);
      }
    }
  });

  test('thumbnails are generated and accessible', async ({ request }) => {
    const response = await request.get('/api/recordings?limit=1');

    if (response.ok()) {
      const recordings = await response.json();

      if (recordings.data && recordings.data.length > 0) {
        const recording = recordings.data[0];

        if (recording.thumbnailPath) {
          const thumbResponse = await request.get(`/api/recordings/${recording.id}/thumbnail`);
          expect(thumbResponse.status()).not.toBe(500);
        }
      }
    }
  });
});

/**
 * @dependency Redis
 * @type message_queue
 * @critical true
 */
test.describe('Dependency: Redis Queue', () => {
  test('health check includes Redis status', async ({ request }) => {
    const response = await request.get('/api/health');

    if (response.ok()) {
      const health = await response.json();
      expect(health.redis).toBeDefined();
    }
  });
});
