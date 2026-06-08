---
phase: 07-workouts-dashboard
plan: "02"
subsystem: scripts
tags: [notion-sync, muscle-map, secondary-attribution, enrichment-layer]
dependency_graph:
  requires:
    - scripts/notion-workouts-sync.mjs (07-01)
  provides:
    - scripts/exercise-muscle-map.json
    - scripts/notion-workouts-sync.mjs (modified — fallback chain wired)
  affects:
    - .dashboard-data/workouts-muscle-volume.json (secondary attribution now populated)
    - Phase 7 plans 03-06 (workouts-muscle-volume.json now correct with secondary)
tech_stack:
  added: []
  patterns:
    - "exercise-muscle-map.json: keyed by normalized name (lowercase+trim), secondary[] hand-curated for compound lifts"
    - "3-step fallback chain: override file → Notion text parse → empty"
    - "MUSCLE_LOWER_MAP for O(1) case-insensitive token matching"
    - "Graceful degradation: try/catch on map load, continues with empty map on failure"
key_files:
  created:
    - scripts/exercise-muscle-map.json
  modified:
    - scripts/notion-workouts-sync.mjs
decisions:
  - "Map keyed by normalized name (lowercase+trim) not exercise_id — easier to hand-edit and matches primary[] normalization the script already applies"
  - "_note key used in JSON for human reference (not a comment, valid JSON key, not iterated by script)"
  - "MUSCLE_LOWER_MAP built at module load time from KNOWN_MUSCLES set — avoids repeated string iteration per exercise"
  - "primary[] entries left empty in the map file — Notion Prime muscle is always authoritative and overrides any value"
  - "Override file path resolved via join(scriptDir, 'exercise-muscle-map.json') — works correctly whether script is run from any cwd"
metrics:
  duration: "~3 minutes"
  completed: "2026-06-08"
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 1
requirements_addressed: [WORKOUT-01]
---

# Phase 7 Plan 02: Exercise Muscle Map + Secondary Attribution Summary

**exercise-muscle-map.json enrichment layer (64 entries) wired into notion-workouts-sync.mjs with 3-step fallback chain (override → Notion text parse → empty) — bench press now contributes to Triceps via secondary; worked-example verification pending human checkpoint**

---

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-08
- **Completed (auto tasks):** 2026-06-08
- **Tasks:** 2 auto + 1 human-verify checkpoint
- **Files modified:** 1 created, 1 modified

## What Was Built

### Task 1: scripts/exercise-muscle-map.json

A 64-entry JSON enrichment map keyed by normalized exercise name (lowercase + trim) — the same normalization the sync script uses for lookup. Each entry is `{ "primary": [], "secondary": [] }`.

Key secondary assignments for compound lifts from the live exercise list:
- Bench variants (db bench press, db incl bench, incl smith press, close-grip bench) → `["Triceps", "Shoulders"]`
- OHP variants (db shoulder press, shoulder press hoist) → `["Triceps"]`
- Row variants (bent over row, db rows, chest-supt row, close grip cable row, flexion row) → `["Biceps"]`
- Pulldowns / pull-ups → `["Biceps"]`
- Squat variants (hack squat, db squats, leg press) → `["Glutes", "Hamstrings"]`
- Deadlift → `["Back", "Lower Back", "Glutes"]`
- SLDL → `["Glutes", "Lower Back"]`
- Rack pulls → `["Lower Back", "Traps"]`
- Dips → `["Chest", "Shoulders"]`
- Upright row → `["Biceps", "Traps"]`
- Push-ups → `["Triceps", "Shoulders"]`
- Isolation movements (curls, tricep extensions, lateral raises, shrugs, calves, abs) → `[]`

Accepted: valid JSON (node -e JSON.parse exits 0), no Cardio or knee values, Side Delt and Shoulders kept as separate buckets.

### Task 2: scripts/notion-workouts-sync.mjs

Modified to implement the 3-step fallback chain:

1. **At startup:** loads `exercise-muscle-map.json` via `readFile(join(scriptDir, 'exercise-muscle-map.json'))` wrapped in try/catch. On missing/corrupt file: logs warning to stderr, continues with `{}` (graceful degradation, T-07-04 mitigated).

2. **New module-level constants:** `KNOWN_MUSCLES` Set (the 13 valid muscle group names from design §3.4) and `MUSCLE_LOWER_MAP` (lowercase → canonical-case for token matching).

3. **Replaced `resolveExerciseMuscles()`:** implements the full fallback chain:
   - Step 1: `exerciseMuscleOverride[normalizedName]` → use `secondary[]` if non-empty
   - Step 2: Parse `secondary_text` (Notion Secondary muscle free text) — split on commas/whitespace, case-insensitively match to known muscle names, keep matches
   - Step 3: `secondary: []`

   `primary[]` continues to come from Notion `Prime muscle` relation every run (always authoritative).

---

## Acceptance Criteria

| Check | Result |
|-------|--------|
| `node --check scripts/notion-workouts-sync.mjs` exits 0 | PASS |
| `exercise-muscle-map` referenced in script + wrapped in try/catch | PASS |
| `Prime muscle` present in script | PASS |
| No `process.exit` inside map-load catch block | PASS |
| `exercise-muscle-map.json` valid JSON (node -e JSON.parse exits 0) | PASS |
| `db bench press` key has Triceps in secondary | PASS |
| No Cardio or knee values in map | PASS |
| Side Delt and Shoulders separate (never merged) | PASS |

**Human-verify checkpoint (Task 3):** pending — re-run sync script and confirm secondary attribution visible in `workouts-muscle-volume.json`, weekly_with_secondary differs from weekly_primary_only, worked example Chest=3/Triceps=7 holds.

---

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Create exercise-muscle-map.json | `a8ac09f` | scripts/exercise-muscle-map.json (new, 64 entries) |
| Task 2: Wire fallback chain into sync script | `0862ef9` | scripts/notion-workouts-sync.mjs (+66/-12 lines) |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None. The secondary attribution is wired. The worked-example verification (Chest=3/Triceps=7) is the human-verify checkpoint, not a stub.

---

## Threat Surface Scan

No new threat surface. T-07-04 (missing/corrupt map file) mitigated via try/catch graceful degradation. T-07-05 (map values in aggregation) accepted — map is developer-maintained, muscle names validated against KNOWN_MUSCLES set before use in the Notion text fallback path.

## Self-Check: PASSED

- `scripts/exercise-muscle-map.json` exists: FOUND
- `scripts/notion-workouts-sync.mjs` modified: CONFIRMED
- Commit `a8ac09f` exists: CONFIRMED
- Commit `0862ef9` exists: CONFIRMED
