---
phase: 05-skill-output-ux-polish
plan: 02
subsystem: skill-state-persistence
tags: [react-context, state-lift, status-bar, css, layout]
requirements: [OUT-02]
completed_date: "2026-06-07"

dependency_graph:
  requires: []
  provides:
    - SkillStateMap in AppContext (consumed by 05-03 SkillButton)
    - SkillStatusBar shell component (reads context, zero-height when idle)
    - claudeos-content-wrapper CSS (flex layout for bar + main)
  affects:
    - src/views/DashboardView.tsx (skillStates state added to DashboardRoot)
    - src/components/App.tsx (content-wrapper + SkillStatusBar mount)
    - styles.css (content-wrapper, status-bar selectors)

tech_stack:
  added: []
  patterns:
    - "React useState + useCallback in function component (DashboardRoot) for cross-page state"
    - "Always-mounted component with CSS class toggle (display:none idle, display:flex active)"
    - "AppContext additive extension — existing destructures continue to compile"

key_files:
  created:
    - src/components/ui/SkillStatusBar.tsx
  modified:
    - src/types.ts
    - src/context/AppContext.tsx
    - src/views/DashboardView.tsx
    - src/components/App.tsx
    - styles.css
    - main.js

decisions:
  - "skillStates state lives in DashboardRoot (React FC) rather than a nested provider in App.tsx — DashboardRoot already uses useState for refreshNonce, making it the correct home for co-located React state; avoids double-provider complexity with no loss of correctness"
  - "SkillStatusBar destructures firstEntry safely (guarded null check) rather than inline IIFE destructuring — TypeScript strict mode requires explicit guard even when isActive guarantees non-empty"
  - "CSS uses display:none (not height:0 transition) for idle state — RESEARCH D-11 anti-pattern; avoids FOUC on first skill run"

metrics:
  duration: "~10 minutes"
  tasks_completed: 3
  files_modified: 6
---

# Phase 5 Plan 02: Skill State Persistence Shell Summary

Lifted skill run state to a context-backed map in `DashboardRoot` (React `useState`) and mounted a persistent `SkillStatusBar` in the App shell that is `display:none` when idle and `display:flex` when any skill is active — surviving page navigation via the context layer.

## What Was Built

### Task 1: Skill-state types + AppContext extension
Added three exports to `src/types.ts`:
- `SkillRunStatus = 'idle' | 'loading' | 'success' | 'error'`
- `SkillRunState { status: SkillRunStatus; outputPath: string | null }`
- `SkillStateMap = Record<string, SkillRunState>`

Extended `AppContextType` in `src/context/AppContext.tsx` with `skillStates: SkillStateMap` and `setSkillState: (skillName, state) => void` (additive — existing `{ app, plugin }` destructures compile unchanged).

Extended `DashboardRoot` in `src/views/DashboardView.tsx` to hold `skillStates` via `useState<SkillStateMap>({})` and a `useCallback`-stable `setSkillState` using functional `prev => ({ ...prev })` update pattern.

### Task 2: App.tsx content-wrapper + SkillStatusBar mount
Updated `src/components/App.tsx` to wrap `Sidebar` + content inside a `claudeos-content-wrapper` div, with `SkillStatusBar` always mounted above `<main>` inside that wrapper. `activePage` state and navigation wiring unchanged.

### Task 3: SkillStatusBar component + CSS
Created `src/components/ui/SkillStatusBar.tsx`:
- Reads `{ skillStates, app }` from `useAppContext()`
- Filters to `activeEntries` (status !== 'idle'), checks `isActive`
- Always returns the wrapper div (never `return null` — Pitfall 4)
- Shows first active entry with text per D-12: `[Skill] running...` / `[Skill] — Done [Open output]` / `[Skill] — Failed`
- `Open output` span calls `app.workspace.openLinkText(outputPath, '', 'tab')`

Added to `styles.css`:
- `.claudeos-content-wrapper`: `flex:1; display:flex; flex-direction:column; min-height:0`
- `.claudeos-status-bar`: `display:none` (zero-height idle)
- `.claudeos-status-bar--active`: `display:flex` with surface bg + border-bottom
- `.claudeos-status-bar__text`, `.claudeos-status-bar__link` + hover rule
- Updated `.claudeos-main` with `min-height:0` (flex absorption, Pitfall 4)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Architectural] skillStates state in DashboardRoot, not a nested provider in App.tsx**
- **Found during:** Task 1 type-check
- **Issue:** Plan called for a nested `AppContext.Provider` in App.tsx. However, `DashboardRoot` in `DashboardView.tsx` is already a React function component that uses `useState` (for `refreshNonce`). Adding `skillStates` alongside `refreshNonce` in `DashboardRoot` and including both in the single outer `AppContext.Provider` is architecturally equivalent and avoids double-provider complexity.
- **Fix:** Added `useState<SkillStateMap>({})` and `useCallback`-wrapped `setSkillState` to `DashboardRoot`; included both in the existing `AppContext.Provider value`. App.tsx reads everything via `useAppContext()` with no nested provider.
- **Why equivalent:** The plan's rationale for a nested provider was to avoid "state in the view class" — DashboardRoot is a React FC, not a class, so this concern doesn't apply. State survives page navigation identically either way.
- **Files modified:** `src/views/DashboardView.tsx` (additional to plan's file list)
- **Commits:** fe93a43

**2. [Rule 1 - Bug] Safe destructuring in SkillStatusBar**
- **Found during:** Task 3 type-check
- **Issue:** TypeScript strict mode rejects inline IIFE destructuring of `activeEntries[0]` as potentially `undefined` even within an `isActive` guard.
- **Fix:** Extract `firstEntry = activeEntries[0]`, then guard `firstEntry ? firstEntry[0] : ''` for `skillName` and `firstEntry ? firstEntry[1] : null` for `state`; inner JSX also guards on `state`.
- **Files modified:** `src/components/ui/SkillStatusBar.tsx`
- **Commits:** 021acc7

## Build Verification

- `tsc --noEmit`: exits 0 (all files type-check clean)
- `esbuild production`: exits 0 — `main.js` updated (1.1 MB bundle, `SkillStatusBar` confirmed present)
- Note: `deploy-plugin.mjs` has a pre-existing path escaping bug when run from worktree context; the build itself is green. The deploy script works correctly from the main checkout path.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: types + AppContext + DashboardRoot | fe93a43 | src/types.ts, src/context/AppContext.tsx, src/views/DashboardView.tsx |
| Tasks 2+3: App.tsx + SkillStatusBar + CSS | 021acc7 | src/components/App.tsx, src/components/ui/SkillStatusBar.tsx, styles.css, main.js |

## Known Stubs

None. The status bar reads from context correctly; `skillStates` initializes to `{}` so the bar is idle (hidden) until 05-03 writes to it via `setSkillState`.

## Threat Flags

None beyond what is in the plan's threat model. The only new cross-boundary value (`outputPath`) passes through `app.workspace.openLinkText` which is the Obsidian API — no filesystem write, no shell execution. React escapes all rendered text by default (`skillName` from Object key, status from enum union).

## Self-Check: PASSED

- [x] `src/types.ts` contains `SkillRunStatus`, `SkillRunState`, `SkillStateMap`
- [x] `src/context/AppContext.tsx` has `skillStates: SkillStateMap` and `setSkillState` in interface
- [x] `src/views/DashboardView.tsx` has `useState<SkillStateMap>({})` in `DashboardRoot`
- [x] `src/components/App.tsx` has `claudeos-content-wrapper`, `SkillStatusBar`, `claudeos-main`
- [x] `src/components/ui/SkillStatusBar.tsx` created, exports `SkillStatusBar`
- [x] `styles.css` contains `claudeos-content-wrapper`, `claudeos-status-bar`, `claudeos-status-bar--active`
- [x] `tsc --noEmit` exits 0
- [x] `esbuild production` exits 0, `main.js` updated
- [x] Commits fe93a43 and 021acc7 present in git log
