---
phase: 03-notion-dashboard
verified: 2026-06-07T00:00:00Z
status: human_needed
score: 18/18 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Click Refresh in Obsidian and confirm idle -> loading -> success transition and 'Last synced HH:mm' updates"
    expected: "Button shows spinner during sync, then 'Synced' with check icon; HH:mm timestamp refreshes to current time"
    why_human: "execFile state machine behavior, real timing, and UI transitions cannot be verified programmatically without running Obsidian"
  - test: "Navigate to Projects page and verify overdue and due-soon tasks appear in a separate 'Overdue & Due Soon' section above 'Active Tasks'"
    expected: "Tasks with past due dates appear with overdue emphasis; tasks due within dueSoonDays appear with due-soon emphasis; section absent when no overdue/due-soon tasks"
    why_human: "Live rendering against real snapshot data and CSS emphasis styling requires Obsidian UI"
  - test: "Navigate to Newsletter page and verify only non-zero pipeline stages appear in the Pipeline section"
    expected: "Stages with 0 items do not appear; stages with items are sorted alphabetically by stage name"
    why_human: "Stage-count filtering and sort order require live snapshot data in Obsidian"
  - test: "Set a snapshot path to a missing file and confirm the page shows the no-data error state, then restore it"
    expected: "Page shows 'Couldn't read [x]' copy (not 'No [x] data') when path is set but file is unreadable"
    why_human: "Conditional empty-state rendering requires Obsidian file system interaction"
  - test: "Confirm each project and task row opens the correct Notion page in the browser when clicked"
    expected: "Clicking a ListRow opens https://notion.so/<page-id> in a new browser tab"
    why_human: "External link navigation cannot be verified programmatically"
---

# Phase 3: Notion Dashboard Verification Report

**Phase Goal:** Make the dashboard Notion-aware — sync script queries Tasks, Projects, and Newsletter via the Notion API and writes JSON snapshots; plugin gains Projects and Newsletter pages, a Refresh button, and new settings. No new network code in the plugin itself.
**Verified:** 2026-06-07
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running notion-sync.mjs with a valid token writes tasks.json, projects.json, newsletter.json to .dashboard-data/ | VERIFIED | Script exists at 336 lines, atomic write pattern confirmed in code (`writeFile .tmp` -> `rename`), live-verified by user (03-01-SUMMARY.md records output: `tasks=130, projects=22, newsletter=7`) |
| 2 | Token is never read from inside the OneDrive-synced vault — only env var NOTION_TOKEN or %USERPROFILE%\.claudeos\notion.env | VERIFIED | `loadToken()` reads `process.env.NOTION_TOKEN` then falls back to `join(homedir(), '.claudeos', 'notion.env')`. No vault path referenced. |
| 3 | Each snapshot file carries a generated_at ISO 8601 timestamp | VERIFIED | `writeAtomic()` stamps `generated_at: new Date().toISOString()` before writing |
| 4 | Snapshot files are written atomically (temp file + rename) | VERIFIED | `writeAtomic()`: writes `${finalPath}.tmp`, then `fs.rename(tmpPath, finalPath)` |
| 5 | Script exits 0 on full success and non-zero on any failure | VERIFIED | `main().catch((err) => { process.stderr.write(...); process.exit(1); })`. Success path falls through to implicit exit 0. |
| 6 | Running on Node < 18 produces a clear error message | VERIFIED | Top-level guard: `if (typeof fetch !== 'function') { process.stderr.write('notion-sync requires Node 18+ (global fetch unavailable). Detected: ' + process.version); process.exit(1); }` |
| 7 | types.ts exports interfaces matching every snapshot field the sync script emits | VERIFIED | All 7 interfaces present (`SnapshotMeta`, `TaskItem`, `TasksSnapshot`, `ProjectItem`, `ProjectsSnapshot`, `NewsletterItem`, `NewsletterSnapshot`). Field names match confirmed snapshot shapes from 03-01-SUMMARY.md. |
| 8 | PageId union includes 'projects' and 'newsletter' | VERIFIED | `export type PageId = 'home' \| 'social' \| 'projects' \| 'newsletter'` |
| 9 | ClaudeOSSettings has the six new Notion paths/values with sensible defaults; settings survive reload via saveData | VERIFIED | All six keys present in interface and DEFAULT_SETTINGS. Note: `nodePath` defaults to `""` (not `"node"`) — an intentional fix committed by user (commit e109f47) because Obsidian cannot resolve bare `"node"` on Windows. Paths use `OS-Dashboard/.dashboard-data/` prefix (vault-relative). Both deviations from plan are intentional and correct for this environment. |
| 10 | AppContext exposes refreshNonce (number) and triggerRefresh (function); existing pages still compile unchanged | VERIFIED | `AppContextType` declares `refreshNonce: number` and `triggerRefresh: () => void`. `DashboardRoot` wrapper holds `useState(0)` and `useCallback` for these. |
| 11 | The SettingsTab renders a 'Notion Sync' section with all six fields wired to saveSettings | VERIFIED | SettingsTab.ts contains `setName('Notion Sync').setHeading()` and all six setting rows (`nodePath`, `syncScriptPath`, `tasksSnapshotPath`, `projectsSnapshotPath`, `newsletterSnapshotPath`, `dueSoonDays`). Each calls `await this.plugin.saveSettings()`. |
| 12 | Clicking Refresh runs the sync script via execFile(nodePath, [syncScriptPath]) and transitions idle->loading->success/error | VERIFIED | `execFile(node, [script], (error) => {...})` with two positional args; blank `syncScriptPath` sets error state without calling execFile; success calls `triggerRefresh()` and auto-resets after 3000ms |
| 13 | On success, Refresh calls triggerRefresh() and the Projects page re-reads its snapshots and re-renders | VERIFIED | `triggerRefresh()` called in success callback; both ProjectsPage `useEffect`s include `refreshNonce` in deps |
| 14 | Refresh shows 'Last synced HH:mm' from the latest snapshot's generated_at | VERIFIED | `refreshLastSynced()` reads `tasksSnapshotPath` via `readJsonFile<SnapshotMeta>`, formats with `formatHHmm()` (zero-padded local hours:minutes) |
| 15 | Projects page shows active projects and tasks with Overdue & Due Soon section above remaining active tasks | VERIFIED | `ProjectsPage.tsx` renders both sections; `classifyTask()` partitions tasks; "Overdue & Due Soon" section only rendered when `emphasizedTasks.length > 0` |
| 16 | Every task/project row links to its Notion page via an external-link anchor | VERIFIED | `ListRow` renders `<a target="_blank" rel="noopener noreferrer" href={url}>` with name as JSX text child (no dangerouslySetInnerHTML) |
| 17 | Projects page degrades to a no-data state when snapshots are missing; stale (>24h) snapshot shows 'Stale' label but still renders | VERIFIED | `T \| null \| 'error'` union drives distinct empty states; `isStale()` exported from RefreshButton; stale banner renders `claudeos-stale-label` and data continues to render |
| 18 | Newsletter page shows stage counts (non-zero only), item list, degrades gracefully, re-reads on refreshNonce | VERIFIED | `nonZeroStages` filters `count > 0`, sorted by `localeCompare`; `useEffect` deps include `refreshNonce`; null vs 'error' produce distinct copy |

**Score:** 18/18 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/notion-sync.mjs` | Sync script: token loading, 3 Notion queries, transforms, atomic writes | VERIFIED | 404 lines, pure Node ESM, no npm deps. Source assertion gate passes. |
| `.gitignore` | `.dashboard-data/` excluded; `main.js` NOT ignored | VERIFIED | `.dashboard-data/` present; `main.js` not ignored; existing entries intact |
| `src/types.ts` | Snapshot interfaces, extended PageId, extended ClaudeOSSettings, DEFAULT_SETTINGS | VERIFIED | All 7 interfaces, PageId extended to 4 values, 6 new settings keys |
| `src/context/AppContext.tsx` | refreshNonce + triggerRefresh on AppContextType | VERIFIED | Both fields declared; DashboardRoot wrapper supplies them via useState/useCallback |
| `src/views/DashboardView.tsx` | DashboardRoot wrapper component with useState | VERIFIED | `DashboardRoot` function component defined; `onOpen` renders it in StrictMode |
| `src/settings/SettingsTab.ts` | Notion Sync settings section with 6 fields | VERIFIED | `setName('Notion Sync').setHeading()` present; all 6 settings rows confirmed |
| `src/components/ui/RefreshButton.tsx` | execFile state machine + last-synced display + exports | VERIFIED | `execFile` from `child_process`; `isStale` and `formatHHmm` exported as named exports |
| `src/components/ui/ListRow.tsx` | Shared row with external Notion link | VERIFIED | `target="_blank" rel="noopener noreferrer"`; name as JSX text child only |
| `src/components/pages/ProjectsPage.tsx` | Projects + tasks rendering with overdue/due-soon and no-data/stale states | VERIFIED | refreshNonce in both useEffect deps; isSnapshotData type guard; stale banner; overdue/due-soon split |
| `src/components/App.tsx` | PAGES map includes projects and newsletter | VERIFIED | Both `ProjectsPage` and `NewsletterPage` imported and registered |
| `src/components/pages/NewsletterPage.tsx` | Stage counts + item list with no-data/stale states | VERIFIED | Non-zero stage filter; refreshNonce dep; RefreshButton at top; isStale imported |
| `src/components/ui/Sidebar.tsx` | NAV_ITEMS includes projects and newsletter | VERIFIED | `{ id: 'projects', iconId: 'folder-kanban' }` and `{ id: 'newsletter', iconId: 'newspaper' }` both present |
| `scripts/schedule-notion-sync.ps1` | Windows Task Scheduler registration for daily 06:00 | VERIFIED | `Register-ScheduledTask`, `New-ScheduledTaskTrigger`, `-Daily`, `notion-sync.mjs` present. PS1 source assertion gate passes. No token embedded. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/notion-sync.mjs` | `https://api.notion.com/v1/data_sources/{uuid}/query` | `fetch POST` with `Notion-Version: 2025-09-03` | VERIFIED | `API_BASE = 'https://api.notion.com/v1/data_sources/'`; NOTION_VERSION constant; POST with header present |
| `scripts/notion-sync.mjs` | `process.env.NOTION_TOKEN` | token loading with file fallback | VERIFIED | `loadToken()` reads env var first, falls back to `join(homedir(), '.claudeos', 'notion.env')` |
| `src/views/DashboardView.tsx` | `AppContext.Provider` | refreshNonce state in DashboardRoot wrapper | VERIFIED | `DashboardRoot` holds `useState(0)` for refreshNonce; Provider `value` includes both `refreshNonce` and `triggerRefresh` |
| `src/settings/SettingsTab.ts` | `plugin.saveSettings` | onChange handler per field | VERIFIED | All 6 new rows call `await this.plugin.saveSettings()` |
| `src/components/ui/RefreshButton.tsx` | `child_process.execFile` | `execFile(settings.nodePath, [settings.syncScriptPath])` | VERIFIED | `execFile(node, [script], (error) => {...})` — two positional args, no shell, no interpolation |
| `src/components/ui/RefreshButton.tsx` | `triggerRefresh` | AppContext on success callback | VERIFIED | `triggerRefresh()` called when `error === null` |
| `src/components/pages/ProjectsPage.tsx` | `readJsonFile` | useEffect with refreshNonce in deps | VERIFIED | Two `useEffect`s reading `projectsSnapshotPath` and `tasksSnapshotPath`; both include `refreshNonce` in dependency arrays |
| `src/components/pages/NewsletterPage.tsx` | `readJsonFile` | useEffect with refreshNonce in deps | VERIFIED | One `useEffect` reading `newsletterSnapshotPath` with `refreshNonce` in deps |
| `scripts/schedule-notion-sync.ps1` | `scripts/notion-sync.mjs` | scheduled action runs node notion-sync.mjs | VERIFIED | `-Execute $NodePath -Argument "$ScriptPath"` using same entry point as Refresh button |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ProjectsPage.tsx` | `projects: ProjectsSnapshot \| null \| 'error'` | `readJsonFile<ProjectsSnapshot>(app, projectsSnapshotPath)` | Yes — reads snapshot written by notion-sync.mjs from live Notion API | FLOWING |
| `ProjectsPage.tsx` | `tasks: TasksSnapshot \| null \| 'error'` | `readJsonFile<TasksSnapshot>(app, tasksSnapshotPath)` | Yes — reads snapshot written by notion-sync.mjs | FLOWING |
| `NewsletterPage.tsx` | `newsletter: NewsletterSnapshot \| null \| 'error'` | `readJsonFile<NewsletterSnapshot>(app, newsletterSnapshotPath)` | Yes — reads snapshot written by notion-sync.mjs | FLOWING |
| `RefreshButton.tsx` | `lastSynced: string \| null` | `readJsonFile<SnapshotMeta>(app, tasksSnapshotPath).generated_at` | Yes — reads generated_at from live snapshot | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| notion-sync.mjs source assertions | `node -e "..."` (plan gate) | `source assertions OK` | PASS |
| .gitignore assertions | `node -e "..."` (plan gate) | `has .dashboard-data/: true \| main.js NOT ignored: true` | PASS |
| PS1 source assertions | `node -e "..."` (plan gate) | `ps1 source assertions OK` | PASS |
| types.ts interface exports | `node -e "..."` (content checks) | All 15 checks pass (active_tasks comment match was false positive — field absent from interface) | PASS |
| Node 18 guard present | grep `typeof fetch` in notion-sync.mjs | Guard present at line 35 | PASS |
| No dangerouslySetInnerHTML in JSX | grep across key components | Appears only in comments stating it is NOT used | PASS |

### Probe Execution

No probe scripts defined for this phase. Behavioral spot-checks above cover the source assertion gates from PLAN frontmatter.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| NOTION-01 | 03-01 | Sync script queries Tasks, Projects, Newsletter via Notion API 2025-09-03 | SATISFIED | All 3 data source UUIDs present, correct API base + version header, paginated queries |
| NOTION-02 | 03-01 | Token from env var or non-synced fallback, never committed | SATISFIED | `loadToken()` uses `process.env.NOTION_TOKEN` then `homedir()/.claudeos/notion.env` |
| NOTION-03 | 03-01, 03-02 | Snapshots conform to TypeScript interfaces, written atomically, carry generated_at | SATISFIED | `writeAtomic()` stamps generated_at; interfaces match confirmed snapshot shapes |
| NOTION-04 | 03-02, 03-03 | Refresh via execFile, re-reads snapshots, shows states + last-synced | SATISFIED | execFile with 2 positional args; triggerRefresh on success; refreshNonce drives useEffect deps |
| NOTION-05 | 03-03 | Projects page with active projects, tasks, overdue/due-soon emphasis, Notion links | SATISFIED | ProjectsPage.tsx renders both sections; classifyTask splits tasks; ListRow has external links |
| NOTION-06 | 03-04 | Newsletter page with stage counts (non-zero) and item list | SATISFIED | NewsletterPage.tsx: nonZeroStages filter, sorted stages, ListRow per item with badges |
| NOTION-07 | 03-01, 03-04 | Sync script runnable by Task Scheduler using same code path as Refresh | SATISFIED | schedule-notion-sync.ps1 invokes notion-sync.mjs daily at 06:00; same entry point as execFile call |
| NOTION-08 | 03-03, 03-04 | All new pages degrade gracefully; stale label shows without hiding data | SATISFIED | T\|null\|'error' union; null = path empty, 'error' = unreadable; isStale + stale banner in both pages |

**Note on REQUIREMENTS.md:** The traceability table in `.planning/REQUIREMENTS.md` still shows NOTION-06 and NOTION-07 as "Planned" (line 107-108). The code fully implements both. The REQUIREMENTS.md was not updated as part of plan 03-04. This is a documentation staleness issue, not a code gap. ROADMAP.md correctly shows Phase 3 as complete.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/types.ts` | 56-58 | DEFAULT_SETTINGS snapshot paths use `OS-Dashboard/.dashboard-data/` prefix | Info | Intentional deviation from plan (plan specified `.dashboard-data/`). Committed by user in fix commit e109f47 with explanation: vault-relative path required for Obsidian DataAdapter. Correct for this environment. |
| `src/types.ts` | 60 | DEFAULT_SETTINGS `nodePath: ""` (plan specified `"node"`) | Info | Intentional deviation committed by user (e109f47): Obsidian cannot resolve bare `"node"` on Windows. User must set full path in Settings. Documented in SettingsTab description. |

No TBD, FIXME, XXX, or PLACEHOLDER markers found in any phase-3 files. No unreferenced debt markers.

### Human Verification Required

Phase 3 delivered all code artifacts with correct wiring. The following items require a running Obsidian instance to confirm, which could not be tested programmatically:

### 1. Refresh State Machine in Obsidian

**Test:** With valid snapshot paths and syncScriptPath configured, click the Refresh button in the dashboard.
**Expected:** Button transitions idle -> spinner (loading) -> "Synced" with check icon, then returns to idle after ~3 seconds. "Last synced HH:mm" updates to current time.
**Why human:** execFile timing, animation, and UI state transitions require running Obsidian.

### 2. ProjectsPage Overdue and Due-Soon Rendering

**Test:** Open the Projects page with a snapshot containing tasks with past due dates and upcoming due dates.
**Expected:** Tasks with due dates before today appear in "Overdue & Due Soon" section with overdue emphasis (styled differently). Tasks due within 3 days appear with due-soon emphasis. Section absent when no such tasks exist.
**Why human:** CSS class application and live rendering require Obsidian UI.

### 3. NewsletterPage Stage Filtering

**Test:** Open the Newsletter page.
**Expected:** Only stages that have items appear in the Pipeline section (no zero-count stages). Stages sorted alphabetically.
**Why human:** Live snapshot data and rendered output require Obsidian.

### 4. No-Data State Rendering

**Test:** Set a snapshot path in Settings to a non-existent file, navigate to the Projects or Newsletter page.
**Expected:** Page shows "Couldn't read [x]" error state (not "No [x] data" which appears when path is empty).
**Why human:** File system error state requires live Obsidian plugin.

### 5. Notion Deep Links

**Test:** Click any project row or task row in the Projects page.
**Expected:** Opens `https://notion.so/<page-id-without-dashes>` in a new browser tab showing the correct Notion page.
**Why human:** External link navigation requires browser interaction.

### Gaps Summary

No gaps. All 18 must-have truths are VERIFIED in code. The `status: human_needed` reflects 5 UI behaviors that require a running Obsidian instance for final confirmation — these are standard human-verify items for any Obsidian plugin phase, not code deficiencies.

The two DEFAULT_SETTINGS deviations (`nodePath: ""` and `OS-Dashboard/.dashboard-data/` path prefix) are intentional environment-correct fixes committed by the user, not gaps.

The REQUIREMENTS.md staleness (NOTION-06 and NOTION-07 still showing "Planned") is a documentation item, not a code gap. Both requirements are fully implemented.

---

_Verified: 2026-06-07_
_Verifier: Claude (gsd-verifier)_
