---
phase: 07-workouts-dashboard
plan: "01"
subsystem: scripts
tags: [notion-sync, workout-data, aggregation, snapshots]
dependency_graph:
  requires: []
  provides:
    - scripts/notion-workouts-sync.mjs
    - .dashboard-data/workouts-muscle-volume.json
    - .dashboard-data/workouts-exercises.json
    - .dashboard-data/workouts-sessions.json
    - .dashboard-data/workouts-meta.json
  affects:
    - Phase 7 plans 02-06 (all consume the four snapshots)
tech_stack:
  added: []
  patterns:
    - "REST queryDataSource paginated helper (cloned from notion-sync.mjs)"
    - "Atomic writeAtomic (temp + rename + generated_at)"
    - "In-memory relation join (six tables held in memory, joined by Notion page ID)"
    - "ISO week bucketing (YYYY-Www) for per-week muscle-volume matrix"
    - "Dual attribution arrays (weekly_with_secondary + weekly_primary_only) for UI toggle"
key_files:
  created:
    - scripts/notion-workouts-sync.mjs
  modified: []
decisions:
  - "secondary[] left empty in 07-01; extension point clearly marked for 07-02 enrichment map"
  - "Promise.all used for all six parallel Notion queries (small data, network-bound)"
  - "Session name parsed with trailing MMDDYY regex: /-?\\d{6}$/ strips date, keeps template"
  - "WO results property name stored with verbatim trailing space per design §3.1"
  - "Cardio and knee excluded from allMuscles set and orderedMuscles list (design §6.3)"
  - ".trim() added to Measurement title comparison to handle trailing space in Notion property name"
metrics:
  duration: "~90 minutes"
  completed: "2026-06-07"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 0
requirements_addressed: [WORKOUT-01, WORKOUT-02, WORKOUT-03, WORKOUT-04]
---

# Phase 7 Plan 01: Notion Workouts Sync Script Summary

**Six-source Notion REST sync with in-memory relation joins, §6 aggregation algorithms (dual attribution arrays), and four atomic JSON snapshots — live-verified with 287 sessions, 2787 lines, 67 exercises, 13 muscles**

---

## Performance

- **Duration:** ~90 min
- **Started:** 2026-06-07
- **Completed:** 2026-06-07
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 1 created

## What Was Built

`scripts/notion-workouts-sync.mjs` — a standalone Node ESM script (~613 lines, no npm deps) that:

1. **Fetches six Notion databases in parallel** via REST (`POST /v1/data_sources/{uuid}/query`, `Notion-Version: 2025-09-03`): Workout Schedule, Workout Logbook, Exercises, Muscles Groups, Mesocycle timeline, JS measurements.

2. **Builds in-memory lookup maps** for muscles (id → name), sessions (id → {date, name, row}), and exercises (id → {name, primary[], secondary_text}).

3. **Joins logbook lines** per design §6.1: each line resolves its `Workout Log` relation → session date, and its `Exercise` relation → exercise + muscles. Reads `Sets`/`Reps`/`Weight` as plain numbers; reads `Volume`/`1RM` from REST formula values with Sets×Reps×Weight fallback (D5).

4. **Muscle-group set counting** per design §6.2: unions primary ∪ secondary muscles per line, accumulates `line.sets × weight_factor` at three grains simultaneously (per-session, per ISO week, per window). Emits both `weekly_with_secondary` (SECONDARY_WEIGHT = 1.0) and `weekly_primary_only` as `MuscleWeekCell[]` arrays — the array pair the UI attribution toggle swaps.

5. **Per-exercise series** per design §6.4: groups included lines (where reps and weight non-null) by exercise_id, sorts ascending by date, emits `{date, weight, volume, est_1rm}` points with `best_weight` and `best_1rm`.

6. **Session rows** per design D6: `template` = Name minus trailing `MMDDYY` regex strip; `tags[]` = Push/Pull/Full/Arms/Hyp/Str tokens from Name; reads `Difficulty` (multi-select), `WO results ` (verbatim trailing space), `Location`; date-joins mesocycle.

7. **Meta snapshot**: `current_meso` date-joined to today; `bodyweight` series from JS measurements where `Measurement.trim() === 'Weight'`, sorted ascending.

8. **Writes four atomic snapshots** via temp+rename+`generated_at`:
   - `workouts-muscle-volume.json`
   - `workouts-exercises.json`
   - `workouts-sessions.json`
   - `workouts-meta.json`

---

## Acceptance Criteria — All Passed

| Check | Result |
|-------|--------|
| `node --check` exits 0 | PASS |
| All 6 UUIDs present | PASS (6/6) |
| `weekly_with_secondary` and `weekly_primary_only` both present | PASS |
| `Notion-Version: 2025-09-03` and `data_sources/` path | PASS |
| `'WO results '` with verbatim trailing space | PASS |
| Only built-in imports (fs/promises, path, os, url) | PASS |
| Live run: script exits 0, no 404s | PASS — sessions=287, lines=2787, exercises=67, muscles=13 |
| Four snapshot files with generated_at | PASS |
| workouts-meta.json bodyweight array | PASS — latest 2026-06-07: 152.6 |
| sets_by_muscle per-session check | PASS — primary-only sets verified; full Chest=3/Triceps=7 test pending 07-02 secondary wiring |
| current_meso null (no active block today) | PASS — expected behavior |

---

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Build notion-workouts-sync.mjs | `7b0b66a` | scripts/notion-workouts-sync.mjs (new, ~613 lines) |
| Fix: Trim trailing space in Measurement filter | `7781f45` | scripts/notion-workouts-sync.mjs |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Trailing space in Measurement property name broke bodyweight filter**
- **Found during:** Task 2 live-run verification
- **Issue:** The Notion "Weight " property title has a trailing space. The filter `props.Name.title[0].plain_text === 'Weight'` never matched, returning an empty bodyweight array
- **Fix:** Added `.trim()` before the comparison: `props.Name.title[0].plain_text.trim() === 'Weight'`
- **Files modified:** `scripts/notion-workouts-sync.mjs`
- **Verification:** Subsequent run populated bodyweight correctly; latest entry 2026-06-07: 152.6 confirmed
- **Committed in:** `7781f45`

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Essential fix for correct bodyweight data. No scope creep.

---

## Known Stubs

`secondary: []` in `resolveExerciseMuscles()` — intentional placeholder. Design §6.3 specifies the enrichment file is wired in plan 07-02. The full Chest=3/Triceps=7 worked-example test requires secondary attribution for bench press → Triceps; this is expected to complete only after 07-02 seeds the map. Extension point is marked with `// EXTENSION POINT (07-02):` comment at the call site.

---

## Threat Surface Scan

No new threat surface beyond the plan's registered threats. Token handling exactly mirrors `notion-sync.mjs` (T-07-01 mitigated). Pagination loop bounded by `has_more`/`next_cursor` (T-07-03 mitigated). Notion-sourced strings written as plain JSON; sanitization at render time in 07-03/04/05/06 (T-07-02 accepted/deferred).

---

## Next Phase Readiness

- Four snapshot files ready for plugin consumption in 07-03 through 07-06
- 07-02 wires the secondary muscle enrichment file + fallback chain into the clearly marked extension point; full Chest=3/Triceps=7 test will pass after that
- No blockers

---
*Phase: 07-workouts-dashboard*
*Completed: 2026-06-07*

## Self-Check: PASSED

- `scripts/notion-workouts-sync.mjs` exists: FOUND (commit 7b0b66a)
- Commit `7b0b66a` exists in git log: CONFIRMED
- Commit `7781f45` exists in git log: CONFIRMED
- All four snapshot files verified by human during Task 2 acceptance test
- All must_haves from plan frontmatter: PASS (see acceptance criteria table above)
