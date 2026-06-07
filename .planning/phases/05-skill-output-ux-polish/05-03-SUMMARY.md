---
phase: 05-skill-output-ux-polish
plan: "03"
subsystem: skill-execution-ui
tags: [skill-button, input-panel, spawn, execFile, output-link, context-state, sec-03]
requirements: [OUT-01, OUT-02]

dependency_graph:
  requires: [05-01-output-line-contracts, 05-02-skill-state-persistence]
  provides:
    - SkillInputPanel component (braindump + humanizer expandable panel)
    - spawn+stdin execution path for input-required skills
    - parseOutputPath + T-05-07 traversal guard
    - Output link (claudeos-output-link) that opens vault note in new tab
    - SkillButton fully wired to AppContext (no local run-state useState)
    - SEC-03 guard order preserved through spawn refactor
  affects:
    - src/components/ui/SkillButton.tsx (primary refactor target)
    - src/components/ui/SkillInputPanel.tsx (new)
    - src/components/ui/SkillsSection.tsx (align-items: flex-start comment)
    - styles.css (input-panel, output-link, run-btn, expanded-button CSS)

tech_stack:
  added: []
  patterns:
    - "spawn + stdin.write/end for async input-required skill execution (D-06 critical correction)"
    - "execFile (error, stdout) for self-contained skill with stdout capture (D-08)"
    - "parseOutputPath module-scope regex /^Output:\s+(.+)$/m"
    - "T-05-07 traversal guard: reject paths containing '..' segments"
    - "key={expanded?'open':'closed'} reset pattern for panel state clearing on collapse"
    - "SEC-03 two-guard order: status check then allowlist then spawn/execFile"

key_files:
  created:
    - src/components/ui/SkillInputPanel.tsx
  modified:
    - src/components/ui/SkillButton.tsx
    - src/components/ui/SkillsSection.tsx
    - styles.css
    - main.js

decisions:
  - "match[1] undefined guard: TypeScript strict mode requires explicit undefined check on regex match groups; used pattern: if (!match || match[1] === undefined) return null — not optional chaining to stay explicit about the two-condition null path (deviation Rule 1 auto-fix)"
  - "applyTraversalGuard as separate module-scope function: keeps parseOutputPath single-responsibility; traversal rejection is applied at call sites (both spawn and execFile close handlers) before storing path in context"
  - "expanded is local useState; skill run status lives in AppContext — per UI-SPEC State Machine extension section"
  - "handleRun and handleClickSelfContained are separate functions (not unified): routing clarity; only handleRun needs stdin path, only handleClickSelfContained uses execFile"

metrics:
  duration: "~20 minutes"
  completed: "2026-06-07"
  tasks_completed: 2
  tasks_pending: 1
  files_modified: 4
  files_created: 1

checkpoint_status: APPROVED
post_checkpoint_fixes:
  - "fix(infra): correct backslash escaping in deploy-plugin.mjs — commit a28920d"
  - "fix(05-03): windowsHide:true added to spawn and execFile to suppress visible Windows console — commit af0b264"
---

# Phase 5 Plan 03: SkillButton Refactor + Input Panel Summary

**One-liner:** Refactored SkillButton with spawn+stdin execution, expandable SkillInputPanel for braindump/humanizer, parseOutputPath traversal-guarded vault link, and full AppContext state migration — human checkpoint approved; windowsHide and deploy-script fixes applied post-checkpoint.

## Status: COMPLETE

Tasks 1 and 2 are committed. Task 3 (human-verify) checkpoint was approved. Two post-checkpoint fixes were applied: windowsHide:true for Windows console suppression and deploy-plugin.mjs backslash correction.

## What Was Built

### Task 1: SkillInputPanel + SkillsSection layout + CSS (commit 08a5fcc)

Created `src/components/ui/SkillInputPanel.tsx`:
- Prop interface: `{ skill: 'braindump' | 'humanizer'; isExpanded: boolean; onRun: (input: string) => void }`
- braindump: single labeled textarea (label: `Input`, placeholder: `Paste or type your braindump here...`)
- humanizer: labeled textarea (`Text`) + labeled path input (`Or vault path`, placeholder: `e.g. braindumps/note.md (takes precedence)`)
- `buildInput()`: returns `File: <path>` when humanizer path field is non-empty (D-03 precedence); otherwise returns textarea text
- `isEmpty` guard disables Run button when all relevant fields are blank
- Panel visibility toggled via `claudeos-input-panel` vs `claudeos-input-panel--hidden` (display:none)

Updated `src/components/ui/SkillsSection.tsx`:
- Added comment explaining panel-below-button layout (SkillButton encapsulates its own panel)
- No structural change needed; CSS change on `.claudeos-skills-row` handles flex-start alignment

Added to `styles.css`:
- `.claudeos-skills-row` gains `align-items: flex-start` (panels don't stretch sibling buttons)
- `.claudeos-input-panel`: surface bg, border, border-radius, padding, flex column, gap
- `.claudeos-input-panel--hidden`: display:none
- `.claudeos-input-panel__label`: 12px/600/uppercase/letter-spacing 0.06em/cos-muted (mirrors .claudeos-tile__label)
- `.claudeos-input-panel__textarea`: full-width, 80px min-height, resize:vertical, 14px/400
- `.claudeos-input-panel__path`: same as textarea but height:36px (single line)
- `.claudeos-run-btn`: accent fill, #fff text, 14px/600, +hover, :disabled opacity:0.5
- `.claudeos-output-link`: flex row, gap xs, margin-top sm
- `.claudeos-output-link__text`: 14px/600/accent/cursor:pointer + :hover underline
- `.claudeos-skill-btn--expanded`: surface-2 bg, cos-text, cos-border (Cancel visual)

### Task 2: SkillButton refactor (commit dd0bcd6)

Refactored `src/components/ui/SkillButton.tsx`:

**Imports:**
- Added `spawn` alongside `execFile` from `child_process`
- Added `useAppContext` from `../../context/AppContext`
- Added `SkillInputPanel` from `./SkillInputPanel`
- Removed local `type SkillState` (now `SkillRunStatus` in types.ts per 05-02)
- Removed `const [state, setState] = useState<SkillState>('idle')`

**State:**
- Reads `{ app, skillStates, setSkillState }` from `useAppContext()`
- `skillState = skillStates[skill] ?? { status: 'idle', outputPath: null }`
- `const [expanded, setExpanded] = useState(false)` — ONLY local state (panel toggle)

**Module-scope utilities:**
- `parseOutputPath(stdout)` — matches `/^Output:\s+(.+)$/m`; explicit `match[1] === undefined` guard
- `applyTraversalGuard(raw)` — splits on `[/\\]`, returns null if any segment is `..` (T-05-07)

**handleRun (input-required skills):**
- Guard 1: `if (skillState.status !== 'idle') return` — non-idle no-op
- Guard 2: `if (!ALLOWED_SKILLS.includes(skill)) return` — SEC-03 allowlist
- Then: `setSkillState(skill, {status:'loading',...})`, `setExpanded(false)`
- Then: `spawn('claude', ['-p', skill])` with closure-scoped `let stdout = ''` and `let stderr = ''`
- `child.stdout.on('data', ...)` accumulates; `child.on('close', ...)` parses+guards path, calls setSkillState
- `child.stdin.write(input, 'utf8')` + `child.stdin.end()` — input via stdin only, never in args (T-05-09)

**handleClickSelfContained (wiki-optimizer):**
- Same guard order (status then ALLOWED_SKILLS then execFile)
- `execFile('claude', ['-p', skill], (error, stdout) => ...)` — upgraded callback captures stdout (D-08)
- Parses+guards output path on success; setSkillState throughout

**Routing:**
- `skill === 'wiki-optimizer'` → `handleClickSelfContained()` directly (no panel)
- braindump/humanizer → `setExpanded(prev => !prev)` when idle

**Rendering:**
- Button label: `Cancel` when expanded+idle for input-required; else `label` prop
- CSS class: `claudeos-skill-btn--expanded` when `idle && expanded` (overrides accent fill)
- Output link JSX: rendered when `status === 'success' && outputPath !== null`; `openLinkText(path, '', 'tab')`
- When success but no outputPath: shows `Done` only (graceful — Pitfall 6)
- `<SkillInputPanel>` rendered below button for input-required skills with `key={expanded ? 'open' : 'closed'}` reset

## Human Checkpoint Outcome (Task 3)

**Checkpoint status: APPROVED with notes**

| Test | Description | Result |
|------|-------------|--------|
| 1 | Expand toggle (braindump/humanizer panel open/close, Cancel clears) | PASSED |
| 2 | Run + output link (braindump execute, spinner, Done, output link) | PARTIAL — ran ~2 min then failed; state machine handled correctly (showed Failed, auto-reset); terminal flash fixed by post-checkpoint windowsHide:true fix; execution failure deferred to 05-04 T4 |
| 3 | Humanizer path precedence | DEFERRED — no test files available |
| 4 | Self-contained wiki-optimizer | DEFERRED — no test files available |
| 5 | Cross-page persistence (status bar visible on Social tab during run) | PASSED |
| 6 | Idle layout (zero-height status bar, no gap) | PASSED |
| 7 | Error state (Failed shown, auto-reset) | PASSED |

Tests 3 and 4 deferred due to missing test fixtures, not missing code. Checkpoint approved on the mechanics verified. Braindump execution failure (test 2 partial result) deferred to 05-04 T4 investigation.

## Post-Checkpoint Fixes

**1. [Rule 1 - Bug] windowsHide:true added to spawn and execFile — commit af0b264**
- **Found during:** Human checkpoint (test 2 — terminal flash observed on Windows)
- **Issue:** On Windows, spawning child processes without `windowsHide:true` causes a visible console window to flash open for every skill execution
- **Fix:** Added `{ windowsHide: true }` to options for both `spawn` and `execFile` calls in SkillButton.tsx
- **Files modified:** `src/components/ui/SkillButton.tsx`

**2. [Rule 1 - Bug] Backslash escaping corrected in deploy-plugin.mjs — commit a28920d**
- **Found during:** Post-checkpoint deploy run
- **Issue:** PLUGIN_DIR path had incorrect backslash escaping, causing deploy failure on Windows
- **Fix:** Corrected escaping in `deploy-plugin.mjs`
- **Files modified:** `deploy-plugin.mjs`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict undefined check on regex match group**
- **Found during:** Task 2 TypeScript check (tsc --noEmit exit code 2)
- **Issue:** TypeScript TS2532 "Object is possibly 'undefined'" on `match[1]` in `parseOutputPath`. The optional chaining `match?.[1]` in the plan pattern would have silently returned `undefined` instead of `null`.
- **Fix:** Explicit two-condition guard: `if (!match || match[1] === undefined) return null;` — makes the null path explicit and satisfies TypeScript strict mode.
- **Files modified:** `src/components/ui/SkillButton.tsx`
- **Commit:** dd0bcd6

## Verification

**Task 1:**
- `npx tsc --noEmit` exits 0 (verified after Task 1 changes)

**Task 2:**
- `npx tsc --noEmit` exits 0
- `esbuild production` exits 0 (main.js updated)
- `deploy-plugin.mjs` has pre-existing path escaping bug in worktree context (noted in 05-02-SUMMARY.md); build is green; deploy from main checkout after merge
- Grep assertions verified:
  - `spawn('claude'` present at line 74
  - `child.stdin.end(` present at line 96
  - `openLinkText(` present at line 172
  - No `useState<SkillState>` remains
  - No `setState(` for run state remains
  - SEC-03 guard order: status check (line 67) → ALLOWED_SKILLS.includes (line 69) → spawn (line 74)

## Task 3: Checkpoint APPROVED

Human-verify checkpoint approved. See "Human Checkpoint Outcome" section above for per-test results.

## Known Stubs

None. SkillInputPanel is fully wired with real field state and `onRun` callback. SkillButton reads from AppContext (not stubs). Output link is conditional on a parsed non-null `outputPath` — graceful no-link when null (expected for skills that haven't been through 05-01 yet).

## Threat Flags

All three new HIGH-surface items addressed per plan threat model:

| Flag | File | Description |
|------|------|-------------|
| T-05-07 mitigated | SkillButton.tsx `applyTraversalGuard` | `..` traversal guard applied to all parsed outputPath values before context storage |
| T-05-08 mitigated | SkillButton.tsx guard order | SEC-03: ALLOWED_SKILLS.includes guard is second statement of handleRun/handleClickSelfContained, before any spawn/execFile call |
| T-05-09 mitigated | SkillButton.tsx stdin | Input flows via `child.stdin.write` only; spawn args array contains only `['-p', skill]` with validated AllowedSkill |

## Self-Check: PASSED

- [x] `src/components/ui/SkillInputPanel.tsx` created and exports `SkillInputPanel`
- [x] `src/components/ui/SkillButton.tsx` contains `spawn('claude'`, `child.stdin.end(`, `openLinkText(`
- [x] `src/components/ui/SkillButton.tsx` contains NO `useState<SkillState>` and NO `setState(`
- [x] SEC-03 guard order verified by line numbers: 67 < 69 < 74
- [x] `styles.css` contains `claudeos-input-panel`, `claudeos-input-panel--hidden`, `claudeos-run-btn`, `claudeos-output-link`, `claudeos-skill-btn--expanded`
- [x] `styles.css .claudeos-skills-row` has `align-items: flex-start`
- [x] Commits 08a5fcc and dd0bcd6 present in git log
- [x] `tsc --noEmit` exits 0 (both tasks)
- [x] `esbuild production` exits 0 (Task 2)
- [x] Task 3 human-verify: APPROVED (tests 1/5/6/7 passed; test 2 partial/deferred; tests 3/4 deferred)
- [x] Post-checkpoint fixes: af0b264 (windowsHide:true), a28920d (deploy-plugin backslash)
