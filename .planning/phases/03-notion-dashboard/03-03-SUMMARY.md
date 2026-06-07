---
phase: 03-notion-dashboard
plan: 03
subsystem: ui
tags: [typescript, react, notion, execfile, child_process, refresh, projects, tasks]

# Dependency graph
requires:
  - phase: 03-notion-dashboard
    plan: 02
    provides: "AppContext refreshNonce/triggerRefresh, TasksSnapshot/ProjectsSnapshot interfaces, ClaudeOSSettings with nodePath/syncScriptPath/snapshot paths"
provides:
  - src/components/ui/RefreshButton.tsx — execFile-based refresh state machine, last-synced HH:mm label; exports isStale and formatHHmm helpers
  - src/components/ui/ListRow.tsx — shared row component with external Notion link (target="_blank" rel="noopener noreferrer")
  - src/components/pages/ProjectsPage.tsx — projects + tasks rendering with overdue/due-soon emphasis, no-data/stale degradation; refreshNonce-driven re-reads
  - src/components/App.tsx — PAGES map now includes projects: ProjectsPage
  - src/components/ui/Sidebar.tsx — NAV_ITEMS includes { id: 'projects', label: 'Projects', iconId: 'folder-kanban' }
  - styles.css — Phase 3 scoped CSS: refresh bar/button, list rows, stale label, projects page layout
affects:
  - 03-04 — Newsletter page reuses ListRow component and imports isStale/formatHHmm from RefreshButton

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "execFile(nodePath, [scriptPath]) with separate positional args — no shell, no interpolation (SEC-03, D-09)"
    - "T | null | 'error' discriminated union with isSnapshotData type guard — narrows safely without ts2367 overlap errors"
    - "refreshNonce in useEffect deps — nonce-bump from triggerRefresh() causes subscribed pages to re-read snapshots without Obsidian reload"
    - "isStale/formatHHmm exported from RefreshButton — utility co-location pattern for reuse across pages"
    - "Overdue/due-soon split before rendering — classifyTask returns emphasis level, filters partition taskItems array"

key-files:
  created:
    - src/components/ui/RefreshButton.tsx
    - src/components/ui/ListRow.tsx
    - src/components/pages/ProjectsPage.tsx
  modified:
    - src/components/App.tsx
    - src/components/ui/Sidebar.tsx
    - styles.css

key-decisions:
  - "isSnapshotData<T> type guard used instead of inline !== null && !== 'error' checks — avoids TS2367 'no overlap' error when comparing generic T against string literal 'error'"
  - "folder-kanban chosen as Lucide icon id for Projects nav item (available in Obsidian's setIcon, semantically correct)"
  - "isStale and formatHHmm co-located in RefreshButton.tsx as named exports — Plan 4 imports them from there; no separate util file needed given small scope"
  - "Blank syncScriptPath sets error state and returns before execFile call — user feedback without exec (D-09)"
  - "Stale banner uses the older of the two snapshot timestamps when both are stale — conservative; shows worst case"
  - "Empty 'Active Tasks' section still rendered when all tasks are overdue/due-soon, with 'No other active tasks.' copy — avoids invisible section"

patterns-established:
  - "Page data loading: useEffect with [settingPath, refreshNonce] deps + readJsonFile<T> + T|null|'error' union state"
  - "isSnapshotData<T>() type guard for discriminated union narrowing in generic contexts"
  - "CSS Phase 3 section comment block appended to styles.css with scoping comment"

requirements-completed: [NOTION-04, NOTION-05, NOTION-08]

# Metrics
duration: 5min
completed: 2026-06-07
---

# Phase 3 Plan 03: RefreshButton, ListRow, and ProjectsPage Summary

**execFile-based refresh state machine with triggerRefresh nonce-bump, shared ListRow with Notion deep links, and a ProjectsPage rendering active projects + tasks with overdue/due-soon emphasis and graceful no-data/stale degradation**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-07T05:02:01Z
- **Completed:** 2026-06-07T05:07:00Z
- **Tasks:** 3 of 3 complete
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `RefreshButton.tsx` — clones SkillButton's idle/loading/success/error state machine; calls `execFile(nodePath, [syncScriptPath])` with no shell/interpolation (SEC-03); guards against blank `syncScriptPath` without calling exec; calls `triggerRefresh()` on success to bump the nonce; reads `generated_at` from tasks snapshot and renders "Last synced HH:mm"; exports `isStale` and `formatHHmm` for reuse
- `ListRow.tsx` — shared row component: `<a target="_blank" rel="noopener noreferrer">` with name as JSX text (XSS-safe, D-17), badge pills, external-link icon via `setIcon`
- `ProjectsPage.tsx` — reads both snapshot paths via `readJsonFile`; `refreshNonce` in both `useEffect` dep arrays (NOTION-04); `T | null | 'error'` union with `isSnapshotData` type guard; renders `<RefreshButton />` at top; stale banner when `generated_at` > 24h (D-14, data still renders); "Overdue & Due Soon" sub-section above "Active Tasks" (only shown when non-empty); overdue/due-soon items pass `emphasis` prop to `ListRow`; no `dangerouslySetInnerHTML` (D-17)
- `App.tsx` and `Sidebar.tsx` — Projects page registered in PAGES map and NAV_ITEMS
- `styles.css` — Phase 3 rules appended, all scoped under `.claudeos-dashboard`; refresh button mirrors skill-button styling; list rows with overdue/due-soon accent borders; stale label; projects page section layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Build RefreshButton (execFile state machine + last-synced) and ListRow** - `3ad9e6d` (feat)
2. **Task 2: Build ProjectsPage with overdue/due-soon emphasis, no-data and stale states** - `f73c3b7` (feat)
3. **Task 3: Register Projects in App + Sidebar and add scoped CSS** - `1de60d7` (feat)

## Files Created/Modified

- `src/components/ui/RefreshButton.tsx` — Created; execFile state machine + last-synced label + isStale/formatHHmm exports
- `src/components/ui/ListRow.tsx` — Created; shared Notion deep-link row component
- `src/components/pages/ProjectsPage.tsx` — Created; projects + tasks rendering with overdue/due-soon emphasis
- `src/components/App.tsx` — Modified; added `projects: ProjectsPage` import and PAGES entry
- `src/components/ui/Sidebar.tsx` — Modified; added `{ id: 'projects', label: 'Projects', iconId: 'folder-kanban' }`
- `styles.css` — Modified; Phase 3 CSS rules appended (~130 lines)

## Decisions Made

- `isSnapshotData<T>` type guard for discriminated union narrowing — TypeScript TS2367 ("no overlap" for generic T vs string) prevents inline `!== 'error'` comparisons from narrowing; a separate type predicate function resolves this cleanly
- `folder-kanban` icon for Projects nav — semantically correct, available in Obsidian's Lucide set
- `isStale`/`formatHHmm` co-located in `RefreshButton.tsx` as named exports — Plan 4 imports them directly from there; no separate util file needed for two small pure functions
- Stale label uses older of the two snapshot timestamps when both are stale — conservative choice; shows worst case to user
- Empty "Active Tasks" sub-section still rendered with "No other active tasks." copy — avoids a confusing invisible section when all tasks are overdue/due-soon

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript TS2367 with generic T vs 'error' comparison**
- **Found during:** Task 2 (ProjectsPage TypeScript compilation)
- **Issue:** `SnapshotState<T> = T | null | 'error'` union caused TS2367 ("comparison appears unintentional because types have no overlap") on `projects !== 'error'` because T (a specific interface) and the string literal 'error' have no overlap
- **Fix:** Added `isSnapshotData<T>(v: SnapshotState<T>): v is T` type guard function; replaced all inline `!== null && !== 'error'` checks with `isSnapshotData()`
- **Files modified:** `src/components/pages/ProjectsPage.tsx`
- **Verification:** `tsc --noEmit` exits 0 after fix
- **Committed in:** `f73c3b7` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — TypeScript narrowing error for generic discriminated union)
**Impact on plan:** One-line type guard addition; no behavioral change, no scope change. The union pattern still matches the SocialPage convention exactly.

## Issues Encountered

None beyond the auto-fixed TS2367 type guard issue above.

## Known Stubs

None — all three components read live snapshot data (or degrade to no-data states when snapshots are missing). No hardcoded placeholder values flow to rendering.

## Threat Flags

None — no new network endpoints, no new auth paths. The `execFile` call was planned (T-03-01 in the plan's threat model) and mitigated correctly: separate positional args, no shell, no interpolation, `syncScriptPath` guard before exec.

## Named Exports for Plan 4

Plan 04 (NewsletterPage) should import these from `RefreshButton.tsx`:

```ts
import { RefreshButton, isStale, formatHHmm } from '../ui/RefreshButton';
```

- `isStale(generatedAt: string): boolean` — returns true when timestamp is >24h old
- `formatHHmm(isoString: string): string` — formats ISO 8601 to "HH:mm" (local time, zero-padded)

Lucide icon id chosen: `folder-kanban` (Projects nav item).

No CSS token gaps encountered — existing `--cos-*` tokens covered all Phase 3 needs.

## Next Phase Readiness

- Plan 04 (NewsletterPage) can import `isStale`, `formatHHmm`, and `ListRow` directly from their respective files
- `PageId` still has `'newsletter'` unregistered — Plan 04 adds it to `PAGES` and `NAV_ITEMS`
- Build is green; Projects page is navigable from the sidebar
- `refreshNonce` plumbing confirmed working end-to-end: RefreshButton calls `triggerRefresh()` → AppContext bumps nonce → ProjectsPage `useEffect` deps fire → snapshot re-reads

## Self-Check: PASSED

- [x] `src/components/ui/RefreshButton.tsx` exists and imports `execFile` from `child_process`
- [x] `execFile(node, [script], ...)` called with two positional args — no template literal
- [x] Blank `syncScriptPath` sets error state without calling execFile
- [x] `triggerRefresh()` called on success callback
- [x] `isStale` and `formatHHmm` exported as named exports
- [x] `src/components/ui/ListRow.tsx` renders `target="_blank" rel="noopener noreferrer"`
- [x] No `dangerouslySetInnerHTML` in RefreshButton, ListRow, or ProjectsPage
- [x] `src/components/pages/ProjectsPage.tsx` reads both snapshot paths via `readJsonFile`
- [x] Both `useEffect` dep arrays include `refreshNonce`
- [x] Overdue/due-soon sub-section omitted when empty
- [x] `App.tsx` PAGES includes `projects: ProjectsPage`
- [x] `Sidebar.tsx` NAV_ITEMS includes `id: 'projects'`
- [x] `styles.css` contains `.claudeos-refresh-btn`, `.claudeos-list-row`, `.claudeos-stale-label`, `.claudeos-page--projects`
- [x] No new `@import` in styles.css
- [x] Commits `3ad9e6d`, `f73c3b7`, `1de60d7` in git log
- [x] `tsc --noEmit` exits 0; esbuild production exits 0

---
*Phase: 03-notion-dashboard*
*Completed: 2026-06-07*
