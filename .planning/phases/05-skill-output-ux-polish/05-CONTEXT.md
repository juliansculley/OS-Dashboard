# Phase 5: Skill Output + UX Polish - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 makes skill buttons fully functional with real input and output. It adds: (1) inline input capture for input-required skills (braindump, humanizer) via an expandable UI below each button, (2) output file linking so completed skills show a clickable vault link to their output note, and (3) async status persistence so a running skill's state survives page navigation via AppContext lift + a persistent status bar visible on all pages. Phase 5 also re-runs Phase 2 T4 to verify end-to-end skill execution with actual file output.

Requirements in scope: OUT-01, OUT-02 (v2), plus T4 re-verification gap from Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Skill Classification
- **D-01:** Skills split into two categories: **input-required** (braindump, humanizer) and **self-contained** (wiki-optimizer). Self-contained skills fire immediately on click as before.
- **D-02:** braindump input = raw text typed or pasted into a textarea. Output is written to a vault file automatically by the skill — dashboard does not display the content inline.
- **D-03:** humanizer input = a textarea OR a vault-relative file path (user chooses). The path field accepts vault-relative paths (resolved against vault root); the claude CLI reads the file itself. Dashboard does not load file content.

### Skill Input UX
- **D-04:** Input-required skills use an **expandable panel below the button**. Clicking the button toggles it open; clicking again collapses it (toggle pattern). Input is cleared on collapse. No modal.
- **D-05:** The expanded panel contains: a textarea for braindump; a textarea + optional path field for humanizer. A "Run" button inside the panel replaces the direct click trigger. The skill button label changes state to indicate "expanded" vs "idle."
- **D-06:** Input text (or path) is passed to `execFile` via the `input` option (stdin). The CLI command stays the same: `claude -p <skill>` — no new flags needed.

### Output Display (OUT-01)
- **D-07:** After a skill completes successfully, the inline panel shows a **clickable vault link** — the filename or path the skill printed to stdout. Clicking it opens the file in a new Obsidian tab using `app.workspace.openLinkText()`.
- **D-08:** The output file path is **parsed from stdout**. `execFile` callback signature changes from `(error) =>` to `(error, stdout) =>`. The skill is expected to print the output path as part of its stdout — format TBD by researcher (likely last line or a labeled line like `Output: path/to/file.md`).
- **D-09:** No inline markdown rendering inside the dashboard. All reading and editing happens in Obsidian's native note view. Dashboard only shows the link.

### Cross-Page State Persistence (OUT-02)
- **D-10:** Skill run state is **lifted to AppContext**. AppContext gains a skill-state map keyed by skill name: `{ [skillName]: SkillState }`. SkillButton reads its state from context instead of local `useState`.
- **D-11:** Two complementary persistence surfaces:
  1. The skill button on the Home page continues to show its live state (spinner while running, Done/link on completion).
  2. A **persistent status bar** sits between the sidebar navigation and the page content area — visible on every page. It only renders when at least one skill is running; zero height when idle (no layout shift on other pages).
- **D-12:** Status bar text format: `[SkillName] running...` or `[SkillName] — Done` with a link. Disappears after the idle auto-reset timer (matching the existing 3-second / 5-second pattern).

### Claude's Discretion
- Exact stdout format to parse for output file path — researcher should check how existing skills output their file location and recommend a parsing approach (regex, last-line assumption, or structured prefix).
- Status bar visual design (height, background, typography) — follow existing `--cos-*` token system; keep it slim and non-intrusive.
- Whether the humanizer "path" field and textarea are mutually exclusive (filling one clears the other) or whether path takes precedence when both are filled.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 Locked Decisions (inherit all)
- `.planning/phases/02-dashboard-features/02-CONTEXT.md` — All Phase 2 decisions including D-01 (allowlist hardcoded in source), D-03 (fire-and-forget baseline this phase replaces), D-04 (skills below tiles on Home page)

### Source Files (current implementation to extend)
- `src/components/ui/SkillButton.tsx` — Core file to modify: 4-state machine, `execFile` call, allowlist guard. D-06 and D-08 both touch this file.
- `src/components/ui/SkillsSection.tsx` — Renders the three skill buttons; may need to accommodate expanded input panels
- `src/components/pages/HomePage.tsx` — Page layout; status bar lives above this in the App shell
- `src/components/App.tsx` — App router; status bar component inserts here (between Sidebar and page content)
- `src/context/AppContext.tsx` — Gains skill-state map for D-10
- `src/types.ts` — Gains new types: extended `SkillState` with output link, `SkillRunState` map type

### Requirements
- `.planning/REQUIREMENTS.md` — OUT-01, OUT-02 acceptance language
- `.planning/ROADMAP.md` §Phase 5 — Phase goal and open to-dos (skill input modal, T4 re-run)
- `.planning/phases/02-dashboard-features/02-UAT.md` — T4 gap and re-run criteria (Gaps section)

### Phase 1 Patterns (inherit)
- `.planning/phases/01-foundation/01-CONTEXT.md` — React + TypeScript patterns, CSS token system, sanitizeHTMLToDom

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SkillButton.tsx` — state machine and `execFile` wiring already in place; D-06 and D-08 extend it rather than replace it
- `AppContext.tsx` — already provides `app` and `plugin` to all components; extending it with skill state (D-10) follows the established pattern
- `StatusTile.tsx` — read-only tile with no-data state; the status bar visual pattern can follow this component's structure (conditional render, CSS token vars)
- `app.workspace.openLinkText()` — Obsidian API already available via `useAppContext().app`

### Established Patterns
- **Toggle expand/collapse**: no existing toggle component — new pattern, but consistent with Obsidian's own collapsible sections
- **AppContext shape**: currently `{ app: App, plugin: ClaudeOSDashboard }` — extending with `skillStates` map is additive, no breaking changes
- **execFile with stdin**: `execFile(cmd, args, { input: string }, callback)` — the `input` option is standard Node.js `child_process`; SEC-03 safety (allowlist guard) is preserved

### Integration Points
- Status bar inserts into `App.tsx` between `<Sidebar />` and the page content `<div>` — needs to read `skillStates` from AppContext
- `SkillButton` state machine moves from local `useState` to context reads/writes — `handleClick` sets context state; component reads from context for rendering
- Output link display needs `app.workspace.openLinkText(path, '')` — second arg is source path (empty string is fine for vault-relative)

</code_context>

<specifics>
## Specific Ideas

- **Vault link click behavior**: Use `app.workspace.openLinkText(outputPath, '')` — opens the note in a new Obsidian tab. The `outputPath` comes from stdout parsing. If the path is vault-relative, this resolves automatically; if it's absolute, Obsidian resolves against vault root.
- **humanizer dual input**: textarea and path field in the expanded panel. User fills one; if path field is filled, that takes precedence (passes path as stdin context); if only textarea is filled, that text is piped. Researcher should recommend the exact stdin format for each case.
- **Status bar zero-height when idle**: Use CSS `display: none` or `height: 0; overflow: hidden` when no skills are running — no permanent layout reservation.

</specifics>

<deferred>
## Deferred Ideas

- **File picker with vault autocomplete** — surfaced during discussion of humanizer input. A richer picker that autocompletes from vault file names would reduce typing errors, but adds significant complexity. Defer to a future polish phase.
- **Markdown rendering inside the dashboard** — rather than linking out, rendering skill output inline as formatted markdown. Deferred: relying on Obsidian's native note view is simpler and better quality.

</deferred>

---

*Phase: 5-Skill Output + UX Polish*
*Context gathered: 2026-06-06*
