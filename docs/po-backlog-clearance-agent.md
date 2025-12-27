# Product Owner Backlog Clearance Agent

> Parallel TDD Sprint Orchestration: 9 Orchestrators × 9 Workers = 81 Parallel Execution Streams
> Mission: Clear prioritized backlog, regression test, retrospect, and prepare next sprint

## Agent Identity

```yaml
role: Product Owner Backlog Clearance Agent
authority: Full sprint backlog execution authority
scope: Clear P0-P2 backlog items in priority order
model: opus
parallel_capacity: 81 concurrent workers
input: reports/prioritized-backlog.json
output: Sprint completion report + next sprint backlog
```

## Mission Statement

Execute a complete backlog clearance sprint using 9 orchestrators, each managing 9 specialized TDD workers. Process backlog items in strict priority order (P0 → P1 → P2), ensuring each item is test-driven, verified, and documented before moving to the next priority level.

---

## Orchestrator Architecture

```
                         ┌──────────────────────────────────┐
                         │   PRODUCT OWNER CLEARANCE AGENT  │
                         │   (Backlog Authority)            │
                         └───────────────┬──────────────────┘
                                         │
     ┌───────┬───────┬───────┬───────┬───┴───┬───────┬───────┬───────┬───────┐
     ▼       ▼       ▼       ▼       ▼       ▼       ▼       ▼       ▼       ▼
 ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
 │ORCH-1││ORCH-2││ORCH-3││ORCH-4││ORCH-5││ORCH-6││ORCH-7││ORCH-8││ORCH-9│
 │ P0   ││ P0   ││ P0   ││ P1   ││ P1   ││ P1   ││ P1   ││ P2   ││REGRES│
 │BLK-01││BLK-02││BLK-03││GAP-01││GAP-02││GAP-03││GAP-04││IMPROV││& PLAN│
 └──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘
    │       │       │       │       │       │       │       │       │
 ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐ ┌──┴──┐
 │9 wkr│ │9 wkr│ │9 wkr│ │9 wkr│ │9 wkr│ │9 wkr│ │9 wkr│ │9 wkr│ │9 wkr│
 └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘
```

---

## Execution Model

```yaml
execution_model: priority_gated_parallel
phases:
  - name: "Gate 0: P0 Blockers (Parallel)"
    orchestrators: [ORCH-1, ORCH-2, ORCH-3]
    blocking: true
    gate_condition: "All P0 items complete with passing tests"

  - name: "Gate 1: P1 Gaps (Parallel)"
    orchestrators: [ORCH-4, ORCH-5, ORCH-6, ORCH-7]
    depends_on: [Gate 0]
    blocking: true
    gate_condition: "All P1 items complete with passing tests"

  - name: "Gate 2: P2 Improvements + Regression"
    orchestrators: [ORCH-8, ORCH-9]
    depends_on: [Gate 1]
    blocking: false
    output: Sprint completion report

backlog_source: "reports/prioritized-backlog.json"
```

---

## ORCHESTRATOR 1: P0 Blocker - Data TestIDs (BLK-001)

### Mission
Add remaining data-testid attributes to all components for E2E test stability.

### Worker Allocation (9 Workers)

| Worker | Component | TestIDs to Add |
|--------|-----------|----------------|
| W1.1 | EventCard.svelte | `event-card`, `event-type`, `event-timestamp`, `event-thumbnail` |
| W1.2 | StatCard.svelte | `stat-card`, `stat-value`, `stat-label` |
| W1.3 | Settings Page | `settings-section`, `setting-toggle`, `save-button` |
| W1.4 | Error Components | `error-message`, `error-retry`, `error-details` |
| W1.5 | Timeline Page | `event-list`, `event-filter`, `date-picker` |
| W1.6 | Devices Page | `device-list`, `device-detail`, `device-actions` |
| W1.7 | Navigation | `nav-item`, `nav-link`, `breadcrumb` |
| W1.8 | Modals | `modal-overlay`, `modal-content`, `modal-close` |
| W1.9 | Forms | `form-input`, `form-label`, `form-error`, `form-submit` |

### TDD Protocol

```yaml
worker_protocol:
  for_each_component:
    1_write_test:
      - Create E2E test for data-testid selector
      - Example: expect(page.locator('[data-testid="event-card"]')).toBeVisible()
      - Run test (expect FAIL)

    2_implement:
      - Add data-testid attribute to component
      - Add data-* attributes for state (data-status, data-type)
      - Preserve existing functionality

    3_verify:
      - Run test (expect PASS)
      - Run related E2E tests
      - Verify no regressions

    4_document:
      - Add testid to component documentation
      - Update selector inventory
```

### Worker W1.1: EventCard TestIDs

```typescript
// Test to write first
test('EventCard has proper test identifiers', async ({ page }) => {
  await page.goto('/timeline');

  const eventCard = page.locator('[data-testid="event-card"]').first();
  await expect(eventCard).toBeVisible();

  // Verify child elements
  await expect(eventCard.locator('[data-testid="event-type"]')).toBeVisible();
  await expect(eventCard.locator('[data-testid="event-timestamp"]')).toBeVisible();

  // Verify data attributes
  const eventType = await eventCard.getAttribute('data-event-type');
  expect(['motion', 'ding', 'on_demand']).toContain(eventType);
});
```

```svelte
<!-- Implementation in EventCard.svelte -->
<div
  data-testid="event-card"
  data-event-id={event.id}
  data-event-type={event.eventType}
  class="..."
>
  <span data-testid="event-type">{eventType}</span>
  <span data-testid="event-timestamp">{formatTime(event.createdAt)}</span>
  {#if event.thumbnailPath}
    <img data-testid="event-thumbnail" src={event.thumbnailPath} alt="" />
  {/if}
</div>
```

### Output Schema

```json
{
  "blocker_id": "BLK-001",
  "status": "complete",
  "components_updated": 9,
  "testids_added": 36,
  "tests_created": 9,
  "tests_passing": true,
  "files_modified": [
    "src/lib/components/EventCard.svelte",
    "src/lib/components/StatCard.svelte",
    "..."
  ]
}
```

---

## ORCHESTRATOR 2: P0 Blocker - Axe-Core Fix (BLK-002)

### Mission
Replace CDN-based axe-core with local @axe-core/playwright package in all accessibility tests.

### Worker Allocation (9 Workers)

| Worker | File/Section | Responsibility |
|--------|--------------|----------------|
| W2.1 | responsiveness.spec.ts - Setup | Create injectAxe helper, update imports |
| W2.2 | responsiveness.spec.ts - Color | Fix color contrast tests |
| W2.3 | responsiveness.spec.ts - Focus | Fix focus indicator tests |
| W2.4 | responsiveness.spec.ts - Images | Fix alt text tests |
| W2.5 | responsiveness.spec.ts - Forms | Fix label association tests |
| W2.6 | responsiveness.spec.ts - Headings | Fix heading hierarchy tests |
| W2.7 | responsiveness.spec.ts - ARIA | Fix ARIA role tests |
| W2.8 | responsiveness.spec.ts - Landmarks | Fix navigation landmark tests |
| W2.9 | comprehension.spec.ts | Fix any a11y tests in comprehension |

### TDD Protocol

```yaml
worker_W2.1_setup:
  file: tests/e2e/quality/responsiveness.spec.ts

  1_create_helper:
    path: tests/e2e/fixtures/axe-helper.ts
    content: |
      import { Page } from '@playwright/test';
      import AxeBuilder from '@axe-core/playwright';

      export async function checkAccessibility(
        page: Page,
        options?: { rules?: string[] }
      ) {
        const axeBuilder = new AxeBuilder({ page });

        if (options?.rules) {
          axeBuilder.withRules(options.rules);
        }

        const results = await axeBuilder.analyze();
        return results;
      }

      export async function expectNoViolations(
        page: Page,
        options?: { rules?: string[]; ignore?: string[] }
      ) {
        const results = await checkAccessibility(page, options);

        const violations = results.violations.filter(v =>
          !options?.ignore?.includes(v.id)
        );

        if (violations.length > 0) {
          const details = violations.map(v =>
            `${v.id}: ${v.description} (${v.nodes.length} instances)`
          ).join('\n');
          throw new Error(`Accessibility violations found:\n${details}`);
        }
      }

  2_update_imports:
    before: |
      await page.addScriptTag({
        url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js',
      });
    after: |
      import { checkAccessibility, expectNoViolations } from '../fixtures/axe-helper';

  3_verify:
    - Run npm run test:e2e -- tests/e2e/quality/responsiveness.spec.ts
    - Verify no CDN requests in network tab
    - All a11y tests should run (pass or fail based on app state)

worker_W2.2_color_contrast:
  test_update:
    before: |
      await page.addScriptTag({ url: CDN_URL });
      const results = await page.evaluate(() => {
        // @ts-ignore
        return axe.run({ runOnly: ['color-contrast'] });
      });
    after: |
      const results = await checkAccessibility(page, {
        rules: ['color-contrast']
      });
      expect(results.violations).toHaveLength(0);
```

### Output Schema

```json
{
  "blocker_id": "BLK-002",
  "status": "complete",
  "cdn_references_removed": 12,
  "tests_updated": 15,
  "helper_file_created": "tests/e2e/fixtures/axe-helper.ts",
  "tests_passing": true
}
```

---

## ORCHESTRATOR 3: P0 Blocker - Test Database Seeding (BLK-003)

### Mission
Create comprehensive test database seeding for realistic E2E test execution.

### Worker Allocation (9 Workers)

| Worker | Responsibility | Data Type |
|--------|---------------|-----------|
| W3.1 | Global Setup | Create setup file, database init |
| W3.2 | Device Seeding | Seed 6 devices (cameras, doorbells, sensors) |
| W3.3 | Event Seeding | Seed 20 events with various types |
| W3.4 | Recording Seeding | Seed 10 recordings with mock video files |
| W3.5 | User Seeding | Ensure admin user, create test user |
| W3.6 | Zone Seeding | Seed 2 zones (front, garden) |
| W3.7 | Alert Seeding | Seed battery alerts, offline alerts |
| W3.8 | Cleanup | Create teardown for test isolation |
| W3.9 | Integration | Wire seeding into playwright global setup |

### TDD Protocol

```yaml
worker_W3.1_global_setup:
  file: tests/setup/global-setup.ts

  implementation: |
    import { chromium, FullConfig } from '@playwright/test';
    import { seedDatabase, cleanDatabase } from './seed-db';

    async function globalSetup(config: FullConfig) {
      // Initialize test database
      await cleanDatabase();
      await seedDatabase();

      // Perform authentication
      const browser = await chromium.launch();
      const page = await browser.newPage();

      await page.goto('http://localhost:5173/login');
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'admin');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Save auth state
      await page.context().storageState({ path: 'playwright/.auth/user.json' });
      await browser.close();
    }

    export default globalSetup;

worker_W3.2_device_seeding:
  file: tests/setup/seed-db.ts

  devices: |
    export const testDevices = [
      {
        id: 'test-doorbell-front',
        name: 'Front Door',
        type: 'doorbell',
        batteryLevel: 85,
        isOnline: true,
        location: 'front'
      },
      {
        id: 'test-camera-backyard',
        name: 'Backyard',
        type: 'camera',
        batteryLevel: 45,
        isOnline: true,
        location: 'garden'
      },
      {
        id: 'test-camera-garage',
        name: 'Garage',
        type: 'camera',
        batteryLevel: 15,  // Low battery for testing
        isOnline: true,
        location: 'front'
      },
      {
        id: 'test-camera-kitchen',
        name: 'Kitchen',
        type: 'camera',
        batteryLevel: null,  // Wired
        isOnline: true,
        location: 'garden'
      },
      {
        id: 'test-sensor-door',
        name: 'Back Door',
        type: 'sensor',
        subtype: 'contact',
        isOnline: true,
        faulted: false
      },
      {
        id: 'test-camera-offline',
        name: 'Side Gate',
        type: 'camera',
        batteryLevel: 0,
        isOnline: false,  // Offline for testing
        lastSeen: new Date(Date.now() - 86400000)  // 1 day ago
      }
    ];

worker_W3.3_event_seeding:
  events: |
    export function generateTestEvents(devices: Device[]) {
      const events = [];
      const now = Date.now();

      for (let i = 0; i < 20; i++) {
        const device = devices[i % devices.length];
        const eventTypes = ['motion', 'ding', 'on_demand'];

        events.push({
          id: `test-event-${i}`,
          deviceId: device.id,
          eventType: eventTypes[i % eventTypes.length],
          createdAt: new Date(now - i * 3600000),  // Hourly
          thumbnailPath: `/test-data/thumb-${i}.jpg`,
          recordingPath: i < 10 ? `/test-data/recording-${i}.mp4` : null,
          zoneTriggered: device.location === 'front' ? 'front' : 'garden'
        });
      }

      return events;
    }

worker_W3.6_zone_seeding:
  zones: |
    export const testZones = [
      {
        id: 'zone-front',
        name: 'Front Zone',
        triggerCameras: ['test-doorbell-front'],
        recordCameras: ['test-doorbell-front', 'test-camera-garage'],
        cooldownSeconds: 7,
        preBufferEnabled: false
      },
      {
        id: 'zone-garden',
        name: 'Garden Zone',
        triggerCameras: ['test-camera-backyard'],
        recordCameras: ['test-camera-backyard', 'test-camera-kitchen'],
        cooldownSeconds: 7,
        preBufferEnabled: true
      }
    ];
```

### Output Schema

```json
{
  "blocker_id": "BLK-003",
  "status": "complete",
  "files_created": [
    "tests/setup/global-setup.ts",
    "tests/setup/seed-db.ts",
    "tests/setup/teardown.ts"
  ],
  "test_data": {
    "devices": 6,
    "events": 20,
    "recordings": 10,
    "zones": 2
  },
  "playwright_config_updated": true
}
```

---

## ORCHESTRATOR 4: P1 Gap - Battery Warning Banner (GAP-001)

### Mission
Implement dashboard-level battery warning banner component with dismiss and snooze functionality.

### Worker Allocation (9 Workers)

| Worker | Responsibility |
|--------|---------------|
| W4.1 | Write E2E tests for battery banner |
| W4.2 | Create BatteryWarningBanner.svelte component |
| W4.3 | Implement banner logic (20% warning) |
| W4.4 | Implement critical banner (10% warning) |
| W4.5 | Add dismiss functionality |
| W4.6 | Add snooze functionality (1 hour) |
| W4.7 | Integrate with dashboard |
| W4.8 | Add persistence (localStorage) |
| W4.9 | Verify all tests pass |

### TDD Protocol

```yaml
worker_W4.1_tests:
  file: tests/e2e/ux/battery-banner.spec.ts

  tests: |
    import { test, expect } from '@playwright/test';

    test.describe('Battery Warning Banner', () => {
      test('shows warning when camera battery below 20%', async ({ page }) => {
        await page.goto('/');

        const banner = page.locator('[data-testid="battery-warning-banner"]');
        await expect(banner).toBeVisible();

        const text = await banner.textContent();
        expect(text).toContain('low battery');
      });

      test('shows critical alert when battery below 10%', async ({ page }) => {
        await page.goto('/');

        const criticalBanner = page.locator('[data-testid="critical-battery-banner"]');
        // Should be visible if seeded device has <10% battery

        if (await criticalBanner.isVisible()) {
          const bgColor = await criticalBanner.evaluate(el =>
            getComputedStyle(el).backgroundColor
          );
          // Should be red-ish
          expect(bgColor).toMatch(/rgb\(2[0-5]\d,/);
        }
      });

      test('can dismiss warning banner', async ({ page }) => {
        await page.goto('/');

        const banner = page.locator('[data-testid="battery-warning-banner"]');

        if (await banner.isVisible()) {
          const dismissBtn = banner.locator('[data-testid="dismiss-banner"]');
          await dismissBtn.click();

          await expect(banner).not.toBeVisible();
        }
      });

      test('can snooze warning for 1 hour', async ({ page }) => {
        await page.goto('/');

        const banner = page.locator('[data-testid="battery-warning-banner"]');

        if (await banner.isVisible()) {
          const snoozeBtn = banner.locator('[data-testid="snooze-banner"]');
          await snoozeBtn.click();

          await expect(banner).not.toBeVisible();

          // Reload - should still be hidden (snoozed)
          await page.reload();
          await expect(banner).not.toBeVisible({ timeout: 2000 });
        }
      });
    });

worker_W4.2_component:
  file: src/lib/components/BatteryWarningBanner.svelte

  implementation: |
    <script lang="ts">
      import type { Device } from '$lib/types';

      interface Props {
        devices: Device[];
        onDismiss?: () => void;
        onSnooze?: () => void;
      }

      let { devices, onDismiss, onSnooze }: Props = $props();

      const lowBatteryDevices = $derived(
        devices.filter(d => d.batteryLevel !== null && d.batteryLevel <= 20)
      );

      const criticalDevices = $derived(
        devices.filter(d => d.batteryLevel !== null && d.batteryLevel <= 10)
      );

      const isCritical = $derived(criticalDevices.length > 0);
      const hasWarning = $derived(lowBatteryDevices.length > 0);
    </script>

    {#if hasWarning}
      <div
        data-testid={isCritical ? 'critical-battery-banner' : 'battery-warning-banner'}
        class="rounded-lg p-4 mb-4 {isCritical ? 'bg-red-100 border-red-500' : 'bg-yellow-100 border-yellow-500'} border"
        role="alert"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="h-5 w-5 {isCritical ? 'text-red-600' : 'text-yellow-600'}" ...>
              <!-- Battery icon -->
            </svg>
            <span class="{isCritical ? 'text-red-800' : 'text-yellow-800'}">
              {#if isCritical}
                Critical: {criticalDevices.length} device(s) need charging immediately
              {:else}
                {lowBatteryDevices.length} device(s) have low battery
              {/if}
            </span>
          </div>

          <div class="flex gap-2">
            <button
              data-testid="snooze-banner"
              onclick={onSnooze}
              class="text-sm px-2 py-1 rounded hover:bg-white/50"
            >
              Snooze 1h
            </button>
            <button
              data-testid="dismiss-banner"
              onclick={onDismiss}
              class="text-sm px-2 py-1 rounded hover:bg-white/50"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    {/if}
```

---

## ORCHESTRATOR 5: P1 Gap - Pre-Buffer Toggle (GAP-002)

### Mission
Implement pre-event buffer toggle in zone settings with battery impact warning.

### Worker Allocation (9 Workers)

| Worker | Responsibility |
|--------|---------------|
| W5.1 | Write E2E tests for pre-buffer toggle |
| W5.2 | Create toggle component |
| W5.3 | Add to zone settings form |
| W5.4 | Implement battery warning display |
| W5.5 | Add buffer duration selector |
| W5.6 | Persist settings to database |
| W5.7 | Integrate with camera-buffer.ts |
| W5.8 | Update zone management API |
| W5.9 | Verify all tests pass |

---

## ORCHESTRATOR 6: P1 Gap - Type Error Fixes (GAP-003)

### Mission
Fix all 35 pre-existing TypeScript errors in application components.

### Worker Allocation (9 Workers)

| Worker | File | Error Count |
|--------|------|-------------|
| W6.1 | devices/[id]/+page.svelte | 12 errors (null checks) |
| W6.2 | Modal.svelte | 3 errors (a11y) |
| W6.3 | Input.svelte | 1 error (state reference) |
| W6.4 | Select.svelte | 1 error (state reference) |
| W6.5 | EventCard.svelte | 1 error (state reference) |
| W6.6 | timeline/+page.svelte | 4 errors (label association) |
| W6.7 | settings/+page.svelte | 8 errors (label association) |
| W6.8 | Other components | Remaining errors |
| W6.9 | Final verification | Run npm run check |

### TDD Protocol

```yaml
worker_W6.1_device_page:
  file: src/routes/(app)/devices/[id]/+page.svelte

  errors:
    - "'device' is possibly 'null'" (12 instances)

  fix_pattern:
    before: |
      {device.name}
    after: |
      {#if device}
        {device.name}
      {/if}

    # OR use optional chaining in expressions
    before: |
      <p>{device.location}</p>
    after: |
      <p>{device?.location ?? 'Unknown'}</p>

  verification:
    - npm run check passes for this file
    - Page still renders correctly
    - No runtime errors

worker_W6.2_modal:
  file: src/lib/components/ui/Modal.svelte

  errors:
    - "Elements with 'dialog' role must have tabindex"
    - "Click events need key events"
    - "Button needs aria-label"

  fixes:
    - Add tabindex="0" to dialog div
    - Add onkeydown handler for Escape
    - Add aria-label="Close" to close button
```

---

## ORCHESTRATOR 7: P1 Gap - Missing Requirement Tests (GAP-004)

### Mission
Add comprehensive tests for BR-3 (30-day retention), BR-4 (auto-terminate), BO-3 (cloud reduction).

### Worker Allocation (9 Workers)

| Worker | Requirement | Tests to Create |
|--------|-------------|-----------------|
| W7.1 | BR-3 Setup | Create retention test file |
| W7.2 | BR-3 Tests | 30-day retention verification |
| W7.3 | BR-3 Tests | Auto-cleanup of old recordings |
| W7.4 | BR-4 Setup | Create live view timeout tests |
| W7.5 | BR-4 Tests | 5-minute auto-terminate with clock mock |
| W7.6 | BR-4 Tests | 4:30 warning display |
| W7.7 | BO-3 Setup | Create cloud independence tests |
| W7.8 | BO-3 Tests | Verify local storage only |
| W7.9 | Integration | Verify all new tests pass |

### TDD Protocol

```yaml
worker_W7.5_live_view_timeout:
  file: tests/e2e/business/live-view-timeout.spec.ts

  implementation: |
    import { test, expect } from '@playwright/test';

    test.describe('BR-4: Live View Auto-Termination', () => {
      test.beforeEach(async ({ page }) => {
        // Use Playwright's clock API for time manipulation
        await page.clock.install();
      });

      test('shows warning at 4:30', async ({ page }) => {
        await page.goto('/');

        // Start live view
        const liveViewBtn = page.locator('[data-testid="live-view-button"]').first();
        await liveViewBtn.click();

        // Fast-forward 4:30
        await page.clock.fastForward('04:30');

        // Check for warning
        const warning = page.locator('[data-testid="live-view-timeout-warning"]');
        await expect(warning).toBeVisible();
        await expect(warning).toContainText('30 seconds');
      });

      test('auto-terminates at 5:00', async ({ page }) => {
        await page.goto('/');

        // Start live view
        const liveViewBtn = page.locator('[data-testid="live-view-button"]').first();
        await liveViewBtn.click();

        const modal = page.locator('[data-testid="live-view-modal"]');
        await expect(modal).toBeVisible();

        // Fast-forward 5 minutes
        await page.clock.fastForward('05:00');

        // Modal should be closed
        await expect(modal).not.toBeVisible();
      });

      test('can extend session before timeout', async ({ page }) => {
        await page.goto('/');

        // Start live view and fast-forward to warning
        const liveViewBtn = page.locator('[data-testid="live-view-button"]').first();
        await liveViewBtn.click();
        await page.clock.fastForward('04:30');

        // Click extend
        const extendBtn = page.locator('[data-testid="extend-session"]');
        await extendBtn.click();

        // Fast-forward another 4:30 - should still be open
        await page.clock.fastForward('04:30');

        const modal = page.locator('[data-testid="live-view-modal"]');
        await expect(modal).toBeVisible();
      });
    });
```

---

## ORCHESTRATOR 8: P2 Improvements

### Mission
Implement performance and accessibility improvements.

### Worker Allocation (9 Workers)

| Worker | Focus Area | Improvements |
|--------|-----------|--------------|
| W8.1 | Dashboard Performance | Lazy loading, code splitting |
| W8.2 | API Caching | Add response caching |
| W8.3 | Image Optimization | Lazy load thumbnails |
| W8.4 | A11y - Color Contrast | Fix contrast issues |
| W8.5 | A11y - Focus States | Visible focus indicators |
| W8.6 | A11y - Screen Reader | ARIA labels, live regions |
| W8.7 | A11y - Keyboard Nav | Tab order, shortcuts |
| W8.8 | A11y - Labels | Form label associations |
| W8.9 | Performance Testing | Verify improvements |

---

## ORCHESTRATOR 9: Regression, Retrospective & Planning

### Mission
Execute full regression suite, document sprint results, and prepare next sprint backlog.

### Worker Allocation (9 Workers)

| Worker | Phase | Responsibility |
|--------|-------|----------------|
| W9.1 | Regression | Run unit tests |
| W9.2 | Regression | Run E2E business tests |
| W9.3 | Regression | Run E2E UX tests |
| W9.4 | Regression | Run E2E quality tests |
| W9.5 | Regression | Run E2E dependency tests |
| W9.6 | Analysis | Compare before/after metrics |
| W9.7 | Retrospective | Document lessons learned |
| W9.8 | Backlog | Identify remaining gaps |
| W9.9 | Planning | Prioritize next sprint |

### Execution Protocol

```yaml
phase_regression:
  worker_W9.1:
    command: "npm run test:unit"
    success_criteria: "100% pass rate"

  worker_W9.2:
    command: "npm run test:e2e -- tests/e2e/business/"
    capture: pass_rate, failures

  worker_W9.3:
    command: "npm run test:e2e -- tests/e2e/ux/"
    capture: pass_rate, failures

  worker_W9.4:
    command: "npm run test:e2e -- tests/e2e/quality/"
    capture: pass_rate, a11y_violations

  worker_W9.5:
    command: "npm run test:e2e -- tests/e2e/dependencies/"
    capture: pass_rate, dependency_status

phase_analysis:
  worker_W9.6:
    compare:
      before: "reports/test-results.json"
      after: "reports/test-results-post-sprint.json"
    metrics:
      - tests_passing_delta
      - failures_resolved
      - new_failures
      - coverage_improvement

phase_retrospective:
  worker_W9.7:
    template: |
      # Sprint Retrospective

      ## Backlog Clearance Summary
      | Priority | Items | Completed | Remaining |
      |----------|-------|-----------|-----------|
      | P0 | 3 | X | Y |
      | P1 | 4 | X | Y |
      | P2 | 2 | X | Y |

      ## What Went Well
      - ...

      ## What Could Improve
      - ...

      ## Action Items
      - ...

phase_planning:
  worker_W9.8:
    identify:
      - Incomplete backlog items
      - New gaps discovered
      - Technical debt
      - Feature requests

  worker_W9.9:
    prioritize:
      criteria:
        - Production blocking
        - User impact
        - Effort vs value
        - Dependencies
    output: "reports/next-sprint-backlog.json"
```

---

## Gate Conditions

```yaml
gate_0_p0_complete:
  condition: "All P0 blockers resolved"
  verification:
    - BLK-001: All data-testids added, E2E selectors working
    - BLK-002: Axe-core local, no CDN requests
    - BLK-003: Test seeding functional, realistic data available
  pass_criteria:
    - npm run check: 0 new errors
    - npm run test:unit: 100% pass
    - E2E selector failures: -90%

gate_1_p1_complete:
  condition: "All P1 gaps resolved"
  verification:
    - GAP-001: Battery banner visible and functional
    - GAP-002: Pre-buffer toggle in settings
    - GAP-003: Type errors fixed (0 errors)
    - GAP-004: Requirement tests passing
  pass_criteria:
    - npm run check: 0 errors
    - All new tests passing
    - Requirements coverage: 100%

gate_2_sprint_complete:
  condition: "Sprint deliverables complete"
  verification:
    - P2 improvements applied
    - Regression tests passing
    - Retrospective documented
    - Next sprint planned
  pass_criteria:
    - E2E pass rate: >90%
    - Unit test pass rate: 100%
    - A11y violations: -50%
```

---

## Execution Commands

```bash
# Phase 0: Run P0 blockers in parallel
npm run test:unit  # Baseline

# After Gate 0 passes
npm run test:e2e -- --project=setup  # Verify auth

# After Gate 1 passes
npm run test:e2e  # Full regression

# Final verification
npm run check && npm run test:all
```

---

## Output Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Unit Results | `reports/unit-results.json` | Unit test results |
| E2E Results | `reports/test-results-post-sprint.json` | Post-sprint E2E |
| Comparison | `reports/sprint-comparison.json` | Before/after delta |
| Retrospective | `reports/sprint-2-retrospective.md` | Sprint retrospective |
| Next Backlog | `reports/next-sprint-backlog.json` | Prioritized backlog |

---

## Success Criteria

```yaml
sprint_success:
  p0_blockers: 0 remaining
  p1_gaps: 0 remaining
  p2_improvements: 80%+ complete

  metrics:
    unit_tests: 100% pass
    e2e_tests: >90% pass
    type_errors: 0
    a11y_violations: -50% from baseline

  deliverables:
    - All data-testids added
    - Axe-core localized
    - Test seeding functional
    - Battery banner implemented
    - Pre-buffer toggle implemented
    - Type errors fixed
    - Requirement tests added
    - Retrospective complete
    - Next sprint planned
```

---

*Product Owner Backlog Clearance Agent v1.0*
*81 Parallel Workers | 9 Orchestrators | Priority-Gated Execution*
