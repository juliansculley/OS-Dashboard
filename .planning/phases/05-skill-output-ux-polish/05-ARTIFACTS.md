# Phase 5 — Artifacts This Phase Produces

Every new symbol, file, type, context member, CSS class, and external contract created in Phase 5. Downstream agents and gap-closure planners use this as the authoritative inventory.

---

## New React Components

| Symbol | File | Plan | Responsibility |
|--------|------|------|----------------|
| `SkillStatusBar` | `src/components/ui/SkillStatusBar.tsx` | 05-02 | Persistent, always-mounted status bar in the App shell; reads `skillStates` from context; zero-height when idle; shows `[Skill] running...` / `[Skill] — Done [Open output]` / `[Skill] — Failed` (D-11, D-12) |
| `SkillInputPanel` | `src/components/ui/SkillInputPanel.tsx` | 05-03 | Expandable textarea/path input panel for braindump (textarea) and humanizer (textarea + vault-path field with precedence); `Run` button; props `{ skill, isExpanded, onRun }` (D-04, D-05) |

## Modified React Components

| Symbol | File | Plan | Change |
|--------|------|------|--------|
| `SkillButton` | `src/components/ui/SkillButton.tsx` | 05-03 | spawn+stdin for input-required skills, stdout-capturing execFile for wiki-optimizer, `parseOutputPath` + `..` traversal guard, Open output link, context-backed run state (no local run-state useState), expand toggle (local `expanded` state), SEC-03 guard order preserved (D-05, D-06, D-07, D-08, D-10) |
| `App` | `src/components/App.tsx` | 05-02 | Owns `skillStates` map via `useState`, defines `setSkillState` (useCallback), renders a NESTED `AppContext.Provider` merging outer `app`/`plugin` with `skillStates`/`setSkillState`, adds `.claudeos-content-wrapper`, mounts `<SkillStatusBar/>` above `<main>` (D-11) |
| `SkillsSection` | `src/components/ui/SkillsSection.tsx` | 05-03 | Row layout set to `align-items: flex-start` so expanded panels stack below buttons without stretching siblings |
| `AppContext` (`AppContextType`) | `src/context/AppContext.tsx` | 05-02 | Interface extended additively with `skillStates: SkillStateMap` and `setSkillState: (skillName, state) => void`; `createContext` call and `useAppContext` hook body unchanged |

## New Types (`src/types.ts`, plan 05-02)

| Symbol | Definition |
|--------|------------|
| `SkillRunStatus` | `'idle' \| 'loading' \| 'success' \| 'error'` |
| `SkillRunState` | `{ status: SkillRunStatus; outputPath: string \| null }` |
| `SkillStateMap` | `Record<string, SkillRunState>` |

Note: this replaces the Phase 2 local `type SkillState` that lived inside `SkillButton.tsx` (removed in 05-03).

## AppContext Additions (consumed by SkillButton + SkillStatusBar)

| Member | Type | Written by | Read by |
|--------|------|-----------|---------|
| `skillStates` | `SkillStateMap` | App.tsx (`useState`) via `setSkillState` | SkillButton, SkillStatusBar |
| `setSkillState` | `(skillName: string, state: SkillRunState) => void` | App.tsx (`useCallback`) | SkillButton (loading/success/error/idle transitions + 3s/5s timers) |

## Module-Scope Utilities (in `SkillButton.tsx`, plan 05-03)

| Symbol | Purpose |
|--------|---------|
| `parseOutputPath(stdout): string \| null` | Extracts the output file path via `/^Output:\s+(.+)$/m` |
| traversal guard (inline) | Rejects parsed paths whose `\`/`/`-split segments include `..` before the path enters context / openLinkText |

## New CSS Classes (`styles.css`)

| Selector | Plan | Purpose |
|----------|------|---------|
| `.claudeos-content-wrapper` | 05-02 | Flex column wrapper (sidebar sibling) stacking status bar above main; `min-height: 0` so main scrolls |
| `.claudeos-status-bar` | 05-02 | Hidden by default (`display: none`) — zero height when idle |
| `.claudeos-status-bar--active` | 05-02 | Visible bar: surface bg, border-bottom, 14px |
| `.claudeos-status-bar__text` | 05-02 | Status copy (muted/success/error) |
| `.claudeos-status-bar__link` | 05-02 | Accent Open output link in the bar |
| `.claudeos-input-panel` | 05-03 | Expandable panel wrapper |
| `.claudeos-input-panel--hidden` | 05-03 | `display: none` panel toggle |
| `.claudeos-input-panel__label` | 05-03 | 12px/600 uppercase label (mirrors `.claudeos-tile__label`) |
| `.claudeos-input-panel__textarea` | 05-03 | Full-width textarea, 14px/400 |
| `.claudeos-input-panel__path` | 05-03 | Single-line vault-path input |
| `.claudeos-run-btn` (+ `:disabled`) | 05-03 | Run CTA (accent fill; muted when empty) |
| `.claudeos-output-link` | 05-03 | Flex row: icon + link text |
| `.claudeos-output-link__text` | 05-03 | 14px/600 accent, underline on hover |
| `.claudeos-skill-btn--expanded` | 05-03 | Cancel visual (surface-2 bg, text color, border) overriding accent idle fill |

CSS convention: new selectors follow `.claudeos-dashboard .claudeos-*` nesting and use inline `var(--cos-space-*, <px>)` fallbacks (the `--cos-space-*` tokens are NOT defined in `:root`).

## External Contract: `Output:` stdout line (SKILL.md files, plan 05-01)

These three files live OUTSIDE this git repo at `C:/Users/scull/OneDrive/ClaudeOS/Skills-dev/` and are edited in place (not committed here).

| Skill file | Contract added |
|------------|----------------|
| `Skills-dev/braindump/SKILL.md` | Final stdout line `Output: braindumps/YYYY-MM-DD_braindump.md` (vault-relative) |
| `Skills-dev/humanizer/SKILL.md` | NEW Cowork-mode file write to `braindumps/humanized-YYYY-MM-DD-HHmmss.md` + final line `Output: braindumps/humanized-...md` (skill previously wrote no file) |
| `Skills-dev/wiki-optimizer/SKILL.md` | Final stdout line `Output: wiki/optimizer-reports/OPTIMIZER-YYYY-MM-DD.md` |

Parsed by the dashboard regex `/^Output:\s+(.+)$/m`.

## Documentation Changes

| File | Plan | Change |
|------|------|--------|
| `.planning/phases/02-dashboard-features/02-UAT.md` | 05-04 | T4 `partial` -> `pass`; summary counts corrected; T4 gap annotated RESOLVED with verified output path |

---

## Requirement Coverage Map

| Requirement | Covered by | Evidence |
|-------------|-----------|----------|
| OUT-01 (inline output panel shows skill output) | 05-01, 05-03, 05-04 | `Output:` line contract (05-01); parse + Open output link in panel and SkillButton (05-03); T4 file-output verification (05-04) |
| OUT-02 (async status persists across navigation) | 05-02, 05-03 | AppContext skill-state lift + persistent SkillStatusBar (05-02); SkillButton reads/writes context, status survives Home<->Social nav (05-03) |
| T4-rerun (Phase 2 gap) | 05-01, 05-03, 05-04 | Skill file output (05-01) + input via panel/stdin (05-03) + end-to-end re-run with file assertion (05-04) |
