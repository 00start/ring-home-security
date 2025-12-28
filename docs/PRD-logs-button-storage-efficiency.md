# Product Requirements Document (PRD)
## Ring Home Security Dashboard - Feature Enhancements

**Document Version:** 1.0
**Date:** 2025-12-28
**Author:** Chief Product Officer
**Status:** Ready for Engineering Review

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Feature 1: System Logs Quick Access Button](#feature-1-system-logs-quick-access-button)
3. [Feature 2: Storage Efficiency Improvements](#feature-2-storage-efficiency-improvements)
4. [Priority and Dependencies](#priority-and-dependencies)
5. [Appendix: Technical Context](#appendix-technical-context)

---

## Executive Summary

This PRD outlines requirements for two features designed to improve the Ring Home Security dashboard:

1. **System Logs Quick Access Button** - Simplifies the timeline page by replacing the embedded LogViewer with a navigation button, reducing visual clutter and page load overhead.

2. **Storage Efficiency Improvements** - A comprehensive suite of optimizations to reduce storage consumption for video recordings, including compression enhancements, smart retention policies, quality tiering, and deduplication strategies.

---

## Feature 1: System Logs Quick Access Button

### Overview

Replace the embedded `LogViewer` component on the timeline page (`/src/routes/(app)/timeline/+page.svelte`) with a compact button that navigates users to the Settings page Logs section (`/settings#logs`).

### Problem Statement

The current implementation includes a compact `LogViewer` component in the timeline page header. Analysis shows:
- The LogViewer fetches data on mount and sets up auto-refresh intervals (5-second polling)
- It consumes vertical space in the page header area
- System logs are a developer/admin tool, not frequently accessed during normal timeline browsing
- The component adds unnecessary network overhead and complexity to the primary user flow

### User Stories

#### US-1.1: Quick Navigation to Logs
**As a** system administrator
**I want** a simple button to access system logs from the timeline page
**So that** I can quickly troubleshoot issues without the logs cluttering my main view

#### US-1.2: Cleaner Timeline Interface
**As a** homeowner viewing my security events
**I want** the timeline page to focus on events and recordings
**So that** I can monitor my home without distractions from system information

#### US-1.3: Reduced Page Load Time
**As a** user with limited bandwidth
**I want** the timeline page to load faster
**So that** I can quickly review security events when needed

### Acceptance Criteria

#### AC-1.1: Button Presence and Visibility
```gherkin
Given I am authenticated and on the timeline page
When the page loads
Then I should see a "View Logs" button in the page header area
And the button should have an appropriate icon (e.g., document/terminal icon)
And the button should be styled consistently with other secondary actions
```

#### AC-1.2: Navigation Functionality
```gherkin
Given I am on the timeline page
When I click the "View Logs" button
Then I should be navigated to "/settings#logs"
And the logs section should be scrolled into view
And the LogViewer component should be fully visible
```

#### AC-1.3: Embedded LogViewer Removal
```gherkin
Given I am on the timeline page
When the page loads
Then there should be no LogViewer component rendered inline
And there should be no log-related API calls (/api/logs) on page load
And the page should not establish any log polling intervals
```

#### AC-1.4: Keyboard Accessibility
```gherkin
Given I am on the timeline page
When I navigate using keyboard (Tab key)
Then the "View Logs" button should be focusable
And pressing Enter or Space should activate the navigation
And the button should have proper aria-label for screen readers
```

#### AC-1.5: Responsive Design
```gherkin
Given I am viewing the timeline page on various screen sizes
When the viewport width changes
Then the button should remain visible and accessible
And on mobile, the button may be represented as an icon-only variant
```

### Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|-------------------|
| Timeline page initial load time | Current (with LogViewer) | -200ms reduction | Lighthouse/Performance API |
| Network requests on timeline load | Current count | -2 requests (logs API + polling) | Network tab analysis |
| Timeline page bundle size | Current | -5KB reduction | Build analysis |
| User complaints about timeline clutter | Baseline | 50% reduction | User feedback surveys |
| Log access rate from timeline | Measure current usage | Maintain or improve | Analytics tracking |

### Technical Requirements

#### TR-1.1: Component Changes
- **File:** `/src/routes/(app)/timeline/+page.svelte`
- **Action:** Remove `LogViewer` import and component usage
- **Action:** Add navigation button component in the same location

#### TR-1.2: Button Implementation
```svelte
<!-- Proposed implementation -->
<Button
  variant="secondary"
  size="sm"
  href="/settings#logs"
  aria-label="View system logs"
>
  <svg><!-- Log/terminal icon --></svg>
  <span class="hidden sm:inline ml-2">View Logs</span>
</Button>
```

#### TR-1.3: Settings Page Hash Navigation
- Ensure `/settings#logs` properly scrolls to the logs section
- The existing `IntersectionObserver` in settings page already handles section highlighting
- The `scrollToSection` function exists and should work with hash navigation

#### TR-1.4: Performance Verification
- Verify no log API calls occur on timeline page load
- Confirm no polling intervals are established
- Measure and document load time improvement

### Test Requirements

#### Unit Tests (Vitest)
```typescript
// tests/unit/timeline-logs-button.test.ts
describe('Timeline Logs Button', () => {
  it('should render a navigation button instead of LogViewer');
  it('should link to /settings#logs');
  it('should have proper accessibility attributes');
  it('should not import or render LogViewer component');
});
```

#### E2E Tests (Playwright)
```typescript
// tests/e2e/ux/timeline-logs-navigation.spec.ts
test.describe('Timeline to Logs Navigation', () => {
  test('AC1: View Logs button is visible on timeline page');
  test('AC2: Clicking button navigates to settings logs section');
  test('AC3: No LogViewer component rendered on timeline');
  test('AC4: Button is keyboard accessible');
  test('AC5: Button responsive behavior on mobile');
});
```

#### Performance Tests
```typescript
// tests/e2e/quality/timeline-performance.spec.ts
test('Timeline page does not make log API requests on load');
test('Timeline page loads within performance budget');
```

---

## Feature 2: Storage Efficiency Improvements

### Overview

Implement a comprehensive suite of storage optimization strategies to reduce disk usage for video recordings while maintaining quality and accessibility. The current system stores recordings at `/{deviceId}/{YYYY}/{MM}/{DD}/{timestamp}.mp4` with 30-day retention.

### Problem Statement

Video recordings consume significant storage space. Current implementation:
- Uses fixed CRF 23 encoding (moderate quality, moderate size)
- Generates thumbnails at 320px width
- Applies uniform 30-day retention regardless of event importance
- No deduplication for similar/redundant clips
- No quality tiering based on event significance

### User Stories

#### US-2.1: Adaptive Video Compression
**As a** system administrator
**I want** video recordings to be optimized based on content and importance
**So that** I can store more recordings without sacrificing critical footage quality

#### US-2.2: Smart Retention Policies
**As a** homeowner
**I want** important security events retained longer than routine motion
**So that** significant incidents are preserved while routine clips are cleaned up sooner

#### US-2.3: Quality Tiering
**As a** storage-conscious user
**I want** the option to store lower quality versions of older recordings
**So that** I can keep more historical data within my storage limits

#### US-2.4: Duplicate Detection
**As a** user with multiple cameras covering overlapping areas
**I want** redundant footage to be identified and consolidated
**So that** I don't waste storage on duplicate views of the same event

#### US-2.5: Thumbnail Optimization
**As a** user browsing through events
**I want** thumbnails to load quickly without consuming excessive storage
**So that** I can efficiently navigate my event history

#### US-2.6: Storage Dashboard
**As a** system administrator
**I want** visibility into storage usage patterns and optimization opportunities
**So that** I can make informed decisions about storage management

### Acceptance Criteria

#### AC-2.1: Adaptive Compression (Video)
```gherkin
Given a new video recording is queued for transcoding
When the transcode worker processes the job
Then it should analyze the content (motion, lighting, complexity)
And apply appropriate CRF value (18-28 based on analysis)
And doorbell ring events should use CRF 18-20 (higher quality)
And routine motion events should use CRF 23-26 (standard quality)
And static/low-activity segments should use CRF 26-28 (space efficient)
```

#### AC-2.2: Smart Retention Tiers
```gherkin
Given recordings with different event types exist
When the retention worker runs
Then "ding" (doorbell) events should be retained for 60 days
And "motion" events should be retained for 30 days
And "device_online/offline" events should be retained for 14 days
And events with user-applied "starred" flag should be retained for 90 days
And the retention configuration should be user-configurable
```

#### AC-2.3: Quality Tiering (Aging Videos)
```gherkin
Given a recording is older than 14 days
When the storage optimization worker runs
Then it should check if a lower-quality archive version exists
And if not, create a compressed archive version (CRF 28, 720p max)
And update the database to reference the archived version
And delete the original high-quality version
And retain the original for "starred" or high-priority events
```

#### AC-2.4: Deduplication Detection
```gherkin
Given multiple cameras detected motion at the same time (within 5 seconds)
When analyzing for deduplication opportunities
Then the system should identify overlapping event clusters
And present deduplication suggestions to the user
And allow users to designate a "primary" recording for each cluster
And optionally auto-archive secondary recordings at lower quality
```

#### AC-2.5: Thumbnail Optimization
```gherkin
Given a new thumbnail is generated
When the ffmpeg thumbnail command executes
Then it should use WebP format instead of JPEG
And limit dimensions to 280px width (reduced from 320px)
And apply quality setting of 80 (WebP)
And the average thumbnail size should be under 15KB
```

#### AC-2.6: Storage Analytics Dashboard
```gherkin
Given I navigate to Settings > Storage
When the storage dashboard loads
Then I should see total storage used vs. available
And I should see storage breakdown by device
And I should see storage breakdown by event type
And I should see "potential savings" from optimization opportunities
And I should see storage trend over time (last 30 days)
```

#### AC-2.7: Configurable Optimization Settings
```gherkin
Given I am on the storage settings page
When I view optimization options
Then I should be able to enable/disable auto-archiving
And I should be able to set quality tier thresholds
And I should be able to configure per-event-type retention days
And I should be able to mark specific recordings as "protected"
```

### Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|-------------------|
| Average video file size (30s clip) | ~2.5MB | ~1.8MB (-28%) | Database file_size analysis |
| Average thumbnail size | ~25KB | ~12KB (-52%) | File system analysis |
| Storage used after 30 days (constant event rate) | Baseline | 35% reduction | Storage monitoring |
| Recordings fitting in 100GB | ~40,000 clips | ~60,000 clips | Capacity planning |
| Archive compression ratio | N/A | 50% size reduction | Archiver statistics |
| User-reported storage warnings | Baseline | 60% reduction | Alert frequency |

### Technical Requirements

#### TR-2.1: Adaptive Compression Engine
- **New File:** `/src/lib/services/compression-analyzer.ts`
- **Purpose:** Analyze video content to determine optimal CRF
- **Integration:** Called by transcode-worker before ffmpeg execution

```typescript
interface CompressionAnalysis {
  recommendedCrf: number;       // 18-28
  contentComplexity: 'high' | 'medium' | 'low';
  motionLevel: 'high' | 'medium' | 'low';
  eventPriority: 'critical' | 'standard' | 'routine';
}

function analyzeForCompression(
  videoPath: string,
  eventType: EventType
): Promise<CompressionAnalysis>;
```

#### TR-2.2: Tiered Retention Configuration
- **Modify:** `/src/lib/config/index.ts`
- **New Schema:**
```typescript
retentionConfig: z.object({
  defaultDays: z.number().default(30),
  byEventType: z.record(z.number()).default({
    ding: 60,
    motion: 30,
    door_open: 45,
    door_close: 45,
    device_offline: 14,
    device_online: 14
  }),
  starredRetentionDays: z.number().default(90),
  enableAutoArchive: z.boolean().default(true),
  archiveAfterDays: z.number().default(14)
})
```

#### TR-2.3: Archive Worker
- **New File:** `/src/workers/archive-worker.ts`
- **Purpose:** Compress aging videos to smaller archive format
- **Schedule:** Daily, during low-activity hours
- **Process:**
  1. Query recordings older than `archiveAfterDays`
  2. Skip protected/starred recordings
  3. Re-encode at CRF 28, 720p max resolution
  4. Update database with new file path and size
  5. Delete original file

#### TR-2.4: Thumbnail Format Migration
- **Modify:** `/src/workers/transcode-worker.ts`
- **Change:** Update `generateThumbnail` function

```typescript
// Current:
const args = ['-i', videoPath, '-ss', '00:00:01', '-vframes', '1',
              '-vf', 'scale=320:-1', '-y', thumbnailPath];

// New:
const args = ['-i', videoPath, '-ss', '00:00:01', '-vframes', '1',
              '-vf', 'scale=280:-1', '-c:v', 'libwebp', '-quality', '80',
              '-y', thumbnailPath.replace('.jpg', '.webp')];
```

#### TR-2.5: Deduplication Service
- **New File:** `/src/lib/services/deduplication-analyzer.ts`
- **Purpose:** Identify temporally related recordings for potential consolidation
- **Algorithm:**
  1. Group recordings by timestamp (5-second window)
  2. Identify multi-device clusters
  3. Calculate overlap score based on timing and zone configuration
  4. Flag clusters exceeding overlap threshold

#### TR-2.6: Database Schema Updates
```sql
-- Add to recordings table
ALTER TABLE recordings ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE recordings ADD COLUMN original_size INTEGER;
ALTER TABLE recordings ADD COLUMN is_protected BOOLEAN DEFAULT FALSE;
ALTER TABLE recordings ADD COLUMN archive_date TEXT;

-- Add deduplication tracking
CREATE TABLE recording_clusters (
  id TEXT PRIMARY KEY,
  primary_recording_id TEXT REFERENCES recordings(id),
  created_at TEXT DEFAULT (datetime('now')),
  event_timestamp TEXT,
  device_count INTEGER
);

CREATE TABLE cluster_members (
  cluster_id TEXT REFERENCES recording_clusters(id),
  recording_id TEXT REFERENCES recordings(id),
  is_primary BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (cluster_id, recording_id)
);
```

#### TR-2.7: Storage Analytics API
- **New Endpoint:** `GET /api/stats/storage-analysis`
- **Response:**
```typescript
interface StorageAnalysis {
  totalUsed: number;
  totalAvailable: number;
  byDevice: Record<string, number>;
  byEventType: Record<EventType, number>;
  byAge: {
    last7Days: number;
    last30Days: number;
    older: number;
  };
  potentialSavings: {
    archivableRecordings: number;
    estimatedSavings: number;
    duplicateClusters: number;
  };
  trend: Array<{ date: string; used: number }>;
}
```

### Test Requirements

#### Unit Tests (Vitest)

```typescript
// tests/unit/compression-analyzer.test.ts
describe('Compression Analyzer', () => {
  it('should recommend CRF 18-20 for doorbell events');
  it('should recommend CRF 23-26 for motion events');
  it('should recommend higher CRF for low-complexity content');
  it('should handle analysis errors gracefully');
});

// tests/unit/tiered-retention.test.ts
describe('Tiered Retention Policy', () => {
  it('should apply 60-day retention for ding events');
  it('should apply 30-day retention for motion events');
  it('should apply 90-day retention for starred recordings');
  it('should respect per-event-type configuration');
  it('should skip protected recordings during cleanup');
});

// tests/unit/archive-worker.test.ts
describe('Archive Worker', () => {
  it('should identify recordings eligible for archiving');
  it('should skip protected recordings');
  it('should reduce file size by at least 40%');
  it('should update database after archiving');
  it('should handle archiving errors gracefully');
});

// tests/unit/thumbnail-optimization.test.ts
describe('Thumbnail Optimization', () => {
  it('should generate WebP thumbnails');
  it('should scale to 280px width');
  it('should produce files under 20KB on average');
});

// tests/unit/deduplication-analyzer.test.ts
describe('Deduplication Analyzer', () => {
  it('should identify recordings within 5-second window');
  it('should group multi-device events into clusters');
  it('should not cluster single-device events');
  it('should calculate overlap scores correctly');
});
```

#### E2E Tests (Playwright)

```typescript
// tests/e2e/business/storage-efficiency.spec.ts
test.describe('Storage Efficiency Features', () => {
  test('Storage dashboard displays accurate usage breakdown');
  test('Storage settings allow retention configuration');
  test('Protected recordings are not auto-archived');
  test('Storage warnings appear at high utilization');
});

// tests/e2e/ux/storage-settings.spec.ts
test.describe('Storage Settings UX', () => {
  test('Can configure per-event-type retention');
  test('Can enable/disable auto-archiving');
  test('Can protect individual recordings');
  test('Storage analytics display potential savings');
});
```

#### Integration Tests

```typescript
// tests/integration/archive-pipeline.test.ts
describe('Archive Pipeline Integration', () => {
  it('should archive a recording end-to-end');
  it('should maintain video playability after archiving');
  it('should preserve thumbnail after archiving');
  it('should correctly update all database references');
});

// tests/integration/retention-enforcement.test.ts
describe('Tiered Retention Enforcement', () => {
  it('should delete motion events after 30 days');
  it('should retain doorbell events for 60 days');
  it('should never delete protected recordings');
});
```

---

## Priority and Dependencies

### Priority Matrix

| Feature | Priority | Effort | Value | Dependencies |
|---------|----------|--------|-------|--------------|
| Logs Button (Feature 1) | P1 - High | Low (1-2 days) | Medium | None |
| Thumbnail WebP Migration | P1 - High | Low (1 day) | High | None |
| Tiered Retention Config | P1 - High | Medium (3-5 days) | High | Database migration |
| Adaptive Compression | P2 - Medium | High (5-7 days) | High | Content analysis research |
| Archive Worker | P2 - Medium | Medium (3-5 days) | High | Database migration |
| Deduplication Analyzer | P3 - Low | High (7-10 days) | Medium | Zone configuration data |
| Storage Dashboard | P2 - Medium | Medium (3-5 days) | Medium | Stats API |

### Recommended Implementation Order

**Phase 1 (Sprint 1):**
1. Feature 1: Logs Quick Access Button
2. Thumbnail WebP Migration

**Phase 2 (Sprint 2):**
3. Database schema updates for storage features
4. Tiered Retention Configuration
5. Update retention-worker to use tiered config

**Phase 3 (Sprint 3):**
6. Storage Analytics API and Dashboard
7. Adaptive Compression Engine

**Phase 4 (Sprint 4):**
8. Archive Worker
9. User-facing archive/protection controls

**Phase 5 (Future):**
10. Deduplication Analyzer (requires more UX research)

### Feature Dependencies Diagram

```
Feature 1 (Logs Button)
    └── Independent, no blockers

Feature 2 (Storage Efficiency)
    ├── Thumbnail Optimization
    │   └── Independent
    │
    ├── Tiered Retention
    │   └── Requires: DB schema update
    │
    ├── Adaptive Compression
    │   └── Requires: Content analysis service
    │
    ├── Archive Worker
    │   ├── Requires: DB schema update
    │   └── Requires: Tiered retention (for priority rules)
    │
    ├── Deduplication
    │   ├── Requires: Zone configuration integration
    │   └── Requires: Cluster analysis algorithm
    │
    └── Storage Dashboard
        ├── Requires: Stats API
        └── Requires: Retention config (to show impact)
```

---

## Appendix: Technical Context

### Current Architecture Summary

**Timeline Page** (`/src/routes/(app)/timeline/+page.svelte`):
- Imports and renders `LogViewer` component in compact mode
- LogViewer performs API calls to `/api/logs` on mount
- Auto-refresh interval polls every 5 seconds

**Settings Page** (`/src/routes/(app)/settings/+page.svelte`):
- Contains full LogViewer in a dedicated section (id="logs")
- Has navigation sidebar with section highlighting
- IntersectionObserver tracks visible sections

**LogViewer Component** (`/src/lib/components/LogViewer.svelte`):
- Supports `compact` mode (currently used on timeline)
- Fetches available log files and displays content
- Parses JSON log lines with level-based coloring

**Video Processing Pipeline**:
- `ring-listener.ts`: Captures events from Ring API
- `transcode-worker.ts`: Downloads and transcodes videos
  - Uses ffmpeg with CRF 23, libx264, fast preset
  - Generates 320px JPEG thumbnails
- `retention-worker.ts`: Deletes recordings older than 30 days

**Storage Configuration**:
- Recordings: `./data/recordings/{deviceId}/{YYYY}/{MM}/{DD}/{timestamp}.mp4`
- Thumbnails: `./data/thumbnails/{deviceId}/{YYYY}/{MM}/{DD}/{timestamp}.jpg`
- Database tracks: `file_path`, `thumbnail_path`, `file_size`, `duration`

**Existing Test Patterns**:
- Unit tests use Vitest with mock services
- E2E tests use Playwright with page object patterns
- Tests follow requirement-based naming (e.g., `BR-3: Retention Policy`)
- Test files include quality dimension annotations

---

*End of Document*
