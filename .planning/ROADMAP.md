# Roadmap: ClaudeOS Dashboard

**Project:** ClaudeOS Dashboard
**Total phases:** 2 (v1) + 3 future phases (v2)
**Requirements coverage:** 18/18 v1 requirements mapped ✓

---

## Phases

### v1 — Current Milestone

- [ ] **Phase 1: Foundation** — Working plugin scaffold with dev environment, GitHub publishing, and security baseline
- [ ] **Phase 2: Dashboard Features** — All v1 pages (Home, Social Stats) and skill triggers functional inside Obsidian

### v2 — Future Milestone

- [ ] **Phase 3: Social Data Pipeline** — Design and implement connectors/MCPs to feed social stats data automatically
- [ ] **Phase 4: Newsletter Workflow Page** — Occam's Leader drafting pipeline UI inside the dashboard
- [ ] **Phase 5: Skill Output + UX Polish** — Inline output display, async status, cross-page persistence, UX refinements

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
- [ ] 01-P1-PLAN.md — Plugin scaffold and toolchain (package.json, tsconfig, esbuild, manifest, main.ts, styles.css, full source tree, npm run build)
- [ ] 01-P2-PLAN.md — Dev loop, security baseline, and Obsidian verification (symlink, gitleaks+husky, sanitizeHTMLToDom, human load test)

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
1. **Skill trigger component** — Generic button with allowlist validation, `child_process` execution, loading/success/error states (SEC-03, SKILL-01, SKILL-02, SKILL-03)
2. **Home page** — Status tile layout, flat-file data reader, skill button integration (HOME-01, HOME-02, HOME-03)
3. **Social Stats page** — LinkedIn and X metric display, configurable file paths, missing-data state (SOCIAL-01, SOCIAL-02, SOCIAL-03, SOCIAL-04)

---

## Future Phases (v2)

These phases are documented requirements, not yet planned. Start with `/gsd-discuss-phase 3` after Phase 2 ships.

### Phase 3: Social Data Pipeline

**Goal:** Design and build a data pipeline (MCP connector or automation) that writes social platform metrics to the format the Social Stats page expects — removing the manual step of exporting/dropping files.
**Depends on:** Phase 2
**Requirements (v2):** DATA-01, DATA-02
**Notes:** This phase requires a design discussion on connector options (LinkedIn/X MCP availability, OAuth implications, polling vs. webhook). Run `/gsd-discuss-phase 3` to start that conversation.

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
**Notes:** v2 output requirements deferred from Phase 2 — implement after core workflow is validated.

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Planned | - |
| 2. Dashboard Features | 0/3 | Not started | - |
| 3. Social Data Pipeline | TBD | Future | - |
| 4. Newsletter Workflow | TBD | Future | - |
| 5. Skill Output + Polish | TBD | Future | - |
