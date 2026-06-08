---
phase: "07"
plan: "04"
subsystem: workouts-dashboard
tags: [chart.js, react, canvas-lifecycle, workouts, visualization]
dependency_graph:
  requires: ["07-03"]
  provides: ["WorkoutsRefreshButton", "MuscleVolumeTab", "ProgressionTab", "chartSetup"]
  affects: ["07-06-WorkoutsPage"]
tech_stack:
  added: []
  patterns:
    - "Chart.js tree-shakeable module-scope registration (chartSetup.ts)"
    - "destroy-before-create canvas lifecycle (Pattern 3)"
    - "getComputedStyle CSS var resolution for Chart.js colors (Pattern 4)"
    - "sanitizeText on all Notion labels before Chart.js surfaces"
key_files:
  created:
    - src/components/ui/WorkoutsRefreshButton.tsx
    - src/components/pages/workouts/chartSetup.ts
    - src/components/pages/workouts/MuscleVolumeTab.tsx
    - src/components/pages/workouts/ProgressionTab.tsx
  modified: []
decisions:
  - "Chart.js registration placed in shared chartSetup.ts (not WorkoutsRefreshButton or WorkoutsPage) for clean import boundary — all tab files import it once"
  - "This Meso window approximated as 16-week (112-day) lookback because WorkoutsMetaSnapshot.current_meso lacks a start field; documented in code for future fix"
  - "ProgressionTab uses Chart.js tooltip filter property (not a callbacks sub-key) to suppress null dataset values"
metrics:
  duration: "25 minutes"
  completed: "2026-06-07"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 0
---

# Phase 07 Plan 04: Leaf Chart Components Summary

Three leaf components for the Workouts page built: WorkoutsRefreshButton (execFile clone targeting workout sync), MuscleVolumeTab (horizontal bar + weekly trend charts with window presets and attribution toggle), and ProgressionTab (exercise select, multi-dataset progression chart, PR tiles) — all with destroy-before-create canvas lifecycle and sanitized Notion labels.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | WorkoutsRefreshButton + Chart.js registration | de2cd6b | WorkoutsRefreshButton.tsx, chartSetup.ts |
| 2 | MuscleVolumeTab — bar + trend charts | de13e1e | MuscleVolumeTab.tsx |
| 3 | ProgressionTab — exercise select, chart, PR tiles | afbbf94 | ProgressionTab.tsx |

## Verification

- `npx tsc --noEmit` exits 0 for all three components
- `destroy` called >= 4 times in MuscleVolumeTab (two charts, each with before-create + cleanup)
- `destroy` called >= 2 times in ProgressionTab (one chart, before-create + cleanup)
- `sanitizeText` applied to muscle labels (bar + trend) and exercise option labels
- `weekly_primary_only` and `weekly_with_secondary` array swap on attribution toggle
- `getPropertyValue('--cos-chart-N')` pattern present for CSS var resolution
- "This Meso" button disabled when `current_meso` is null
- Blank-path guard in WorkoutsRefreshButton sets error state, no execFile call
- `execFile(node, [script])` — no shell, no interpolation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict null safety in aggregation helpers**
- **Found during:** Task 2 tsc run
- **Issue:** `Record<string, number>` index access returns `number | undefined` under strictNullChecks; array map on FALLBACK_COLORS could yield undefined
- **Fix:** Added `?? 0` and `?? '#7c6af7'` null-coalescing guards at all Record access points; typed barColors as `string[]` explicitly
- **Commit:** de13e1e

**2. [Rule 1 - Bug] Chart.js tooltip filter is not a callbacks sub-property**
- **Found during:** Task 3 tsc run
- **Issue:** `filter` is a top-level tooltip property, not nested inside `callbacks`; Chart.js type definitions rejected the placement
- **Fix:** Moved `filter` to top-level tooltip options object
- **Commit:** afbbf94

**3. [Rule 2 - Missing] This Meso approximation for missing current_meso.start**
- **Found during:** Task 2 implementation
- **Issue:** `WorkoutsMetaSnapshot.current_meso` type has `end` but no `start` field; plan says "compute window from current_meso.start to today"
- **Fix:** Approximated meso start as 16-week (112-day) lookback with explanatory comment; no types.ts change needed (future plan can add `start` field)
- **Files modified:** MuscleVolumeTab.tsx (comment documents the approximation)
- **Commit:** de13e1e

## Known Stubs

None. All three components receive real snapshot data via props and render from it. No hardcoded empty values, no placeholder text flowing to render surfaces.

## Threat Surface Scan

No new threat surfaces beyond those already in the plan's threat model (T-07-07 through T-07-09). All three mitigations are implemented:
- T-07-07: sanitizeText on all Notion-sourced labels before Chart.js
- T-07-08: execFile with positional args, blank-path guard
- T-07-09: destroy-before-create + cleanup destroy on every chart

## Self-Check: PASSED

- src/components/ui/WorkoutsRefreshButton.tsx: FOUND
- src/components/pages/workouts/chartSetup.ts: FOUND
- src/components/pages/workouts/MuscleVolumeTab.tsx: FOUND
- src/components/pages/workouts/ProgressionTab.tsx: FOUND
- Commit de2cd6b: FOUND
- Commit de13e1e: FOUND
- Commit afbbf94: FOUND
