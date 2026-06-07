---
phase: 03-notion-dashboard
plan: 02
subsystem: ui
tags: [typescript, react, notion, settings, appcontext, types]

# Dependency graph
requires:
  - phase: 03-notion-dashboard
    plan: 01
    provides: notion-sync.mjs script and confirmed snapshot JSON shapes (field names used to define interfaces here)
provides:
  - src/types.ts — SnapshotMeta, TaskItem, TasksSnapshot, ProjectItem, ProjectsSnapshot, NewsletterItem, NewsletterSnapshot interfaces; PageId extended to include 'projects' and 'newsletter'; ClaudeOSSettings extended with six Notion keys; DEFAULT_SETTINGS updated
  - src/context/AppContext.tsx — AppContextType gains refreshNonce: number and triggerRefresh: () => void
  - src/views/DashboardView.tsx — DashboardRoot React function component holds refreshNonce state and supplies Provider value; onOpen simplified to render <DashboardRoot>
  - src/settings/SettingsTab.ts — Notion Sync section with six fields (nodePath, syncScriptPath, three snapshot paths, dueSoonDays)
affects:
  - 03-03 — Projects and Newsletter pages; RefreshButton component (reads refreshNonce from AppContext, all six settings from plugin.settings)
  - 03-04 — Task Scheduler plan (uses nodePath and syncScriptPath from settings)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React state wrapper pattern: DashboardRoot holds useState/useCallback for refreshNonce; class ItemView (onOpen) renders it — cleanly separates React state lifecycle from Obsidian class boundary"
    - "Partial<Record<PageId, ComponentType>> with null-safe fallback — allows PageId union to grow before all pages are implemented"

key-files:
  created: []
  modified:
    - src/types.ts
    - src/context/AppContext.tsx
    - src/views/DashboardView.tsx
    - src/settings/SettingsTab.ts
    - src/components/App.tsx

key-decisions:
  - "App.tsx PAGES typed as Partial<Record<PageId, ComponentType>> with ?? HomePage fallback — allows build to pass before Plans 03-03/03-04 register 'projects' and 'newsletter' pages; no runtime risk since activePage defaults to 'home'"
  - "DashboardRoot is a named function component (not anonymous) — clearer in React DevTools; defined before DashboardView class for hoisting clarity"
  - "node_modules junction created in worktree via PowerShell New-Item -ItemType Junction — worktrees don't inherit node_modules; junction allows esbuild.config.mjs (which uses import esbuild from 'esbuild') to resolve packages"

patterns-established:
  - "Snapshot interface naming: <Entity>Item for row shape, <Entity>Snapshot extends SnapshotMeta for file shape — Plans 03-03/03-04 use these directly"
  - "DashboardRoot component signature: ({ app, plugin }: { app: App; plugin: ClaudeOSPlugin }) — canonical props shape for any future re-renders or test stubs"

requirements-completed: [NOTION-03, NOTION-04]

# Metrics
duration: 6min
completed: 2026-06-07
---

# Phase 3 Plan 02: Types, Settings, and AppContext Foundation Summary

**TypeScript contracts for Notion snapshot consumption: seven interfaces matching notion-sync.mjs output exactly, six settings with defaults, and a refreshNonce/triggerRefresh plumbing layer on AppContext via a DashboardRoot React wrapper**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-07T04:51:13Z
- **Completed:** 2026-06-07T04:57:14Z
- **Tasks:** 3 of 3 complete
- **Files modified:** 5

## Accomplishments

- `src/types.ts` — Seven new exported interfaces (`SnapshotMeta`, `TaskItem`, `TasksSnapshot`, `ProjectItem`, `ProjectsSnapshot`, `NewsletterItem`, `NewsletterSnapshot`) with field names matching the confirmed snapshot output from 03-01-SUMMARY.md. `PageId` extended to four values. `ClaudeOSSettings` extended with six new keys. `DEFAULT_SETTINGS` updated.
- `src/context/AppContext.tsx` — `AppContextType` gains `refreshNonce: number` and `triggerRefresh: () => void` (D-11). Backward-compatible — existing Home/Social pages ignore these fields.
- `src/views/DashboardView.tsx` — `DashboardRoot` React function component introduced; holds `useState(0)` for `refreshNonce` and `useCallback` for `triggerRefresh`; supplies the full `AppContext.Provider` value. `DashboardView.onOpen` now renders `<DashboardRoot>` instead of an inline Provider (class methods cannot call useState).
- `src/settings/SettingsTab.ts` — "Notion Sync" heading section added after existing "Data File Paths" rows; six settings rows: `nodePath`, `syncScriptPath`, `tasksSnapshotPath`, `projectsSnapshotPath`, `newsletterSnapshotPath`, `dueSoonDays`. All rows call `await plugin.saveSettings()`. `dueSoonDays` uses `parseInt` with fallback to `3`.
- `npm run build` passes with zero TypeScript errors (both `tsc --noEmit` and esbuild production).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend types.ts with snapshot interfaces, PageId, settings, and defaults** - `dd5f8f1` (feat)
2. **Task 2: Add refreshNonce + triggerRefresh to AppContext and supply them from a state wrapper in DashboardView** - `2d5a8d1` (feat)
3. **Task 3: Add a Notion Sync section to SettingsTab with all six fields** - `de4dce3` (feat)

## Files Created/Modified

- `src/types.ts` — Added seven snapshot interfaces, extended `PageId` union, extended `ClaudeOSSettings` with six keys, updated `DEFAULT_SETTINGS`
- `src/context/AppContext.tsx` — `AppContextType` gains `refreshNonce` and `triggerRefresh`
- `src/views/DashboardView.tsx` — `DashboardRoot` function component introduced; `onOpen` simplified; imports `useState`/`useCallback`
- `src/settings/SettingsTab.ts` — "Notion Sync" section with six settings rows
- `src/components/App.tsx` — `PAGES` typed as `Partial<Record<PageId, ...>>` with null-safe fallback (deviation fix for build)

## Decisions Made

- `PAGES` in `App.tsx` changed to `Partial<Record<PageId, ComponentType>>` with `?? HomePage` fallback — required because extending `PageId` to four values made the existing exhaustive `Record` fail until Plans 03-03/03-04 register the new pages. Correct behavior: if a not-yet-registered page id is navigated to, it falls back to `HomePage`.
- `DashboardRoot` defined as a named function component above the `DashboardView` class for clarity; takes `{ app, plugin }` as props and owns all React state for the Provider value.
- `node_modules` junction created in worktree via `PowerShell New-Item -ItemType Junction` pointing to main repo's `node_modules` — worktrees do not inherit `node_modules` from the main checkout; junction required for `esbuild.config.mjs` to resolve its imports.

## Snapshot Interface Field-Name Reconciliation (Plan 2 Output Requirement)

Field names match 03-01-SUMMARY.md confirmed output exactly:

| Interface | Field | Source confirmation |
|-----------|-------|---------------------|
| `TaskItem` | `name`, `status`, `priority?`, `due?`, `url` | 03-01-SUMMARY.md tasks.json shape |
| `TasksSnapshot` | `active_count`, `overdue_count`, `due_soon_count`, `items`, `generated_at` | 03-01-SUMMARY.md |
| `ProjectItem` | `name`, `status`, `progress?`, `url` | 03-01-SUMMARY.md projects.json shape |
| `ProjectsSnapshot` | `active_count`, `items`, `generated_at` | 03-01-SUMMARY.md |
| `NewsletterItem` | `name`, `stage`, `content_type?`, `platform?`, `url` | 03-01-SUMMARY.md newsletter.json shape |
| `NewsletterSnapshot` | `by_stage`, `items`, `generated_at` | 03-01-SUMMARY.md |

`project` field absent from `TaskItem` (D-06). `active_tasks`/`overdue_tasks` absent from `ProjectItem` (Meta formula skipped). Both consistent with sync script.

## DashboardRoot Component Signature (Plan 3/4 Reference)

```tsx
function DashboardRoot({ app, plugin }: { app: App; plugin: ClaudeOSPlugin }): React.JSX.Element {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshNonce(n => n + 1), []);
  return (
    <AppContext.Provider value={{ app, plugin, refreshNonce, triggerRefresh }}>
      <DashApp />
    </AppContext.Provider>
  );
}
```

Plans 03-03/03-04: call `triggerRefresh()` via `useAppContext()` to trigger snapshot re-reads. Subscribe to `refreshNonce` in `useEffect` dependency arrays.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] App.tsx PAGES exhaustive Record broken by PageId extension**
- **Found during:** Task 1 (tsc --noEmit verification)
- **Issue:** `const PAGES: Record<PageId, React.ComponentType>` required all four PageId values but only 'home' and 'social' were registered — TypeScript error TS2739. Plans 03-03/03-04 will add 'projects' and 'newsletter', but the build must pass now.
- **Fix:** Changed to `Partial<Record<PageId, React.ComponentType>>` with `?? HomePage` null-safe fallback on `PAGES[activePage]`
- **Files modified:** `src/components/App.tsx`
- **Verification:** `tsc --noEmit` passes; esbuild production passes
- **Committed in:** `dd5f8f1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in pre-existing code exposed by PageId extension)
**Impact on plan:** Necessary for build compliance. The fix is correct for forward-compatibility: new pages register themselves in Plans 03-03/03-04 and will be picked up by the Partial Record without further App.tsx changes.

## Issues Encountered

- `node_modules` not present in git worktree — build commands fail. Resolved by creating a Windows junction from worktree's `node_modules` to the main repo's `node_modules` via PowerShell `New-Item -ItemType Junction`. Junction is a directory pointer, not tracked by git, and does not appear in `git status`.

## Known Stubs

None — this plan adds TypeScript types, context plumbing, and settings UI only. No snapshot data is read or rendered here.

## Threat Flags

None — no new network surface, no new file reads, no new exec calls. Settings fields store string/number values via Obsidian's standard `saveData` mechanism. `syncScriptPath` and `nodePath` are stored but not executed in this plan (execution happens in Plan 03-03's RefreshButton).

## Next Phase Readiness

- All TypeScript contracts for Notion data consumption are in place — Plans 03-03/03-04 can import `TasksSnapshot`, `ProjectsSnapshot`, `NewsletterSnapshot` directly from `src/types.ts`
- `useAppContext().refreshNonce` and `useAppContext().triggerRefresh()` are available to any component
- `plugin.settings.nodePath` and `plugin.settings.syncScriptPath` are in place for the RefreshButton's `execFile` call
- Build is green; existing Home/Social pages unaffected

## Self-Check

- [x] `src/types.ts` exports `SnapshotMeta`, `TaskItem`, `TasksSnapshot`, `ProjectItem`, `ProjectsSnapshot`, `NewsletterItem`, `NewsletterSnapshot`
- [x] `TaskItem` has no `project` member; `ProjectItem` has no `active_tasks`/`overdue_tasks` members
- [x] `PageId` equals `'home' | 'social' | 'projects' | 'newsletter'`
- [x] `ClaudeOSSettings` contains all ten keys (four original + six new)
- [x] `DEFAULT_SETTINGS` sets `nodePath: "node"`, `syncScriptPath: ""`, `dueSoonDays: 3`, snapshot paths under `.dashboard-data/`
- [x] `AppContextType` declares `refreshNonce: number` and `triggerRefresh: () => void`
- [x] `DashboardView.tsx` imports `useState` and `useCallback` and defines `DashboardRoot` function component
- [x] `SettingsTab.ts` contains `setName('Notion Sync').setHeading()`
- [x] Six Notion Sync rows bind to correct settings keys; `dueSoonDays` uses `parseInt` with fallback
- [x] Commits `dd5f8f1`, `2d5a8d1`, `de4dce3` in git log
- [x] `tsc --noEmit` exits 0; esbuild production exits 0

## Self-Check: PASSED

---
*Phase: 03-notion-dashboard*
*Completed: 2026-06-07*
