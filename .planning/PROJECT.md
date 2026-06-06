# ClaudeOS Dashboard

## What This Is

An Obsidian community plugin that provides a multi-page visual dashboard for the ClaudeOS personal agent system and second brain. It is purely a display and interaction layer — it renders data written by external sources (MCPs, notes, flat files) and provides buttons to trigger Claude Code CLI skills without leaving Obsidian. The plugin lives on GitHub and is installed directly through Obsidian's community plugins system.

## Core Value

A single, distraction-free control panel inside Obsidian that shows system status and surfaces AI skill triggers — no context-switching to terminals or separate apps.

## Requirements

### Validated in Phase 1

- [x] Plugin installs from GitHub via Obsidian community plugin protocol (manifest.json + main.js at repo root) — FOUND-05
- [x] Hot-reload development environment for plugin iteration without manual reinstall — FOUND-02
- [x] Multi-page navigation (sidebar or tab bar) within a single Obsidian pane — FOUND-04
- [x] Proper HTML sanitization via sanitizeHTMLToDom + renderSafeHTML (no innerHTML assignments) — SEC-01
- [x] No credentials or secrets in source code; gitleaks pre-commit hook enforced — SEC-02

### Active

- [ ] Plugin installs from GitHub via Obsidian community plugin protocol (manifest.json + main.js at repo root)
- [ ] Multi-page navigation (sidebar or tab bar) within a single Obsidian pane
- [ ] Home page showing system status / key metrics
- [ ] Social stats page displaying pre-fetched LinkedIn and X data (data source TBD — read from flat files or Obsidian notes written externally)
- [ ] Buttons that execute `claude` CLI skill commands via Obsidian Shell Commands plugin (headless mode)
- [ ] Newsletter workflow page: buttons to advance the Occam's Leader drafting pipeline, render generated markdown files for review, produce a Substack-ready markdown file
- [ ] Hot-reload development environment for plugin iteration without manual reinstall
- [ ] Proper input sanitization and shell-injection prevention on all CLI command buttons

### Out of Scope

- Fetching social media data directly from platforms — display only; data pipeline is separate
- Hosting or running a web server; this is a local Obsidian plugin
- Replacing the underlying Claude skills/workflows/MCPs — this is the UI layer only
- Mobile Obsidian support in v1

## Context

- **Ecosystem**: Obsidian plugin system (community plugins, manifest.json, main.js, styles.css). Plugin is TypeScript compiled to JS.
- **Existing plugins already installed**: CustomJS, Dataview, Terminal, Shell Commands — these can be leveraged but the dashboard plugin must not depend on them.
- **Skill trigger mechanism**: Obsidian Shell Commands plugin (or Node.js `child_process` from within the plugin) calls `claude -p <skill>` CLI; the claude process runs headless in the background.
- **Data pipeline**: Social stats and other live data are written to flat files or Obsidian notes by separate MCP processes or automations. The dashboard reads and renders those files.
- **Newsletter workflow**: AI skills already exist that generate ideas, drafts, and edits for Occam's Leader Substack. The dashboard page provides a cleaner step-by-step interface to these skills and previews their output.
- **GitHub hosting**: For community plugin installation, the compiled `main.js`, `manifest.json`, and optionally `styles.css` must be at the repo root. Source TypeScript lives in `src/`.

## Constraints

- **Tech Stack**: TypeScript + Obsidian Plugin API (standard community plugin pattern)
- **Distribution**: GitHub repo root must have `main.js` and `manifest.json` at every release
- **Security**: No credentials or API keys in source; sanitize all HTML rendered in Obsidian webview to prevent XSS; validate shell command inputs before execution to prevent injection
- **Dependencies**: Minimize external npm dependencies to reduce bundle size and attack surface

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build as Obsidian plugin (not standalone web app) | Stays inside user's existing workflow, vault-local data access, no extra app to manage | Validated Phase 1 |
| Skill triggers via `claude` CLI (not direct API calls) | Reuses existing Claude Code skill ecosystem; no API key management in plugin | — Pending Phase 2 |
| Social data display-only in v1 | Data pipeline design needs separate discussion on connectors/MCPs — don't block UI work | — Pending Phase 3 |
| Newsletter page deferred to Phase 4+ | Core plugin must work before adding complex workflow pages | — Pending Phase 4 |
| Hot-reload dev environment | Eliminates manual reinstall friction during iteration | Validated Phase 1 |
| No third-party font CDN imports | Outbound network calls on startup unacceptable for a personal plugin; system font fallback is sufficient | Decided Phase 1 |
| React mounted via `this.contentEl` in ItemView | `containerEl.children[1]` is undocumented and fragile; `contentEl` is the stable Obsidian API | Validated Phase 1 |
| Windows junction instead of symlink for vault plugin dir | Developer Mode not required for junctions; transparent to Obsidian's plugin loader | Decided Phase 1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-04 after initialization*
