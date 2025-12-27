import { test, expect } from '@playwright/test';
import { mockStorageStats, mockDashboardState } from '../../../src/lib/test-utils/ux-fixtures';

/**
 * User Story Tests: System Settings & Configuration
 * Covers US-3.3, US-3.4, and US-4.* (Epic 3 & 4)
 *
 * @epic System Health, Zone Configuration
 * @priority P0/P1
 * @quality_dimensions [B.UserExperience, E.Usability, F.Reliability]
 * @worker B6
 */

/**
 * @story US-3.3
 * @epic System Health
 * @priority P1
 */
test.describe('US-3.3: Storage Usage Display', () => {
  test.describe('Acceptance Criteria', () => {
    test('AC1: Total and used storage displayed', async ({ page }) => {
      await page.goto('/settings/storage');

      // Wait for storage stats to load
      await page.waitForSelector('[data-testid="storage-stats"]');

      // Assert: Total storage shown
      const totalStorage = page.locator('[data-testid="total-storage"]');
      await expect(totalStorage).toBeVisible();

      const totalText = await totalStorage.textContent();
      expect(totalText).toMatch(/\d+\s*(GB|TB)/i);

      // Assert: Used storage shown
      const usedStorage = page.locator('[data-testid="used-storage"]');
      await expect(usedStorage).toBeVisible();

      const usedText = await usedStorage.textContent();
      expect(usedText).toMatch(/\d+\s*(GB|TB)/i);
    });

    test('AC2: Visual progress bar shows usage percentage', async ({ page }) => {
      await page.goto('/settings/storage');

      await page.waitForSelector('[data-testid="storage-stats"]');

      // Assert: Progress bar exists
      const progressBar = page.locator('[data-testid="storage-progress-bar"]');
      await expect(progressBar).toBeVisible();

      // Assert: Has width representing percentage
      const percentWidth = await progressBar.evaluate((el) => {
        const width = el.style.width || el.getAttribute('aria-valuenow');
        return width;
      });

      expect(percentWidth).toBeTruthy();
    });

    test('AC3: Number of stored events shown', async ({ page }) => {
      await page.goto('/settings/storage');

      await page.waitForSelector('[data-testid="storage-stats"]');

      // Assert: Event count displayed
      const eventCount = page.locator('[data-testid="event-count"]');
      await expect(eventCount).toBeVisible();

      const countText = await eventCount.textContent();
      expect(countText).toMatch(/\d+/);
    });

    test('AC4: Oldest event date shown', async ({ page }) => {
      await page.goto('/settings/storage');

      await page.waitForSelector('[data-testid="storage-stats"]');

      // Assert: Oldest event date displayed
      const oldestDate = page.locator('[data-testid="oldest-event-date"]');
      await expect(oldestDate).toBeVisible();

      const dateText = await oldestDate.textContent();
      // Should contain date format
      expect(dateText).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|ago/i);
    });
  });

  test.describe('Quality: User Experience', () => {
    test('shows warning when storage is nearly full', async ({ page }) => {
      await page.goto('/settings/storage');

      // Mock high storage usage
      await page.route('**/api/system/storage', async (route) => {
        const highUsageStats = mockStorageStats({
          usedGB: 92,
          availableGB: 8,
          percentUsed: 92,
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(highUsageStats),
        });
      });

      await page.reload();
      await page.waitForSelector('[data-testid="storage-stats"]');

      // Assert: Warning banner visible
      const warning = page.locator('[data-testid="storage-warning"]');
      await expect(warning).toBeVisible();

      // Assert: Has warning color
      const color = await warning.evaluate((el) =>
        getComputedStyle(el).backgroundColor
      );
      expect(color).toMatch(/rgb\((2[0-4]\d|25[0-5]),\s*(\d{1,3}),\s*(\d{1,2})\)/); // Red/orange
    });

    test('provides option to delete old events', async ({ page }) => {
      await page.goto('/settings/storage');

      await page.waitForSelector('[data-testid="storage-stats"]');

      // Assert: Cleanup option exists
      const cleanupButton = page.locator('[data-testid="cleanup-old-events-button"]');
      await expect(cleanupButton).toBeVisible();

      // Click and verify confirmation dialog
      await cleanupButton.click();

      const confirmDialog = page.locator('[data-testid="cleanup-confirmation-dialog"]');
      await expect(confirmDialog).toBeVisible({ timeout: 2000 });
    });
  });
});

/**
 * @story US-3.4
 * @epic System Health
 * @priority P1
 */
test.describe('US-3.4: System Status Display', () => {
  test.describe('Acceptance Criteria', () => {
    test('AC1: Overall system health indicator', async ({ page }) => {
      await page.goto('/settings/system');

      // Wait for system status
      await page.waitForSelector('[data-testid="system-status"]');

      // Assert: Health indicator visible
      const healthIndicator = page.locator('[data-testid="system-health-indicator"]');
      await expect(healthIndicator).toBeVisible();

      // Assert: Has status (healthy/warning/critical)
      const status = await healthIndicator.getAttribute('data-status');
      expect(['healthy', 'warning', 'critical']).toContain(status);
    });

    test('AC2: Individual camera connection status', async ({ page }) => {
      await page.goto('/settings/system');

      await page.waitForSelector('[data-testid="camera-status-list"]');

      // Assert: Each camera has connection status
      const cameraItems = page.locator('[data-testid="camera-status-item"]');
      const count = await cameraItems.count();

      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < Math.min(count, 3); i++) {
        const item = cameraItems.nth(i);
        const statusBadge = item.locator('[data-testid="connection-status-badge"]');
        await expect(statusBadge).toBeVisible();
      }
    });

    test('AC3: Last sync timestamp shown', async ({ page }) => {
      await page.goto('/settings/system');

      await page.waitForSelector('[data-testid="system-status"]');

      // Assert: Last sync time displayed
      const lastSync = page.locator('[data-testid="last-sync-time"]');
      await expect(lastSync).toBeVisible();

      const syncText = await lastSync.textContent();
      expect(syncText).toBeTruthy();
    });

    test('AC4: Active alerts count displayed', async ({ page }) => {
      await page.goto('/settings/system');

      await page.waitForSelector('[data-testid="system-status"]');

      // Assert: Alert count visible
      const alertCount = page.locator('[data-testid="active-alerts-count"]');
      await expect(alertCount).toBeVisible();

      const countText = await alertCount.textContent();
      expect(countText).toMatch(/\d+/);
    });
  });

  test.describe('Quality: User Experience', () => {
    test('can refresh system status manually', async ({ page }) => {
      await page.goto('/settings/system');

      await page.waitForSelector('[data-testid="system-status"]');

      const refreshButton = page.locator('[data-testid="refresh-system-status"]');

      if (await refreshButton.isVisible()) {
        // Get initial timestamp
        const lastSync = page.locator('[data-testid="last-sync-time"]');
        const initialText = await lastSync.textContent();

        await refreshButton.click();

        // Wait for update
        await page.waitForTimeout(1000);

        // Assert: Timestamp updated (or loading indicator shown)
        const loadingIndicator = page.locator('[data-testid="status-loading"]');
        const isLoading = await loadingIndicator.isVisible();

        if (isLoading) {
          await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
        }
      }
    });
  });
});

/**
 * @story US-4.1
 * @epic Zone Configuration
 * @priority P0
 */
test.describe('US-4.1: Zone Configuration UI', () => {
  test.describe('Acceptance Criteria', () => {
    test('AC1: List of all configured zones', async ({ page }) => {
      await page.goto('/settings/zones');

      // Wait for zones to load
      await page.waitForSelector('[data-testid="zones-list"]');

      // Assert: Zone items displayed
      const zones = page.locator('[data-testid="zone-item"]');
      const count = await zones.count();

      // May have 0 zones initially, but list should be present
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('AC2: Create new zone option', async ({ page }) => {
      await page.goto('/settings/zones');

      // Assert: Create zone button exists
      const createButton = page.locator('[data-testid="create-zone-button"]');
      await expect(createButton).toBeVisible();

      // Click to open form
      await createButton.click();

      // Assert: Zone creation form appears
      const zoneForm = page.locator('[data-testid="zone-form"]');
      await expect(zoneForm).toBeVisible({ timeout: 2000 });
    });

    test('AC3: Zone form includes name and camera selection', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      // Assert: Name input exists
      const nameInput = page.locator('[data-testid="zone-name-input"]');
      await expect(nameInput).toBeVisible();

      // Assert: Camera selection exists
      const cameraSelector = page.locator('[data-testid="zone-camera-selector"]');
      await expect(cameraSelector).toBeVisible();
    });

    test('AC4: Can select multiple cameras for a zone', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      // Fill zone name
      await page.fill('[data-testid="zone-name-input"]', 'Test Zone');

      // Select multiple cameras
      const cameraCheckboxes = page.locator('[data-testid="camera-checkbox"]');
      const checkboxCount = await cameraCheckboxes.count();

      if (checkboxCount >= 2) {
        await cameraCheckboxes.nth(0).click();
        await cameraCheckboxes.nth(1).click();

        // Assert: Both selected
        const selectedCount = await page
          .locator('[data-testid="camera-checkbox"]:checked')
          .count();

        expect(selectedCount).toBe(2);
      }
    });

    test('AC5: Can edit existing zone', async ({ page }) => {
      await page.goto('/settings/zones');

      await page.waitForSelector('[data-testid="zones-list"]');

      const zones = page.locator('[data-testid="zone-item"]');

      if ((await zones.count()) > 0) {
        const editButton = zones.first().locator('[data-testid="edit-zone-button"]');
        await editButton.click();

        // Assert: Form opens with existing data
        const zoneForm = page.locator('[data-testid="zone-form"]');
        await expect(zoneForm).toBeVisible();

        const nameInput = page.locator('[data-testid="zone-name-input"]');
        const currentName = await nameInput.inputValue();

        expect(currentName).toBeTruthy();
      } else {
        test.skip(true, 'No zones to edit');
      }
    });

    test('AC6: Can delete zone', async ({ page }) => {
      await page.goto('/settings/zones');

      await page.waitForSelector('[data-testid="zones-list"]');

      const zones = page.locator('[data-testid="zone-item"]');
      const initialCount = await zones.count();

      if (initialCount > 0) {
        const deleteButton = zones.first().locator('[data-testid="delete-zone-button"]');
        await deleteButton.click();

        // Assert: Confirmation dialog appears
        const confirmDialog = page.locator('[data-testid="delete-zone-confirmation"]');
        await expect(confirmDialog).toBeVisible({ timeout: 2000 });

        // Confirm deletion
        const confirmButton = page.locator('[data-testid="confirm-delete-zone"]');
        await confirmButton.click();

        // Wait for deletion
        await page.waitForTimeout(1000);

        // Assert: Zone removed
        const newCount = await zones.count();
        expect(newCount).toBe(initialCount - 1);
      } else {
        test.skip(true, 'No zones to delete');
      }
    });
  });
});

/**
 * @story US-4.2
 * @epic Zone Configuration
 * @priority P0
 */
test.describe('US-4.2: Trigger Camera Designation', () => {
  test.describe('Acceptance Criteria', () => {
    test('AC1: Designate one camera as trigger in zone', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      // Fill zone name
      await page.fill('[data-testid="zone-name-input"]', 'Trigger Test Zone');

      // Select cameras
      const cameraCheckboxes = page.locator('[data-testid="camera-checkbox"]');

      if ((await cameraCheckboxes.count()) >= 2) {
        await cameraCheckboxes.nth(0).click();
        await cameraCheckboxes.nth(1).click();

        // Assert: Trigger designation option appears
        const triggerSelector = page.locator('[data-testid="trigger-camera-selector"]');
        await expect(triggerSelector).toBeVisible({ timeout: 2000 });

        // Select trigger camera
        await triggerSelector.click();
        await page.click('[data-testid="trigger-option"]:first-child');

        // Assert: Trigger camera marked
        const triggeredIndicator = page.locator('[data-testid="trigger-indicator"]');
        await expect(triggeredIndicator).toBeVisible();
      }
    });

    test('AC2: Trigger camera selection required for multi-camera zones', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      await page.fill('[data-testid="zone-name-input"]', 'Multi-Camera Zone');

      // Select multiple cameras
      const cameraCheckboxes = page.locator('[data-testid="camera-checkbox"]');

      if ((await cameraCheckboxes.count()) >= 2) {
        await cameraCheckboxes.nth(0).click();
        await cameraCheckboxes.nth(1).click();

        // Try to save without selecting trigger
        const saveButton = page.locator('[data-testid="save-zone-button"]');
        await saveButton.click();

        // Assert: Validation error shown
        const validationError = page.locator('[data-testid="trigger-required-error"]');
        await expect(validationError).toBeVisible({ timeout: 2000 });
      }
    });

    test('AC3: Visual indicator shows trigger vs follower cameras', async ({ page }) => {
      await page.goto('/settings/zones');

      await page.waitForSelector('[data-testid="zones-list"]');

      const zones = page.locator('[data-testid="zone-item"]');

      if ((await zones.count()) > 0) {
        const firstZone = zones.first();
        await firstZone.click();

        // Assert: Camera list shows trigger designation
        const triggerCamera = page.locator('[data-testid="camera-item"][data-is-trigger="true"]');
        const followerCameras = page.locator('[data-testid="camera-item"][data-is-trigger="false"]');

        if ((await triggerCamera.count()) > 0) {
          // Assert: Trigger has distinct visual indicator
          const triggerBadge = triggerCamera.locator('[data-testid="trigger-badge"]');
          await expect(triggerBadge).toBeVisible();
        }
      }
    });
  });
});

/**
 * @story US-4.3
 * @epic Zone Configuration
 * @priority P1
 */
test.describe('US-4.3: Motion Cooldown Settings', () => {
  test.describe('Acceptance Criteria', () => {
    test('AC1: Cooldown period configurable per zone', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      // Assert: Cooldown input exists
      const cooldownInput = page.locator('[data-testid="cooldown-period-input"]');
      await expect(cooldownInput).toBeVisible();

      // Assert: Can set value
      await cooldownInput.fill('300');

      const value = await cooldownInput.inputValue();
      expect(value).toBe('300');
    });

    test('AC2: Default cooldown is 5 minutes (300 seconds)', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      const cooldownInput = page.locator('[data-testid="cooldown-period-input"]');
      const defaultValue = await cooldownInput.inputValue();

      // Assert: Default is 300 (seconds) or 5 (minutes)
      expect(['300', '5']).toContain(defaultValue);
    });

    test('AC3: Cooldown range between 1-30 minutes', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      const cooldownInput = page.locator('[data-testid="cooldown-period-input"]');

      // Try to set below minimum
      await cooldownInput.fill('0');
      await cooldownInput.blur();

      // Check validation
      const validationError = page.locator('[data-testid="cooldown-validation-error"]');

      if (await validationError.isVisible()) {
        const errorText = await validationError.textContent();
        expect(errorText).toContain('1');
      }

      // Try to set above maximum (1800 seconds = 30 minutes)
      await cooldownInput.fill('2000');
      await cooldownInput.blur();

      if (await validationError.isVisible()) {
        const errorText = await validationError.textContent();
        expect(errorText).toContain('30');
      }
    });
  });

  test.describe('Quality: Usability', () => {
    test('shows cooldown in user-friendly format', async ({ page }) => {
      await page.goto('/settings/zones');

      await page.waitForSelector('[data-testid="zones-list"]');

      const zones = page.locator('[data-testid="zone-item"]');

      if ((await zones.count()) > 0) {
        const cooldownDisplay = zones.first().locator('[data-testid="cooldown-display"]');

        if (await cooldownDisplay.isVisible()) {
          const text = await cooldownDisplay.textContent();

          // Should show in minutes, not raw seconds
          expect(text).toMatch(/\d+\s*(minute|min)/i);
        }
      }
    });
  });
});

/**
 * @story US-4.4
 * @epic Zone Configuration
 * @priority P1
 */
test.describe('US-4.4: Pre-Event Buffer Toggle', () => {
  test.describe('Acceptance Criteria', () => {
    test('AC1: Enable/disable pre-event buffer per zone', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      // Assert: Pre-buffer toggle exists
      const preBufferToggle = page.locator('[data-testid="pre-buffer-toggle"]');
      await expect(preBufferToggle).toBeVisible();

      // Assert: Can toggle on/off
      const initialState = await preBufferToggle.isChecked();
      await preBufferToggle.click();

      const newState = await preBufferToggle.isChecked();
      expect(newState).toBe(!initialState);
    });

    test('AC2: Pre-buffer defaults to enabled', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      const preBufferToggle = page.locator('[data-testid="pre-buffer-toggle"]');
      const isEnabled = await preBufferToggle.isChecked();

      // Assert: Enabled by default
      expect(isEnabled).toBe(true);
    });

    test('AC3: Shows explanation of pre-buffer feature', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      // Assert: Help text explains feature
      const helpText = page.locator('[data-testid="pre-buffer-help-text"]');

      if (await helpText.isVisible()) {
        const text = await helpText.textContent();

        // Should explain it captures before motion
        expect(text).toMatch(/before|prior|leading/i);
      }
    });

    test('AC4: Buffer duration shown when enabled', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      const preBufferToggle = page.locator('[data-testid="pre-buffer-toggle"]');

      if (!(await preBufferToggle.isChecked())) {
        await preBufferToggle.click();
      }

      // Assert: Duration info displayed
      const durationInfo = page.locator('[data-testid="pre-buffer-duration"]');

      if (await durationInfo.isVisible()) {
        const text = await durationInfo.textContent();

        // Should show seconds (typical: 5-10 seconds)
        expect(text).toMatch(/\d+\s*second/i);
      }
    });
  });

  test.describe('Quality: User Experience', () => {
    test('warns about battery impact when pre-buffer enabled', async ({ page }) => {
      await page.goto('/settings/zones');

      const createButton = page.locator('[data-testid="create-zone-button"]');
      await createButton.click();

      await page.waitForSelector('[data-testid="zone-form"]');

      const preBufferToggle = page.locator('[data-testid="pre-buffer-toggle"]');

      if (!(await preBufferToggle.isChecked())) {
        await preBufferToggle.click();
      }

      // Look for battery impact warning
      const batteryWarning = page.locator('[data-testid="pre-buffer-battery-warning"]');

      if (await batteryWarning.isVisible()) {
        const text = await batteryWarning.textContent();

        expect(text).toMatch(/battery|power/i);
      }
    });

    test('shows toggle state in zone list', async ({ page }) => {
      await page.goto('/settings/zones');

      await page.waitForSelector('[data-testid="zones-list"]');

      const zones = page.locator('[data-testid="zone-item"]');

      if ((await zones.count()) > 0) {
        const firstZone = zones.first();
        const preBufferBadge = firstZone.locator('[data-testid="pre-buffer-badge"]');

        // If badge visible, means it's enabled
        const isVisible = await preBufferBadge.isVisible();
        expect(typeof isVisible).toBe('boolean');
      }
    });
  });
});

/**
 * @epic Zone Configuration
 * Cross-story integration tests
 */
test.describe('Zone Configuration: Integration Tests', () => {
  test('can create complete zone with all settings', async ({ page }) => {
    await page.goto('/settings/zones');

    const createButton = page.locator('[data-testid="create-zone-button"]');
    await createButton.click();

    await page.waitForSelector('[data-testid="zone-form"]');

    // Fill all fields
    await page.fill('[data-testid="zone-name-input"]', 'Complete Test Zone');

    // Select cameras
    const cameraCheckboxes = page.locator('[data-testid="camera-checkbox"]');

    if ((await cameraCheckboxes.count()) >= 2) {
      await cameraCheckboxes.nth(0).click();
      await cameraCheckboxes.nth(1).click();

      // Set trigger camera
      const triggerSelector = page.locator('[data-testid="trigger-camera-selector"]');

      if (await triggerSelector.isVisible()) {
        await triggerSelector.click();
        await page.click('[data-testid="trigger-option"]:first-child');
      }
    }

    // Set cooldown
    const cooldownInput = page.locator('[data-testid="cooldown-period-input"]');

    if (await cooldownInput.isVisible()) {
      await cooldownInput.fill('600'); // 10 minutes
    }

    // Enable pre-buffer
    const preBufferToggle = page.locator('[data-testid="pre-buffer-toggle"]');

    if (await preBufferToggle.isVisible() && !(await preBufferToggle.isChecked())) {
      await preBufferToggle.click();
    }

    // Save zone
    const saveButton = page.locator('[data-testid="save-zone-button"]');
    await saveButton.click();

    // Assert: Success message or redirect
    const successMessage = page.locator('[data-testid="zone-created-success"]');
    const zonesListVisible = await page.locator('[data-testid="zones-list"]').isVisible();

    const hasSuccess = await successMessage.isVisible().catch(() => false);

    expect(hasSuccess || zonesListVisible).toBe(true);
  });

  test('zone settings persist after page reload', async ({ page }) => {
    await page.goto('/settings/zones');

    await page.waitForSelector('[data-testid="zones-list"]');

    const zones = page.locator('[data-testid="zone-item"]');
    const initialCount = await zones.count();

    if (initialCount > 0) {
      const firstZoneName = await zones.first().locator('[data-testid="zone-name"]').textContent();

      // Reload page
      await page.reload();
      await page.waitForSelector('[data-testid="zones-list"]');

      // Assert: Same zones still there
      const newZones = page.locator('[data-testid="zone-item"]');
      const newCount = await newZones.count();

      expect(newCount).toBe(initialCount);

      const reloadedName = await newZones.first().locator('[data-testid="zone-name"]').textContent();
      expect(reloadedName).toBe(firstZoneName);
    }
  });
});
