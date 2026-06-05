# Requirements: ClaudeOS Dashboard

**Defined:** 2026-06-04
**Core Value:** A single control panel inside Obsidian that shows system status and surfaces AI skill triggers — no context-switching to terminals or separate apps.

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Plugin scaffold compiles and loads in Obsidian (manifest.json, main.ts, styles.css, esbuild toolchain) — completed 01-P1
- [x] **FOUND-02**: Hot-reload dev environment — file watcher auto-reloads plugin on save without manual reinstall — completed 01-P1
- [ ] **FOUND-03**: Dashboard opens via ribbon icon and command palette entry
- [ ] **FOUND-04**: Multi-page navigation (tab bar or sidebar) switches between dashboard pages without full re-render
- [x] **FOUND-05**: Plugin is installable from GitHub repo root (main.js + manifest.json present at root on every release) — completed 01-P1

### Home Page

- [ ] **HOME-01**: Home page renders as the default landing tab when dashboard opens
- [ ] **HOME-02**: Home page displays a configurable set of status tiles (initially hardcoded, data from vault notes or flat files)
- [ ] **HOME-03**: Home page includes at least one Claude skill trigger button that executes `claude -p <skill>` via child_process

### Social Stats

- [ ] **SOCIAL-01**: Social stats page displays LinkedIn metrics read from a designated data file (Obsidian note or JSON flat file)
- [ ] **SOCIAL-02**: Social stats page displays X (Twitter) metrics read from a designated data file
- [ ] **SOCIAL-03**: Data file paths are configurable in plugin settings (not hardcoded)
- [ ] **SOCIAL-04**: Page shows "no data" state gracefully when data files are missing or empty

### Skill Triggers

- [ ] **SKILL-01**: Generic button component executes a configurable `claude -p <skill>` shell command
- [ ] **SKILL-02**: Shell command inputs are validated before execution to prevent command injection
- [ ] **SKILL-03**: Button shows visual loading state while command runs; shows success/error indicator on completion

### Security

- [ ] **SEC-01**: All HTML rendered inside Obsidian webview is sanitized (DOMPurify or equivalent) to prevent XSS
- [ ] **SEC-02**: No credentials, API keys, or secrets are stored in plugin source code or compiled output
- [ ] **SEC-03**: Shell command strings are constructed from an allowlist of approved skill names — no raw user input passed to shell

## v2 Requirements

### Newsletter Workflow Page

- **NEWS-01**: Newsletter workflow page with step-by-step buttons for Occam's Leader drafting pipeline
- **NEWS-02**: Inline preview of AI-generated markdown files within the dashboard pane
- **NEWS-03**: "Finalize" button produces a Substack-ready markdown file in the vault

### Social Data Pipeline

- **DATA-01**: Social stats page can pull data from an MCP connector (design TBD — connector options to be discussed)
- **DATA-02**: Configurable refresh interval for auto-updating stats display

### Output Display

- **OUT-01**: Skill trigger output panel shows stdout/stderr from executed skill inline
- **OUT-02**: Async status indicator (running / complete / error) persists across page navigation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Fetching social data directly from LinkedIn/X APIs | Platform rate limits, OAuth complexity, and auth key storage risk — separate data pipeline handles this |
| Mobile Obsidian support | Desktop-first for v1; Obsidian mobile has limited plugin API surface |
| Hosting or web server component | Local Obsidian plugin only |
| Replacing existing Claude skills/MCPs | UI layer only — underlying workflows are separate |
| Real-time collaborative features | Single-user personal dashboard |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete (01-P1) |
| FOUND-02 | Phase 1 | Complete (01-P1) |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Complete (01-P1) |
| HOME-01 | Phase 2 | Pending |
| HOME-02 | Phase 2 | Pending |
| HOME-03 | Phase 2 | Pending |
| SOCIAL-01 | Phase 2 | Pending |
| SOCIAL-02 | Phase 2 | Pending |
| SOCIAL-03 | Phase 2 | Pending |
| SOCIAL-04 | Phase 2 | Pending |
| SKILL-01 | Phase 2 | Pending |
| SKILL-02 | Phase 2 | Pending |
| SKILL-03 | Phase 2 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-04*
*Last updated: 2026-06-05 after 01-P1 completion*
