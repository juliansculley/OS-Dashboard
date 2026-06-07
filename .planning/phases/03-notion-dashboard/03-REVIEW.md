---
phase: 03-notion-dashboard
reviewed: 2026-06-06T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - scripts/notion-sync.mjs
  - scripts/schedule-notion-sync.ps1
  - src/components/App.tsx
  - src/components/pages/NewsletterPage.tsx
  - src/components/pages/ProjectsPage.tsx
  - src/components/ui/ListRow.tsx
  - src/components/ui/RefreshButton.tsx
  - src/components/ui/Sidebar.tsx
  - src/context/AppContext.tsx
  - src/settings/SettingsTab.ts
  - src/types.ts
  - src/views/DashboardView.tsx
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-06-06
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 3 delivers the Notion sync script, Windows Task Scheduler registration, and three new UI
pages (Projects, Newsletter, and the shared RefreshButton). The architecture is sound: atomic
writes, no shell interpolation in execFile, safe HTML via React text children throughout. However
two blockers will prevent the sync from working at all on a fresh setup, and four warnings cover
correctness edge cases that will surface under normal use.

## Critical Issues

### CR-01: Wrong Notion API endpoint — sync will always fail with 404

**File:** `scripts/notion-sync.mjs:72`

**Issue:** The `API_BASE` constant is set to `https://api.notion.com/v1/data_sources/` which is
not a documented Notion public API path. The correct endpoint for querying a database is
`https://api.notion.com/v1/databases/{id}/query`. Every call to `queryDataSource` will receive a
404 response, which the error handler catches and rethrows with the response body — meaning the
sync script will always exit with an error and no snapshot files will be written. The UI will
perpetually show the "no data" empty state.

**Fix:**
```js
// Line 72 — replace:
const API_BASE = 'https://api.notion.com/v1/data_sources/';

// with:
const API_BASE = 'https://api.notion.com/v1/databases/';

// queryDataSource builds the URL as `${API_BASE}${uuid}/query` (line 89), which becomes
// https://api.notion.com/v1/databases/{uuid}/query — the correct documented endpoint.
```

### CR-02: Notion API version `2025-09-03` is a future/non-existent version

**File:** `scripts/notion-sync.mjs:73`

**Issue:** `NOTION_VERSION = '2025-09-03'` is dated in September 2025, which is beyond the current
date (2026-06-06) but the Notion API changelog has no record of this version string. The last
publicly documented version as of this review is `2022-06-28`. Notion's API server rejects
requests that carry an unknown or future `Notion-Version` header value with a 400 error. Combined
with CR-01, no API call will ever succeed. Even after fixing CR-01, this version string must be
corrected to a version the Notion API actually accepts.

**Fix:**
```js
// Line 73 — replace:
const NOTION_VERSION = '2025-09-03';

// with the most recent documented stable version:
const NOTION_VERSION = '2022-06-28';
```

---

## Warnings

### WR-01: `addDays` uses UTC output, causing off-by-one on the due-soon boundary for users east of UTC

**File:** `src/components/pages/ProjectsPage.tsx:20-23`

**Issue:** `todayStr()` (line 11) builds the date string from local time, correctly. `addDays`
(line 20) parses `dateStr + 'T00:00:00'` as local time (also correct), but then returns
`d.toISOString().slice(0, 10)` — `toISOString()` always returns UTC. For any timezone east of
UTC (e.g., UTC+8), midnight local time is the previous UTC day. So `addDays('2026-06-06', 3)`
returns `'2026-06-05'` instead of `'2026-06-09'`, effectively shrinking the due-soon window by
one day.

**Fix:**
```ts
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  // Use local-time components, matching todayStr()
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

### WR-02: `refreshLastSynced` on mount silently ignores thrown errors — stale state if vault adapter throws

**File:** `src/components/ui/RefreshButton.tsx:84-86`

**Issue:** The mount `useEffect` calls `refreshLastSynced()` without a `.catch()` handler.
`refreshLastSynced` is an `async function` that calls `readJsonFile`, which internally catches all
errors and returns `null`. That path is safe. However, `refreshLastSynced` itself is not wrapped
in try/catch, and if any future code inside it throws synchronously before the first `await`, the
returned promise will be unhandled. More concretely: the `useEffect` callback receives the
promise but does not attach a rejection handler, so any such failure is a silent unhandled
rejection. This is a React best-practice violation (effects must not return promises, and
fire-and-forget async inside effects must handle their own rejections).

**Fix:**
```ts
useEffect(() => {
  refreshLastSynced().catch(() => {
    // read failed — leave lastSynced as null
  });
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

### WR-03: `refreshLastSynced` defined inside component body captures stale `app`/`plugin` references

**File:** `src/components/ui/RefreshButton.tsx:72-81`

**Issue:** `refreshLastSynced` is a plain `async function` defined inside the component, not a
`useCallback`. It is called both from the mount `useEffect` (with `[]` deps) and from the
`execFile` callback. The `execFile` callback closes over the version of `refreshLastSynced` bound
at the time `handleClick` was called. Because `refreshLastSynced` itself closes over `app` and
`plugin` from the render scope where it was defined, this is generally fine as long as those refs
are stable (they come from `useAppContext` which wraps `useState`). However, `handleClick` is
also a plain function — not `useCallback` — so every render creates a new closure, and the
`execFile` async callback holds a reference to the `refreshLastSynced` from that specific render.
If the component re-renders between button click and the execFile completion (e.g., due to an
unrelated state change), the stale closure's `setState` call targets the correct state setter
(since `setState` identity is stable from `useState`), so in practice this is benign. The
immediate actionable risk is the mount useEffect with `[]` deps: it suppresses the exhaustive-deps
lint warning via `eslint-disable-line`, but the real fix is a `useCallback` to make deps explicit.

**Fix:** Wrap `refreshLastSynced` in `useCallback` with `[app, plugin]` deps so the linter can
validate the dependency chain:
```ts
const refreshLastSynced = useCallback(async () => {
  const path = plugin.settings.tasksSnapshotPath;
  const data = await readJsonFile<SnapshotMeta>(app, path);
  if (data && typeof data.generated_at === 'string') {
    const formatted = formatHHmm(data.generated_at);
    setLastSynced(formatted !== '' ? formatted : null);
  } else {
    setLastSynced(null);
  }
}, [app, plugin]);
```
Then remove the `eslint-disable-line` comment from the mount effect.

### WR-04: `nodePath` default empty string falls back to bare `'node'` — likely to fail in Obsidian's PATH environment

**File:** `src/components/ui/RefreshButton.tsx:92` and `src/types.ts:60`

**Issue:** `DEFAULT_SETTINGS.nodePath` is `""`. In `handleClick`, the fallback is
`plugin.settings.nodePath || 'node'`. Obsidian on Windows does not inherit the user's full
`PATH` (it launches as an Electron app). On a system where Node is installed via nvm (as this
machine uses — see the hardcoded path in `schedule-notion-sync.ps1` and `notion-sync.mjs`
comments), the bare `'node'` command will not be found by `execFile`. The sync will always fail
with `ENOENT` until the user sets the full path in Settings. The Settings UI description text
does mention the full path example, but the default empty string means the first Refresh attempt
always fails with an error state that gives no indication of the root cause.

This is a UX/correctness issue: the error state is shown identically for both "script path not
set" and "node not found" — the user cannot distinguish them.

**Fix:** Either set the `DEFAULT_SETTINGS.nodePath` to a reasonable platform default, or surface
a distinct error message when `execFile` fails with `ENOENT`:
```ts
execFile(node, [script], (error) => {
  if (error === null) {
    setState('success');
    triggerRefresh();
    refreshLastSynced().catch(() => {});
    setTimeout(() => setState('idle'), 3000);
  } else {
    // Log to console so the user can diagnose ENOENT vs script errors
    console.error('[ClaudeOS] Notion sync failed:', error.message);
    setState('error');
    setTimeout(() => setState('idle'), 5000);
  }
});
```

---

## Info

### IN-01: `EmptyState` component duplicated in `ProjectsPage` and `NewsletterPage`

**File:** `src/components/pages/ProjectsPage.tsx:36-43`, `src/components/pages/NewsletterPage.tsx:18-25`

**Issue:** The `EmptyState` component (a `div` with heading and body text) is defined identically
in both page files. It is a small component, but duplication means any change (styling, ARIA
attributes, etc.) must be applied twice.

**Fix:** Extract to `src/components/ui/EmptyState.tsx` and import from both pages.

### IN-02: `SnapshotState<T>` discriminated union type duplicated across pages

**File:** `src/components/pages/ProjectsPage.tsx:28-31`, `src/components/pages/NewsletterPage.tsx:10-13`

**Issue:** The `SnapshotState<T>` type alias and its `isSnapshotData<T>` type guard are defined
identically in both page files (and likely in `SocialPage` as well). These should live in a
shared location.

**Fix:** Move to `src/types.ts` or a new `src/utils/snapshotState.ts` and import where needed.

---

_Reviewed: 2026-06-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
