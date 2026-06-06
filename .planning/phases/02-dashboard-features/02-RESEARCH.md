# Phase 2: Dashboard Features - Research

**Researched:** 2026-06-04
**Domain:** Obsidian Plugin API — PluginSettingTab, vault file reading, child_process execution, Lucide icons in React
**Confidence:** HIGH (core patterns), MEDIUM (adapter path behavior for external files)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Allowlist of valid skill names is a hardcoded array in source code — not configurable in settings. Enforces SEC-03 structurally.
- **D-02:** Initial allowlist (Phase 2): `wiki-optimizer`, `braindump`, `humanizer` — three buttons rendered in a dedicated Skills section.
- **D-03:** Output handling is fire-and-forget: button shows loading spinner while child_process runs, then transitions to success or error indicator based on exit code. No stdout capture in v1.
- **D-04:** Skills section sits below the status tiles on the Home page.
- **D-05:** Tile data source format is JSON flat files.
- **D-06:** v1 Home page has 2 status tiles: "Last vault sync" (timestamp) and "Active projects" (count).
- **D-07:** When a tile's data file is missing or unreadable, the tile stays visible with `—` as the value and a muted "No data" label. Layout is stable.
- **D-08:** Phase 2 includes an Obsidian plugin Settings tab (standard `PluginSettingTab` pattern).
- **D-09:** Settings are file paths only: LinkedIn data file path, X data file path, tile data file paths (one per tile). Skill allowlist stays hardcoded.
- **D-10:** All configurable paths default to empty strings. When a path is empty, tile or page renders "no data" state.
- **D-11:** Social stats data format matches tile format: JSON files. Schema is defined in the UI-SPEC.

### Claude's Discretion

- Exact JSON schema for LinkedIn and X data files — defined in UI-SPEC: `{ followers, connections, posts, updated_at? }` (LinkedIn) and `{ followers, following, tweets, updated_at? }` (X)
- Tile JSON schema — defined in UI-SPEC: `{ timestamp }` (sync tile) and `{ count }` (projects tile)
- Settings tab layout — defined in UI-SPEC copywriting contract
- Whether tile data paths are configured individually — decided in UI-SPEC: each tile has its own JSON file

### Deferred Ideas (OUT OF SCOPE)

- Inline skill output display (stdout/stderr) — OUT-01, deferred to Phase 5
- Configurable skill allowlist in settings — adds validation complexity; hardcoded for v1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOME-01 | Home page renders as default landing tab when dashboard opens | Phase 1 establishes state-based router with 'home' as default; Phase 2 fills in content without touching router |
| HOME-02 | Home page displays configurable status tiles reading from flat files | `app.vault.adapter.read()` for vault paths; Node.js `fs.readFile` for absolute paths; JSON.parse for tile data schemas |
| HOME-03 | Home page includes skill trigger button executing `claude -p <skill>` via child_process | `child_process.exec()` available as Node.js builtin (marked external in esbuild); allowlist validation before exec; exit code callback for state transitions |
| SOCIAL-01 | Social Stats page displays LinkedIn metrics from designated data file | Same file read pattern as tiles; LinkedInData interface defined in UI-SPEC |
| SOCIAL-02 | Social Stats page displays X metrics from designated data file | Same file read pattern; XData interface defined in UI-SPEC |
| SOCIAL-03 | Data file paths configurable in plugin settings | `PluginSettingTab` with `Setting.addText().onChange()` calling `plugin.saveData()`; paths stored in `ClaudeOSSettings` |
| SOCIAL-04 | Page shows "no data" state gracefully when files missing or empty | Empty-path check before read attempt; try/catch around read+parse; render empty state on null data |
| SKILL-01 | Generic button component executes `claude -p <skill>` shell command | `child_process.exec(\`claude -p ${skill}\`)` where skill is drawn from hardcoded array |
| SKILL-02 | Shell command inputs validated before execution — no injection | Allowlist check: `if (!ALLOWED_SKILLS.includes(skill)) return` — never reaches exec if skill not in list |
| SKILL-03 | Button shows loading state while running; success/error on completion | Local state `idle \| loading \| success \| error`; set on click, on exit code 0, on exit code non-zero |
| SEC-03 | Shell command strings constructed from allowlist — no raw user input to shell | Hardcoded array `const ALLOWED_SKILLS = ['wiki-optimizer', 'braindump', 'humanizer']` in SkillButton component |
</phase_requirements>

---

## Summary

Phase 2 fills in the three content areas left as stubs by Phase 1: the Home page (tiles + skills), the Social Stats page, and the plugin Settings tab. All patterns needed are well-established in the Obsidian plugin ecosystem and confirmed in the archive spec. The three non-trivial technical questions — how child_process works inside Obsidian, how to read vault/external JSON files, and how to render Lucide icons in React — all have clean answers.

The child_process module is a Node.js builtin that Obsidian's Electron environment exposes directly because the esbuild config marks `...builtins` as external. `child_process.exec()` is the right function for fire-and-forget execution with exit-code callbacks. The allowlist pattern (hardcoded array checked before any exec call) structurally prevents injection — SEC-03 is enforced architecturally, not by runtime sanitization.

For file reading: JSON files inside the vault can be read via `app.vault.adapter.read(relativePath)`. For files the user may configure as absolute paths outside the vault, the reliable approach is Node.js `fs.readFile` (also available as a builtin). A unified read helper that detects absolute vs relative path removes ambiguity. Lucide icons in React components are injected imperatively via `setIcon(el, iconName)` using a `useRef` + `useEffect` pattern — not imported as React components.

**Primary recommendation:** Three plans as outlined in ROADMAP.md — Skill Trigger component first (isolated, testable), then Home page, then Social Stats + Settings. SettingsTab can be developed alongside Social Stats as both need `ClaudeOSSettings`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Status tile display | React component (client) | — | Pure rendering of passed-in data; no logic |
| Tile data reading | HomePage component | — | Reads file on mount using settings paths; passes value prop to StatusTile |
| Skill execution | SkillButton component | — | Owns execution state; calls child_process directly |
| Allowlist enforcement | SkillButton component | — | Hardcoded array lives in component file; checked pre-exec |
| Settings persistence | PluginSettingTab (Obsidian API) | main.ts (plugin) | SettingsTab calls plugin.saveData; plugin.loadData on startup |
| Social data reading | SocialPage component | — | Reads configured file paths from settings; passes to SocialMetricCard |
| Icon rendering | SkillButton component (useEffect) | — | setIcon() injects SVG imperatively into ref'd DOM node |
| Settings tab registration | main.ts (onload) | — | addSettingTab() call; Obsidian owns tab lifecycle |

---

## Standard Stack

### Core (all inherited from Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component rendering | Locked Phase 1 |
| TypeScript | 5.x | Type safety | Locked Phase 1 |
| esbuild | current | Bundler | Locked Phase 1 |
| obsidian (API) | latest | Plugin API surface | Locked Phase 1 |

### Node.js Builtins (available via Electron, no install needed)
| Module | Purpose | Availability |
|--------|---------|-------------|
| `child_process` | Spawn `claude -p <skill>` commands | Available in Electron renderer; marked external in esbuild — no bundle needed |
| `fs` | Read JSON files by absolute path | Available in Electron renderer; marked external in esbuild |
| `path` | Path normalization if needed | Available in Electron renderer; marked external in esbuild |

**Why no install:** The esbuild config already has `...builtins` in the `external` array. Node.js built-in modules resolve at runtime from the Electron Node.js environment. [VERIFIED: archive spec esbuild.config.mjs; CITED: Obsidian forum thread on child_process + builtins]

### New Phase 2 Additions (none)
Phase 2 introduces no new npm dependencies. All functionality uses the Obsidian API and Node.js builtins already available. [VERIFIED: codebase + Obsidian API docs]

---

## Architecture Patterns

### System Architecture Diagram

```
User Click (SkillButton)
        │
        ▼
  ALLOWED_SKILLS.includes(skill)?
        │ yes            │ no
        ▼                └─► return (no-op)
  setState('loading')
        │
        ▼
  child_process.exec(`claude -p ${skill}`)
        │
        ├── exit code 0  ──► setState('success') ──► setTimeout 3s ──► setState('idle')
        └── exit code ≠0 ──► setState('error')  ──► setTimeout 5s ──► setState('idle')


Settings path change (SettingsTab)
        │
        ▼
  plugin.settings[key] = value
        │
        ▼
  plugin.saveData(plugin.settings) ──► data.json (Obsidian managed)


Page mount (HomePage / SocialPage)
        │
        ▼
  Read path from plugin.settings (loadData result)
        │
        ├── path === ""  ──► setData(null)  ──► render no-data state
        │
        └── path set  ──► readJsonFile(path)
                               │
                               ├── success ──► setData(parsed) ──► render data state
                               └── error   ──► setData(null)   ──► render no-data state
```

### Recommended Project Structure (Phase 2 additions to Phase 1 tree)
```
src/
├── components/
│   ├── pages/
│   │   ├── HomePage.tsx        # Replace Phase 1 stub — TileGrid + SkillsSection
│   │   └── SocialPage.tsx      # Replace Phase 1 stub — two SocialMetricCards
│   └── ui/
│       ├── StatusTile.tsx       # Single tile card (label + value | no-data)
│       ├── TileGrid.tsx         # Two-column grid wrapper
│       ├── SkillButton.tsx      # Skill trigger with 4-state machine
│       └── SkillsSection.tsx    # Section heading + 3 SkillButton row
│       ├── SocialMetricCard.tsx # Platform card (LinkedIn | X) with empty state
├── settings/
│   └── SettingsTab.ts          # PluginSettingTab subclass (new file)
└── types.ts                    # Extend with Phase 2 interfaces (see UI-SPEC)
styles.css                      # Add Phase 2 selectors (tile, skill btn, social card)
```

### Pattern 1: child_process Execution with Exit Code Callback

**What:** Fire-and-forget `exec()` that transitions button state based on exit code.
**When to use:** Any skill trigger execution in SkillButton.tsx.

```typescript
// Source: Node.js docs (CITED: nodejs.org/api/child_process.html) + Obsidian forum pattern
import { exec } from 'child_process';

const ALLOWED_SKILLS = ['wiki-optimizer', 'braindump', 'humanizer'] as const;
type AllowedSkill = typeof ALLOWED_SKILLS[number];

function executeSkill(skill: AllowedSkill, onComplete: (success: boolean) => void) {
  // Allowlist check is structural — AllowedSkill type + runtime check
  if (!ALLOWED_SKILLS.includes(skill)) {
    onComplete(false);
    return;
  }
  // exec spawns a shell and runs the command string
  exec(`claude -p ${skill}`, (error) => {
    // error is null on exit code 0; non-null (with .code) on non-zero exit
    onComplete(error === null);
  });
}
```

**Why exec over spawn:** `exec` buffers output (not needed here but simpler API), provides a single callback with error/stdout/stderr, and is idiomatic for short-lived commands where you only care about exit status. Since v1 doesn't capture stdout (D-03), `exec` is the right choice. [CITED: nodejs.org/api/child_process.html]

**Important:** The skill name goes directly into the command string. The allowlist is the only injection protection. Since the allowlist is a hardcoded TypeScript `const` array, the TypeScript type system (`AllowedSkill` union) provides compile-time enforcement in addition to the runtime check.

### Pattern 2: PluginSettingTab Registration and Settings Persistence

**What:** Standard Obsidian settings tab with text inputs; saves on change.
**When to use:** SettingsTab.ts in Phase 2.

```typescript
// Source: CITED: docs.obsidian.md/Plugins/User+interface/Settings
import { App, PluginSettingTab, Setting } from 'obsidian';
import ClaudeOSPlugin from '../main';

export class SettingsTab extends PluginSettingTab {
  plugin: ClaudeOSPlugin;

  constructor(app: App, plugin: ClaudeOSPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Section heading (Obsidian-native way)
    new Setting(containerEl)
      .setName('Data File Paths')
      .setHeading();

    new Setting(containerEl)
      .setName('Last Vault Sync File')
      .setDesc('Path to a JSON file with a "timestamp" field (ISO 8601). Written by your vault sync automation.')
      .addText(text => text
        .setValue(this.plugin.settings.lastSyncPath)
        .onChange(async (value) => {
          this.plugin.settings.lastSyncPath = value;
          await this.plugin.saveSettings();
        })
      );

    // ... repeat for activeProjectsPath, linkedinDataPath, xDataPath
  }
}
```

**Registration in main.ts (onload):**
```typescript
this.addSettingTab(new SettingsTab(this.app, this));
```

**saveSettings() in Plugin class** (already in archive spec pattern, confirmed working):
```typescript
async saveSettings() {
  await this.saveData(this.settings);
}
```

[CITED: docs.obsidian.md/Plugins/User+interface/Settings]

### Pattern 3: Reading JSON Data Files

**What:** Unified async helper that reads a JSON file given a path (vault-relative or absolute).
**When to use:** HomePage.tsx (tile data) and SocialPage.tsx (social data).

The UI-SPEC says "Paths are relative to the vault root unless the user enters an absolute path." This means the read helper must handle both cases.

```typescript
// Source: [ASSUMED] — synthesized from Obsidian DataAdapter docs + Node.js fs docs
// vault-relative paths go via app.vault.adapter.read()
// absolute paths go via Node.js fs.readFile (available as builtin)
import { App } from 'obsidian';
import { readFile } from 'fs/promises';
import * as path from 'path';

async function readJsonFile<T>(app: App, filePath: string): Promise<T | null> {
  if (!filePath) return null;
  try {
    let content: string;
    if (path.isAbsolute(filePath)) {
      // Absolute path — use Node.js fs directly
      content = await readFile(filePath, 'utf8');
    } else {
      // Vault-relative path — use Obsidian adapter
      content = await app.vault.adapter.read(filePath);
    }
    return JSON.parse(content) as T;
  } catch {
    return null; // Missing file, parse error, permission error — all render no-data state
  }
}
```

**Important caveat:** `app.vault.adapter.read()` takes a vault-relative path (relative to vault root). It does NOT accept absolute system paths. The `normalizedPath` parameter confirmed in the DataAdapter docs refers to vault-relative normalized paths. For paths outside the vault, Node.js `fs` is required. [CITED: docs.obsidian.md/Reference/TypeScript+API/DataAdapter, MEDIUM confidence on path scope]

### Pattern 4: Lucide Icons in React Components (setIcon via useRef + useEffect)

**What:** Obsidian's `setIcon()` is an imperative DOM function — it injects an SVG into an HTML element. In React, bridge it via useRef + useEffect.
**When to use:** SkillButton.tsx for `loader-2` (loading), `check` (success), `x` (error) icons.

```typescript
// Source: CITED: docs.obsidian.md/Plugins/User+interface/Icons
import { useRef, useEffect } from 'react';
import { setIcon } from 'obsidian';

// Usage inside SkillButton component:
function IconSlot({ iconName }: { iconName: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      setIcon(ref.current, iconName);
    }
  }, [iconName]);

  return <span ref={ref} />;
}
```

**Icon names for this phase:**
- `loader-2` — spinning loader (loading state)
- `check` — checkmark (success state)
- `x` — X mark (error state)

All three are standard Lucide icons available in Obsidian (Lucide support added in Obsidian 0.13.27; current Obsidian ships Lucide ≤ v0.446.0). `loader-2`, `check`, and `x` are all in early Lucide versions — availability is near-certain. [CITED: docs.obsidian.md/Plugins/User+interface/Icons]

**Spinner CSS animation:** The UI-SPEC provides the exact animation (see `@keyframes cos-spin`). The `setIcon` call populates the SVG content; the animation is applied via the `.cos-spinner` class on the wrapper element. These are independent — no conflict.

**Alternative for simple icons:** For the success/error icons that don't need animation, an inline SVG or CSS-content approach also works. But `setIcon()` is idiomatic for Obsidian plugins and keeps icon rendering consistent with how Phase 1 nav icons work. [ASSUMED: Phase 1 nav uses Lucide icons via setIcon — inferred from archive spec context]

### Pattern 5: SkillButton State Machine

**What:** Local component state driving visual transitions.
**When to use:** SkillButton.tsx.

```typescript
// [ASSUMED] — synthesized from UI-SPEC interaction contract + D-03
type SkillState = 'idle' | 'loading' | 'success' | 'error';

function SkillButton({ skill, label }: { skill: AllowedSkill; label: string }) {
  const [state, setState] = useState<SkillState>('idle');

  function handleClick() {
    if (state !== 'idle') return; // Block during non-idle states
    setState('loading');
    executeSkill(skill, (success) => {
      setState(success ? 'success' : 'error');
      setTimeout(() => setState('idle'), success ? 3000 : 5000);
    });
  }

  return (
    <button
      className={`claudeos-skill-btn claudeos-skill-btn--${state}`}
      onClick={handleClick}
      disabled={state === 'loading'}
    >
      {state === 'loading' && <span className="cos-spinner" ref={spinnerRef} />}
      {state === 'idle' && label}
      {state === 'success' && <><IconSlot iconName="check" /> Done</>}
      {state === 'error' && <><IconSlot iconName="x" /> Failed</>}
    </button>
  );
}
```

### Anti-Patterns to Avoid

- **Passing user-typed text directly to exec:** The settings UI lets users type file paths, not skill names. Skill names come from the hardcoded array. Never wire a text input's value directly into an exec call string. [SEC-03]
- **Using app.vault.read() for flat JSON files:** `app.vault.read()` expects a `TFile` object, not a path string. That API is for vault markdown files tracked by Obsidian. Use `app.vault.adapter.read(path)` for path strings, or `fs.readFile` for absolute paths. [CITED: docs.obsidian.md/Plugins/Vault]
- **Storing Lucide icons as JSX imports:** Obsidian ships Lucide as part of its bundle — there's no `lucide-react` package available. Don't attempt `import { Check } from 'lucide-react'`. Use `setIcon()` exclusively. [ASSUMED: no lucide-react in Obsidian plugin environment — inferred from Obsidian docs pattern]
- **Using localStorage for settings:** Obsidian blocks localStorage in some contexts. All settings persistence must use `plugin.loadData()` / `plugin.saveData()`. [CITED: archive spec gotchas §19]
- **Reloading data on every render:** File reads should happen in `useEffect` on mount (and when the relevant settings path changes), not on every render cycle.
- **Not handling the empty-path case before attempting a read:** If path is `""` (default), skip the file read entirely and go straight to no-data state. Attempting `adapter.read("")` or `readFile("")` would throw.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Settings persistence | Custom localStorage / file write logic | `plugin.loadData()` / `plugin.saveData()` | Obsidian manages data.json lifecycle, handles concurrent writes, survives plugin reload |
| Settings UI | Custom React form inputs | `PluginSettingTab` + `Setting` class | Obsidian provides native styling, keyboard nav, section grouping for free |
| Icon rendering | SVG imports or inline SVG strings | `setIcon(el, iconName)` from obsidian | Obsidian manages icon versioning; setIcon is the community-standard pattern |
| Shell injection prevention | Runtime sanitization / escaping of shell strings | Hardcoded TypeScript allowlist (`const ALLOWED_SKILLS`) | No escaping can be as safe as never constructing a dynamic string at all |
| Cross-vault file access | Custom file resolution logic | Path check: absolute → `fs.readFile`, relative → `adapter.read()` | Two-line conditional handles both cases; no custom path resolver needed |

---

## Common Pitfalls

### Pitfall 1: app.vault.read() vs app.vault.adapter.read()

**What goes wrong:** Developer uses `app.vault.read(filePath)` with a string path and gets a TypeScript error or runtime crash because it expects a `TFile` object.

**Why it happens:** The Vault API's `read()` method signature is `read(file: TFile): Promise<string>` — it takes a vault-tracked file object, not a path string.

**How to avoid:** For path-based reads: use `app.vault.adapter.read(normalizedPath)` for vault-relative paths. Normalize the path using `normalizePath()` from obsidian before passing it.

**Warning signs:** TypeScript error "Argument of type 'string' is not assignable to parameter of type 'TFile'".

### Pitfall 2: Node.js Builtins Accidentally Bundled

**What goes wrong:** esbuild bundles `child_process` or `fs` into main.js, causing runtime errors because the bundled version can't resolve the Node.js internals.

**Why it happens:** If a developer adds `import { exec } from 'child_process'` but the `...builtins` spread is missing from esbuild's `external` array.

**How to avoid:** The Phase 1 esbuild config already has `...builtins` spread from the `builtin-modules` package. Verify this is present before Phase 2 execution. No change needed if Phase 1 scaffold is correct.

**Warning signs:** Runtime error "Cannot find module 'child_process'" or unusually large main.js bundle size.

### Pitfall 3: Spinner Animation Not Visible Due to SVG Transform Origin

**What goes wrong:** The `loader-2` icon SVG spins around the wrong origin, appearing to wobble rather than spin.

**Why it happens:** CSS `transform: rotate()` defaults to `transform-origin: 50% 50%` of the element, but the SVG may have a viewBox that puts the center elsewhere.

**How to avoid:** Apply the spin animation to a wrapper `<span>` that contains the setIcon output, not to the SVG directly. The `cos-spinner` class is on the wrapper span, not the SVG. The UI-SPEC animation targets `.claudeos-skill-btn--loading .cos-spinner` which is the span element. [CITED: 02-UI-SPEC.md CSS animation block]

### Pitfall 4: Settings Not Reflecting After Plugin Reload

**What goes wrong:** User changes a file path in Settings, reloads Obsidian, and the path reverts to empty.

**Why it happens:** Developer called `plugin.saveData(value)` instead of `plugin.saveData(plugin.settings)`, or forgot to call saveData entirely.

**How to avoid:** In `onChange` callback: (1) update `this.plugin.settings[key]`, (2) call `await this.plugin.saveSettings()`. Both steps required. `saveSettings()` calls `saveData(this.settings)` — it saves the entire settings object, not just the changed field.

### Pitfall 5: exec() on Windows — Command Resolution

**What goes wrong:** `claude` CLI not found when exec runs on Windows. exec on Windows defaults to `cmd.exe` as the shell. If `claude` is not on the system PATH, exec fails silently or with "command not found".

**Why it happens:** `exec()` uses the system shell. On Windows this is `cmd.exe`, which may have a different PATH than the user's PowerShell session.

**How to avoid:** Test by running `claude --version` from a fresh `cmd.exe` prompt. If it fails, the user needs to ensure `claude` is on the system PATH (not just the PowerShell profile PATH). This is a user environment issue, not a code issue — document it as a prerequisite. Error state will correctly show "Failed" if exec returns non-zero.

**Warning signs:** Error state on first click of any skill button despite the skill working in a terminal.

### Pitfall 6: Race Condition When User Clicks Button Twice

**What goes wrong:** User double-clicks a skill button, spawning two concurrent `claude -p` processes.

**Why it happens:** If the button's `disabled` or `pointer-events: none` is applied only after a render cycle completes, a fast double-click could trigger two exec calls.

**How to avoid:** Set `disabled={state === 'loading'}` as the first line in `handleClick` before calling exec. Or check `if (state !== 'idle') return` at the top of the handler (already in the pattern above). The `disabled` attribute provides the belt; the guard is the suspenders.

---

## Code Examples

### Reading a tile JSON file (complete helper)
```typescript
// Source: [ASSUMED] synthesized from DataAdapter docs + Node.js fs/promises docs
import { App, normalizePath } from 'obsidian';
import { readFile } from 'fs/promises';
import * as nodePath from 'path';

export async function readJsonFile<T>(
  app: App,
  filePath: string
): Promise<T | null> {
  if (!filePath || filePath.trim() === '') return null;
  try {
    let raw: string;
    if (nodePath.isAbsolute(filePath)) {
      raw = await readFile(filePath, 'utf-8');
    } else {
      raw = await app.vault.adapter.read(normalizePath(filePath));
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
```

### Using settings in a page component
```typescript
// Source: [ASSUMED] — synthesized from AppContext pattern in archive spec
import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { readJsonFile } from '../../utils/readJsonFile';
import { TileSyncData } from '../../types';

function HomePage() {
  const { app, plugin } = useAppContext();
  const [syncValue, setSyncValue] = useState<string | null>(null);

  useEffect(() => {
    readJsonFile<TileSyncData>(app, plugin.settings.lastSyncPath).then(data => {
      if (data?.timestamp) {
        // Format ISO 8601 to YYYY-MM-DD HH:mm local time
        const d = new Date(data.timestamp);
        setSyncValue(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
      } else {
        setSyncValue(null);
      }
    });
  }, [plugin.settings.lastSyncPath]);

  return <StatusTile label="Last vault sync" value={syncValue} />;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Shell Commands plugin dependency for skill triggers | Direct `child_process.exec()` in plugin code | Project decision — D-03 in Phase 2 context | Removes external plugin dependency; plugin is self-contained |
| MCP bridge HTTP fetch for social data | Flat JSON files written by external automations | Project decision — Phase 2 context | Eliminates bridge server complexity for v1 |
| `containerEl.children[1]` as React root | `this.contentEl` preferred | Obsidian API guidance | NOTED: archive spec uses children[1]; Phase 1 plan should verify. Phase 2 does not change this. |

**Deprecated in this project context:**
- MCP bridge architecture from archive spec §9–10: discarded per Phase 1 CONTEXT.md. Phase 2 reads flat files directly.
- `executeCommandById('shell-commands:...')` pattern from archive spec §8: discarded in favour of direct child_process.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `app.vault.adapter.read()` accepts vault-relative path strings and rejects absolute paths | Patterns §3, Pitfalls §1 | If adapter.read() also accepts absolute paths, the path-type branch in readJsonFile is unnecessary (but harmless) |
| A2 | `lucide-react` npm package is not available in Obsidian plugin environment | Don't Hand-Roll | If it were available, icons could be imported as React components instead of using setIcon() — lower-effort approach |
| A3 | Phase 1 nav icons use setIcon() (not inline SVG) — SkillButton's useRef+useEffect pattern is consistent with Phase 1 | Patterns §4 | If Phase 1 used inline SVGs, there's no consistency argument for setIcon(); still correct to use setIcon() for Lucide |
| A4 | `claude` CLI is on the system PATH when invoked via cmd.exe on Windows | Pitfalls §5 | If not on PATH, all skill buttons fail with error state — user prerequisite, not a code bug |
| A5 | Obsidian's current Lucide version includes loader-2, check, and x icons | Patterns §4 | These are foundational icons present in early Lucide releases; risk is near-zero but not formally verified against Obsidian's exact Lucide version |

---

## Open Questions

1. **Does `app.vault.adapter.read()` accept vault-relative paths given as strings, or does it require normalizePath preprocessing?**
   - What we know: DataAdapter docs reference "normalizedPath" parameters. The `normalizePath()` utility exists in the Obsidian API.
   - What's unclear: Whether passing a raw user-typed relative path (e.g., `"data/sync.json"`) works without normalization.
   - Recommendation: Always run `normalizePath(filePath)` on vault-relative paths before passing to `adapter.read()`. This is the safe defensive pattern and costs nothing.

2. **Phase 1 completion state at time of Phase 2 execution**
   - What we know: Phase 2 depends entirely on Phase 1's scaffold. The exact file locations and component interfaces matter.
   - What's unclear: Phase 1 has not executed yet. `src/context/AppContext.tsx`, `src/types.ts`, `styles.css` don't exist yet.
   - Recommendation: Phase 2 plans must include a "read Phase 1 source" step before implementing. The planner should note this dependency explicitly.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js `child_process` | SKILL-01, SKILL-02, SKILL-03, SEC-03 | Implied ✓ | Electron built-in | — |
| Node.js `fs/promises` | HOME-02, SOCIAL-01, SOCIAL-02 | Implied ✓ | Electron built-in | Use `adapter.read()` for vault paths only |
| `claude` CLI on system PATH | Skill execution | Unknown | — | Error state shown; user prerequisite |
| Obsidian vault at `C:\Users\scull\OneDrive\ClaudeOS` | Dev testing | ✓ | Known from Phase 1 D-06 | — |
| Phase 1 compiled plugin scaffold | Phase 2 development | Not yet (Phase 1 pending) | — | Phase 2 cannot start until Phase 1 executes |

**Missing dependencies with no fallback:**
- Phase 1 compiled scaffold — Phase 2 literally cannot proceed without it. This is expected; it's a sequencing constraint.

**Missing dependencies with fallback:**
- `claude` CLI availability at exec time: if not on PATH, skill buttons show error state (graceful degradation, not a crash).

---

## Security Domain

`security_enforcement: true` in config; `security_asvs_level: 1`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in this plugin |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Single-user local plugin |
| V5 Input Validation | yes | Allowlist validation before exec; null-check + try/catch on file reads |
| V6 Cryptography | no | No secrets stored in plugin |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Command injection via skill name | Tampering | Hardcoded allowlist — TypeScript type + runtime check prevents any user-controlled string reaching exec() |
| Malicious JSON file content | Tampering | JSON.parse() only — no eval(), no script execution. Parsed data is displayed as text. XSS sanitization from Phase 1 (sanitizeHTMLToDom) applies to any rendered output. |
| Path traversal via settings input | Tampering | Data files are read-only (plugin only reads, never writes external files). No execution based on file contents. Risk is limited to what data is displayed. |
| Secret in source code | Information Disclosure | No credentials in code — confirmed SEC-02 from Phase 1; Phase 2 adds no new secrets |

**SEC-03 implementation note:** The allowlist is a `const` array at module level in SkillButton.tsx. The TypeScript type `AllowedSkill` is derived from the array via `typeof ALLOWED_SKILLS[number]`. Both the type system and the runtime check enforce the constraint. The skill name never comes from user input (settings UI has no skill name fields). [VERIFIED: 02-CONTEXT.md D-01, D-09]

---

## Sources

### Primary (HIGH confidence)
- `archive/claudeos-obsidian-plugin-spec.md` — Phase 1 canonical reference; esbuild config builtins external pattern, PluginSettingTab pattern, AppContext pattern, gotchas list
- `02-CONTEXT.md` — Phase 2 locked decisions (D-01 through D-11)
- `02-UI-SPEC.md` — Complete component inventory, CSS class names, data schemas, TypeScript interfaces, copywriting contract
- [docs.obsidian.md/Plugins/User+interface/Settings](https://docs.obsidian.md/Plugins/User+interface/Settings) — PluginSettingTab pattern, Setting.setHeading(), addText, onChange, loadData/saveData
- [docs.obsidian.md/Plugins/User+interface/Icons](https://docs.obsidian.md/Plugins/User+interface/Icons) — setIcon() API, Lucide version support

### Secondary (MEDIUM confidence)
- [nodejs.org/api/child_process.html](https://nodejs.org/api/child_process.html) — exec() callback signature, error.code on non-zero exit
- [docs.obsidian.md/Reference/TypeScript+API/DataAdapter](https://docs.obsidian.md/Reference/TypeScript+API/DataAdapter) — DataAdapter methods including adapter.read()
- [Obsidian forum: executable child_process](https://forum.obsidian.md/t/inquiry-about-downloading-and-executing-local-executables-in-obsidian-plugins/89716/3) — confirmed node:child_process.exec() works, desktop-only constraint
- [Obsidian forum: setIcon list](https://forum.obsidian.md/t/list-of-available-icons-for-component-seticon/16332) — Lucide icons available since Obsidian 0.13.27

### Tertiary (LOW confidence / ASSUMED)
- readJsonFile helper pattern (A1) — synthesized from multiple sources, not verified against Obsidian internal adapter implementation
- Lucide icon name exact availability for loader-2/check/x (A5) — inferred from Lucide being present since early versions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all Phase 1 locked, no new npm dependencies needed
- child_process execution: HIGH — confirmed in Obsidian forum, Node.js docs
- PluginSettingTab pattern: HIGH — confirmed in official Obsidian docs
- setIcon in React: MEDIUM — pattern synthesized from docs + community examples; no official React integration guide
- adapter.read() path scope: MEDIUM — docs don't explicitly state whether absolute paths work; defensive two-path approach covers both cases

**Research date:** 2026-06-04
**Valid until:** 2026-09-04 (Obsidian API stable; child_process Node.js stable)
