# Phase 1: Foundation - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers a working Obsidian plugin scaffold: TypeScript compiles, hot-reload dev loop runs, sidebar navigation shell loads with placeholder pages, XSS sanitization layer is in place, and main.js + manifest.json are publishable at the GitHub repo root. No real page data, no skill triggers, no live content — just the foundation every subsequent phase builds on.

Requirements in scope: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, SEC-01, SEC-02

</domain>

<decisions>
## Implementation Decisions

### Navigation
- **D-01:** Left sidebar navigation is the chosen UX pattern (not a horizontal tab bar). Sidebar with icon + label nav items per the spec's `Sidebar.tsx` skeleton.

### XSS Sanitization
- **D-02:** Use Obsidian's built-in `sanitizeHTMLToDom()` API — not DOMPurify. Zero bundle size impact, maintained by the Obsidian team, idiomatic for the platform.

### Framework & Toolchain
- **D-03:** React + TypeScript inside an Obsidian `ItemView`. Not vanilla TS, not Next.js.
- **D-04:** esbuild as bundler (not webpack, not Vite). `jsx: "automatic"` in both tsconfig and esbuild config for React 18 JSX transform. `outfile: "main.js"` at repo root.
- **D-05:** File structure follows the spec exactly: `main.ts` at root, `src/views/DashboardView.tsx`, `src/components/App.tsx`, `src/components/pages/`, `src/components/ui/`, `src/context/AppContext.tsx`, `src/types.ts`.

### Dev Environment
- **D-06:** Vault location: `C:\Users\scull\OneDrive\ClaudeOS`
- **D-07:** Dev linking: symlink the repo folder into `C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard\` (not copy, not building directly into vault).
- **D-08:** Hot-reload approach: `npm run dev` (esbuild file watcher) + Obsidian's built-in "Reload app without saving" command. Do NOT depend on pjeby/hot-reload plugin — not installing it.

### Secret Scanning
- **D-09:** Pre-commit Git hook using **gitleaks** via **husky**. High security preference. Gitleaks is a single binary, no additional runtime dependencies, works well on Windows.

### Styling
- **D-10:** All styles scoped under `.claudeos-dashboard {}` to prevent Obsidian global style pollution. Use `--cos-*` CSS custom properties as defined in the spec. Inherit Obsidian theme variables (`--background-primary`, `--text-normal`, etc.) as defaults.

### GitHub Publishing
- **D-11:** esbuild `outfile: "main.js"` builds directly to repo root alongside `manifest.json`. This is the standard Obsidian community plugin pattern. Both files are committed to the repo root and are available for direct install or BRAT.

### Claude's Discretion
- manifest.json `minAppVersion` value (spec shows `1.4.0` — researcher should validate against current Obsidian release)
- Exact TypeScript strictness settings beyond `strictNullChecks`
- Whether to include `styles.css` in Phase 1 build or defer to Phase 2

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Code Patterns
- `archive/claudeos-obsidian-plugin-spec.md` — Full coding agent handoff spec. Contains all architectural decisions, code skeletons (main.ts, DashboardView.tsx, App.tsx, Sidebar.tsx, AppContext.tsx, esbuild.config.mjs, tsconfig.json, package.json, styles.css), API patterns, gotchas list, and build order. PRIMARY REFERENCE — read before planning.

### Requirements & Success Criteria
- `.planning/REQUIREMENTS.md` — Phase 1 requirements (FOUND-01 through FOUND-05, SEC-01, SEC-02) with acceptance language
- `.planning/ROADMAP.md` §Phase 1 — Success criteria (4 numbered criteria) that define done for this phase
- `.planning/PROJECT.md` — Project constraints, tech stack decisions, out-of-scope definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing source code — greenfield build. The archive spec provides the complete starting skeleton.

### Established Patterns
- The archive spec (`archive/claudeos-obsidian-plugin-spec.md`) establishes all patterns for this project: React + Obsidian ItemView bridge, AppContext for dependency injection, state-based router (no URL routing), `--cos-*` CSS variable system, `plugin.loadData()` / `plugin.saveData()` for settings persistence.

### Integration Points
- Plugin lives at `C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard\` (symlinked from repo)
- Shell Commands plugin is already installed in the vault — skill trigger integration in Phase 2 will use it
- Dataview plugin is already installed — available for vault data queries in future phases

</code_context>

<specifics>
## Specific Ideas

- User prefers a quick dev loop: esbuild watch + one-keystroke Obsidian reload. No complex hot-reload infrastructure.
- The `archive/claudeos-obsidian-plugin-spec.md` represents prior research the user has already done. Downstream agents should treat it as authoritative on API patterns and gotchas — do not repeat that research from scratch.
- gitleaks must work on Windows (PowerShell environment). Husky pre-commit hook should use a cross-platform script or PowerShell.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-06-04*
