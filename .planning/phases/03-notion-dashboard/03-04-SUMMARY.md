---
phase: 03-notion-dashboard
plan: 04
subsystem: ui
tags: [typescript, react, notion, newsletter, task-scheduler, powershell, refresh]

# Dependency graph
requires:
  - phase: 03-notion-dashboard
    plan: 03
    provides: "RefreshButton (isStale, formatHHmm exports), ListRow, ProjectsPage, AppContext refreshNonce"
provides:
  - src/components/pages/NewsletterPage.tsx — stage counts (non-zero only) + item list with no-data/stale states; refreshNonce-driven re-reads
  - src/components/App.tsx — PAGES map includes newsletter: NewsletterPage
  - src/components/ui/Sidebar.tsx — NAV_ITEMS includes { id: 'newsletter', label: 'Newsletter', iconId: 'newspaper' }
  - styles.css — .claudeos-page--newsletter, .claudeos-stage-count, .claudeos-stage-count-list selectors under .claudeos-dashboard
  - scripts/schedule-notion-sync.ps1 — Windows Task Scheduler daily 06:00 job registration; same notion-sync.mjs entry point as Refresh
affects:
  - Phase 3 complete — all four plans delivered; Newsletter navigable and refresh-aware

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Non-zero stage filtering: Object.entries(by_stage).filter(([,count]) => count > 0).sort() — only populated stages rendered"
    - "Windows Task Scheduler via Register-ScheduledTask -Force — idempotent re-run updates existing task"
    - "PSScriptRoot-relative script resolution — schedule-notion-sync.ps1 defaults ScriptPath to sibling notion-sync.mjs"

key-files:
  created:
    - src/components/pages/NewsletterPage.tsx
    - scripts/schedule-notion-sync.ps1
  modified:
    - src/components/App.tsx
    - src/components/ui/Sidebar.tsx
    - styles.css

key-decisions:
  - "newspaper chosen as Lucide icon id for Newsletter nav item (semantically correct, available in Obsidian's Lucide set)"
  - "platform badge included alongside content_type in ListRow badges — low cost, useful context when present"
  - "nonZeroStages sorted by stage name (localeCompare) — stage names prefixed with numbers (e.g. '3. Single outline') sort sensibly as plain strings"
  - "schedule-notion-sync.ps1 defaults NodePath to nvm v20.20.2 path (user's installed version); parameterized for override"
  - "Register-ScheduledTask with -Force — re-running updates rather than failing; idempotent setup"

requirements-completed: [NOTION-06, NOTION-07, NOTION-08]

# Metrics
duration: 4min (Tasks 1-3 auto; Task 4 checkpoint:human-verify pending)
completed: 2026-06-07
---

# Phase 3 Plan 04: Newsletter Page + Task Scheduler Summary

**Newsletter page (stage counts, item list, no-data/stale states) wired into sidebar navigation, plus a PowerShell script registering a daily 06:00 Windows Task Scheduler job running the same notion-sync.mjs entry point as the manual Refresh button**

## Performance

- **Duration:** ~4 min (Tasks 1-3 complete; Task 4 is a human-verify checkpoint)
- **Started:** 2026-06-07T05:11:37Z
- **Completed (auto tasks):** 2026-06-07T05:15:17Z
- **Tasks:** 3 of 4 complete (Task 4: checkpoint:human-verify pending)
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `NewsletterPage.tsx` — mirrors ProjectsPage pattern: `T | null | 'error'` discriminated union with `isSnapshotData<T>` type guard; `useEffect` with `[newsletterSnapshotPath, refreshNonce]` deps; `<RefreshButton />` at top; stale banner when `generated_at` >24h (data still renders — D-14); Pipeline section with non-zero stage counts sorted by name; Items section with `<ListRow>` per item (stage + content_type + platform badges); null vs 'error' produce distinct empty-state copy; no `dangerouslySetInnerHTML` (D-17, T-04-01)
- `App.tsx` — added `newsletter: NewsletterPage` to PAGES record; all four PageId entries now registered
- `Sidebar.tsx` — added `{ id: 'newsletter', label: 'Newsletter', iconId: 'newspaper' }` to NAV_ITEMS
- `styles.css` — appended `.claudeos-page--newsletter`, `.claudeos-newsletter-section`, `.claudeos-stage-count-list`, `.claudeos-stage-count` (flex row: name grows, count right-aligned as muted pill); scoped under `.claudeos-dashboard`; no new `@import`
- `scripts/schedule-notion-sync.ps1` — registers a daily 06:00 Task Scheduler job; `param(NodePath, ScriptPath, TaskName)` with defaults; validates both paths before exec; `-Force` makes re-runs idempotent; no token embedded; prints confirmation with next run time and env var reminder (T-04-02)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build NewsletterPage | f3a8c6f | src/components/pages/NewsletterPage.tsx |
| 2 | Register in App + Sidebar + CSS | 91b37a4 | App.tsx, Sidebar.tsx, styles.css |
| 3 | Create schedule-notion-sync.ps1 | e9d39fe | scripts/schedule-notion-sync.ps1 |
| 4 | Human verify checkpoint | — | Pending user verification |

## Decisions Made

- `newspaper` icon for Newsletter nav — semantically correct, available in Obsidian's Lucide set
- Stage counts sorted by `localeCompare` — stage names have numeric prefixes ("3. Single outline") which sort correctly as plain strings; no custom sort key needed
- `platform` badge included when present — zero-cost addition, useful context, consistent with "include available metadata" pattern from ProjectsPage badges
- `schedule-notion-sync.ps1` defaults `NodePath` to nvm v20.20.2 path — matches machine's installed Node; parameterized for easy override
- `-Force` on `Register-ScheduledTask` — idempotent: re-running script updates the task rather than throwing a duplicate-name error

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `NewsletterPage` reads live snapshot data from `newsletterSnapshotPath` via `readJsonFile`. Degrades to no-data states when snapshot is absent; no hardcoded placeholder values flow to rendering.

## Threat Flags

None — no new network endpoints introduced. `NewsletterPage` renders snapshot strings as JSX text children (T-04-01 mitigated). `schedule-notion-sync.ps1` quotes the script path to prevent argument injection, embeds no secrets (T-04-02 mitigated). The scheduled task runs the same committed `notion-sync.mjs` the user already runs manually (T-04-03 accepted).

## Checkpoint Status

**Task 4 (`checkpoint:human-verify`) is pending.**

Verification steps for the user:
1. Reload plugin in Obsidian (or let hot-reload pick up the new `main.js`). Open the ClaudeOS Dashboard.
2. Confirm sidebar shows Projects and Newsletter entries. Click each.
3. With valid snapshots present: Projects shows active projects + overdue/due-soon tasks; Newsletter shows non-zero pipeline stages and item list. Click a row — confirm it opens the correct Notion page.
4. Click Refresh on either page — confirm loading → success, "Last synced HH:mm" updates without Obsidian reload.
5. Clear one snapshot path in Settings — confirm the page shows the no-data state. Restore the path.
6. From an elevated PowerShell:
   ```
   powershell -ExecutionPolicy Bypass -File scripts\schedule-notion-sync.ps1 -ScriptPath (Resolve-Path scripts\notion-sync.mjs)
   ```
   Confirm "ClaudeOS Notion Sync" task exists in Task Scheduler with a daily 06:00 trigger.

## Lucide Icon Chosen

`newspaper` — Newsletter nav item in `Sidebar.tsx`.

## Registered Task Scheduler Task Name

`ClaudeOS Notion Sync` (default; user-overridable via `-TaskName` parameter).

## Self-Check: PASSED

- [x] `src/components/pages/NewsletterPage.tsx` exists
- [x] Reads `newsletterSnapshotPath` via `readJsonFile` with `refreshNonce` in `useEffect` deps
- [x] `<RefreshButton />` rendered at top; `isStale` and `formatHHmm` imported from RefreshButton
- [x] Stage counts filter out entries with count === 0
- [x] Items rendered via `<ListRow>` with stage + content_type + platform badges
- [x] null vs 'error' produce distinct empty-state copy
- [x] Stale snapshot renders stale label but data still renders
- [x] No `dangerouslySetInnerHTML` in NewsletterPage.tsx
- [x] `App.tsx` PAGES includes `newsletter: NewsletterPage`
- [x] `Sidebar.tsx` NAV_ITEMS includes `id: 'newsletter'`
- [x] `styles.css` contains `.claudeos-page--newsletter` and `.claudeos-stage-count` selectors under `.claudeos-dashboard`
- [x] `styles.css` contains no new `@import`
- [x] `scripts/schedule-notion-sync.ps1` exists and contains `param(`, `Register-ScheduledTask`, `New-ScheduledTaskTrigger`, `-Daily`, `notion-sync.mjs`
- [x] No token value embedded in ps1 script
- [x] Commits f3a8c6f, 91b37a4, e9d39fe in git log
- [x] `tsc --noEmit` exits 0; esbuild production exits 0; ps1 source assertions gate exits 0

---
*Phase: 03-notion-dashboard*
*Completed (auto tasks): 2026-06-07*
