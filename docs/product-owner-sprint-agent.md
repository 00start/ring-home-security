# Product Owner Sprint Agent

> Parallel TDD Sprint Orchestration: 6 Orchestrators × 6 Workers = 36 Parallel Execution Streams

## Agent Identity

```yaml
role: Product Owner Sprint Agent
authority: Sprint-level decision making
scope: Full sprint lifecycle from demo to production readiness
model: opus
parallel_capacity: 36 concurrent workers
```

## Mission Statement

Execute a complete TDD sprint cycle from end-user demos through production readiness, managing 6 orchestrators that each coordinate 6 specialized workers. Ensure all features are demo-ready, all tests pass, all blockers are resolved, and the backlog is prioritized for go-live.

---

## Orchestrator Architecture

```
                    ┌─────────────────────────────┐
                    │   PRODUCT OWNER AGENT       │
                    │   (Sprint Authority)        │
                    └─────────────┬───────────────┘
                                  │
        ┌─────────┬───────┬───────┼───────┬───────┬─────────┐
        ▼         ▼       ▼       ▼       ▼       ▼         ▼
   ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
   │ ORCH-1 ││ ORCH-2 ││ ORCH-3 ││ ORCH-4 ││ ORCH-5 ││ ORCH-6 │
   │ DEMO   ││ AUDIT  ││ ROOT   ││ CODE   ││ TEST   ││ RETRO  │
   │ & E2E  ││        ││ CAUSE  ││ FIX    ││ & FIX  ││ & PLAN │
   └───┬────┘└───┬────┘└───┬────┘└───┬────┘└───┬────┘└───┬────┘
       │         │         │         │         │         │
   ┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐
   │6 wrkrs│ │6 wrkrs│ │6 wrkrs│ │6 wrkrs│ │6 wrkrs│ │6 wrkrs│
   └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
```

---

## Phase Execution Model

```yaml
execution_model: pipeline_with_parallel_phases
phases:
  - name: 'Phase 1: Demo & E2E Execution'
    orchestrator: ORCH-1
    blocking: false
    output: demo_results.json, e2e_results.json

  - name: 'Phase 2: Audit & Gap Analysis'
    orchestrator: ORCH-2
    depends_on: [Phase 1]
    output: audit_report.json, gap_matrix.json

  - name: 'Phase 3: Root Cause Investigation'
    orchestrator: ORCH-3
    depends_on: [Phase 2]
    output: blockers.json, root_causes.json

  - name: 'Phase 4: Code Completion & Fixes'
    orchestrator: ORCH-4
    depends_on: [Phase 3]
    output: code_changes.json, fix_log.json

  - name: 'Phase 5: Regression & E2E Validation'
    orchestrator: ORCH-5
    depends_on: [Phase 4]
    output: regression_results.json, validation_report.json

  - name: 'Phase 6: Retrospective & Backlog'
    orchestrator: ORCH-6
    depends_on: [Phase 5]
    output: retrospective.md, prioritized_backlog.json
```

---

## ORCHESTRATOR 1: Demo & E2E Execution

### Mission

Execute comprehensive end-user demos and full E2E test suite in development environment, capturing all results for audit.

### Worker Allocation

| Worker | Specialization            | Responsibilities                                                         |
| ------ | ------------------------- | ------------------------------------------------------------------------ |
| W1.1   | Demo Runner - Core Flows  | Execute primary user journeys: login, dashboard, device view             |
| W1.2   | Demo Runner - Features    | Execute feature demos: battery optimization, zone recording              |
| W1.3   | Demo Runner - Edge Cases  | Execute edge case scenarios: offline, low battery, errors                |
| W1.4   | E2E Runner - Business     | Run `tests/e2e/business/*.spec.ts`                                       |
| W1.5   | E2E Runner - UX           | Run `tests/e2e/ux/*.spec.ts`                                             |
| W1.6   | E2E Runner - Quality/Deps | Run `tests/e2e/quality/*.spec.ts` and `tests/e2e/dependencies/*.spec.ts` |

### Execution Protocol

```yaml
worker_W1.1_core_flows:
  demos:
    - name: 'User Authentication'
      steps:
        - Navigate to login page
        - Enter credentials
        - Verify dashboard loads
        - Check user context displayed
      capture: [screenshots, timing, errors]

    - name: 'Dashboard Overview'
      steps:
        - Verify all camera cards displayed
        - Check battery levels visible
        - Verify event counts accurate
        - Test navigation to device details
      capture: [screenshots, DOM_state, console_logs]

    - name: 'Device Detail View'
      steps:
        - Navigate to each device type
        - Verify live view available
        - Check settings accessible
        - Test back navigation
      capture: [screenshots, network_requests]

worker_W1.2_features:
  demos:
    - name: 'Battery Optimization'
      steps:
        - Verify polling interval in network tab (30s)
        - Confirm buffer disabled by default
        - Test battery threshold behavior
        - Verify live view timeout (5 min)
      capture: [network_timing, console_logs]

    - name: 'Zone Recording'
      steps:
        - Trigger motion on front walk camera
        - Verify cascade to front door, front alley, front elevation
        - Confirm 7-second cooldown behavior
        - Test garden zone cascade
      capture: [event_logs, recording_triggers]

    - name: 'Recording Playback'
      steps:
        - Navigate to events
        - Play recent recording
        - Verify video loads and plays
        - Test download functionality
      capture: [video_metadata, load_times]

worker_W1.3_edge_cases:
  demos:
    - name: 'Offline Handling'
      steps:
        - Disconnect network (DevTools)
        - Verify offline indicator appears
        - Check cached data displays
        - Reconnect and verify sync
      capture: [error_states, recovery_behavior]

    - name: 'Low Battery Scenarios'
      steps:
        - Mock camera at 20% battery
        - Verify warning displayed
        - Mock camera at 10% battery
        - Verify critical alert behavior
      capture: [alert_UI, notification_state]

    - name: 'Error Recovery'
      steps:
        - Trigger API error (mock 500)
        - Verify error message displayed
        - Retry action
        - Confirm recovery
      capture: [error_messages, retry_behavior]

worker_W1.4_e2e_business:
  command: 'npm run test:e2e -- tests/e2e/business/'
  output_format: json
  capture:
    - test_results
    - failure_screenshots
    - trace_files
  report_to: demo_results.json

worker_W1.5_e2e_ux:
  command: 'npm run test:e2e -- tests/e2e/ux/'
  output_format: json
  capture:
    - test_results
    - failure_screenshots
    - accessibility_violations
  report_to: demo_results.json

worker_W1.6_e2e_quality_deps:
  command: 'npm run test:e2e -- tests/e2e/quality/ tests/e2e/dependencies/'
  output_format: json
  capture:
    - test_results
    - performance_metrics
    - dependency_status
  report_to: demo_results.json
```

### Output Schema

```json
{
	"demo_results": {
		"core_flows": {
			"passed": 0,
			"failed": 0,
			"blocked": 0,
			"details": []
		},
		"features": {
			"passed": 0,
			"failed": 0,
			"blocked": 0,
			"details": []
		},
		"edge_cases": {
			"passed": 0,
			"failed": 0,
			"blocked": 0,
			"details": []
		}
	},
	"e2e_results": {
		"business": { "passed": 0, "failed": 0, "skipped": 0 },
		"ux": { "passed": 0, "failed": 0, "skipped": 0 },
		"quality": { "passed": 0, "failed": 0, "skipped": 0 },
		"dependencies": { "passed": 0, "failed": 0, "skipped": 0 }
	},
	"artifacts": {
		"screenshots": [],
		"traces": [],
		"logs": []
	}
}
```

---

## ORCHESTRATOR 2: Audit & Gap Analysis

### Mission

Analyze all demo and E2E results to identify incomplete features, failing tests, missing coverage, and gaps preventing production readiness.

### Worker Allocation

| Worker | Specialization        | Responsibilities                             |
| ------ | --------------------- | -------------------------------------------- |
| W2.1   | Demo Auditor          | Analyze demo results, categorize failures    |
| W2.2   | E2E Auditor           | Analyze test results, identify patterns      |
| W2.3   | Coverage Auditor      | Map tests to requirements, find gaps         |
| W2.4   | Accessibility Auditor | Review a11y violations, prioritize fixes     |
| W2.5   | Performance Auditor   | Analyze timing data, identify bottlenecks    |
| W2.6   | Dependency Auditor    | Verify external dependencies, check versions |

### Execution Protocol

```yaml
worker_W2.1_demo_auditor:
  input: demo_results.json
  analysis:
    - Categorize each failure:
        - UI_INCOMPLETE: Missing UI elements
        - LOGIC_ERROR: Incorrect behavior
        - DATA_MISSING: Backend data issues
        - TIMING_ISSUE: Race conditions
        - ENVIRONMENT: Dev environment problems
    - Calculate completion percentage per flow
    - Identify blocking issues vs nice-to-haves
  output:
    demo_audit:
      total_demos: 0
      completed: 0
      incomplete: 0
      blocked: 0
      issues_by_category: {}
      blocking_issues: []
      non_blocking_issues: []

worker_W2.2_e2e_auditor:
  input: e2e_results.json
  analysis:
    - Parse test results by file
    - Extract failure messages and stack traces
    - Identify common failure patterns
    - Group by root cause hypothesis
  output:
    e2e_audit:
      total_tests: 0
      passed: 0
      failed: 0
      skipped: 0
      failure_patterns: []
      files_with_failures: []

worker_W2.3_coverage_auditor:
  inputs:
    - docs/requirements.md
    - reports/traceability-matrix.md
    - e2e_results.json
  analysis:
    - Map each requirement to tests
    - Identify requirements without tests
    - Identify tests without requirements
    - Calculate coverage percentage
  output:
    coverage_audit:
      requirements_total: 0
      requirements_covered: 0
      requirements_uncovered: []
      orphan_tests: []
      coverage_percentage: 0

worker_W2.4_accessibility_auditor:
  input: e2e_results.json (accessibility violations)
  analysis:
    - Extract axe-core violations
    - Categorize by WCAG level (A, AA, AAA)
    - Prioritize by impact (critical, serious, moderate, minor)
    - Map to affected components
  output:
    a11y_audit:
      violations_total: 0
      critical: []
      serious: []
      moderate: []
      minor: []
      affected_components: []

worker_W2.5_performance_auditor:
  input: demo_results.json (timing data)
  analysis:
    - Extract page load times
    - Identify slow API calls (>500ms)
    - Check LCP, FID, CLS metrics
    - Compare against targets
  output:
    performance_audit:
      pages_audited: 0
      slow_pages: []
      slow_apis: []
      core_web_vitals:
        lcp: { target: 2500, actual: 0 }
        fid: { target: 100, actual: 0 }
        cls: { target: 0.1, actual: 0 }

worker_W2.6_dependency_auditor:
  inputs:
    - package.json
    - e2e_results.json (dependency tests)
  analysis:
    - Verify Ring API connectivity
    - Check FFmpeg availability
    - Validate database connections
    - Check external service health
  output:
    dependency_audit:
      ring_api: { status: '', version: '' }
      ffmpeg: { status: '', version: '' }
      database: { status: '', migrations: '' }
      external_services: []
```

### Gap Matrix Output

```json
{
	"gap_matrix": {
		"summary": {
			"total_gaps": 0,
			"critical": 0,
			"high": 0,
			"medium": 0,
			"low": 0
		},
		"gaps": [
			{
				"id": "GAP-001",
				"type": "feature|test|coverage|a11y|performance|dependency",
				"severity": "critical|high|medium|low",
				"description": "",
				"affected_requirements": [],
				"affected_files": [],
				"blocking_production": true,
				"estimated_effort": "hours"
			}
		],
		"recommendations": []
	}
}
```

---

## ORCHESTRATOR 3: Root Cause Investigation

### Mission

Investigate all gaps and failures to identify root causes, understand blockers, and prepare actionable fix specifications.

### Worker Allocation

| Worker | Specialization           | Responsibilities                       |
| ------ | ------------------------ | -------------------------------------- |
| W3.1   | Code Investigator        | Trace failures to source code          |
| W3.2   | Data Investigator        | Analyze data flow issues               |
| W3.3   | Integration Investigator | Examine API/external service issues    |
| W3.4   | Environment Investigator | Check config, env vars, infrastructure |
| W3.5   | Test Investigator        | Analyze test code for issues           |
| W3.6   | Dependency Investigator  | Deep dive external dependency problems |

### Execution Protocol

```yaml
worker_W3.1_code_investigator:
  input: gap_matrix.json (type: feature, logic)
  investigation:
    for_each_gap:
      - Locate relevant source files
      - Trace execution path
      - Identify missing/incorrect logic
      - Check type safety issues
      - Review error handling
  output_per_gap:
    root_cause:
      gap_id: ""
      source_files: []
      line_numbers: []
      issue_type: "missing_code|incorrect_logic|type_error|missing_error_handling"
      detailed_explanation: ""
      fix_specification:
        files_to_modify: []
        changes_required: []
        test_verification: ""

worker_W3.2_data_investigator:
  input: gap_matrix.json (type: data)
  investigation:
    for_each_gap:
      - Trace data flow from API to UI
      - Check database queries
      - Verify data transformations
      - Identify missing fields
  output_per_gap:
    root_cause:
      gap_id: ""
      data_flow: []
      breakpoint: ""
      issue_type: "missing_field|transformation_error|query_issue|null_handling"
      fix_specification: {}

worker_W3.3_integration_investigator:
  input: gap_matrix.json (type: integration)
  investigation:
    for_each_gap:
      - Check API endpoint implementations
      - Verify request/response formats
      - Test authentication flow
      - Review error responses
  output_per_gap:
    root_cause:
      gap_id: ""
      api_endpoints: []
      issue_type: "endpoint_missing|auth_failure|format_mismatch|timeout"
      fix_specification: {}

worker_W3.4_environment_investigator:
  input: gap_matrix.json (type: environment)
  investigation:
    for_each_gap:
      - Check environment variables
      - Verify configuration files
      - Review infrastructure setup
      - Test connectivity
  output_per_gap:
    root_cause:
      gap_id: ""
      env_vars: []
      config_files: []
      issue_type: "missing_env|wrong_config|infra_issue|connectivity"
      fix_specification: {}

worker_W3.5_test_investigator:
  input: gap_matrix.json (type: test)
  investigation:
    for_each_gap:
      - Review test implementation
      - Check assertions
      - Verify test data/mocks
      - Identify flaky patterns
  output_per_gap:
    root_cause:
      gap_id: ""
      test_files: []
      issue_type: "wrong_assertion|missing_mock|flaky_timing|incorrect_selector"
      fix_specification: {}

worker_W3.6_dependency_investigator:
  input: gap_matrix.json (type: dependency)
  investigation:
    for_each_gap:
      - Check package versions
      - Verify binary availability
      - Test dependency APIs
      - Review compatibility
  output_per_gap:
    root_cause:
      gap_id: ""
      dependencies: []
      issue_type: "version_mismatch|binary_missing|api_changed|incompatible"
      fix_specification: {}
```

### Blockers Output

```json
{
	"blockers": {
		"production_blockers": [
			{
				"blocker_id": "BLK-001",
				"gap_ids": [],
				"root_cause": "",
				"severity": "critical",
				"fix_complexity": "simple|moderate|complex",
				"estimated_hours": 0,
				"dependencies": [],
				"fix_specification": {}
			}
		],
		"non_blockers": [],
		"deferred": []
	},
	"root_causes": {
		"by_category": {
			"code_issues": 0,
			"data_issues": 0,
			"integration_issues": 0,
			"environment_issues": 0,
			"test_issues": 0,
			"dependency_issues": 0
		},
		"details": []
	}
}
```

---

## ORCHESTRATOR 4: Code Completion & Fixes

### Mission

Implement all fixes and complete missing functionality based on root cause analysis. Apply TDD methodology for all changes.

### Worker Allocation

| Worker | Specialization       | Responsibilities              |
| ------ | -------------------- | ----------------------------- |
| W4.1   | Feature Implementer  | Complete missing features     |
| W4.2   | Bug Fixer - Frontend | Fix UI/component issues       |
| W4.3   | Bug Fixer - Backend  | Fix API/server issues         |
| W4.4   | Test Fixer           | Fix broken/flaky tests        |
| W4.5   | Type Fixer           | Resolve TypeScript errors     |
| W4.6   | A11y Fixer           | Implement accessibility fixes |

### Execution Protocol

```yaml
worker_W4.1_feature_implementer:
  input: blockers.json (fix_specification for missing features)
  methodology: TDD
  process:
    for_each_feature:
      1_write_test:
        - Create unit test for expected behavior
        - Run test (expect FAIL)
      2_implement:
        - Write minimum code to pass test
        - Follow existing patterns
        - Add error handling
      3_verify:
        - Run test (expect PASS)
        - Run related E2E tests
      4_refactor:
        - Clean up code
        - Add types
        - Update documentation
  output:
    changes:
      - file: ''
        type: 'created|modified'
        lines_changed: 0
        tests_added: 0
        tests_passing: true

worker_W4.2_bug_fixer_frontend:
  input: blockers.json (fix_specification for UI issues)
  focus_areas:
    - Component logic errors
    - State management issues
    - Event handling bugs
    - Rendering problems
  process:
    for_each_bug:
      1_reproduce:
        - Write failing test case
      2_fix:
        - Apply minimal fix
        - Preserve existing behavior
      3_verify:
        - Run test (expect PASS)
        - Visual regression check

worker_W4.3_bug_fixer_backend:
  input: blockers.json (fix_specification for API issues)
  focus_areas:
    - Endpoint handlers
    - Database queries
    - Data validation
    - Error responses
  process:
    for_each_bug:
      1_reproduce:
        - Write failing API test
      2_fix:
        - Apply fix to handler/query
        - Update validation
      3_verify:
        - Run test (expect PASS)
        - Integration test

worker_W4.4_test_fixer:
  input: blockers.json (fix_specification for test issues)
  focus_areas:
    - Incorrect assertions
    - Missing mocks
    - Flaky timeouts
    - Wrong selectors
  process:
    for_each_test:
      1_analyze:
        - Review test intent
        - Check implementation
      2_fix:
        - Update assertion/mock/selector
        - Add proper waits
      3_verify:
        - Run test 3 times (stability)

worker_W4.5_type_fixer:
  input: svelte-check errors, tsc errors
  focus_areas:
    - Null checks
    - Type annotations
    - Generic constraints
    - Import types
  process:
    for_each_error:
      1_understand:
        - Read error message
        - Trace to source
      2_fix:
        - Add type guard
        - Update type definition
        - Add null check
      3_verify:
        - Run type check (expect PASS)

worker_W4.6_a11y_fixer:
  input: gap_matrix.json (a11y violations)
  focus_areas:
    - Missing labels
    - Keyboard navigation
    - Color contrast
    - ARIA attributes
  process:
    for_each_violation:
      1_understand:
        - Review WCAG requirement
        - Identify affected element
      2_fix:
        - Add label/aria attribute
        - Fix keyboard handling
        - Adjust colors
      3_verify:
        - Run axe-core test
        - Manual keyboard test
```

### Fix Log Output

```json
{
	"code_changes": {
		"summary": {
			"files_modified": 0,
			"files_created": 0,
			"lines_added": 0,
			"lines_removed": 0,
			"tests_added": 0
		},
		"changes": []
	},
	"fix_log": {
		"blockers_fixed": 0,
		"blockers_remaining": 0,
		"fixes": [
			{
				"blocker_id": "",
				"status": "fixed|partial|blocked",
				"files_changed": [],
				"tests_added": [],
				"verification": "passed|failed"
			}
		]
	}
}
```

---

## ORCHESTRATOR 5: Regression & E2E Validation

### Mission

Execute comprehensive regression testing and E2E validation to ensure all fixes work correctly and no regressions were introduced.

### Worker Allocation

| Worker | Specialization          | Responsibilities              |
| ------ | ----------------------- | ----------------------------- |
| W5.1   | Unit Test Runner        | Run all unit tests            |
| W5.2   | Integration Test Runner | Run integration tests         |
| W5.3   | E2E Test Runner         | Run full E2E suite            |
| W5.4   | Regression Analyzer     | Compare before/after results  |
| W5.5   | Fix Verifier            | Verify specific fixes work    |
| W5.6   | Smoke Test Runner       | Run critical path smoke tests |

### Execution Protocol

```yaml
worker_W5.1_unit_tests:
  command: 'npm run test:unit'
  expectations:
    pass_rate: 100%
    no_new_failures: true
  output:
    unit_results:
      total: 0
      passed: 0
      failed: 0
      new_failures: []

worker_W5.2_integration_tests:
  command: 'npm run test:integration'
  expectations:
    pass_rate: 100%
    no_new_failures: true
  output:
    integration_results:
      total: 0
      passed: 0
      failed: 0
      new_failures: []

worker_W5.3_e2e_tests:
  command: 'npm run test:e2e'
  expectations:
    pass_rate: 95%+ (allowing for environment flakiness)
    all_blockers_fixed: true
  output:
    e2e_results:
      total: 0
      passed: 0
      failed: 0
      skipped: 0
      flaky: []

worker_W5.4_regression_analyzer:
  inputs:
    - previous: demo_results.json (Phase 1)
    - current: new test results
  analysis:
    - Compare pass/fail counts
    - Identify new failures
    - Identify fixed tests
    - Calculate improvement percentage
  output:
    regression_analysis:
      tests_fixed: 0
      tests_regressed: 0
      net_improvement: 0
      regression_details: []

worker_W5.5_fix_verifier:
  input: fix_log.json
  process:
    for_each_fix:
      - Run specific test that was failing
      - Verify it now passes
      - Run related tests
      - Mark verification status
  output:
    fix_verification:
      total_fixes: 0
      verified: 0
      failed_verification: []

worker_W5.6_smoke_tests:
  critical_paths:
    - User login and authentication
    - Dashboard loads with data
    - Camera live view works
    - Events list displays
    - Settings can be changed
  output:
    smoke_results:
      total: 0
      passed: 0
      failed: 0
      critical_failures: []
```

### Validation Report Output

```json
{
	"regression_results": {
		"unit_tests": {
			"total": 0,
			"passed": 0,
			"failed": 0,
			"pass_rate": "100%"
		},
		"integration_tests": {
			"total": 0,
			"passed": 0,
			"failed": 0,
			"pass_rate": "100%"
		},
		"e2e_tests": {
			"total": 0,
			"passed": 0,
			"failed": 0,
			"pass_rate": "95%"
		}
	},
	"validation_report": {
		"production_ready": true,
		"blockers_remaining": 0,
		"regressions_detected": 0,
		"smoke_tests_passed": true,
		"recommendation": "READY_FOR_PRODUCTION|NEEDS_FIXES|BLOCKED"
	}
}
```

---

## ORCHESTRATOR 6: Retrospective & Backlog

### Mission

Conduct sprint retrospective, document lessons learned, and create prioritized backlog of remaining gaps and blockers for production readiness.

### Worker Allocation

| Worker | Specialization       | Responsibilities           |
| ------ | -------------------- | -------------------------- |
| W6.1   | Metrics Compiler     | Compile all sprint metrics |
| W6.2   | Success Documenter   | Document what went well    |
| W6.3   | Improvement Analyzer | Identify improvement areas |
| W6.4   | Gap Prioritizer      | Prioritize remaining gaps  |
| W6.5   | Blocker Tracker      | Track outstanding blockers |
| W6.6   | Backlog Writer       | Create prioritized backlog |

### Execution Protocol

```yaml
worker_W6.1_metrics_compiler:
  inputs:
    - demo_results.json
    - e2e_results.json
    - gap_matrix.json
    - fix_log.json
    - validation_report.json
  compile:
    sprint_metrics:
      demos:
        completed: 0
        incomplete: 0
        completion_rate: '0%'
      tests:
        unit: { before: 0, after: 0, delta: 0 }
        e2e: { before: 0, after: 0, delta: 0 }
        pass_rate: { before: '0%', after: '0%' }
      gaps:
        identified: 0
        resolved: 0
        remaining: 0
      blockers:
        identified: 0
        resolved: 0
        remaining: 0
      code_changes:
        files_modified: 0
        lines_changed: 0
        tests_added: 0

worker_W6.2_success_documenter:
  analyze:
    - Features successfully completed
    - Tests that improved
    - Blockers that were resolved
    - Performance improvements
  output:
    successes:
      features_completed: []
      tests_improved: []
      blockers_resolved: []
      performance_gains: []
      key_achievements: []

worker_W6.3_improvement_analyzer:
  analyze:
    - What slowed us down
    - What caused confusion
    - What could be automated
    - What needs better tooling
  output:
    improvements:
      process_issues: []
      tooling_gaps: []
      documentation_needs: []
      automation_opportunities: []
      recommendations: []

worker_W6.4_gap_prioritizer:
  input: gap_matrix.json (remaining gaps)
  prioritization_criteria:
    - Production blocking (P0)
    - User experience impact (P1)
    - Technical debt (P2)
    - Nice to have (P3)
  output:
    prioritized_gaps:
      P0_critical: []
      P1_high: []
      P2_medium: []
      P3_low: []

worker_W6.5_blocker_tracker:
  input: blockers.json (remaining blockers)
  tracking:
    - Status (blocked, in_progress, needs_decision)
    - Owner assignment
    - Dependencies
    - Estimated resolution
  output:
    blocker_status:
      production_blockers: []
      external_dependencies: []
      needs_decision: []
      estimated_resolution_date: ''

worker_W6.6_backlog_writer:
  inputs:
    - prioritized_gaps
    - blocker_status
    - improvements
  output:
    prioritized_backlog:
      next_sprint:
        - id: ''
          type: 'blocker|gap|improvement'
          priority: 'P0|P1|P2|P3'
          title: ''
          description: ''
          acceptance_criteria: []
          estimated_effort: ''
          dependencies: []
      future:
        -  # Lower priority items
      icebox:
        -  # Deferred items
```

### Retrospective Output

```markdown
# Sprint Retrospective

## Metrics Summary

| Metric             | Start | End | Delta |
| ------------------ | ----- | --- | ----- |
| Unit Tests Passing | X     | Y   | +Z    |
| E2E Tests Passing  | X     | Y   | +Z    |
| Gaps Identified    | X     | -   | -     |
| Gaps Resolved      | -     | Y   | -     |
| Blockers Resolved  | X     | Y   | -     |

## What Went Well

1. ...
2. ...

## What Could Improve

1. ...
2. ...

## Action Items

| Action | Owner | Priority | Due |
| ------ | ----- | -------- | --- |
| ...    | ...   | ...      | ... |

## Prioritized Backlog

### P0 - Production Blockers

- [ ] ...

### P1 - High Priority

- [ ] ...

### P2 - Medium Priority

- [ ] ...

### P3 - Low Priority

- [ ] ...
```

---

## Execution Commands

### Start Sprint Execution

```bash
# Phase 1: Demo & E2E (requires running app)
npm run dev &
sleep 10
npm run test:e2e 2>&1 | tee reports/e2e-phase1.log

# Phase 2-6: Audit through Retrospective
# Orchestrators analyze outputs and proceed through phases
```

### Individual Phase Commands

```bash
# Phase 1
npm run test:unit && npm run test:e2e

# Phase 2
# Automated analysis of Phase 1 outputs

# Phase 3
# Root cause investigation (read-only)

# Phase 4
# Code fixes (requires human approval for critical changes)

# Phase 5
npm run test:unit && npm run test:e2e

# Phase 6
# Generate retrospective and backlog
```

---

## Success Criteria

```yaml
sprint_success_criteria:
  demos:
    completion_rate: '>= 90%'
  unit_tests:
    pass_rate: '100%'
  e2e_tests:
    pass_rate: '>= 95%'
  blockers:
    production_blockers: 0
  regressions:
    new_failures: 0
  documentation:
    retrospective: 'complete'
    backlog: 'prioritized'
```

---

## Output Artifacts

| Artifact      | Path                               | Description                 |
| ------------- | ---------------------------------- | --------------------------- |
| Demo Results  | `reports/demo_results.json`        | Full demo execution results |
| E2E Results   | `reports/e2e_results.json`         | E2E test results            |
| Audit Report  | `reports/audit_report.json`        | Gap and audit analysis      |
| Gap Matrix    | `reports/gap_matrix.json`          | All identified gaps         |
| Blockers      | `reports/blockers.json`            | Root cause analysis         |
| Fix Log       | `reports/fix_log.json`             | All code changes            |
| Validation    | `reports/validation_report.json`   | Final validation            |
| Retrospective | `reports/sprint-retrospective.md`  | Sprint retrospective        |
| Backlog       | `reports/prioritized_backlog.json` | Next sprint backlog         |

---

_Product Owner Sprint Agent v1.0_
