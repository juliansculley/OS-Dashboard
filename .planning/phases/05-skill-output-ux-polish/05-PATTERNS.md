# Phase 5: Skill Output + UX Polish — Pattern Map

**Mapped:** 2026-06-06
**Files analyzed:** 10 (7 source files + 3 SKILL.md files)
**Analogs found:** 8 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/ui/SkillButton.tsx` | component | event-driven | self (current version) | exact — extend in place |
| `src/components/ui/SkillInputPanel.tsx` | component | request-response | `src/components/ui/SkillButton.tsx` | role-match — controlled input + state guard |
| `src/components/ui/SkillStatusBar.tsx` | component | event-driven | `src/components/ui/StatusTile.tsx` | role-match — conditional render + CSS class toggle |
| `src/components/ui/SkillsSection.tsx` | component | transform | self (current version) | exact — additive layout change |
| `src/components/App.tsx` | component | request-response | self (current version) | exact — additive wrapper + child insert |
| `src/context/AppContext.tsx` | provider | event-driven | self (current version) | exact — additive interface extension |
| `src/types.ts` | model | — | self (current version) | exact — additive type block |
| `Skills-dev/braindump/SKILL.md` | config | — | `Skills-dev/wiki-optimizer/SKILL.md` | role-match — add `Output:` stdout line |
| `Skills-dev/humanizer/SKILL.md` | config | — | `Skills-dev/braindump/SKILL.md` | role-match — add file write + `Output:` line |
| `Skills-dev/wiki-optimizer/SKILL.md` | config | — | `Skills-dev/braindump/SKILL.md` | role-match — add `Output:` stdout line |

---

## Pattern Assignments

### `src/components/ui/SkillButton.tsx` (component, event-driven) — MODIFY

**Analog:** `src/components/ui/SkillButton.tsx` (current — extend in place)

**Current imports** (lines 1–3):
```typescript
import React, { useState, useRef, useEffect } from 'react';
import { execFile } from 'child_process';
import { setIcon } from 'obsidian';
```

**Required import change** — replace `execFile` with `spawn`; add `useCallback` and context hook:
```typescript
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { spawn, execFile } from 'child_process';   // keep execFile for wiki-optimizer
import { setIcon } from 'obsidian';
import { useAppContext } from '../../context/AppContext';
```

**Current state machine** (lines 10, 28–29):
```typescript
type SkillState = 'idle' | 'loading' | 'success' | 'error';  // REMOVE — now lives in types.ts
// [...]
const [state, setState] = useState<SkillState>('idle');       // REMOVE — replace with context read
```

**Replace with context reads/writes** — after AppContext extension:
```typescript
// Read from context
const { skillStates, setSkillState, app } = useAppContext();
const skillState = skillStates[skill] ?? { status: 'idle', outputPath: null };

// Local state: panel expand only (not propagated to context)
const [expanded, setExpanded] = useState(false);
```

**Current SEC-03 guard + execFile execution** (lines 37–56 — the pattern to preserve order):
```typescript
function handleClick() {
  if (state !== 'idle') return;                    // guard 1: non-idle no-op
  if (!ALLOWED_SKILLS.includes(skill)) return;     // guard 2: SEC-03 allowlist
  setState('loading');
  execFile('claude', ['-p', skill], (error) => {
    if (error === null) {
      setState('success');
      setTimeout(() => setState('idle'), 3000);
    } else {
      setState('error');
      setTimeout(() => setState('idle'), 5000);
    }
  });
}
```

**New handleRun pattern for input-required skills** — preserves guard ORDER, replaces setState with context:
```typescript
function handleRun(input: string) {
  // Guard order must not change (SEC-03 Pitfall 1)
  if (skillState.status !== 'idle') return;
  if (!ALLOWED_SKILLS.includes(skill)) return;

  setSkillState(skill, { status: 'loading', outputPath: null });
  setExpanded(false);  // collapse panel on Run

  const child = spawn('claude', ['-p', skill]);
  let stdout = '';     // closure-scoped to each invocation (Pitfall 2)
  let stderr = '';

  child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
  child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });

  child.on('close', (code: number | null) => {
    if (code === 0) {
      const outputPath = parseOutputPath(stdout);
      setSkillState(skill, { status: 'success', outputPath });
      setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 3000);
    } else {
      setSkillState(skill, { status: 'error', outputPath: null });
      setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 5000);
    }
  });

  if (input) child.stdin.write(input, 'utf8');
  child.stdin.end();
}
```

**Self-contained skill execution** (wiki-optimizer — keep execFile, capture stdout):
```typescript
function handleClickSelfContained() {
  if (skillState.status !== 'idle') return;
  if (!ALLOWED_SKILLS.includes(skill)) return;

  setSkillState(skill, { status: 'loading', outputPath: null });
  execFile('claude', ['-p', skill], (error, stdout) => {
    if (error === null) {
      const outputPath = parseOutputPath(stdout);
      setSkillState(skill, { status: 'success', outputPath });
      setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 3000);
    } else {
      setSkillState(skill, { status: 'error', outputPath: null });
      setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 5000);
    }
  });
}
```

**Output path parser utility** (add at module scope, not inside component):
```typescript
function parseOutputPath(stdout: string): string | null {
  const match = stdout.match(/^Output:\s+(.+)$/m);
  return match ? match[1].trim() : null;
}
```

**IconSlot helper** (lines 17–25 — reuse unchanged):
```typescript
function IconSlot({ iconName }: { iconName: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) setIcon(ref.current, iconName);
  }, [iconName]);
  return <span ref={ref} className="cos-icon-slot" />;
}
```

**Output link render** (new JSX block, shown after success — uses app from context):
```tsx
{skillState.status === 'success' && skillState.outputPath && (
  <div className="claudeos-output-link">
    <IconSlot iconName="external-link" />
    <span
      className="claudeos-output-link__text"
      onClick={() => app.workspace.openLinkText(skillState.outputPath!, '', 'tab')}
    >
      Open output
    </span>
  </div>
)}
```

---

### `src/components/ui/SkillInputPanel.tsx` (component, request-response) — NEW

**Analog:** `src/components/ui/SkillButton.tsx` — controlled input + state guard pattern

**Full component structure** (copy this skeleton, do not deviate from prop interface):
```typescript
import React, { useState } from 'react';

type SkillWithInput = 'braindump' | 'humanizer';

interface SkillInputPanelProps {
  skill: SkillWithInput;
  isExpanded: boolean;
  onRun: (input: string) => void;
}

export function SkillInputPanel({ skill, isExpanded, onRun }: SkillInputPanelProps) {
  const [text, setText] = useState('');
  const [filePath, setFilePath] = useState('');

  function buildInput(): string {
    if (skill === 'humanizer' && filePath.trim()) {
      return `File: ${filePath.trim()}`;   // path takes precedence (CONTEXT D-03)
    }
    return text;
  }

  const isEmpty = skill === 'humanizer'
    ? text.trim() === '' && filePath.trim() === ''
    : text.trim() === '';

  return (
    <div className={`claudeos-input-panel${isExpanded ? '' : ' claudeos-input-panel--hidden'}`}>
      {skill === 'braindump' && (
        <div className="claudeos-input-panel__field">
          <label className="claudeos-input-panel__label">Input</label>
          <textarea
            className="claudeos-input-panel__textarea"
            placeholder="Paste or type your braindump here..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>
      )}
      {skill === 'humanizer' && (
        <>
          <div className="claudeos-input-panel__field">
            <label className="claudeos-input-panel__label">Text</label>
            <textarea
              className="claudeos-input-panel__textarea"
              placeholder="Paste text to humanize..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>
          <div className="claudeos-input-panel__field">
            <label className="claudeos-input-panel__label">Or vault path</label>
            <input
              type="text"
              className="claudeos-input-panel__path"
              placeholder="e.g. braindumps/note.md (takes precedence)"
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
            />
          </div>
        </>
      )}
      <button
        className="claudeos-run-btn"
        disabled={isEmpty}
        onClick={() => onRun(buildInput())}
      >
        Run
      </button>
    </div>
  );
}
```

**Input cleared on collapse:** Parent (`SkillButton`) toggles `isExpanded`. When the panel collapses, it re-mounts if `key` prop is tied to expanded state — simplest reset. Alternatively, parent calls a `reset` callback. Copy the `key={expanded ? 'open' : 'closed'}` pattern on the panel to reset state without an explicit callback.

---

### `src/components/ui/SkillStatusBar.tsx` (component, event-driven) — NEW

**Analog:** `src/components/ui/StatusTile.tsx` — conditional render + CSS class toggle on null/non-null value

**StatusTile conditional render pattern** (`src/components/ui/StatusTile.tsx` lines 10–27):
```tsx
// null-check drives CSS class + content branch
const isNoData = value === null;
return (
  <div className={`claudeos-tile${isNoData ? ' claudeos-tile--no-data' : ''}`}>
    {isNoData ? (
      <div className="claudeos-tile__value">—</div>
    ) : (
      <div className="claudeos-tile__value">{value}</div>
    )}
  </div>
);
```

**SkillStatusBar applies the same pattern** (active/inactive CSS class toggle):
```typescript
import React from 'react';
import { useAppContext } from '../../context/AppContext';

export function SkillStatusBar(): React.JSX.Element {
  const { skillStates, app } = useAppContext();

  const activeEntries = Object.entries(skillStates).filter(
    ([, s]) => s.status !== 'idle'
  );
  const isActive = activeEntries.length > 0;

  // Always mounted — visibility via CSS class (avoids mount-time layout shift, Pitfall 4)
  return (
    <div className={`claudeos-status-bar${isActive ? ' claudeos-status-bar--active' : ''}`}>
      {isActive && (() => {
        const [skillName, state] = activeEntries[0];
        return (
          <span className="claudeos-status-bar__text">
            {state.status === 'loading' && `${skillName} running...`}
            {state.status === 'success' && (
              <>
                {skillName} — Done
                {state.outputPath && (
                  <>
                    {' '}
                    <span
                      className="claudeos-status-bar__link"
                      onClick={() => app.workspace.openLinkText(state.outputPath!, '', 'tab')}
                    >
                      Open output
                    </span>
                  </>
                )}
              </>
            )}
            {state.status === 'error' && `${skillName} — Failed`}
          </span>
        );
      })()}
    </div>
  );
}
```

---

### `src/components/App.tsx` (component, request-response) — MODIFY

**Analog:** Self (current version)

**Current structure** (lines 1–24 — full file):
```typescript
import React, { useState } from 'react';
import { Sidebar } from './ui/Sidebar';
import { HomePage } from './pages/HomePage';
import { SocialPage } from './pages/SocialPage';
import type { PageId } from '../types';

const PAGES: Record<PageId, React.ComponentType> = {
  home: HomePage,
  social: SocialPage,
};

export function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState<PageId>('home');
  const PageComponent = PAGES[activePage];

  return (
    <div className="claudeos-dashboard">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="claudeos-main">
        <PageComponent />
      </main>
    </div>
  );
}
```

**Required additions — skill state wiring + content-wrapper + status bar insert:**
```typescript
// Add to imports
import { useCallback, useState } from 'react';
import { SkillStatusBar } from './ui/SkillStatusBar';
import type { SkillStateMap, SkillRunState } from '../types';

// Add inside App() before return:
const [skillStates, setSkillStatesRaw] = useState<SkillStateMap>({});
const setSkillState = useCallback(
  (skillName: string, state: SkillRunState) => {
    setSkillStatesRaw(prev => ({ ...prev, [skillName]: state }));
  },
  []
);

// Updated JSX (see RESEARCH.md D-11 for layout rationale):
return (
  <AppContext.Provider value={{ app, plugin, skillStates, setSkillState }}>
    <div className="claudeos-dashboard">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="claudeos-content-wrapper">
        <SkillStatusBar />
        <main className="claudeos-main">
          <PageComponent />
        </main>
      </div>
    </div>
  </AppContext.Provider>
);
```

**Note:** The `AppContext.Provider` wrap may already live in `DashboardView.tsx` (Phase 1 pattern). Verify where the Provider is currently rendered before moving it. If it is already in `DashboardView.tsx`, extend its `value` prop rather than adding a new Provider in `App.tsx`. The key constraint: `skillStates` state must live at or above the Provider.

---

### `src/context/AppContext.tsx` (provider, event-driven) — MODIFY

**Analog:** Self (current version)

**Current shape** (lines 1–16 — full file):
```typescript
import { createContext, useContext } from 'react';
import { App } from 'obsidian';
import ClaudeOSPlugin from '../../main';

export interface AppContextType {
  app: App;
  plugin: ClaudeOSPlugin;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppContext.Provider');
  return ctx;
}
```

**Additive extension — no breaking changes** (existing consumers only destructure `{ app, plugin }`):
```typescript
// Add import
import type { SkillStateMap, SkillRunState } from '../types';

// Extend interface (additive — existing destructures continue to work):
export interface AppContextType {
  app: App;
  plugin: ClaudeOSPlugin;
  skillStates: SkillStateMap;
  setSkillState: (skillName: string, state: SkillRunState) => void;
}
```

The `createContext` call and `useAppContext` hook body are **unchanged**.

---

### `src/types.ts` (model) — MODIFY

**Analog:** Self (current version)

**Current type block** (lines 1–48 — append below existing content):
```typescript
// Phase 5: Skill execution state types (per D-10, OUT-02)
export type SkillRunStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SkillRunState {
  status: SkillRunStatus;
  outputPath: string | null;  // null when no output parsed or skill not complete
}

export type SkillStateMap = Record<string, SkillRunState>;
```

Add at the bottom of the file, after the `DEFAULT_SETTINGS` const. No changes to existing types.

---

### `src/components/ui/SkillsSection.tsx` (component, transform) — MODIFY

**Analog:** Self (current version)

**Current structure** (lines 1–15 — full file):
```tsx
import React from 'react';
import { SkillButton } from './SkillButton';

export function SkillsSection() {
  return (
    <section className="claudeos-skills-section">
      <div className="claudeos-skills-heading">Skills</div>
      <div className="claudeos-skills-row">
        <SkillButton skill="wiki-optimizer" label="Wiki Optimizer" />
        <SkillButton skill="braindump" label="Braindump" />
        <SkillButton skill="humanizer" label="Humanizer" />
      </div>
    </section>
  );
}
```

**Required change:** The `claudeos-skills-row` flex row layout must accommodate expanded input panels that push content below their sibling button. Switch to a `flex-direction: column` wrapper per button, or let each `SkillButton` own its panel below it. The simplest approach: keep the row, but each `SkillButton` renders as a `<div>` column containing the button + panel stacked vertically. The row then lays out three such columns side by side. CSS change to `claudeos-skills-row`: `align-items: flex-start` (so expanded panels don't stretch all columns to the same height).

No import changes needed if `SkillButton` encapsulates the panel internally.

---

### `Skills-dev/braindump/SKILL.md` — MODIFY (add `Output:` stdout line)

**Analog:** `Skills-dev/wiki-optimizer/SKILL.md` (same pattern needed)

**Required addition:** At the end of the skill's final response instructions, add exactly one line:
```
Output: <vault-relative-path>
```

Concrete braindump path format (from RESEARCH.md §Skill Output Path Analysis):
```
Output: braindumps/YYYY-MM-DD_braindump.md
```

The skill already writes the file. This addition instructs it to print the vault-relative path as a terminal stdout line after saving. Do not use the absolute Windows path — use vault-relative (strip `C:\Users\scull\OneDrive\ClaudeOS\` prefix) so `openLinkText` resolves correctly.

---

### `Skills-dev/humanizer/SKILL.md` — MODIFY (add file write + `Output:` line)

**Analog:** `Skills-dev/braindump/SKILL.md` — braindump already writes a file and will have the `Output:` line

**Two required additions (order matters):**
1. Write the humanized output to a vault file: `braindumps/humanized-YYYY-MM-DD-HHmmss.md`
2. Print `Output: braindumps/humanized-YYYY-MM-DD-HHmmss.md` as the final stdout line

This is a skill-side change — the dashboard cannot display a vault link (D-07) until humanizer writes a file. See RESEARCH.md §Pitfall 6.

**Confirm output path with user before implementing** — RESEARCH.md Open Question 1 flags this as a user preference.

---

### `Skills-dev/wiki-optimizer/SKILL.md` — MODIFY (add `Output:` stdout line)

**Analog:** `Skills-dev/braindump/SKILL.md`

**Required addition:** At the end of the skill's response, after writing the report file, print:
```
Output: wiki/optimizer-reports/OPTIMIZER-YYYY-MM-DD.md
```

The skill already writes to this path. This is a one-line addition only.

---

## Shared Patterns

### Context consumption (applies to SkillButton, SkillStatusBar)

**Source:** `src/context/AppContext.tsx` lines 12–16; usage in `src/components/pages/HomePage.tsx` lines 3–4, 21

```typescript
// Import and consume pattern (from HomePage.tsx):
import { useAppContext } from '../../context/AppContext';
// [...]
const { app, plugin } = useAppContext();

// Phase 5 extension — same hook, destructure new fields:
const { app, skillStates, setSkillState } = useAppContext();
```

**Apply to:** `SkillButton.tsx`, `SkillStatusBar.tsx`

---

### CSS class-toggle conditional render (applies to SkillStatusBar, SkillInputPanel)

**Source:** `src/components/ui/StatusTile.tsx` lines 10–13

```tsx
// Pattern: always render the container, toggle class for visibility
const isNoData = value === null;
return (
  <div className={`claudeos-tile${isNoData ? ' claudeos-tile--no-data' : ''}`}>
```

**Apply to:** `SkillStatusBar` (`claudeos-status-bar` vs `claudeos-status-bar--active`), `SkillInputPanel` (`claudeos-input-panel` vs `claudeos-input-panel--hidden`)

---

### Icon rendering with setIcon (applies to SkillButton, SkillStatusBar)

**Source:** `src/components/ui/SkillButton.tsx` lines 17–25 (`IconSlot` helper) and lines 31–35 (spinner ref)

```typescript
function IconSlot({ iconName }: { iconName: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) setIcon(ref.current, iconName);
  }, [iconName]);
  return <span ref={ref} className="cos-icon-slot" />;
}
```

**Apply to:** `SkillStatusBar` if icons are needed in the bar. Reuse the `IconSlot` helper — import it from `SkillButton.tsx` or extract it to a shared utility file.

---

### Auto-reset timer pattern (applies to SkillButton)

**Source:** `src/components/ui/SkillButton.tsx` lines 48–53

```typescript
// success: 3s reset; error: 5s reset — both must call context setter, never local setState
if (error === null) {
  setState('success');
  setTimeout(() => setState('idle'), 3000);
} else {
  setState('error');
  setTimeout(() => setState('idle'), 5000);
}
```

**Phase 5 replacement** — all `setState` calls become `setSkillState` from context (Pitfall 3):
```typescript
setSkillState(skill, { status: 'success', outputPath });
setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 3000);
// [...error branch...]
setSkillState(skill, { status: 'error', outputPath: null });
setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 5000);
```

---

### Label typography pattern (applies to SkillInputPanel)

**Source:** `src/components/ui/StatusTile.tsx` lines 14 (`claudeos-tile__label` class)

```tsx
<div className="claudeos-tile__label">{label}</div>
```

**`SkillInputPanel` label class** `claudeos-input-panel__label` must mirror the existing `claudeos-tile__label` CSS: `12px / 600 / var(--cos-muted) / uppercase / letter-spacing: 0.06em`. Copy the CSS declaration from `styles.css` for `.claudeos-tile__label` and create a parallel selector.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All files have role-match or exact analogs in the codebase |

---

## Metadata

**Analog search scope:** `src/components/`, `src/context/`, `src/types.ts`, `Skills-dev/`
**Files read:** SkillButton.tsx, SkillsSection.tsx, App.tsx, AppContext.tsx, types.ts, StatusTile.tsx, HomePage.tsx + 3 SKILL.md files
**Pattern extraction date:** 2026-06-06
