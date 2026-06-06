# Phase 2: Dashboard Features - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 makes the dashboard functional: the stub Home and Social Stats pages from Phase 1 become real pages with live data. The Home page shows 2 status tiles reading from JSON flat files plus a Skills section with buttons triggering `claude -p <skill>` via child_process. The Social Stats page reads LinkedIn and X metrics from configurable JSON files. A plugin Settings tab lets the user configure data file paths. Architecture, toolchain, and navigation are locked from Phase 1 — this phase fills in content only.

Requirements in scope: HOME-01, HOME-02, HOME-03, SOCIAL-01, SOCIAL-02, SOCIAL-03, SOCIAL-04, SKILL-01, SKILL-02, SKILL-03, SEC-03

</domain>

<decisions>
## Implementation Decisions

### Skill Triggers
- **D-01:** Allowlist of valid skill names is a **hardcoded array in source code** — not configurable in settings. It's a curated personal list; changes require a code update. This enforces SEC-03 (no raw user input passed to shell) structurally.
- **D-02:** Initial allowlist (Phase 2): `wiki-optimizer`, `braindump`, `humanizer` — three buttons rendered in a dedicated Skills section.
- **D-03:** Output handling is **fire-and-forget**: button shows a loading spinner while child_process runs, then transitions to a success or error indicator based on exit code. No stdout capture or inline display in v1. (OUT-01 in v2 requirements covers inline output.)
- **D-04:** Skills section sits **below the status tiles** on the Home page — clear visual separation between status (read) and actions (execute).

### Home Page Tiles
- **D-05:** Tile data source format is **JSON flat files** — simple key-value, easy to write from automations or MCPs, typed interfaces in TypeScript.
- **D-06:** v1 Home page has **2 status tiles**:
  - Tile 1: "Last vault sync" — reads a timestamp from a JSON file
  - Tile 2: "Active projects" — reads a count value from a JSON file
- **D-07:** When a tile's data file is **missing or unreadable**, the tile stays visible with `—` as the value and a muted "No data" label. Layout is stable regardless of whether files exist.

### Settings UI
- **D-08:** Phase 2 includes an **Obsidian plugin Settings tab** (standard `PluginSettingTab` pattern).
- **D-09:** Settings are **file paths only**: LinkedIn data file path, X data file path, tile data file paths (one path per tile or a directory). Skill allowlist stays hardcoded in source — it is NOT exposed in settings.
- **D-10:** All configurable paths **default to empty strings**. When a path is empty, the corresponding tile or page renders its "no data" state. User must set paths in Settings before live data appears.

### Social Stats
- **D-11:** Social stats data file format matches the tile format: **JSON files**. Field names are not specified here — researcher should define a minimal schema for LinkedIn followers/posts and X followers/tweets that the Social Stats page can display. The "no data" state (SOCIAL-04) follows the same pattern as tiles: page renders a clear empty state message when the configured path is empty or the file is unreadable.

### Claude's Discretion
- Exact JSON schema for LinkedIn and X data files — researcher defines field names
- Tile JSON file schema (key name for timestamp, key name for count)
- Settings tab layout (label copy, help text, section grouping)
- Whether tile data paths are configured individually or as a shared data directory

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Locked Decisions
- `.planning/phases/01-foundation/01-CONTEXT.md` — All Phase 1 locked decisions (D-01 through D-11). Phase 2 inherits everything: React + TypeScript, esbuild, file structure, CSS token system, sanitizeHTMLToDom, plugin.loadData/saveData, symlink dev setup.

### Architecture & Code Patterns
- `archive/claudeos-obsidian-plugin-spec.md` — Prior research artifact. Read with selective trust per Phase 1 CONTEXT.md notes. Reliable for: ItemView pattern, AppContext, CSS scoping, plugin settings tab pattern, `plugin.loadData()`/`plugin.saveData()`. Discard: MCP bridge architecture.

### Requirements & Success Criteria
- `.planning/REQUIREMENTS.md` — Phase 2 requirements (HOME-01 through HOME-03, SOCIAL-01 through SOCIAL-04, SKILL-01 through SKILL-03, SEC-03) with acceptance language
- `.planning/ROADMAP.md` §Phase 2 — Success criteria (4 numbered criteria) that define done
- `.planning/PROJECT.md` — Project constraints, tech stack, out-of-scope definitions

### Phase 1 Source (available after Phase 1 executes)
- `src/views/DashboardView.tsx` — View mount pattern; Phase 2 does not change this
- `src/components/App.tsx` — Router; Phase 2 fills in HomePage and SocialPage components
- `src/context/AppContext.tsx` — App + Plugin injection; Phase 2 reads `plugin.loadData()` via this context
- `src/types.ts` — PageId type; Phase 2 may extend with new types for tile data and settings schema
- `styles.css` — CSS token system; Phase 2 adds selectors for tiles, skill buttons, settings

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/pages/HomePage.tsx` — Phase 1 stub; Phase 2 replaces body with tiles + skills section
- `src/components/pages/SocialPage.tsx` — Phase 1 stub; Phase 2 replaces body with LinkedIn/X metric display
- `src/context/AppContext.tsx` — Provides `plugin` reference; use `plugin.loadData()` to read settings (file paths), `plugin.saveData()` to write settings

### Established Patterns
- State-based router: `activePage` state in `App.tsx` drives page rendering — no URL routing. Phase 2 adds page content without touching the router.
- CSS token system: all new selectors scoped under `.claudeos-dashboard {}`, new tokens follow `--cos-*` namespace (D-10 from Phase 1).
- No external UI libraries — Phase 2 follows the same pattern: plain React components styled with CSS tokens.
- `plugin.loadData()` / `plugin.saveData()` for settings persistence (not localStorage, not hardcoded file paths).

### Integration Points
- `child_process` (Node.js built-in) for skill execution — available in Obsidian's Electron environment. Obsidian's `electron` module is in esbuild's external list, so Node.js built-ins like `child_process` are accessible.
- Obsidian `PluginSettingTab` API for the Settings tab — registered via `this.addSettingTab()` in `main.ts` (Phase 2 extends the existing Plugin class).
- Obsidian `app.vault.adapter.read()` for reading JSON data files from vault paths.

</code_context>

<specifics>
## Specific Ideas

- Skills section has exactly 3 buttons in v1: `wiki-optimizer`, `braindump`, `humanizer`. These are real Claude Code skills already in use.
- Tiles show useful real data from day one, not dummy placeholders. The data files will be written by external automations (MCPs, scripts) — Phase 2 only reads them.
- Empty-string path defaults mean the dashboard renders cleanly on first install without needing setup. User configures paths when they're ready to connect real data.

</specifics>

<deferred>
## Deferred Ideas

- Inline skill output display (stdout/stderr in the button card) — covered by OUT-01 in v2 requirements. Defer to Phase 5.
- Configurable skill allowlist in settings — adds validation complexity; keep hardcoded for v1.
- Social stats field schema was not explicitly discussed — researcher should define a minimal schema (LinkedIn: followers, posts; X: followers, tweets, or similar). If the schema needs user input, researcher should flag it before planning begins.

</deferred>

---

*Phase: 2-Dashboard-Features*
*Context gathered: 2026-06-04*
