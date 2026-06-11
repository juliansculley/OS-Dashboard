---
phase: "07-workouts-dashboard"
plan: "06"
subsystem: "workouts"
tags: ["workouts", "page-shell", "tab-bar", "snapshot-loading", "navigation"]
dependency_graph:
  requires: ["07-04", "07-05"]
  provides: ["WorkoutsPage", "workouts-nav-item"]
  affects: ["App.tsx", "Sidebar.tsx"]
tech_stack:
  added: []
  patterns:
    - "SnapshotState<T> discriminated union (copied from ProjectsPage)"
    - "NOTION-04: useEffect keyed on [path, refreshNonce] for snapshot re-reads"
    - "Tab bar with Lucide icons via setIcon()"
    - "Inline EmptyState + stale banner per ProjectsPage pattern"
key_files:
  created:
    - src/components/pages/WorkoutsPage.tsx
  modified:
    - src/components/App.tsx
    - src/components/ui/Sidebar.tsx
decisions:
  - "Tab state is local useState — not persisted, resets to 'muscle-volume' on navigation away/back"
  - "Tab icon size forced to 14px by mutating SVG width/height after setIcon() call"
  - "Stale banner uses oldest generated_at across all four snapshots (same approach as ProjectsPage but extended to four sources)"
  - "MuscleVolumeTab receives meta=null when meta snapshot not loaded — handled gracefully per 07-04 existing logic"
metrics:
  duration: "~4 min"
  completed: "2026-06-11"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 7 Plan 06: Workouts Page Shell Summary

WorkoutsPage assembled and deployed: four-tab page shell wired to all four snapshot files, routed via dumbbell nav item. UAT checkpoint passed (2026-06-11) after two fix rounds.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | WorkoutsPage shell — snapshot loading, tab bar, routing, states | 2e186ba | src/components/pages/WorkoutsPage.tsx (created) |
| 2 | Register page in App.tsx + add Sidebar nav item | 2f30626 | src/components/App.tsx, src/components/ui/Sidebar.tsx |
| 3 | UAT checkpoint — two fix rounds, approved 2026-06-11 | 8592030, bddf608 | ProgressionTab, ContextTab, WorkoutsPage, styles.css |

## What Was Built

**WorkoutsPage.tsx** — the page shell that:
- Loads all four workout snapshots (`muscleVolume`, `exercises`, `sessions`, `meta`) via `readJsonFile`, each in a separate `useEffect` keyed on `[path, refreshNonce]` (NOTION-04 pattern)
- Uses `SnapshotState<T> = T | null | 'error'` discriminated union and `isSnapshotData<T>` guard — copied verbatim from `ProjectsPage`
- Renders `WorkoutsRefreshButton` in the refresh bar (runs `notion-workouts-sync.mjs`)
- Shows stale banner (`Stale — last synced HH:mm`) using the oldest `generated_at` across loaded snapshots
- Renders a four-tab bar (Muscle Volume / Progression / History / Context) using `setIcon()` for Lucide icons at 14px
- Routes each tab to its component with correct state gating: `null` → no-data `EmptyState`, `'error'` → error `EmptyState`, `isSnapshotData(...)` → mount the component
- `MuscleVolumeTab` receives `meta={isSnapshotData(meta) ? meta : null}` so it degrades gracefully when meta not loaded
- Tab state is local `useState` — resets to `'muscle-volume'` on navigation away/back

**App.tsx** — `WorkoutsPage` imported and added to `PAGES` map as `workouts: WorkoutsPage`

**Sidebar.tsx** — `{ id: 'workouts', label: 'Workouts', iconId: 'dumbbell' }` appended to `NAV_ITEMS`

**Deploy** — `tsc --noEmit` + `node esbuild.config.mjs production` + `node scripts/deploy-plugin.mjs` all succeeded. `main.js` and `styles.css` copied to `C:/Users/scull/OneDrive/ClaudeOS/.obsidian/plugins/claudeos-dashboard`.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new threat surface beyond what the plan's threat model covers. WorkoutsPage passes snapshot data only as typed props to child components (T-07-12 mitigated). No new network endpoints, auth paths, or file access patterns introduced beyond the four snapshot reads already in the plan.

## Known Stubs

None. All tab components receive live snapshot data (or EmptyState when not loaded). No hardcoded placeholder values.

## UAT Fix Rounds

**Round 1 (commit 8592030):**
- ProgressionTab rewritten: BW dataset removed, Volume moved to right y-axis, two charts (per-workout + real calendar spacing via `type: 'linear'` x-axis), exercise selection lifted to parent as controlled props
- ContextTab sparkline: switched from category x to `type: 'linear'` with `{x: timestamp, y: value}` data objects
- Dropdown font-size reduced 14px → 13px

**Round 2 (commit bddf608):**
- ContextTab sparkline: changed from last-60-entries slice to actual last-90 calendar days (`date >= cutoff` filter)
- Sparkline tooltip: added `title: () => ''` callback to suppress raw timestamp shown as tooltip header
- Dropdown: added `line-height: 1.6` + explicit `padding: 6px` to fix text clipping on Windows

## Self-Check: PASSED

- FOUND: `src/components/pages/WorkoutsPage.tsx`
- FOUND: commits `2e186ba`, `2f30626`, `8592030`, `bddf608`
- UAT approved: 2026-06-11
- Deploy: `main.js` + `styles.css` copied to Obsidian plugin directory
