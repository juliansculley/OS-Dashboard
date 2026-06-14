# Notion Data Pipeline — Design & Requirements (Phase 3 input)

**Status:** Design proposal, ready for `/gsd-discuss-phase 3`
**Author:** Drafted with Claude, 2026-06-05
**Supersedes:** The old Phase 3 framing in ROADMAP.md ("Social Data Pipeline"). The data-pipeline machinery designed here is the general mechanism; social stats become just one more snapshot file using the same pattern.

---

## 1. Decisions locked (from Julian, 2026-06-05)

| Decision | Choice | Why it matters |
|---|---|---|
| Where fetch logic lives | **External sync script**, not the plugin and not the Notion MCP | Keeps the plugin a pure display layer (the project's stated core principle), keeps the Notion token out of the OneDrive-synced vault, and costs **zero LLM tokens** — it is deterministic REST, not an agent call. |
| What to surface | Active tasks, active projects, overdue / due-soon tasks, newsletter pipeline | Covers the daily-driver views Julian actually checks. |
| Refresh model | **Manual button + scheduled background sync** | Dashboard is fresh on open; manual button forces an immediate pull. |

---

## 2. Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  notion-sync (Node script)  │  HTTPS  │  Notion REST API             │
│  - reads token from OUTSIDE  │ ──────▶ │  POST /v1/data_sources/{id}/ │
│    the synced vault          │         │       query  (2025-09-03)    │
│  - queries each data source  │ ◀────── │                              │
│  - transforms → compact JSON │         └──────────────────────────────┘
│  - writes snapshot files     │
└──────────────┬──────────────┘
               │ writes  *.json
               ▼
   <vault>/.dashboard-data/*.json   ← snapshot files (gitignored, NOT secret)
               ▲
               │ readJsonFile() (already built)
┌──────────────┴──────────────┐
│  ClaudeOS Dashboard plugin   │
│  - Refresh button runs the   │  child_process.execFile (same pattern
│    script, then re-reads JSON│   as existing SkillButton)
│  - renders tiles / lists     │
└──────────────────────────────┘
```

Why this shape:

- **Reuses everything already built.** `readJsonFile()` already handles both vault-relative and absolute paths and returns `null` on any failure → existing no-data states just work. The refresh button is a near-clone of `SkillButton`'s `execFile` flow.
- **Plugin stays a display layer.** No API client, no token, no network code inside the plugin. Consistent with PROJECT.md ("purely a display and interaction layer — it renders data written by external sources").
- **Token never touches OneDrive.** See §4.
- **Script is independently runnable.** The scheduler (or OS cron / Task Scheduler) runs the exact same script the button runs — one code path, two triggers.

### Rejected alternative: plugin calls Notion directly via `requestUrl`
Fewer moving parts and slightly snappier, but the integration token would live in the plugin's `data.json`, which sits inside the OneDrive-synced vault. That syncs a secret to the cloud and mixes API logic into the display layer. Not worth it for a personal dashboard. (Documented here so a future session doesn't relitigate it.)

---

## 3. The sync script

**Location (proposed):** `OS-Dashboard/scripts/notion-sync.mjs` (committed — it contains no secrets) or a standalone repo. Pure Node ESM, one dependency-free `fetch` per data source.

**Per-query call shape:**

```
POST https://api.notion.com/v1/data_sources/{DATA_SOURCE_ID}/query
Headers:
  Authorization: Bearer ${NOTION_TOKEN}
  Notion-Version: 2025-09-03
  Content-Type: application/json
Body: { "filter": {...}, "sorts": [...], "page_size": 100 }
```

Note: the API moved from `POST /v1/databases/{id}/query` to `POST /v1/data_sources/{id}/query` in the 2025-09-03 version. The `collection://<uuid>` values in `Notion LifeOS/notion-ids.md` ARE the data-source UUIDs — strip the `collection://` prefix and use the UUID.

**Data sources to query** (UUIDs from `notion-ids.md`):

| Snapshot | Data source UUID | Filter | Sort |
|---|---|---|---|
| Active tasks | `1e74f78c-9804-81e4-a8b8-000bb75cf801` (Tasks) | `Status` ≠ Done group | `Due` asc |
| Overdue / due-soon | same Tasks source | `Due` on-or-before today+N AND `Status` ≠ Done | `Due` asc |
| Active projects | `1e74f78c-9804-818e-b085-000be0a80fc5` (Projects) | `Status` is any of `Work Doing`,`Doing`,`Ongoing` AND `Archived` = false | by Status |
| Newsletter pipeline | `2b64f78c-9804-80c8-a851-000b3dea27d5` (Newsletter Hub) | `Status` ≠ `10. Published`,`11. Deleted` | by Status |

(Active-tasks and overdue can be one query filtered client-side to save an API call.)

**Transform:** map Notion's verbose property objects down to the flat schema in §5. Pagination: follow `next_cursor` until `has_more` is false (each DB is well under a few hundred rows, so 1–2 pages each).

**Write:** one JSON file per snapshot into `<vault>/.dashboard-data/`. Write atomically (temp file + rename) so the plugin never reads a half-written file. Stamp each file with `generated_at` (ISO 8601) so the UI can show "last synced".

**Exit codes:** 0 on full success, non-zero on any failure — the refresh button keys its success/error state off this, exactly like `SkillButton`.

---

## 4. Secret handling (satisfies SEC-02, improves on it)

- The Notion **internal integration token** is read by the script from **outside the synced vault**:
  - Primary: an environment variable `NOTION_TOKEN`.
  - Fallback: a local config file at a non-synced path (e.g. `%USERPROFILE%\.claudeos\notion.env`), read via absolute-path `fs` — never inside `OneDrive\ClaudeOS`.
- `.dashboard-data/*.json` holds only already-public-to-you content (your own task names etc.), not credentials, but should still be gitignored to avoid noise. Add `.dashboard-data/` to `.gitignore`.
- The plugin never sees the token. SEC-02 ("no secrets in source/compiled output") holds, and we additionally keep the secret off cloud sync.
- Notion integration must be shared with the LifeOS databases (Connections → add the integration) or queries 404.

---

## 5. Data contracts (new `types.ts` additions)

Keep snapshots compact — only what the UI renders. Proposed schemas:

```ts
export interface SnapshotMeta { generated_at: string; } // ISO 8601, every file

export interface TaskItem {
  name: string;
  status: 'To Do' | 'Doing' | 'Done';
  priority?: 'Low' | 'Medium' | 'High';
  due?: string;            // YYYY-MM-DD or undefined
  project?: string;        // project name, resolved from relation
  url: string;             // notion.so/<page-id> deep link
}
export interface TasksSnapshot extends SnapshotMeta {
  active_count: number;
  overdue_count: number;
  due_soon_count: number;  // due within N days
  items: TaskItem[];       // capped (e.g. top 25 by due) to keep file small
}

export interface ProjectItem {
  name: string;
  status: string;
  progress?: number;       // 0–100 from the Progress formula
  active_tasks?: number;   // from Meta
  overdue_tasks?: number;
  url: string;
}
export interface ProjectsSnapshot extends SnapshotMeta {
  active_count: number;
  items: ProjectItem[];
}

export interface NewsletterItem {
  name: string;
  stage: string;           // e.g. "3. Single outline"
  content_type?: string;
  platform?: string;
  url: string;
}
export interface NewsletterSnapshot extends SnapshotMeta {
  by_stage: Record<string, number>;  // stage → count, for a pipeline bar
  items: NewsletterItem[];
}
```

Add corresponding settings paths to `ClaudeOSSettings` (default to `.dashboard-data/<name>.json`):
`tasksSnapshotPath`, `projectsSnapshotPath`, `newsletterSnapshotPath`. `due_soon` window N also a setting (default 3 days).

---

## 6. Plugin changes (display layer only)

1. **RefreshButton component** — clone of `SkillButton`'s state machine, but instead of `claude -p <skill>` it runs `node <path-to>/notion-sync.mjs` via `execFile`. On the success callback, it triggers a re-read of the snapshot files and a re-render (bump a `refreshNonce` in `AppContext`, or expose a `reload()` the pages subscribe to). Show "Last synced HH:mm" from `generated_at`.
   - Security note: the script path is a hardcoded/allowlisted constant, not user input — same SEC-03 posture as the skill allowlist. No shell string interpolation; `execFile` with an args array.
2. **New page(s)** — add a `projects` page (active projects + a tasks list with overdue/due-soon emphasis) and a `newsletter` page (pipeline counts by stage + item list). Extend `PageId` and the sidebar nav. Reuse `StatusTile` / `TileGrid` for counts; add a simple list row component for task/project/newsletter items with a click-through to the Notion `url`.
3. **No new network/secret code in the plugin.** Everything new is read + render + one `execFile`.

---

## 7. Scheduling (manual + background)

- **Manual:** the RefreshButton above.
- **Background:** schedule the same `notion-sync.mjs` to run on a cadence (e.g. every morning at 06:00 HST and/or every 2 hours during the day). Options, in order of preference:
  1. The ClaudeOS scheduled-task system (a small task whose action is "run the sync script").
  2. Windows Task Scheduler / cron — most robust, runs even when Obsidian is closed.
- The plugin doesn't need to know about the schedule; it just reads whatever JSON is on disk. Optionally add a lightweight file-watch so the open dashboard auto-updates when the scheduled run rewrites the files (nice-to-have, not required).

---

## 8. Requirements (proposed — restate Phase 3 around Notion)

Replace/extend the old DATA-01/DATA-02 with:

- **NOTION-01** — A standalone, dependency-light Node sync script queries the Tasks, Projects, and Newsletter data sources via the Notion REST API (`2025-09-03`) and writes compact JSON snapshots to `<vault>/.dashboard-data/`.
- **NOTION-02** — The Notion integration token is read from outside the synced vault (env var or non-synced config file); it never appears in plugin source, compiled output, `data.json`, or any synced location.
- **NOTION-03** — Snapshot files conform to the §5 schemas, are written atomically, and carry a `generated_at` timestamp.
- **NOTION-04** — A Refresh button in the dashboard runs the sync script and, on success, re-reads snapshots and re-renders without an Obsidian reload; it shows loading/success/error state and the last-synced time. Script path is from a hardcoded allowlist (no user input to shell).
- **NOTION-05** — A Projects page renders active projects (progress %, active/overdue counts) and a tasks list emphasizing overdue and due-soon items, each linking to its Notion page.
- **NOTION-06** — A Newsletter page renders pipeline counts by stage and an item list linking to Notion.
- **NOTION-07** — The sync script can be run by a scheduler (cron / Task Scheduler / ClaudeOS scheduled task) on a configurable cadence, using the same code path as the manual button.
- **NOTION-08** — All pages degrade to the existing no-data state when a snapshot file is missing, empty, or stale.

Non-functional / carries over: SEC-01 (sanitize rendered HTML — task/project names from Notion are untrusted-ish and must be sanitized before render), SEC-02, SEC-03 (allowlist the script path).

---

## 9. Implementation plan (suggested waves - GSD planning should evaluate this before accepting this recommendation)

**Wave 1 — Sync script (no plugin changes):** write `notion-sync.mjs`, token loading, the three queries + transforms, atomic writes. Verify by running it by hand and inspecting the JSON. This de-risks the whole phase before any UI work.

**Wave 2 — Types + settings:** add the §5 types and the new settings paths/`due_soon` window. Wire `readJsonFile` for the new snapshots.

**Wave 3 — Refresh mechanism:** RefreshButton + AppContext reload/nonce + "last synced" display.

**Wave 4 — Pages:** Projects page, Newsletter page, nav + list-row component, click-through links, sanitization.

**Wave 5 — Schedule + polish:** register the scheduled run; optional file-watch auto-refresh; empty/stale states; UAT.

---

## 10. Open questions for the next session

1. **Integration token:** does Julian already have a Notion internal integration created and shared with the LifeOS DBs, or does that need to be set up first? (Blocks Wave 1 testing.)
   A: Julian confirmed, Not set up
2. **due_soon window** default — 3 days assumed; confirm.
   A: Julian confirmed, yes
3. **Item caps** — how many task/project rows to show on the dashboard before it's noise? (Assumed top ~25 tasks by due.) Per CLAUDE.md, Julian dislikes proactive staleness flags — so the overdue list should be present-on-the-page, not a notification.
    A: 10 tasks is fine for testing. 
4. **Relation resolution:** Project name on a task and active-task counts on a project come from relations/rollups. Decide whether the script resolves relation IDs → names with extra fetches, or whether the Projects `Meta`/`Progress` formula values are read directly (cheaper). Recommend reading the formula values where they exist.
    A: Claude should decide.
5. **Social stats:** fold the existing LinkedIn/X social page into this same snapshot pattern, or leave it as its own thing? (The mechanism is identical.)
    A: Notion dashboard page should be a separate page for now. Let's build and test this separately, we can always refactor code later.
---

## 11. Handoff notes

- Existing read pipeline: `src/utils/readJsonFile.ts` (path-flexible, null-safe).
- Existing button/exec pattern to mirror: `src/components/ui/SkillButton.tsx` (`execFile`, allowlist, loading/success/error states).
- Settings pattern: `src/settings/SettingsTab.ts` + `ClaudeOSSettings` in `src/types.ts`.
- Notion IDs/schema: `ClaudeOS/Notion LifeOS/notion-ids.md` and `notion-workspace-schema.md`.
- API reference verified 2026-06-05: query is `POST /v1/data_sources/{id}/query`, header `Notion-Version: 2025-09-03`.
```