# Phase 5: Skill Output + UX Polish - Research

**Researched:** 2026-06-06
**Domain:** React/TypeScript Obsidian plugin — child_process stdin/stdout, React context lift, expandable UI panels
**Confidence:** HIGH (all key findings verified against Node.js official docs and live source code inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Skill Classification
- **D-01:** Skills split into two categories: **input-required** (braindump, humanizer) and **self-contained** (wiki-optimizer). Self-contained skills fire immediately on click as before.
- **D-02:** braindump input = raw text typed or pasted into a textarea. Output is written to a vault file automatically by the skill — dashboard does not display the content inline.
- **D-03:** humanizer input = a textarea OR a vault-relative file path (user chooses). The path field accepts vault-relative paths (resolved against vault root); the claude CLI reads the file itself. Dashboard does not load file content.

#### Skill Input UX
- **D-04:** Input-required skills use an **expandable panel below the button**. Clicking the button toggles it open; clicking again collapses it (toggle pattern). Input is cleared on collapse. No modal.
- **D-05:** The expanded panel contains: a textarea for braindump; a textarea + optional path field for humanizer. A "Run" button inside the panel replaces the direct click trigger. The skill button label changes state to indicate "expanded" vs "idle."
- **D-06:** Input text (or path) is passed to `execFile` via the `input` option (stdin). The CLI command stays the same: `claude -p <skill>` — no new flags needed.

#### Output Display (OUT-01)
- **D-07:** After a skill completes successfully, the inline panel shows a **clickable vault link** — the filename or path the skill printed to stdout. Clicking it opens the file in a new Obsidian tab using `app.workspace.openLinkText()`.
- **D-08:** The output file path is **parsed from stdout**. `execFile` callback signature changes from `(error) =>` to `(error, stdout) =>`. The skill is expected to print the output path as part of its stdout — format TBD by researcher.
- **D-09:** No inline markdown rendering inside the dashboard. All reading and editing happens in Obsidian's native note view. Dashboard only shows the link.

#### Cross-Page State Persistence (OUT-02)
- **D-10:** Skill run state is **lifted to AppContext**. AppContext gains a skill-state map keyed by skill name: `{ [skillName]: SkillState }`. SkillButton reads its state from context instead of local `useState`.
- **D-11:** Two complementary persistence surfaces:
  1. The skill button on the Home page continues to show its live state (spinner while running, Done/link on completion).
  2. A **persistent status bar** sits between the sidebar navigation and the page content area — visible on every page. It only renders when at least one skill is running; zero height when idle (no layout shift on other pages).
- **D-12:** Status bar text format: `[SkillName] running...` or `[SkillName] — Done` with a link. Disappears after the idle auto-reset timer (matching the existing 3-second / 5-second pattern).

### Claude's Discretion
- Exact stdout format to parse for output file path — researcher should check how existing skills output their file location and recommend a parsing approach (regex, last-line assumption, or structured prefix).
- Status bar visual design (height, background, typography) — follow existing `--cos-*` token system; keep it slim and non-intrusive.
- Whether the humanizer "path" field and textarea are mutually exclusive (filling one clears the other) or whether path takes precedence when both are filled.

### Deferred Ideas (OUT OF SCOPE)
- **File picker with vault autocomplete** — deferred to a future polish phase.
- **Markdown rendering inside the dashboard** — deferred; relying on Obsidian's native note view.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OUT-01 | Skill trigger output panel shows stdout/stderr from executed skill inline | D-07, D-08: output path parsed from stdout; clickable vault link displayed in expanded panel |
| OUT-02 | Async status indicator (running / complete / error) persists across page navigation | D-10, D-11, D-12: AppContext skill-state map + persistent status bar in App.tsx shell |
| T4-rerun | Re-run Phase 2 T4 test with actual file output verification | Skills now receive input via stdin; output path captured; test can assert file was written |
</phase_requirements>

---

## Summary

Phase 5 completes the skill execution loop: input in, output acknowledged. The work divides into three clean layers. First, `SkillButton.tsx` gains an expandable input panel (toggle pattern) and its `execFile` call is upgraded to capture stdout so the output file path can be parsed and displayed as a clickable vault link. Second, skill run state moves from component-local `useState` to a shared `AppContext` map, enabling a persistent status bar in `App.tsx` that survives page navigation. Third, the three existing skills (braindump, humanizer, wiki-optimizer) need a one-line stdout addition to print their output file paths in a parseable format.

The most important technical correction in this research concerns D-06. The CONTEXT.md decision states input text is passed to `execFile` via the `input` option. **This is incorrect: `execFile` (async) does not support an `input` option.** The `input` option exists only on synchronous variants (`execFileSync`, `spawnSync`). For async execution with stdin, the correct approach is `spawn()` with `child.stdin.write(text); child.stdin.end()`, manually buffering stdout via `data` events. Alternatively, `execFileSync` works but blocks the renderer thread and would freeze the Obsidian UI for the duration of the skill run. The correct fix is `spawn()` — it preserves async behavior, supports stdin, and captures stdout.

The second key finding: none of the three skill SKILL.md files currently print a machine-parseable output file path to stdout. Each skill has a defined output location in its SKILL.md, but the output path is embedded in human-readable chat text, not in a structured line. A minimal one-line addition to each skill is required before D-08 can work.

**Primary recommendation:** Use `spawn()` (not `execFile`) for the async stdin+stdout capture pattern. Add `Output: <path>` as the final stdout line in each skill. Lift state to AppContext via a `useReducer` dispatch pattern to keep re-renders minimal.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Input capture (textarea, path field) | Frontend (React component) | — | Pure UI state; no persistence needed |
| Skill execution with stdin | Frontend (SkillButton) via Node.js child_process | — | Obsidian Electron exposes Node.js built-ins directly |
| stdout parsing for output path | Frontend (SkillButton callback) | — | Simple string scan on callback return |
| Skill run state persistence | AppContext (React context) | — | Cross-component, cross-page React state; no server needed |
| Status bar display | Frontend (App.tsx shell) | AppContext | Reads context, renders only when active |
| Vault file open on click | Obsidian Workspace API | — | `app.workspace.openLinkText()` is the correct Obsidian abstraction |
| Security allowlist enforcement | SkillButton runtime guard | TypeScript type system | SEC-03 must be preserved in new execution path |

---

## Standard Stack

This phase adds no new npm packages. All capabilities are available through:
- Node.js `child_process` (`spawn`) — already in Obsidian's Electron environment
- Obsidian Workspace API (`openLinkText`) — already available via AppContext
- React (useState, useReducer, useContext) — already in project
- Existing CSS token system — no new tokens needed for status bar

### No Package Legitimacy Audit Required
Phase 5 installs zero new npm packages. All work is additive on existing dependencies.

---

## Critical Correction: D-06 stdin Approach

**Decision D-06 states:** "Input text (or path) is passed to `execFile` via the `input` option (stdin)."

**Verified finding:** `execFile` (async callback variant) does **not** support an `input` option. [VERIFIED: nodejs.org/api/child_process.html] The `input` option exists only on synchronous variants (`execFileSync`, `execSync`, `spawnSync`).

**Options:**

| Approach | stdin | async | stdout capture | UI freeze | Recommendation |
|----------|-------|-------|----------------|-----------|----------------|
| `execFile` (current) | No | Yes | callback(err, stdout) | No | Base — no stdin support |
| `execFileSync` + `input` | Yes | No (blocks) | return value | **Yes — freezes UI** | Rejected |
| `spawn` + `stdin.write` | Yes | Yes | manual buffer | No | **Recommended** |

**Recommended implementation using `spawn`:**

```typescript
// Source: nodejs.org/api/child_process.html
import { spawn } from 'child_process';

function runSkillWithInput(
  skill: AllowedSkill,
  input: string,
  onDone: (err: Error | null, stdout: string) => void
): void {
  const child = spawn('claude', ['-p', skill]);
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

  child.on('close', (code: number | null) => {
    if (code === 0) {
      onDone(null, stdout);
    } else {
      onDone(new Error(`Exit code ${code}: ${stderr}`), stdout);
    }
  });

  // Write input to stdin and close it
  if (input) {
    child.stdin.write(input, 'utf8');
  }
  child.stdin.end();
}
```

**For self-contained skills (wiki-optimizer) with no input**, `execFile` remains correct — no stdin needed, callback captures stdout cleanly.

---

## Skill Output Path Analysis (D-08)

### What the skills currently do

Inspected all three SKILL.md files directly (source of truth).

**braindump** (`Skills-dev/braindump/SKILL.md`):
- Output target: `C:\Users\scull\OneDrive\ClaudeOS\braindumps\YYYY-MM-DD_braindump.md`
- Stdout behavior: Ends with a human-readable chat line: `> File saved. [View braindump](computer://...) — Anything to add or correct?`
- Machine-parseable path in stdout: **No** — path is embedded in a markdown link inside prose. [VERIFIED: file inspection]

**humanizer** (`Skills-dev/humanizer/SKILL.md`):
- Output target: Not explicitly defined in SKILL.md — humanizer produces its output inline in chat, not written to a file by default.
- Machine-parseable path in stdout: **Not applicable** — humanizer outputs the rewritten text directly; it does not write a file.
- **Implication:** For D-07 (output link), humanizer's output cannot be a vault link unless the skill is modified to write output to a file and print the path.

**wiki-optimizer** (`Skills-dev/wiki-optimizer/SKILL.md`):
- Output target: `wiki/optimizer-reports/OPTIMIZER-YYYY-MM-DD.md` (written to disk explicitly)
- Stdout behavior: Writes the report file then presents a summary in chat. No structured `Output:` line.
- Machine-parseable path in stdout: **No** — report path is mentioned in prose, not as a labeled line. [VERIFIED: file inspection]

### Required skill-side changes

All three skills need a minimal addition to support D-08. The cleanest approach:

**Structured prefix format (recommended):** Each skill prints one line at the end of stdout:
```
Output: <vault-relative-or-absolute-path>
```

This format is:
- Easy to parse with a single regex: `/^Output:\s+(.+)$/m`
- Human-readable in chat mode (does not corrupt existing behavior)
- Trivially added to each SKILL.md without restructuring

**Parsing code (dashboard side):**
```typescript
function parseOutputPath(stdout: string): string | null {
  const match = stdout.match(/^Output:\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
```

**Per-skill additions needed:**

| Skill | Current behavior | Required addition |
|-------|-----------------|-------------------|
| braindump | Writes file, ends with chat prose | Add `Output: C:\Users\scull\OneDrive\ClaudeOS\braindumps\YYYY-MM-DD_braindump.md` as final stdout line |
| humanizer | Outputs text inline, no file write | Must write output to a vault file AND print `Output: <path>`. Suggest `humanized-YYYY-MM-DD-HHmmss.md` in a configurable folder, or a hardcoded path like `C:\Users\scull\OneDrive\ClaudeOS\braindumps\humanized-YYYY-MM-DD.md` |
| wiki-optimizer | Writes report, presents summary | Add `Output: wiki/optimizer-reports/OPTIMIZER-YYYY-MM-DD.md` as final stdout line |

**humanizer is a special case:** It currently produces no file output. To make D-07 work for humanizer, the skill must be modified to write the humanized text to a vault file in addition to (or instead of) displaying it inline. This is a skill-side change, not a dashboard-side change. The planner should include a skill modification task for humanizer.

---

## D-03 Recommendation: humanizer Dual Input + stdin Format

The CONTEXT.md says: path field takes precedence when both are filled.

**Recommended stdin formats:**

**Textarea-only mode:** The text content is piped directly as stdin.
```
child.stdin.write(textareaContent, 'utf8');
```

**Path-only mode or path takes precedence:** The dashboard passes the vault-relative path as a line to stdin with a clear instruction prefix, so the skill can read it. However, the skill SKILL.md shows humanizer currently receives its input inline in chat — it reads from the conversation, not a file path passed via stdin.

The cleanest dashboard-side approach for path mode: pass the path as a single line of stdin, e.g.:
```
File: <vault-relative-path>
```
The humanizer skill's SKILL.md mentions: "File: 'Humanize this text. Use my writing style from [file path] as a reference.'" — the skill already documents a file reference pattern. Extending this to a structured `File: <path>` prefix on stdin is consistent with documented behavior.

**Precedence rule implementation:**
```typescript
function buildHumanizerInput(textarea: string, filePath: string): string {
  if (filePath.trim()) {
    // Path takes precedence; textarea content is ignored
    return `File: ${filePath.trim()}`;
  }
  return textarea;
}
```

**Recommendation on mutual exclusivity:** Path takes precedence (as decided in CONTEXT.md Specifics section). No need to clear the textarea when the path is filled — just silently ignore textarea content when path is non-empty. This is simpler than mutual exclusivity (no need for onChange handlers that clear the other field) and the CONTEXT.md already specifies the precedence rule.

---

## D-10: AppContext Lift Pattern

### Current AppContext shape (verified from source)

```typescript
// src/context/AppContext.tsx
export interface AppContextType {
  app: App;
  plugin: ClaudeOSDashboard;
}
```

Two consumers today: `HomePage` reads `app` and `plugin`; `SocialPage` reads the same. [VERIFIED: file inspection]

### Recommended additive extension

```typescript
// New types in src/types.ts
export type SkillRunStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SkillRunState {
  status: SkillRunStatus;
  outputPath: string | null;  // null when no output or not yet complete
}

export type SkillStateMap = Record<string, SkillRunState>;

// Updated AppContextType in src/context/AppContext.tsx
export interface AppContextType {
  app: App;
  plugin: ClaudeOSDashboard;
  skillStates: SkillStateMap;
  setSkillState: (skillName: string, state: SkillRunState) => void;
}
```

### Where state lives

State must live in a component that persists across page navigation. In the current `App.tsx`, `activePage` is managed locally with `useState`. The `AppContext.Provider` wraps `App` from `DashboardView.tsx` (Phase 1 pattern). 

The cleanest additive approach: add `skillStates` and `setSkillState` to the Provider value. The Provider's state is initialized in `App.tsx` (or wherever the Provider is rendered) using `useState<SkillStateMap>({})`.

**App.tsx update pattern:**
```typescript
// App.tsx additions
const [skillStates, setSkillStatesRaw] = useState<SkillStateMap>({});

function setSkillState(skillName: string, state: SkillRunState) {
  setSkillStatesRaw(prev => ({ ...prev, [skillName]: state }));
}

// Provider value gets extended:
// <AppContext.Provider value={{ app, plugin, skillStates, setSkillState }}>
```

**Re-render implications:** Every call to `setSkillState` will re-render all context consumers. With three skill buttons and one status bar as consumers, this is acceptable — the consumer count is small and renders are infrequent (only on skill state transitions). A `useReducer` pattern would be marginally more optimal but is not necessary here. If the component tree grows, memoize the context value with `useMemo` to prevent unnecessary re-renders on unrelated state changes.

**No breaking changes:** Existing consumers (`HomePage`, `SocialPage`) only destructure `{ app, plugin }` — TypeScript will type-check clean as long as the interface extension is additive (it is).

---

## D-11: Status Bar Insertion Point

### Verified from App.tsx source

Current App.tsx structure:
```tsx
<div className="claudeos-dashboard">
  <Sidebar activePage={activePage} onNavigate={setActivePage} />
  <main className="claudeos-main">
    <PageComponent />
  </main>
</div>
```

**Status bar insertion point:** Between `<Sidebar />` and `<main className="claudeos-main">`. [VERIFIED: file inspection]

**Updated structure:**
```tsx
<div className="claudeos-dashboard">
  <Sidebar activePage={activePage} onNavigate={setActivePage} />
  <div className="claudeos-content-wrapper">
    <SkillStatusBar />          {/* new — zero height when idle */}
    <main className="claudeos-main">
      <PageComponent />
    </main>
  </div>
</div>
```

Or without wrapper div, insert `<SkillStatusBar />` directly between `<Sidebar />` and `<main>` — this works if the `claudeos-dashboard` flex container is `flex-direction: row` (sidebar + content side by side). In that layout, inserting a child between Sidebar and main would break the side-by-side layout. A wrapper div `claudeos-content-wrapper` is needed with `flex: 1; display: flex; flex-direction: column` to stack the status bar above the main content area.

### Zero-height-when-idle implementation

```css
.claudeos-status-bar {
  height: 0;
  overflow: hidden;
  transition: height 0.15s ease;
}

.claudeos-status-bar--active {
  height: auto; /* or a fixed rem value like 2rem */
  padding: var(--cos-space-xs, 4px) var(--cos-space-md, 16px);
  background: var(--cos-surface);
  border-bottom: 1px solid var(--cos-border);
  font-size: 0.85em;
  color: var(--cos-muted);
}
```

**Alternative:** `display: none` is simpler and avoids the transition jank on skill completion. For a non-animated approach, `display: none` when no active skills is cleaner and has zero layout impact.

---

## Architecture Patterns

### System Architecture Diagram

```
User clicks skill button
         |
         v
SkillButton (expanded panel open)
  [textarea / path field]
         |
    "Run" clicked
         |
         v
SkillButton.handleRun()
  1. Guard: ALLOWED_SKILLS.includes(skill)  <-- SEC-03 preserved
  2. setSkillState(skill, { status: 'loading', outputPath: null })
  3. For input-required: spawn('claude', ['-p', skill])
     - stdin.write(inputText)
     - stdin.end()
     - collect stdout
  4. For self-contained: execFile('claude', ['-p', skill])
     - callback(err, stdout)
         |
         v
  On close/callback:
  5. parseOutputPath(stdout) -> string | null
  6. if success:
       setSkillState(skill, { status: 'success', outputPath })
       setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 3000)
  7. if error:
       setSkillState(skill, { status: 'error', outputPath: null })
       setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 5000)
         |
         v
AppContext.skillStates updated
         |
    +----+----+
    |         |
    v         v
SkillButton   SkillStatusBar
(Home page)   (all pages, App.tsx shell)
shows state   shows "[Skill] running..." or "[Skill] - Done [link]"
+ output link
```

### Recommended Project Structure (additions only)

```
src/
├── components/
│   ├── ui/
│   │   ├── SkillButton.tsx       # Modified: expand panel + spawn stdin + output link
│   │   ├── SkillInputPanel.tsx   # New: expandable textarea/path UI (braindump, humanizer)
│   │   ├── SkillsSection.tsx     # Modified: accommodates expanded panels
│   │   └── SkillStatusBar.tsx    # New: persistent status bar component
│   ├── App.tsx                   # Modified: content-wrapper + SkillStatusBar insert
│   └── pages/
│       └── HomePage.tsx          # Unchanged (SkillsSection already there)
├── context/
│   └── AppContext.tsx            # Modified: gains skillStates + setSkillState
└── types.ts                      # Modified: SkillRunState, SkillRunStatus, SkillStateMap
```

### Pattern 1: Expandable Input Panel (Toggle)

**What:** A panel below the skill button that shows/hides on button click. State machine: button click toggles `expanded` boolean; "Run" inside the panel triggers execution; collapse clears input.

**When to use:** input-required skills (braindump, humanizer)

```typescript
// SkillInputPanel.tsx pattern
interface SkillInputPanelProps {
  skill: 'braindump' | 'humanizer';
  isExpanded: boolean;
  onRun: (input: string) => void;
}

// SkillButton button label logic:
// idle + !expanded -> show label ("Braindump")
// idle + expanded  -> show "Cancel" or dimmed label
// loading          -> spinner
// success          -> check + "Done" + output link
// error            -> x + "Failed"
```

**Note:** When the button is in `loading`, `success`, or `error` state, clicking it should be a no-op (guard already exists via `if (state !== 'idle') return`). The expanded panel should collapse automatically on success or error (or stay open with the output link visible).

### Pattern 2: Context State Lift

**What:** Move skill state from component-local `useState` to AppContext, enabling status bar to read it.

**Key:** The auto-reset timers (3s/5s) must still fire from `SkillButton` since it owns the execution logic. The timer calls `setSkillState` on AppContext — the reset propagates to all consumers naturally.

### Anti-Patterns to Avoid

- **Using `execFile` with `input` option for async stdin:** Does not work. `input` is sync-only. Use `spawn` instead.
- **Using `execFileSync` for input-required skills:** Blocks the Electron main renderer thread during execution (skills can take 30+ seconds). UI freezes. Never use synchronous child_process for skills.
- **Re-rendering on every stdout data chunk:** Do not call `setSkillState` on every `data` event — accumulate stdout in a local variable, only update context on `close`. This prevents N re-renders during skill execution.
- **Putting state in `SkillsSection`:** State must be in `AppContext` or a component that persists across page navigation. `SkillsSection` is only mounted when `HomePage` is active.
- **`display: none` on status bar using React conditional render:** If `SkillStatusBar` is conditionally rendered (not just hidden), inserting it will cause a layout shift on mount. Prefer `display: none` via CSS class toggle on an always-mounted element, or accept the trade-off if mount-time shift is acceptable.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stdin piping to child process | Custom spawn wrapper with complex error handling | Node.js `spawn()` with `stdin.write` / `stdin.end` | Standard pattern; handles backpressure, encoding, EOF automatically |
| Vault file open | Custom file navigator or renderer | `app.workspace.openLinkText(path, '')` | Obsidian-native; handles vault-relative and absolute paths, opens in correct pane, respects user's pane layout preferences |
| Path parsing from stdout | Custom stdout parser with multiple format variants | Single regex `/^Output:\s+(.+)$/m` on a defined format | Simple and reliable IF the skill prints a consistent format |
| Toggle expand/collapse | External animation library | CSS `height`/`display` toggle with CSS transition | No additional dependencies; consistent with existing animation-free approach |

**Key insight:** The complexity in this phase is in coordination (state lift, timing of resets), not in individual component complexity. Keep each piece simple.

---

## Common Pitfalls

### Pitfall 1: SEC-03 allowlist guard breaks when moving to spawn

**What goes wrong:** The existing `SkillButton` has two guards: TypeScript compile-time (`AllowedSkill` type) and runtime (`ALLOWED_SKILLS.includes(skill)`). When refactoring to `spawn`, developers sometimes reorganize the execution code and accidentally move the guard after the spawn call.

**Why it happens:** The spawn pattern requires setting up listeners before writing to stdin, which visually looks like "starting" the process before validation.

**How to avoid:** The runtime guard must remain the first operation inside `handleRun`, before any `spawn()` call. Order: (1) check state !== 'idle', (2) check `ALLOWED_SKILLS.includes(skill)`, (3) `setSkillState` to loading, (4) `spawn`.

**Warning signs:** Any `spawn` call that appears before the allowlist check in the code.

### Pitfall 2: Stdout accumulates across multiple skill runs

**What goes wrong:** If `stdout` is declared outside the click handler (e.g., as a component-level variable), it accumulates across runs instead of starting fresh each time.

**Why it happens:** Developers refactor local variables to component-level state to avoid re-declaring them.

**How to avoid:** Declare `let stdout = ''` inside the `handleRun` function body (closure-scoped to each invocation).

### Pitfall 3: Auto-reset timer fires after component unmounts (navigate away during loading)

**What goes wrong:** User starts a skill, navigates away from Home page. The skill completes. The `setTimeout` fires and calls `setSkillState` — this is fine because state is now in `AppContext`, not the component. But if the developer accidentally still uses component-local state for the timer, `setState` fires on an unmounted component.

**Why it happens:** Partial migration — state lift done but timer still uses local state setter.

**How to avoid:** After the state lift to AppContext, ALL state updates (including timer-triggered resets) must call `setSkillState` from context, not local `setState`. No `setState` calls remain in `SkillButton`.

**Warning signs:** `useState` remaining in `SkillButton` for `SkillRunState` after the context lift.

### Pitfall 4: Status bar height causes layout shift when first skill runs

**What goes wrong:** Status bar goes from `height: 0` to `height: auto` when a skill starts. If the `<main>` content area doesn't flex-shrink, the total content area grows and the page scrolls unexpectedly.

**Why it happens:** The `claudeos-dashboard` uses `height: 100%` and flex layout. Adding the status bar reduces available height for `<main>`.

**How to avoid:** The content wrapper must use `flex: 1; min-height: 0; overflow: hidden` and `<main>` must `flex: 1; overflow-y: auto`. This ensures the status bar height is absorbed from the main area without growing the total container.

### Pitfall 5: `openLinkText` with absolute paths on Windows

**What goes wrong:** Braindump outputs an absolute Windows path (`C:\Users\scull\OneDrive\ClaudeOS\braindumps\...`). `openLinkText` with sourcePath `''` interprets the path relative to vault root for vault-relative paths, but absolute paths on Windows include drive letters.

**Why it happens:** `openLinkText(linktext, sourcePath)` is designed for vault-relative wikilinks. It calls Obsidian's internal link resolver which may not handle absolute Windows paths correctly.

**How to avoid:** For vault-relative paths, `openLinkText(path, '')` works correctly. For absolute paths, use `app.vault.getAbstractFileByPath()` to resolve first, then `app.workspace.openFile(file)`. Or: convert absolute paths to vault-relative paths by stripping the vault base path prefix before storing the output path.

**Recommendation:** Standardize on vault-relative paths in skill output. When a skill writes to a location inside the vault, it should print the vault-relative path (e.g., `braindumps/2026-06-06_braindump.md`), not the absolute path.

### Pitfall 6: humanizer has no file output — D-07 cannot apply until skill is modified

**What goes wrong:** Planning assumes humanizer outputs a vault file, but the current SKILL.md outputs rewritten text inline in chat. If the skill is not modified before the dashboard runs, `parseOutputPath(stdout)` returns null and the "Done" state shows no link.

**Why it happens:** The skill was designed for interactive chat use, not pipeline use.

**How to avoid:** Include a skill modification task in the plan for humanizer before the dashboard feature is implemented. The fallback behavior (no link shown when `outputPath === null`) is graceful, but T4 re-run requires actual file output.

---

## Code Examples

### spawn() with stdin and stdout capture

```typescript
// Source: nodejs.org/api/child_process.html (verified)
import { spawn } from 'child_process';

function runSkill(
  skill: string,
  input: string | null,
  onDone: (err: Error | null, stdout: string) => void
): void {
  const child = spawn('claude', ['-p', skill]);
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });
  child.on('close', (code: number | null) => {
    if (code === 0) {
      onDone(null, stdout);
    } else {
      onDone(new Error(`claude exit ${code}: ${stderr.slice(0, 200)}`), stdout);
    }
  });

  if (input) {
    child.stdin.write(input, 'utf8');
  }
  child.stdin.end();
}
```

### AppContext extension pattern

```typescript
// types.ts additions
export type SkillRunStatus = 'idle' | 'loading' | 'success' | 'error';
export interface SkillRunState {
  status: SkillRunStatus;
  outputPath: string | null;
}
export type SkillStateMap = Record<string, SkillRunState>;

// AppContext.tsx — additive extension
export interface AppContextType {
  app: App;
  plugin: ClaudeOSDashboard;
  skillStates: SkillStateMap;
  setSkillState: (skillName: string, state: SkillRunState) => void;
}
```

### App.tsx state wiring

```typescript
// App.tsx
const [skillStates, setSkillStatesRaw] = useState<SkillStateMap>({});

const setSkillState = useCallback(
  (skillName: string, state: SkillRunState) => {
    setSkillStatesRaw(prev => ({ ...prev, [skillName]: state }));
  },
  []
);

// Provider value:
<AppContext.Provider value={{ app, plugin, skillStates, setSkillState }}>
```

### Output path parsing

```typescript
// Parses "Output: path/to/file.md" from skill stdout
function parseOutputPath(stdout: string): string | null {
  const match = stdout.match(/^Output:\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
```

### Obsidian openLinkText (verified from type definitions)

```typescript
// Source: node_modules/obsidian/obsidian.d.ts line 7822
// Signature: openLinkText(linktext: string, sourcePath: string, newLeaf?: PaneType | boolean, openViewState?: OpenViewState): Promise<void>
// PaneType = 'tab' | 'split' | 'window'

// Open in new tab:
await app.workspace.openLinkText(outputPath, '', 'tab');

// Open in current leaf:
await app.workspace.openLinkText(outputPath, '');
```

### SkillStatusBar component structure

```typescript
export function SkillStatusBar(): React.JSX.Element | null {
  const { skillStates } = useAppContext();

  const activeSkills = Object.entries(skillStates).filter(
    ([, state]) => state.status !== 'idle'
  );

  if (activeSkills.length === 0) return null; // zero-height via not rendering

  const [skillName, state] = activeSkills[0]; // show first active skill

  return (
    <div className="claudeos-status-bar">
      {state.status === 'loading' && (
        <span>{skillName} running...</span>
      )}
      {state.status === 'success' && state.outputPath && (
        <span>
          {skillName} — Done{' '}
          <a onClick={() => handleOpenLink(state.outputPath!)}>
            Open output
          </a>
        </span>
      )}
      {state.status === 'success' && !state.outputPath && (
        <span>{skillName} — Done</span>
      )}
      {state.status === 'error' && (
        <span>{skillName} — Failed</span>
      )}
    </div>
  );
}
```

---

## Obsidian API Verification (D-07)

**`app.workspace.openLinkText` signature** [VERIFIED: node_modules/obsidian/obsidian.d.ts line 7822]:

```typescript
openLinkText(
  linktext: string,
  sourcePath: string,
  newLeaf?: PaneType | boolean,
  openViewState?: OpenViewState
): Promise<void>
```

Where `PaneType = 'tab' | 'split' | 'window'` [VERIFIED: obsidian.d.ts line 4728].

**Behavior for vault-relative paths:** Pass the vault-relative path (e.g., `braindumps/2026-06-06_braindump.md`) as `linktext`, empty string as `sourcePath`. Obsidian resolves it against vault root automatically.

**For absolute paths:** Obsidian's link resolver may not handle Windows absolute paths. See Pitfall 5 above. Recommended: normalize to vault-relative in skill stdout.

**To open in new tab:** Pass `'tab'` as third argument: `openLinkText(path, '', 'tab')`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fire-and-forget execFile | spawn with stdin/stdout capture | Phase 5 | Enables input-required skills and output path display |
| Component-local SkillState | AppContext SkillStateMap | Phase 5 | Status survives page navigation |
| No status bar | Persistent slim status bar in App shell | Phase 5 | User can navigate freely without losing skill status |
| No output link | Parsed output path → vault link | Phase 5 | Closes the loop: trigger → wait → result |

**Deprecated/outdated in this phase:**
- `execFile` callback `(error) =>` — replaced with `(error, stdout)` for wiki-optimizer; `spawn` for input-required skills
- Component-local `useState<SkillState>` in `SkillButton` — replaced by AppContext reads

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Humanizer must write output to a vault file to support D-07 — this requires a skill-side change not mentioned in CONTEXT.md | Skill Output Path Analysis | If humanizer already writes a file in some code path not documented in SKILL.md, the task to add file output would be unnecessary |
| A2 | Skills are installed at `C:\Users\scull\OneDrive\ClaudeOS\Skills-dev\` and that is the canonical location the `claude -p <skill>` command references | Skill Output Path Analysis | If skills are installed elsewhere, the output paths in SKILL.md may be different at runtime |
| A3 | `spawn()` is available in Obsidian's Electron environment the same as `execFile` | Architecture / execFile correction | If Obsidian's electron build restricts spawn differently than execFile, fallback to execFileSync is the only sync option — but this would block the UI |
| A4 | Vault-relative output paths are preferable to absolute paths for `openLinkText` | D-07 / Pitfall 5 | If the vault is not inside the user's OneDrive folder structure, path mapping logic changes |

**Note on A3:** `execFile` is already confirmed working in Phase 2. Both `execFile` and `spawn` are from the same `child_process` module available in Node.js. There is no documented distinction in Obsidian's Electron environment between the two. [ASSUMED — not independently verified against Obsidian Electron docs]

---

## Open Questions

1. **Humanizer file output location**
   - What we know: humanizer currently outputs rewritten text inline in chat; no file write in SKILL.md
   - What's unclear: Where should the humanizer output file be written? Braindump uses `braindumps/` folder. A parallel `humanized/` folder is logical, but this is a user preference.
   - Recommendation: Add a task to modify humanizer SKILL.md to write output to `C:\Users\scull\OneDrive\ClaudeOS\braindumps\humanized-YYYY-MM-DD-HHmmss.md` (vault-relative: `braindumps/humanized-...`) and print `Output: <vault-relative-path>` at the end. Confirm with user before implementing if needed.

2. **Vault root to vault-relative path conversion**
   - What we know: braindump outputs absolute paths; `openLinkText` works best with vault-relative paths
   - What's unclear: Should the dashboard strip the vault root prefix from absolute paths, or should skills be responsible for outputting vault-relative paths?
   - Recommendation: Skills print vault-relative paths (simpler, skills know their own paths). Dashboard should gracefully handle both by attempting vault-relative first and falling back to `app.vault.getAbstractFileByPath()`.

3. **Status bar behavior when multiple skills run simultaneously**
   - What we know: D-12 shows `[SkillName] running...` — singular. SkillButton guards against re-click while loading (`if (state !== 'idle') return`), but two different skills could be running at once.
   - What's unclear: What does the status bar show when both braindump and wiki-optimizer are running at the same time?
   - Recommendation: Show the first active skill found in the map (consistent behavior). If count > 1, could show count: "2 skills running..." — but this is a cosmetic decision for the planner.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js `child_process.spawn` | Skill execution with stdin | Confirmed (same module as execFile, already working) | Electron Node.js | — |
| `obsidian` package / `app.workspace.openLinkText` | Vault file open | Confirmed in type defs | See obsidian.d.ts line 7822 | — |
| `claude` CLI on system PATH | Skill execution | Confirmed working (Phase 2 T4 passed) | — | — |

---

## Security Domain

`security_enforcement: true` in config.json. ASVS Level 1 applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not applicable — local plugin, no auth |
| V3 Session Management | No | Not applicable |
| V4 Access Control | Partial | SEC-03 allowlist guard — must be preserved in spawn refactor |
| V5 Input Validation | Yes | Skill name from hardcoded array only; textarea content is passed as stdin data, not shell argument — no injection risk |
| V6 Cryptography | No | No secrets handled |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Command injection via skill name | Tampering | SEC-03 allowlist hardcoded in source; runtime check before any spawn call |
| Command injection via stdin content | Tampering | None required — stdin is data pipe, not shell argument. `spawn` (not exec/shell:true) prevents stdin from being interpreted as shell commands |
| Path traversal in parsed output path | Information Disclosure | Parsed `outputPath` is used only in `openLinkText` (Obsidian API, not file system access) — low risk. Could validate path does not contain `..` sequences before passing to API |

**SEC-03 preservation checklist for Phase 5:**
- Runtime allowlist check must remain the FIRST operation in `handleRun` before any `spawn()` call
- Textarea/path field content is passed via stdin (data), never concatenated into the command arguments array
- The `spawn('claude', ['-p', skill])` call must use the validated `skill` from ALLOWED_SKILLS, never a raw string from user input

---

## Sources

### Primary (HIGH confidence)
- Node.js official docs (nodejs.org/api/child_process.html) — execFile options, spawn stdin pattern, callback signatures [VERIFIED]
- `node_modules/obsidian/obsidian.d.ts` (local file) — `openLinkText` signature line 7822, `PaneType` definition line 4728 [VERIFIED]
- `src/components/ui/SkillButton.tsx` — current execFile pattern, 4-state machine, ALLOWED_SKILLS guard [VERIFIED]
- `src/components/App.tsx` — layout structure, Sidebar + main structure [VERIFIED]
- `src/context/AppContext.tsx` — current shape: `{ app, plugin }` [VERIFIED]
- `src/types.ts` — existing type definitions [VERIFIED]
- `Skills-dev/braindump/SKILL.md` — output path, stdout behavior [VERIFIED]
- `Skills-dev/humanizer/SKILL.md` — confirms no file output; stdin input format [VERIFIED]
- `Skills-dev/wiki-optimizer/SKILL.md` — output path, no structured stdout line [VERIFIED]
- `styles.css` — full `--cos-*` token inventory [VERIFIED]

### Secondary (MEDIUM confidence)
- WebFetch of nodejs.org docs confirming `execFile` does not support `input` option (async variant only) [VERIFIED against official source]

---

## Metadata

**Confidence breakdown:**
- execFile/spawn stdin finding: HIGH — verified against Node.js official docs
- Skill output format (none currently): HIGH — verified by direct SKILL.md inspection
- AppContext extension pattern: HIGH — verified against live source code
- App.tsx insertion point: HIGH — verified against live source code
- openLinkText signature: HIGH — verified against installed obsidian type definitions
- Obsidian/Electron spawn availability: MEDIUM — reasoned from execFile working, not independently verified

**Research date:** 2026-06-06
**Valid until:** 90 days — stable Node.js APIs; Obsidian API is stable at this version
