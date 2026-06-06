# Phase 3: Notion Dashboard - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning
**Source:** Design doc `.planning/NOTION-PIPELINE-DESIGN.md` (Julian, 2026-06-05) — treated as PRD

<domain>
## Phase Boundary

Phase 3 makes the dashboard Notion-aware. A standalone Node.js sync script (`scripts/notion-sync.mjs`) queries the Tasks, Projects, and Newsletter Content Hub databases via the Notion REST API and writes compact JSON snapshots to `.dashboard-data/`. The plugin gains two new pages (Projects/Tasks, Newsletter), a Refresh button that re-runs the sync script and live-reloads the views, and new settings paths. No new network code enters the plugin — the plugin remains a pure display + execFile layer.

This phase is **separate from the Social Stats page** — the Notion dashboard is a distinct page set; social stats stay untouched. The sync-script pattern established here becomes the template for the Phase 6 social data pipeline.

**In scope:** NOTION-01 through NOTION-08 (see REQUIREMENTS.md). Notion integration setup is a manual prerequisite documented in the plan.

**Out of scope:** Inline output display for the refresh script, file-watch auto-refresh (nice-to-have, Phase 5+), modifying the Social Stats page, any MCP or agent-based Notion fetch.

</domain>

<decisions>
## Implementation Decisions

### Architecture (D-01 — LOCKED)
- **D-01:** The Notion API token lives **outside the OneDrive-synced vault** — in an environment variable `NOTION_TOKEN` or a fallback file at `%USERPROFILE%\.claudeos\notion.env`. The plugin never sees the token. The sync script reads it from the OS environment; the plugin calls the script via `execFile` (same pattern as SkillButton), not via any network API.

### Sync Script (D-02 — LOCKED)
- **D-02:** Location is `scripts/notion-sync.mjs` at the OS-Dashboard repo root. Pure Node ESM, no npm dependencies — uses `fetch` (Node 18+) only. Script is committed (no secrets in it). Runs identically whether triggered by the Refresh button or a Windows Task Scheduler job.

### API version (D-03 — LOCKED)
- **D-03:** Notion API version `2025-09-03`. Query endpoint: `POST /v1/data_sources/{uuid}/query`. The data-source UUIDs come from `notion-ids.md` by stripping the `collection://` prefix.

### Data sources and UUIDs (D-04 — LOCKED from notion-ids.md)
- Tasks: `1e74f78c-9804-81e4-a8b8-000bb75cf801`
- Projects: `1e74f78c-9804-818e-b085-000be0a80fc5`
- Newsletter Content Hub: `2b64f78c-9804-80c8-a851-000b3dea27d5`

### Filters (D-05)
- **Active tasks:** Status ≠ Done
- **Overdue/due-soon:** Due on or before today + 3 days AND Status ≠ Done (due_soon window = 3 days, confirmed by Julian)
- **Active projects:** Status in `["Work Doing", "Doing", "Ongoing"]` AND Archived ≠ true
- **Newsletter pipeline:** Status not in `["10. Published", "11. Deleted"]`
- Tasks and overdue can share one query; filter client-side to avoid a second API call.

### Relation resolution (D-06 — Claude's decision)
- **D-06:** Do NOT make extra relation-resolution API calls. For tasks: omit the `project` field from `TaskItem` (it requires fetching the related Project page). For projects: read existing rollup/formula properties (`Meta`/`Progress`) directly from the Projects DB query — these are already pre-computed by Notion. This keeps the sync script to one query per data source.

### Item caps (D-07 — confirmed)
- **D-07:** Snapshots are capped: top 10 tasks by due date (Tasks page cap confirmed by Julian for testing). Projects: all active (typically < 20). Newsletter: all non-published/deleted items.

### Snapshot output (D-08)
- **D-08:** One JSON file per snapshot in `<vault>/.dashboard-data/`. Written atomically (write to temp, rename). Each file carries `generated_at: ISO8601`. Files are gitignored. Path: vault-relative `.dashboard-data/tasks.json`, `.dashboard-data/projects.json`, `.dashboard-data/newsletter.json`.

### Script path in settings (D-09 — LOCKED)
- **D-09:** The path to `notion-sync.mjs` is a **configurable setting** (`syncScriptPath`), not hardcoded. Default value is an empty string — the user must set it once in Settings. This avoids fragile path inference across different vault layouts. SEC-03 posture: `execFile` called with the configured path, no shell string interpolation, no user input passed as argument (same pattern as SkillButton's allowlist).

### RefreshButton (D-10)
- **D-10:** A `RefreshButton` component clones SkillButton's state machine (idle/loading/success/error) but calls `execFile(node, [scriptPath])` instead of `execFile('claude', ['-p', skill])`. On success callback, it calls `triggerRefresh()` from AppContext, which bumps a `refreshNonce` counter. Pages subscribe to `refreshNonce` in their `useEffect` dependency arrays to re-read snapshot files. "Last synced HH:mm" rendered from `generated_at` in the snapshot file.

### AppContext extension (D-11)
- **D-11:** AppContext gains two new fields: `refreshNonce: number` (starts 0, increments on each successful sync) and `triggerRefresh: () => void`. This is a backward-compatible addition — existing pages (Home, Social) ignore these fields.

### Settings extension (D-12)
- **D-12:** `ClaudeOSSettings` gains: `tasksSnapshotPath` (default: `.dashboard-data/tasks.json`), `projectsSnapshotPath` (default: `.dashboard-data/projects.json`), `newsletterSnapshotPath` (default: `.dashboard-data/newsletter.json`), `syncScriptPath` (default: `""`), `dueSoonDays` (default: `3`). `DEFAULT_SETTINGS` updated accordingly. SettingsTab gains a "Notion Sync" section with these fields.

### Pages (D-13)
- **D-13:** Two new pages added to the plugin:
  - `projects` page: Active projects list (name, status, progress %, active/overdue task counts, link) + task list emphasizing overdue/due-soon items (highlighted), then remaining active tasks. Each item links to its Notion page.
  - `newsletter` page: Stage counts (simple list of stage → count) + item list (name, stage, content type, link).
  - `PageId` union extended: `'home' | 'social' | 'projects' | 'newsletter'`.
  - Sidebar nav extended with Projects and Newsletter entries.
  - Reuse existing `StatusTile`/`TileGrid` for count tiles. New `ListRow` component for task/project/newsletter rows with click-through to Notion URL.

### No-data and stale states (D-14)
- **D-14:** All new pages degrade to the existing no-data state (same pattern as Social Stats) when a snapshot file is missing, empty, or unreadable. Stale detection: if `generated_at` is older than 24 hours, show a subtle "Stale — last synced X" label but still render the data.

### Scheduling (D-15)
- **D-15:** Background scheduling via Windows Task Scheduler. Plan 4 includes a PowerShell helper script (`scripts/schedule-notion-sync.ps1`) that registers a daily Task Scheduler job at 06:00 local time running the same `notion-sync.mjs`. This is documented; the user runs it once to set up. The plugin is not involved in scheduling.

### Notion integration prerequisite (D-16 — manual, not automated)
- **D-16:** Julian does NOT yet have a Notion internal integration created. Plan 1 includes step-by-step setup instructions. Integration must be shared with Tasks, Projects, and Newsletter Content Hub databases (Connections → add integration in each database). This is a blocking manual step before any live testing.

### XSS sanitization (D-17)
- **D-17:** Task names, project names, newsletter titles from Notion are treated as untrusted content. All rendered strings from snapshot data go through Obsidian's `sanitizeHTMLToDom` before render — SEC-01 carries over. In React JSX contexts, content is set as text (not dangerouslySetInnerHTML), which is XSS-safe natively; `sanitizeHTMLToDom` applies when building DOM nodes directly.

### Claude's Discretion
- Exact property names for `Meta`, `Progress`, and `Archived` in the Projects DB (read from the database during sync)
- CSS for the new pages (follows existing `.claudeos-*` token system)
- Exact layout of the stage-count display on the Newsletter page (simple list is sufficient for v1)
- Node.js version check in sync script (Node 18+ required for `fetch`; emit clear error if older)
- `ListRow` component internal structure

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design document (primary source)
- `.planning/NOTION-PIPELINE-DESIGN.md` — Full design: architecture diagram, API shape, data contracts (§5), requirements (§8), answered open questions

### Existing code patterns to extend/clone
- `src/components/ui/SkillButton.tsx` — execFile pattern, idle/loading/success/error state machine, security posture (SEC-03) to replicate in RefreshButton
- `src/utils/readJsonFile.ts` — null-safe file reader; new snapshot reads use this exactly as-is
- `src/context/AppContext.tsx` — Add `refreshNonce` + `triggerRefresh` here; pages import `useAppContext()`
- `src/settings/SettingsTab.ts` — Pattern for adding new settings sections
- `src/types.ts` — Add `PageId` union values + new snapshot interfaces here
- `src/components/App.tsx` — `PAGES` map + `PageId` — add new pages here
- `src/components/ui/Sidebar.tsx` — Add nav items for Projects + Newsletter pages
- `src/components/pages/HomePage.tsx` — Pattern for reading JSON files in a page component via `useEffect` + `refreshNonce`

### Notion data reference
- `Notion LifeOS/notion-ids.md` — Data source UUIDs, status option values (critical for filter construction)
- `Notion LifeOS/notion-workspace-schema.md` — Property names for each database

### Project constraints
- `.planning/PROJECT.md` — "Plugin is a pure display and interaction layer"
- `.planning/STATE.md` — Locked decisions: CSS scoping under `.claudeos-dashboard`, `npm install --strict-ssl=false` on this machine

</canonical_refs>

<specifics>
## Specific Ideas

- The sync script writes a temp file then renames to avoid half-written reads: `fs.writeFile(tmpPath, json)` then `fs.rename(tmpPath, finalPath)`.
- The `NOTION_TOKEN` env var is the primary read path; fallback: `fs.readFileSync('%USERPROFILE%\\.claudeos\\notion.env', 'utf-8')` and parse `NOTION_TOKEN=xxx` format.
- Pagination: follow `next_cursor` / `has_more` in each query until fully consumed (each DB is well under 1000 rows).
- The Projects page should show overdue tasks prominently — put them in a separate "Overdue" section above the full active list. Not a notification/badge; just a section header. Julian does not want unsolicited staleness flags in normal operations, but explicitly showing overdue in context is fine.
- Link format for Notion deep links: `https://notion.so/<page-id-without-dashes>`. The page ID comes from the `id` field in the query response.
- For the Newsletter page stage counts, show only stages that have items — don't show zero-count stages.
- `dueSoonDays: 3` is the confirmed default. Due-soon tasks (due within next 3 days) get visual emphasis (same section as overdue, or color distinction).
- Node.js is at `C:\Users\scull\AppData\Local\nvm\v20.20.2\node.exe` on this machine — the sync script must be called with the full node path or the user's system node; settings should store the node executable path or use a shell wrapper.

</specifics>

<deferred>
## Deferred Ideas

- **File-watch auto-refresh** — auto-update the open dashboard when the scheduled job rewrites snapshot files. Nice-to-have; requires `fs.watch()` in the plugin. Defer to Phase 5 polish.
- **Project name on tasks** — resolving the relation ID to a project name requires extra API calls. Omit `project` field from TaskItem for v1; add in a future iteration if desired.
- **Social stats adaptation to sync-script pattern** — the same pattern could replace the manual-file approach for social stats. Defer to Phase 6.
- **Configurable item caps** — exposing `taskCap` as a setting. Hardcode 10 for now; revisit when there's a real need.
- **Newsletter pipeline visualization** — a horizontal Kanban-style lane display. Simple list is sufficient for v1; upgrade later.
- **Refresh button placement** — currently planned per-page; could be promoted to the sidebar or a global header later.

</deferred>

---

*Phase: 03-notion-dashboard*
*Context gathered: 2026-06-06 via PRD Express Path from NOTION-PIPELINE-DESIGN.md*
