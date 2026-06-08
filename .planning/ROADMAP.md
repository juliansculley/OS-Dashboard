# Roadmap: ClaudeOS Dashboard

**Project:** ClaudeOS Dashboard
**Total phases:** 2 (v1) + 4 future phases (v2)
**Requirements coverage:** 18/18 v1 requirements mapped ✓

---

## Phases

### v1 — Current Milestone

- [x] **Phase 1: Foundation** — Working plugin scaffold with dev environment, GitHub publishing, and security baseline (completed 2026-06-05)
- [ ] **Phase 2: Dashboard Features** — All v1 pages (Home, Social Stats) and skill triggers functional inside Obsidian — UAT T4 partial; skill output not verified (see open gap)

### v2 — Future Milestone

- [x] **Phase 3: Notion Dashboard** — Sync script + Notion pages (Projects, Tasks, Newsletter) surfaced inside the dashboard (completed 2026-06-06)
- [ ] **Phase 4: Newsletter Workflow Page** — Occam's Leader drafting pipeline UI inside the dashboard
- [x] **Phase 5: Skill Output + UX Polish** — Inline output display, async status, cross-page persistence, UX refinements (completed 2026-06-07)
- [ ] **Phase 6: Social Data Pipeline** — Design and implement connectors/MCPs to feed social stats data automatically

---

## Phase Details

### Phase 1: Foundation

**Goal:** A compilable, hot-reloading plugin loads in Obsidian, is publishable to GitHub for community plugin installation, and has security primitives (XSS sanitization, no secrets in code) in place.
**Depends on:** Nothing
**Requirements:** FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, SEC-01, SEC-02
**UI hint:** yes
**Plans:** 2 plans

### Success Criteria

1. Running `npm run dev` starts a file watcher; saving any source file reloads the plugin in Obsidian within 2 seconds without manual reinstall.
2. A ribbon icon and command palette entry both open the dashboard pane; a tab bar switches between placeholder pages without full re-render.
3. All HTML rendered through the plugin passes through a sanitization layer (DOMPurify or equivalent) — verifiable by attempting to inject a `<script>` tag through rendered content.
4. `main.js`, `manifest.json`, and `styles.css` are present at the repo root and the plugin installs successfully via Obsidian community plugin / BRAT from the GitHub repo.

### Plans

**Wave 1**

- [x] 01-P1-PLAN.md — Plugin scaffold and toolchain (package.json, tsconfig, esbuild, manifest, main.ts, styles.css, full source tree, npm run build) — completed 2026-06-05

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-P2-PLAN.md — Dev loop, security baseline, and Obsidian verification (symlink, gitleaks+husky, sanitizeHTMLToDom, human load test) — completed 2026-06-05

**Cross-cutting constraints:**

- `main.js` and `manifest.json` must be present at repo root (not in .gitignore) — required for FOUND-05 and SEC-02 gitleaks scan
- All React mounting must use `this.contentEl` (not `containerEl.children[1]`) — enforced by P1 Task 2 verify block

---

### Phase 2: Dashboard Features

**Goal:** All v1 dashboard pages (Home, Social Stats) and skill trigger buttons are functional with real data and safe shell execution.
**Depends on:** Phase 1
**Requirements:** HOME-01, HOME-02, HOME-03, SOCIAL-01, SOCIAL-02, SOCIAL-03, SOCIAL-04, SKILL-01, SKILL-02, SKILL-03, SEC-03
**UI hint:** yes

### Success Criteria

1. Home page opens as default tab and renders at least two status tiles reading data from vault notes or flat files; one skill trigger button executes `claude -p <skill>` and shows a loading spinner followed by a success or error indicator.
2. Social Stats page reads LinkedIn and X metrics from configurable file paths (set in plugin settings), renders them in the page, and displays a clear "no data" state when files are absent.
3. Skill trigger buttons only execute commands from an approved allowlist — attempting to pass an unlisted skill name produces no shell execution (verifiable in tests).
4. Configurable data file paths survive plugin reload (stored in Obsidian plugin data, not hardcoded).

### Plans

1. [x] **02-P1** — Foundation layer: type contracts, SettingsTab, SkillButton allowlist, readJsonFile utility, Phase 2 CSS (SEC-03, SKILL-01, SKILL-02, SKILL-03) — completed 2026-06-06
2. [x] **02-P2** — Home page: status tile layout, flat-file data reader, skill button integration (HOME-01, HOME-02, HOME-03) — completed 2026-06-06
3. [x] **02-P3** — Social Stats page: LinkedIn and X metric display, configurable file paths, missing-data state (SOCIAL-01, SOCIAL-02, SOCIAL-03, SOCIAL-04) — completed 2026-06-06

---

## Future Phases (v2)

These phases are documented requirements, not yet planned.

### Phase 3: Notion Dashboard

**Goal:** A standalone Node sync script queries Tasks, Projects, and Newsletter data sources via the Notion REST API, writes compact JSON snapshots, and the dashboard renders two new pages (Projects/Tasks and Newsletter) with a Refresh button that re-runs the script and live-reloads the views.
**Depends on:** Phase 2
**Requirements (v2):** NOTION-01, NOTION-02, NOTION-03, NOTION-04, NOTION-05, NOTION-06, NOTION-07, NOTION-08
**Notes:** Full design documented in `.planning/NOTION-PIPELINE-DESIGN.md`. Notion integration token setup is a manual prerequisite.
**Plans:** 4 plans (4 waves)

Plans:

- [x] 03-01-PLAN.md — Sync script + infrastructure: notion-sync.mjs (token loading, 3 queries, atomic snapshots), .gitignore, integration setup (NOTION-01, NOTION-02, NOTION-03, NOTION-07) — completed 2026-06-06; live-verified: 130 tasks, 22 projects, 7 newsletter items
- [x] 03-02-PLAN.md — Types, settings, AppContext: snapshot interfaces, extended PageId, 6 new settings, refreshNonce/triggerRefresh (NOTION-03, NOTION-04) — completed 2026-06-07; build green, all interfaces match confirmed snapshot shapes
- [x] 03-03-PLAN.md — RefreshButton + Projects page: execFile refresh state machine, ListRow, Projects page with overdue/due-soon emphasis (NOTION-04, NOTION-05, NOTION-08) — completed 2026-06-07
- [x] 03-04-PLAN.md — Newsletter page + scheduling: stage counts + item list, Windows Task Scheduler registration script (NOTION-06, NOTION-07, NOTION-08) — completed 2026-06-06; human-verified: Projects, Newsletter, Refresh all functional

---

### Phase 4: Newsletter Workflow Page

**Goal:** Add a Substack/newsletter drafting pipeline page to the dashboard — buttons to advance the Occam's Leader workflow (ideation → draft → edit → review), inline markdown preview, and a "finalize" step that produces a Substack-ready note.
**Depends on:** Phase 2
**Requirements (v2):** NEWS-01, NEWS-02, NEWS-03
**Notes:** Existing Claude skills for this workflow are already built. This phase is purely the dashboard UI layer on top of those skills.

---

### Phase 5: Skill Output + UX Polish

**Goal:** Add inline output display for skill executions, async status persistence across page navigation, and general UX refinements based on daily use of the v1 dashboard.
**Depends on:** Phase 2
**Requirements (v2):** OUT-01, OUT-02
**Notes:** v2 output requirements deferred from Phase 2 — implement after core workflow is validated. Design resolved during /gsd-discuss-phase: inline expandable input panel (not a modal), stdin via spawn (D-06 correction — execFile has no async `input` option), output link parsed from a skill-printed `Output:` line.
**Plans:** 3/4 plans executed

Plans:

- [x] 05-01-PLAN.md — Skill-side `Output:` stdout contract for braindump, humanizer (adds Cowork-mode file write), wiki-optimizer (OUT-01 prerequisite for output-link parsing)
- [x] 05-02-PLAN.md — Cross-page persistence foundation: skill-state types, AppContext lift, App.tsx nested provider + content-wrapper, SkillStatusBar + CSS (OUT-02)
- [x] 05-03-PLAN.md — SkillButton refactor (spawn+stdin / stdout-capturing execFile, output-link parsing + `..` traversal guard, context-backed state, SEC-03 preserved) + SkillInputPanel + CSS (OUT-01, OUT-02)
- [x] 05-04-PLAN.md — Re-run Phase 2 T4 end-to-end with file-output verification; mark the T4 gap resolved (OUT-01) — completed 2026-06-07

#### Open To-Dos (discovered during Phase 2 UAT) — addressed by the plans above

- [x] **Skill input modal** — Resolved as an inline expandable input panel (D-04 / D-05), implemented in 05-03. Input passed to `claude -p <skill>` via spawn stdin (D-06 correction).
- [x] **Re-run Phase 2 T4** — Scheduled as 05-04: click braindump (or wiki-optimizer) with input, confirm "Done", verify the output file exists in the correct directory.

---

### Phase 6: Social Data Pipeline

**Goal:** Design and build a data pipeline (MCP connector or automation) that writes social platform metrics to the format the Social Stats page expects — removing the manual step of exporting/dropping files.
**Depends on:** Phase 2
**Requirements (v2):** DATA-01, DATA-02
**Notes:** This phase requires a design discussion on connector options (LinkedIn/X MCP availability, OAuth implications, polling vs. webhook). Architecture will mirror the Notion sync script pattern established in Phase 3.

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | P1: 2026-06-05, P2: 2026-06-05 |
| 2. Dashboard Features | 3/3 | Complete | 2026-06-06 (T4 gap closed in Phase 5) |
| 3. Notion Dashboard | 4/4 | Complete | 2026-06-06 |
| 4. Newsletter Workflow | TBD | Future | - |
| 5. Skill Output + Polish | 4/4 | Complete | 2026-06-07 |
| 6. Social Data Pipeline | TBD | Future | - |
