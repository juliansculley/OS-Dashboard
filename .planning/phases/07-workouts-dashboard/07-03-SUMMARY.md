---
phase: 07-workouts-dashboard
plan: "03"
subsystem: ui
tags: [chart.js, dompurify, typescript, settings, css, workouts]

requires:
  - phase: 07-01
    provides: notion-workouts-sync.mjs and four snapshot files
  - phase: 07-02
    provides: exercise-muscle-map.json with secondary muscle wiring

provides:
  - src/utils/sanitizeText.ts (SEC-01 DOMPurify sanitizer for Chart.js labels)
  - src/types.ts extensions (four workout snapshot interfaces + settings + PageId)
  - src/settings/SettingsTab.ts Workouts Data section
  - styles.css chart palette tokens + all workouts component classes
  - chart.js and dompurify installed and bundle-ready

affects:
  - 07-04 (MuscleVolumeTab — consumes MuscleVolumeSnapshot, CSS classes, sanitizeText)
  - 07-05 (ProgressionTab — consumes ExercisesSnapshot, CSS classes, sanitizeText)
  - 07-06 (WorkoutsPage + HistoryTab + ContextTab — all consume settings + types + CSS)

tech-stack:
  added:
    - chart.js ^4.5.1 (bundled via esbuild, NOT in external array)
    - dompurify ^3.4.8 (SEC-01 HTML sanitizer)
    - "@types/dompurify" ^3.0.5 (devDependency)
  patterns:
    - "DOMPurify sanitizeText utility pattern — plain-text sanitizer for non-React render surfaces (Chart.js labels)"
    - "Workout snapshot type pattern — SnapshotMeta extension with dual attribution arrays (weekly_with_secondary + weekly_primary_only)"
    - "--cos-chart-* palette tokens scoped inside .claudeos-dashboard (not :root) for CSS var resolution via getComputedStyle"

key-files:
  created:
    - src/utils/sanitizeText.ts
  modified:
    - src/types.ts
    - src/settings/SettingsTab.ts
    - styles.css
    - package.json
    - package-lock.json

key-decisions:
  - "snapshot path defaults use 'OS-Dashboard/.dashboard-data/' prefix (matching Phase 3 convention)"
  - "MuscleVolumeSnapshot uses weekly_with_secondary + weekly_primary_only (matching notion-workouts-sync.mjs output — not the design doc's 'weekly' field)"
  - "node_modules in worktree set up as PowerShell junction pointing to main checkout after empty dir caused npm install failures"
  - "chart.js absent from esbuild external array — bundled and tree-shaken by esbuild"

patterns-established:
  - "Pattern SEC-01: sanitizeText(input) strips HTML with empty ALLOWED_TAGS/ALLOWED_ATTR — use before any Chart.js label, not for React text children"
  - "Pattern chart-colors: --cos-chart-0..12 declared inside .claudeos-dashboard, resolved at mount via getComputedStyle"

requirements-completed: [WORKOUT-01, WORKOUT-02, WORKOUT-03, WORKOUT-04, WORKOUT-05]

duration: ~25min
completed: 2026-06-08
---

# Phase 7 Plan 03: Workouts Foundation — Types, Settings, Sanitizer, CSS Summary

**Chart.js + DOMPurify installed, four workout snapshot interfaces + 7 settings keys added to types.ts, Workouts Data section in SettingsTab, sanitizeText SEC-01 utility, and complete Workouts stylesheet (13 chart palette tokens + all component classes)**

---

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-08T07:20:00Z
- **Completed:** 2026-06-08T07:41:18Z
- **Tasks:** 2 auto tasks (Task 1 was pre-approved by orchestrator)
- **Files modified:** 5 modified, 1 created

## Accomplishments

- chart.js ^4.5.1 and dompurify ^3.4.8 installed; chart.js confirmed absent from esbuild external array (bundled + tree-shaken)
- All four workout snapshot interfaces (`MuscleVolumeSnapshot`, `ExercisesSnapshot`, `SessionsSnapshot`, `WorkoutsMetaSnapshot`) with field names matching `notion-workouts-sync.mjs` output; `PageId` extended to include `'workouts'`; `ClaudeOSSettings` + `DEFAULT_SETTINGS` extended with 7 workout keys
- `src/utils/sanitizeText.ts` created — SEC-01 DOMPurify sanitizer with empty `ALLOWED_TAGS`/`ALLOWED_ATTR` for Chart.js labels (non-React render surfaces)
- `SettingsTab.ts` extended with "Workouts Data" heading + 5 path settings + `muscleWindowDays` (parseInt pattern) + `secondaryMuscleWeight` (parseFloat pattern)
- `styles.css` extended with 13 `--cos-chart-0..12` palette tokens inside `.claudeos-dashboard` block + complete set of `.claudeos-workouts-*` and `.claudeos-pr-*` component classes

## Task Commits

1. **Task 2: Install deps + types + settings + sanitizeText util** — `f19138a` (feat)
2. **Task 3: Add Workouts CSS — chart palette tokens + all component classes** — `382086c` (feat)

## Files Created/Modified

- `src/utils/sanitizeText.ts` — New: DOMPurify-based plain-text sanitizer for Chart.js labels (SEC-01)
- `src/types.ts` — Extended: PageId + 4 snapshot interfaces + supporting types + 7 settings keys
- `src/settings/SettingsTab.ts` — Extended: Workouts Data section with 7 settings
- `styles.css` — Extended: 13 chart palette tokens + all workouts component CSS classes
- `package.json` — Added chart.js, dompurify dependencies + @types/dompurify devDependency
- `package-lock.json` — Updated lockfile from main checkout

## Decisions Made

- **Snapshot path defaults use `OS-Dashboard/.dashboard-data/` prefix**: matches the Phase 3 convention (`tasksSnapshotPath`, `projectsSnapshotPath` etc.) — plan instruction took precedence over UI-SPEC Settings Contract table which showed the shorter path
- **`MuscleVolumeSnapshot` uses `weekly_with_secondary` + `weekly_primary_only` arrays** (not `weekly` as in the design doc §8): matches the actual `notion-workouts-sync.mjs` output verified in 07-01-SUMMARY; the script emits dual arrays for UI attribution toggle — keeping types consistent with the real output
- **node_modules junction strategy**: worktree had an empty real `node_modules` directory; npm install into the worktree failed because esbuild's install script couldn't find `node` on PATH. Resolved by removing the empty dir and creating a PowerShell junction to the main checkout's `node_modules` (same pattern as prior phases documented in STATE.md)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] node_modules junction required for worktree npm install**
- **Found during:** Task 2 (npm install step)
- **Issue:** The worktree had an empty real `node_modules` directory; running `npm install chart.js dompurify` failed because esbuild's install script (run as a postinstall hook) couldn't find `node` on PATH in the bash context used by the Bash tool
- **Fix:** Installed packages in the main checkout, then removed the empty worktree `node_modules` directory and replaced it with a PowerShell junction (`New-Item -ItemType Junction`) pointing to the main checkout's `node_modules`. Copied the updated `package-lock.json` from the main checkout to the worktree. Updated the worktree's `package.json` to include the new deps.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `ls node_modules | grep chart` confirmed chart.js accessible; `tsc --noEmit` passed
- **Committed in:** `f19138a` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking)
**Impact on plan:** Essential fix for package accessibility in worktree context. No scope creep.

## Issues Encountered

- npm install via bash in worktree failed because esbuild's postinstall script needs `node` on PATH, which isn't available in the bash environment. Resolved by using the main checkout for installation + junction pattern (established approach from Phase 3).

## User Setup Required

None — no external service configuration required for this plan. chart.js and dompurify are npm packages bundled at build time; no runtime secrets or environment variables needed.

## Next Phase Readiness

- Types, settings, CSS, and sanitizer are complete foundations for 07-04 (MuscleVolumeTab), 07-05 (ProgressionTab), and 07-06 (WorkoutsPage + HistoryTab + ContextTab)
- `sanitizeText` is importable from `src/utils/sanitizeText.ts` — all tab components must use it before passing Notion strings to Chart.js labels
- CSS classes are all defined — tab components just need to apply the class names
- Settings keys are live — WorkoutsPage can read `workoutsSyncScriptPath`, `workoutsMuscleVolumePath`, etc. from `plugin.settings` immediately
- No blockers

---

*Phase: 07-workouts-dashboard*
*Completed: 2026-06-08*

## Self-Check: PASSED

- `src/utils/sanitizeText.ts` exists: FOUND
- `src/types.ts` contains `MuscleVolumeSnapshot`: FOUND
- `styles.css` contains `--cos-chart-0`: FOUND
- `styles.css` contains `claudeos-workouts-tabs`: FOUND
- `src/settings/SettingsTab.ts` contains `Workouts Data`: FOUND
- Commit `f19138a` exists: CONFIRMED (git log)
- Commit `382086c` exists: CONFIRMED (git log)
- `npx tsc --noEmit` passes: CONFIRMED (exit 0)
- chart.js absent from esbuild external: CONFIRMED (grep returns 0)
