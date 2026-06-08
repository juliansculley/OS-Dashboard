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
  - "SECONDARY_WEIGHT=1.0 confirmed correct: Triceps weekly_with_secondary=18 vs weekly_primary_only=9 (2x ratio for push sessions)"
metrics:
  duration: "~45 minutes"
  completed: "2026-06-07"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 1
requirements_addressed: [WORKOUT-01]
---

# Phase 7 Plan 02: Exercise Muscle Map + Secondary Attribution Summary

**exercise-muscle-map.json enrichment layer (64 entries) wired into notion-workouts-sync.mjs with 3-step fallback chain (override → Notion text parse → empty) — bench press now correctly contributes to Chest, Triceps, and Shoulders via secondary attribution, confirmed in live re-run**

---

## Performance

- **Duration:** ~45 min
- **Started:** 2026-06-07
- **Completed:** 2026-06-07
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint, all complete)
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

### Task 2: scripts/notion-workouts-sync.mjs

Modified to implement the 3-step fallback chain:

1. **At startup:** loads `exercise-muscle-map.json` via `readFile(join(scriptDir, 'exercise-muscle-map.json'))` wrapped in try/catch. On missing/corrupt file: logs warning to stderr, continues with `{}` (graceful degradation, T-07-04 mitigated).

2. **New module-level constants:** `KNOWN_MUSCLES` Set (the 13 valid muscle group names from design §3.4) and `MUSCLE_LOWER_MAP` (lowercase → canonical-case for token matching).

3. **Replaced `resolveExerciseMuscles()`:** implements the full fallback chain:
   - Step 1: `exerciseMuscleOverride[normalizedName]` → use `secondary[]` if non-empty
   - Step 2: Parse `secondary_text` (Notion Secondary muscle free text) — split on commas/whitespace, case-insensitively match to known muscle names, keep matches
   - Step 3: `secondary: []`

   `primary[]` continues to come from Notion `Prime muscle` relation every run (always authoritative).

### Task 3: Live Verification (human-verify checkpoint — approved)

Live re-run results confirmed secondary attribution working correctly:
- sessions=287, lines=2787, exercises=67, muscles=13
- Push session 2026-06-06: Chest=6, Triceps=15, Shoulders=15 — bench press contributes to all three via secondary
- Triceps 2026-W23: weekly_with_secondary=18, weekly_primary_only=9 (exactly 2x, confirming SECONDARY_WEIGHT=1.0 full credit)
- weekly_with_secondary and weekly_primary_only differ as expected for exercises with secondary muscles

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
| Secondary attribution visible in weekly_with_secondary | PASS |
| weekly_with_secondary differs from weekly_primary_only for compound lifts | PASS |
| Bench press contributes to Chest + Triceps + Shoulders | PASS |

---

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Create exercise-muscle-map.json | `a8ac09f` | scripts/exercise-muscle-map.json (new, 64 entries) |
| Task 2: Wire fallback chain into sync script | `0862ef9` | scripts/notion-workouts-sync.mjs (+66/-12 lines) |
| Task 3: Human-verify checkpoint | verified by orchestrator | live re-run confirmed |

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None. Secondary attribution is wired and verified in live data.

---

## Threat Surface Scan

No new threat surface. T-07-04 (missing/corrupt map file) mitigated via try/catch graceful degradation. T-07-05 (map values in aggregation) accepted — map is developer-maintained, muscle names validated against KNOWN_MUSCLES set before use in the Notion text fallback path.

## Self-Check: PASSED

- `scripts/exercise-muscle-map.json` exists: FOUND
- `scripts/notion-workouts-sync.mjs` modified: CONFIRMED
- Commit `a8ac09f` exists: CONFIRMED
- Commit `0862ef9` exists: CONFIRMED
- All must_haves verified against orchestrator-provided verification results: PASS
