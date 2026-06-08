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
  - "Session name parsed with trailing MMDDYY regex: /-?\d{6}$/ strips date, keeps template"
  - "WO results property name stored with verbatim trailing space per design §3.1"
  - "Cardio and knee excluded from allMuscles set and orderedMuscles list (design §6.3)"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-07"
  tasks_completed: 1
  tasks_total: 2
  files_created: 1
  files_modified: 0
requirements_addressed: [WORKOUT-01, WORKOUT-02, WORKOUT-03, WORKOUT-04]
---

# Phase 7 Plan 01: Notion Workouts Sync Script Summary

**One-liner:** Six-source Notion REST sync with in-memory relation joins, §6 aggregation algorithms (dual attribution arrays), and four atomic JSON snapshots.

---

## What Was Built

`scripts/notion-workouts-sync.mjs` — a standalone Node ESM script (no npm deps) that:

1. **Fetches six Notion databases in parallel** via REST (`POST /v1/data_sources/{uuid}/query`, `Notion-Version: 2025-09-03`): Workout Schedule, Workout Logbook, Exercises, Muscles Groups, Mesocycle timeline, JS measurements.

2. **Builds in-memory lookup maps** for muscles (id → name), sessions (id → {date, name, row}), and exercises (id → {name, primary[], secondary_text}).

3. **Joins logbook lines** per design §6.1: each line resolves its `Workout Log` relation → session date, and its `Exercise` relation → exercise + muscles. Reads `Sets`/`Reps`/`Weight` as plain numbers; reads `Volume`/`1RM` from REST formula values with Sets×Reps×Weight fallback (D5).

4. **Muscle-group set counting** per design §6.2: unions primary ∪ secondary muscles per line, accumulates `line.sets × weight_factor` at three grains simultaneously (per-session, per ISO week, per window). Emits both `weekly_with_secondary` (SECONDARY_WEIGHT = 1.0) and `weekly_primary_only` as `MuscleWeekCell[]` arrays — this is the array pair the UI attribution toggle will swap.

5. **Per-exercise series** per design §6.4: groups included lines (where reps and weight non-null) by exercise_id, sorts ascending by date, emits `{date, weight, volume, est_1rm}` points with `best_weight` and `best_1rm`.

6. **Session rows** per design D6: `template` = Name minus trailing `MMDDYY` regex strip; `tags[]` = Push/Pull/Full/Arms/Hyp/Str tokens from Name; reads `Difficulty` (multi-select), `WO results ` (verbatim trailing space), `Location`; date-joins mesocycle.

7. **Meta snapshot**: `current_meso` date-joined to today; `bodyweight` series from JS measurements where `Measurement == "Weight"`, sorted ascending.

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

---

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Build notion-workouts-sync.mjs | `7b0b66a` | scripts/notion-workouts-sync.mjs (new, 612 lines) |

---

## Deviations from Plan

None — plan executed exactly as written. Extension point for 07-02 secondary muscle enrichment is clearly marked with a `// EXTENSION POINT (07-02):` comment at the `resolveExerciseMuscles()` call site.

---

## Known Stubs

`secondary: []` in `resolveExerciseMuscles()` — intentional placeholder. Design §6.3 specifies the enrichment file is wired in plan 07-02. The worked-example test (Chest 3 / Triceps 7) requires secondary attribution for bench press → Triceps to pass; this is expected to fail until 07-02 seeds the map.

---

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond what the plan's threat model covers. Token handling exactly mirrors `notion-sync.mjs` (T-07-01 mitigated). Pagination loop is bounded `has_more`/`next_cursor` (T-07-03 mitigated). Notion-sourced strings written as plain JSON; sanitization at render time in 07-03/04/05/06 (T-07-02 accepted/deferred).

---

## Awaiting: Task 2 (Checkpoint — Human Verify)

The script is syntactically valid and structure-verified. It requires a live Notion run to confirm the four snapshots write correctly and the worked-example acceptance test passes (Chest 3 / Triceps 7). See checkpoint details in the executor return message.

---

## Self-Check

- [x] `scripts/notion-workouts-sync.mjs` exists: FOUND
- [x] Commit `7b0b66a` exists in git log
- [x] `node --check` passes
- [x] All 6 UUIDs, both attribution arrays, correct Notion-Version, WO results trailing space, built-in imports only

## Self-Check: PASSED
