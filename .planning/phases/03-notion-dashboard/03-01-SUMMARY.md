---
phase: 03-notion-dashboard
plan: 01
subsystem: api
tags: [notion, node, esm, sync, snapshot, gitignore]

# Dependency graph
requires:
  - phase: 02-dashboard-features
    provides: readJsonFile utility pattern and plugin display layer that will consume snapshots
provides:
  - scripts/notion-sync.mjs — standalone Node ESM sync script querying three Notion data sources and writing atomic JSON snapshots
  - .dashboard-data/ gitignore entry — snapshot directory excluded from version control
affects:
  - 03-02 — types and plugin integration that will define TypeScript interfaces matching snapshot shapes emitted here
  - 03-03 — UI pages (Projects, Newsletter) that read the snapshot files written by this script
  - 03-04 — scheduling plan that will register notion-sync.mjs as a Task Scheduler job

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic snapshot write: JSON.stringify -> write .tmp -> fs.rename to final path (avoids half-read)"
    - "Token loading chain: env var primary, file fallback at %USERPROFILE%\\.claudeos\\notion.env"
    - "Paginated Notion data_sources query: loop on has_more / next_cursor, accumulate results"
    - "Client-side filter for newsletter (fetch all, drop Published/Deleted) avoids server-side multi-value gap risk"

key-files:
  created:
    - scripts/notion-sync.mjs
  modified:
    - .gitignore

key-decisions:
  - "Tasks filter uses status.does_not_equal operator (not select) — Tasks DB Status is a status-type property"
  - "Newsletter reads props.Title (not props.Name) — Title is the correct property name for this DB"
  - "TaskItem omits project field entirely (D-06) — relation resolution requires extra API calls"
  - "ProjectItem reads Progress.formula.number, omits active_tasks/overdue_tasks (Meta formula format undocumented)"
  - "Counts computed over full active set before TASK_CAP=10 is applied — active_count/overdue_count/due_soon_count reflect true totals"
  - "Newsletter fetched without server-side status filter; Published/Deleted dropped client-side to avoid multi-value operator gap"
  - "dueSoonDays=3 hardcoded in sync script, matches Plan 2 DEFAULT_SETTINGS default"

patterns-established:
  - "Sync script pattern: pure Node ESM, no npm deps, token outside vault, atomic writes — template for Phase 6 social data pipeline"
  - "Deep link format: https://notion.so/ + result.id with all dashes removed"

requirements-completed: [NOTION-01, NOTION-02, NOTION-03, NOTION-07]

# Metrics
duration: 8min
completed: 2026-06-06
---

# Phase 3 Plan 01: Notion Sync Script Summary

**Dependency-free Node ESM sync script querying Tasks, Projects, and Newsletter Content Hub via Notion API 2025-09-03, writing atomic JSON snapshots to .dashboard-data/ with token loaded from outside the vault**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-06T22:22:46Z
- **Completed:** 2026-06-06T22:25:30Z
- **Tasks:** 2 of 3 complete (Task 3 is blocking-human checkpoint — awaiting Notion integration setup)
- **Files modified:** 2

## Accomplishments

- Created `scripts/notion-sync.mjs` — 336-line pure Node ESM script with no npm dependencies
- Node 18+ guard, external token loading, three paginated Notion queries, correct transforms with all critical-finding deviations, atomic writes
- `.dashboard-data/` added to `.gitignore` — snapshot runtime outputs excluded from version control; `main.js` remains tracked for BRAT distribution

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scripts/notion-sync.mjs** - `5ae408b` (feat)
2. **Task 2: Add .dashboard-data/ to .gitignore** - `a3954ba` (chore)
3. **Task 3: Notion integration setup + live sync run** - PENDING HUMAN ACTION (blocking-human checkpoint)

## Files Created/Modified

- `scripts/notion-sync.mjs` — Standalone Node ESM sync script: token loading, three Notion data_sources queries, transforms to TaskItem/ProjectItem/NewsletterItem shapes, atomic snapshot writes
- `.gitignore` — Added `.dashboard-data/` entry with comment; existing entries intact; main.js not ignored

## Snapshot JSON Shapes (exact field names for Plan 2 to mirror)

**tasks.json:**
```json
{
  "active_count": <number>,
  "overdue_count": <number>,
  "due_soon_count": <number>,
  "items": [{ "name": "", "status": "", "priority"?: "", "due"?: "YYYY-MM-DD", "url": "" }],
  "generated_at": "ISO8601"
}
```
Note: `priority` and `due` are conditionally present (omitted when undefined/null). `project` field is absent entirely (D-06).

**projects.json:**
```json
{
  "active_count": <number>,
  "items": [{ "name": "", "status": "", "progress"?: <integer>, "url": "" }],
  "generated_at": "ISO8601"
}
```
Note: `progress` is conditionally present (omitted when not a finite number). No `active_tasks` or `overdue_tasks` fields.

**newsletter.json:**
```json
{
  "by_stage": { "<stage_name>": <count> },
  "items": [{ "name": "", "stage": "", "content_type"?: "", "platform"?: "", "url": "" }],
  "generated_at": "ISO8601"
}
```
Note: `content_type` and `platform` conditionally present. `by_stage` contains only stages with at least one item.

## Decisions Made

- Tasks filter: `{"property":"Status","status":{"does_not_equal":"Done"}}` — Status is a `status`-type property, not `select`
- Newsletter title property: `props.Title.title[0]?.plain_text` — the DB property is named "Title" not "Name" (critical finding)
- Counts computed before capping: `active_count`, `overdue_count`, `due_soon_count` reflect all matching records; `items` array is capped at 10
- Newsletter fetched without server-side exclusion (empty body `{}` to queryDataSource) to avoid multi-value filter gap; Published and Deleted dropped client-side
- `DUE_SOON_DAYS = 3` constant mirrors the `dueSoonDays` default Plan 2 will add to settings

## Confirmed Node Path

Node executable: `C:\Users\scull\AppData\Local\nvm\v20.20.2\node.exe`
Documented in script header comment and referenced in checkpoint verification steps.

## Deviations from Plan

None — plan executed exactly as written. All critical-finding deviations (D-06 project omission, Title vs Name, Meta skip, does_not_equal operator, atomic write, external token) were incorporated as specified.

## Issues Encountered

Source assertion gate required a temp `.cjs` helper file to avoid bash-escaping issues with the inline `node -e` command on Windows. The helper ran cleanly, confirmed assertions pass, and was deleted before the commit. No code changes required.

## User Setup Required

Task 3 (blocking-human checkpoint) requires the following before a live sync run can be verified:

1. Create an internal integration at https://www.notion.so/profile/integrations named "ClaudeOS Dashboard Sync"
2. Copy the Internal Integration Secret (starts with `ntn_` or `secret_`)
3. Share the integration with all THREE databases via each database's ••• → Connections menu: Tasks DB, Projects DB, Newsletter Content Hub. (A 404 on any query means this step was missed for that DB.)
4. Provide the token via `NOTION_TOKEN` user environment variable OR create `%USERPROFILE%\.claudeos\notion.env` with one line: `NOTION_TOKEN=<secret>`
5. Run: `& "C:\Users\scull\AppData\Local\nvm\v20.20.2\node.exe" scripts\notion-sync.mjs`
6. Confirm exit 0 and three files exist under `.dashboard-data\` with the shapes documented above

## Next Phase Readiness

- `scripts/notion-sync.mjs` is committed and ready for human verification
- Snapshot shapes are locked — Plan 2 can define matching TypeScript interfaces immediately
- Once Task 3 is approved, Plan 2 (types + plugin integration) can proceed

## Known Stubs

None — this plan creates the sync script only. No UI rendering of snapshot data occurs here.

## Threat Flags

None — `notion-sync.mjs` runs outside the plugin, reads no vault files, writes only to `.dashboard-data/` which is gitignored. Token loaded from env var or non-synced `%USERPROFILE%\.claudeos\notion.env` path, never committed or logged. No new network surface inside the plugin boundary.

## Self-Check

- [x] `scripts/notion-sync.mjs` exists
- [x] Source assertion gate passes (`source assertions OK`)
- [x] `.gitignore` contains `.dashboard-data/` and does NOT contain `main.js`
- [x] Commits `5ae408b` and `a3954ba` exist in git log
- [x] SUMMARY.md written to `.planning/phases/03-notion-dashboard/03-01-SUMMARY.md`

## Self-Check: PASSED
