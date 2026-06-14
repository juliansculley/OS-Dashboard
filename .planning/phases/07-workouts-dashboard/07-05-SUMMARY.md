---
phase: 07-workouts-dashboard
plan: "05"
subsystem: workouts-ui
tags: [react, chart.js, history, context, sparkline, filters]
dependency_graph:
  requires: ["07-03", "07-04"]
  provides: ["HistoryTab", "ContextTab"]
  affects: ["07-06"]
tech_stack:
  added: []
  patterns:
    - "Chart.js destroy-before-create + cleanup destroy (Pattern 3)"
    - "CSS variable resolution via getComputedStyle (Pattern 4)"
    - "AND-across / OR-within filter semantics"
    - "ListRow reuse with emphasis='overdue' for error tint"
key_files:
  created:
    - src/components/pages/workouts/HistoryTab.tsx
    - src/components/pages/workouts/ContextTab.tsx
  modified: []
decisions:
  - "Negative results tint: emphasis='overdue' on ListRow (reuses component without modification; error tint applied via claudeos-list-row--overdue modifier)"
  - "useEffect dep array for sparkline: stringified window data avoids deep equality overhead for small arrays"
  - "Meso 'days remaining = 0' treated as positive (Ends today line, not overdue)"
metrics:
  duration: "4 minutes"
  completed: "2026-06-08"
  tasks_completed: 2
  files_created: 2
---

# Phase 7 Plan 05: HistoryTab + ContextTab Summary

**One-liner:** Filterable session history list with AND/OR filter semantics and error-tinted negative results, plus mesocycle card with days-remaining/overdue and a Chart.js bodyweight sparkline with destroy lifecycle.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | HistoryTab — filter row + session list | 85642f2 | src/components/pages/workouts/HistoryTab.tsx |
| 2 | ContextTab — mesocycle card + bodyweight sparkline | a8cf539 | src/components/pages/workouts/ContextTab.tsx |

## What Was Built

### Task 1: HistoryTab (`src/components/pages/workouts/HistoryTab.tsx`)

Filter row with four groups:
- **SPLIT** multi-select pill group (Push / Pull / Full / Arms / Hyp / Str) — OR within, AND with other types
- **DIFFICULTY** native select — unique values from session.difficulty[] arrays
- **RESULTS** native select — unique values from session.results[] arrays
- **MESOCYCLE** native select — unique meso_name values sorted descending by first session date

Filter logic: AND across types, OR within SPLIT multi-select. Sessions sorted reverse-chronologically.

Session list via `ListRow` (unmodified):
- `name` = `sanitizeText(session.template || session.name)` (SEC-01 / T-07-10)
- `badges` = [date, ...tags, ...difficulty, `{N} sets`]
- `url` = session.url (ListRow adds rel="noopener noreferrer" target="_blank")
- `emphasis="overdue"` when session.results contains "joint pain" or "None" → error-tinted row

100+ row guard: `max-height: 400px; overflow-y: auto` inline style on list container.

Empty states:
- Zero total sessions → `EmptyState` "No sessions yet" / "Log your first workout in Notion, then Refresh."
- Filter produces zero rows → inline `claudeos-list-empty` "No sessions match the active filters. Clear a filter to see more."

### Task 2: ContextTab (`src/components/pages/workouts/ContextTab.tsx`)

**Mesocycle card** (`.claudeos-workouts-meso-card`):
- Label: "CURRENT MESOCYCLE"
- Renders name, "Type: {wo_type} · Focus: {focus}", "Status: {status}"
- Days remaining = `dayDiff(today, meso.end)` — positive: "Ends: {end}  ({N} days remaining)"; negative: "Ended {N} days ago" in `__overdue` class
- No meso → `EmptyState` "No active mesocycle" / "No mesocycle block covers today's date."

**Bodyweight sparkline** (Chart.js line):
- Window: last 60 points from `meta.bodyweight[]` sorted ascending by date
- `fill: 'origin'` with `backgroundColor: rgba(113,128,150,0.10)` (requires Filler plugin — imported via `./chartSetup`)
- Line color `--cos-chart-9` resolved via `getComputedStyle(canvasEl.ownerDocument.documentElement)` at mount (Pattern 4)
- `pointRadius: 2`, `animation: false`, axes hidden, legend hidden
- Tooltip: `{YYYY-MM-DD}: {N} lbs`
- Latest value text: `{value} lbs  as of {date}` (two spaces per UI-SPEC)
- Canvas lifecycle: destroy-before-create + cleanup destroy (Pattern 3, T-07-11)
- No data → inline `claudeos-list-empty` "No bodyweight measurements found."

## Deviations from Plan

None — plan executed exactly as written.

## Security Scan (T-07-10, T-07-11)

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-07-10 (XSS) | `sanitizeText(template || name)` before ListRow; URLs only in href via ListRow; no dangerouslySetInnerHTML | Applied |
| T-07-11 (canvas DoS/memory) | `chartRef.current?.destroy()` before new Chart(); cleanup destroy in useEffect return | Applied — `chartRef.*destroy` pattern confirmed |

## Known Stubs

None. Both components render real data from snapshot props; no placeholder values flow to UI.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- [x] `src/components/pages/workouts/HistoryTab.tsx` exists
- [x] `src/components/pages/workouts/ContextTab.tsx` exists
- [x] `src/components/ui/ListRow.tsx` unmodified (last commit: 3ad9e6d, Phase 3)
- [x] `npx tsc --noEmit` exits 0
- [x] Commits 85642f2 and a8cf539 present in git log
