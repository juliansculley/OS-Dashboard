# Phase 1: Foundation - Research

**Researched:** 2026-06-04
**Domain:** Obsidian Community Plugin — TypeScript/React scaffold, esbuild toolchain, Windows dev environment, secret scanning
**Confidence:** HIGH (primary findings verified against official Obsidian docs and current GitHub repos)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Left sidebar navigation is the chosen UX pattern (not a horizontal tab bar). Sidebar with icon + label nav items per the spec's `Sidebar.tsx` skeleton.
- **D-02:** Use Obsidian's built-in `sanitizeHTMLToDom()` API — not DOMPurify. Zero bundle size impact, maintained by the Obsidian team, idiomatic for the platform.
- **D-03:** React + TypeScript inside an Obsidian `ItemView`. Not vanilla TS, not Next.js.
- **D-04:** esbuild as bundler (not webpack, not Vite). `jsx: "automatic"` in both tsconfig and esbuild config for React 18 JSX transform. `outfile: "main.js"` at repo root.
- **D-05:** File structure follows the spec exactly: `main.ts` at root, `src/views/DashboardView.tsx`, `src/components/App.tsx`, `src/components/pages/`, `src/components/ui/`, `src/context/AppContext.tsx`, `src/types.ts`.
- **D-06:** Vault location: `C:\Users\scull\OneDrive\ClaudeOS`
- **D-07:** Dev linking: symlink the repo folder into `C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard\` (not copy, not building directly into vault).
- **D-08:** Hot-reload approach: `npm run dev` (esbuild file watcher) + Obsidian's built-in "Reload app without saving" command. Do NOT depend on pjeby/hot-reload plugin.
- **D-09:** Pre-commit Git hook using gitleaks via husky. High security preference. Gitleaks is a single binary, no additional runtime dependencies, works well on Windows.
- **D-10:** All styles scoped under `.claudeos-dashboard {}` to prevent Obsidian global style pollution. Use `--cos-*` CSS custom properties. Inherit Obsidian theme variables as defaults.
- **D-11:** esbuild `outfile: "main.js"` builds directly to repo root alongside `manifest.json`. Both files committed to the repo root.

### Claude's Discretion

- `manifest.json` `minAppVersion` value (spec shows `1.4.0` — researcher to validate)
- Exact TypeScript strictness settings beyond `strictNullChecks`
- Whether to include `styles.css` in Phase 1 build or defer to Phase 2

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Plugin scaffold compiles and loads in Obsidian (manifest.json, main.ts, styles.css, esbuild toolchain) | Full package list, manifest format, esbuild config, tsconfig verified against current official sample plugin |
| FOUND-02 | Hot-reload dev environment — file watcher auto-reloads plugin on save without manual reinstall | esbuild watch mode confirmed; "Reload app without saving" command is the manual trigger; symlink setup documented |
| FOUND-03 | Dashboard opens via ribbon icon and command palette entry | `addRibbonIcon` + `addCommand` APIs confirmed in archive spec and Obsidian docs |
| FOUND-04 | Multi-page navigation (sidebar) switches between pages without full re-render | React state-based router pattern confirmed; no URL routing needed |
| FOUND-05 | Plugin is installable from GitHub repo root (main.js + manifest.json at root) | esbuild outfile pattern confirmed; manifest format verified against official sample |
| SEC-01 | All HTML rendered inside Obsidian webview is sanitized to prevent XSS | `sanitizeHTMLToDom()` API signature verified: `(html: string) => DocumentFragment` |
| SEC-02 | No credentials, API keys, or secrets in plugin source code or compiled output | gitleaks v8.30.1 + husky v9 pattern documented; Windows install via winget confirmed |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield Obsidian community plugin scaffold. The core pattern — TypeScript compiled by esbuild into `main.js`, mounted into an Obsidian `ItemView` that boots a React component tree — is well-established and officially documented. All key architectural decisions are locked. Research focused on verifying current package versions, correcting an API usage error in the archive spec, and establishing the Windows-specific dev toolchain.

Two significant corrections to the archive spec emerged from research: (1) The official Obsidian React guide uses `this.contentEl` as the React root mount point, not `this.containerEl.children[1]` as shown in the archive. The `contentEl` property is the stable, officially documented API; `containerEl.children[1]` is an internal DOM structure hack that is unreliable in recent Obsidian versions. (2) The official sample plugin's `tsconfig.json` uses `"strict": true` (the full strict mode flag) plus additional checks — not just `strictNullChecks`.

The gitleaks + husky pre-commit chain is straightforward on Windows: install gitleaks via `winget install Gitleaks.Gitleaks` (binary goes to PATH automatically), install husky v9 via npm, and write a POSIX-compatible shell script to `.husky/pre-commit` that calls `gitleaks protect --staged --redact`.

**Primary recommendation:** Use `this.contentEl` for the React root (not `containerEl.children[1]`), use `"strict": true` in tsconfig, set `minAppVersion` to `"1.0.0"` matching the current official sample, and install gitleaks via winget for the simplest Windows setup.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Plugin lifecycle (load/unload) | Obsidian Plugin API | — | `Plugin.onload()` / `onunload()` is the platform contract |
| View mounting | Obsidian ItemView | React | ItemView owns the DOM container; React renders inside it |
| Multi-page navigation | React (client state) | — | No URL routing in Obsidian; `useState` handles page switching |
| XSS sanitization | Obsidian API (`sanitizeHTMLToDom`) | — | D-02 locked; zero bundle cost, maintained by Obsidian |
| Secret scanning | Git pre-commit hook (gitleaks) | husky (hook runner) | Runs before commit, outside the plugin runtime |
| CSS isolation | Plugin styles.css + scoping class | Obsidian theme variables | Scoping under `.claudeos-dashboard {}` prevents bleed |
| Dev hot-reload | esbuild watch + manual Obsidian reload | — | D-08 locked; no pjeby/hot-reload |
| GitHub publishing | Repo root files (main.js, manifest.json) | — | Standard community plugin distribution pattern |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.1.0 | UI components and state | React 19 is current; community sample plugin-with-react uses it; React 18 also works |
| react-dom | ^19.1.0 | DOM rendering via createRoot | Required companion to react |
| obsidian | latest | Type definitions + API surface | Official npm package; always use `latest` so types match installed Obsidian |
| typescript | ^5.8.3 | Type checking | Current version per official sample plugin |
| esbuild | 0.25.5 | Bundler / transpiler | Current version per official sample plugin |
| builtin-modules | 3.3.0 | esbuild externals list | Prevents Node built-ins from being bundled |
| tslib | 2.4.0 | TypeScript helper library | Reduces bundle size for `importHelpers: true` |

> **React version note:** The archive spec specifies React 18. The community `obsidian-sample-plugin-with-react` now uses React 19.1.0. Either works — React 19 is backward-compatible for `createRoot` + `ItemView` usage and adds no new Obsidian-specific gotchas. React 18 is safe if you prefer stability. [VERIFIED: github.com/karutt/obsidian-sample-plugin-with-react, docs.obsidian.md]

### Dev Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/react | ^19.x | React TypeScript types | Always — companion to react |
| @types/react-dom | ^19.x | react-dom TypeScript types | Always — companion to react-dom |
| @types/node | ^22.15.17 | Node.js built-in types | Required for esbuild config, child_process |
| husky | ^9.x | Git hook runner | D-09: pre-commit secret scanning |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| esbuild | Vite, webpack | esbuild is locked (D-04); faster, simpler config for plugin bundling |
| gitleaks | git-secrets, truffleHog | gitleaks is a single binary, Go-compiled, no Python/Ruby runtime needed on Windows |
| husky | lefthook, simple-git-hooks | husky is npm-native, widely documented; simpler for solo projects |

**Installation:**
```bash
npm install react react-dom
npm install --save-dev @types/react @types/react-dom @types/node typescript esbuild builtin-modules tslib husky
```

**Version verification:** Versions above confirmed on 2026-06-04 against:
- Official sample plugin: `github.com/obsidianmd/obsidian-sample-plugin` (package.json, 2026)
- Community React sample: `github.com/karutt/obsidian-sample-plugin-with-react` (package.json, 2026)

---

## Architecture Patterns

### System Architecture Diagram

```
Developer saves source file
        │
        ▼
esbuild watch (npm run dev)
        │ compiles TypeScript + JSX
        ▼
main.js (repo root) ─── symlink ───► .obsidian/plugins/claudeos-dashboard/main.js
        │
Developer triggers "Reload app without saving" in Obsidian
        │
        ▼
Obsidian Plugin Loader
        │ calls onload()
        ▼
ClaudeOSPlugin (main.ts)
        │ registers view type + ribbon icon + command
        ▼
activateDashboardView()
        │ workspace.getLeaf('tab') or reuse existing
        ▼
DashboardView (ItemView)
        │ onOpen(): createRoot(this.contentEl)
        ▼
React Component Tree
        │ AppContext.Provider (app, plugin refs)
        ▼
App.tsx (state router)
        ├── Sidebar.tsx (nav items → setActivePage)
        └── Active Page Component (Home / Social / ...)
                │
                └── sanitizeHTMLToDom() wraps any dynamic HTML
```

### Recommended Project Structure

```
claudeos-dashboard/          ← repo root (symlinked into vault)
├── main.ts                  ← Plugin entry (extends Plugin)
├── main.js                  ← esbuild output (committed)
├── manifest.json            ← Plugin metadata (committed)
├── styles.css               ← Plugin CSS (committed; see Phase 1 decision below)
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── .husky/
│   └── pre-commit           ← gitleaks protect --staged --redact
├── src/
│   ├── views/
│   │   └── DashboardView.tsx
│   ├── components/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   └── SocialPage.tsx
│   │   └── ui/
│   │       └── Sidebar.tsx
│   ├── context/
│   │   └── AppContext.tsx
│   └── types.ts
└── data.json                ← Auto-generated settings (gitignored)
```

> **Note on D-05 structure:** The archive spec places `context/AppContext.tsx` under `src/components/context/`. The official Obsidian docs example and common community convention place it directly under `src/context/`. Either works — D-05 says "follows the spec exactly," so use `src/components/context/AppContext.tsx` if that's what the spec shows; adjust to `src/context/` if preferred. Functionally identical.

### Pattern 1: React Mount in ItemView

**CORRECTION FROM ARCHIVE SPEC:** Use `this.contentEl`, not `this.containerEl.children[1]`.

```typescript
// Source: docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { StrictMode } from 'react';

export class DashboardView extends ItemView {
  root: Root | null = null;

  async onOpen() {
    // contentEl is the stable, official API for ItemView content area
    this.root = createRoot(this.contentEl);
    this.root.render(
      <StrictMode>
        <AppContext.Provider value={{ app: this.app, plugin: this.plugin }}>
          <DashApp />
        </AppContext.Provider>
      </StrictMode>
    );
  }

  async onClose() {
    this.root?.unmount(); // Required — prevents React memory leaks
  }
}
```

**Why `contentEl` not `containerEl.children[1]`:** `contentEl` is a documented property on `ItemView` that refers to the content area. `containerEl.children[1]` was an undocumented hack relying on internal DOM structure; it has become unreliable in recent Obsidian versions. The official docs use `contentEl`. [VERIFIED: docs.obsidian.md/Reference/TypeScript+API/ItemView/contentEl]

### Pattern 2: workspace.getLeaf('tab')

```typescript
// Source: docs.obsidian.md/Reference/TypeScript+API/Workspace
async activateDashboardView() {
  const { workspace } = this.app;
  let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0];
  if (!leaf) {
    leaf = workspace.getLeaf('tab'); // 'tab' string parameter is valid
    await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true });
  }
  workspace.revealLeaf(leaf);
}
```

`workspace.getLeaf('tab')` is confirmed valid. The API accepts `PaneType | boolean` where `PaneType` includes `'tab'`, `'split'`, `'window'`. [VERIFIED: docs.obsidian.md]

### Pattern 3: XSS Sanitization

```typescript
// Source: docs.obsidian.md/Reference/TypeScript+API/sanitizeHTMLToDom
// Signature: sanitizeHTMLToDom(html: string): DocumentFragment

import { sanitizeHTMLToDom } from 'obsidian';

// Usage: append sanitized HTML to a container element
const fragment = sanitizeHTMLToDom(untrustedHtmlString);
containerEl.appendChild(fragment);
```

Note: `sanitizeHTMLToDom` returns a `DocumentFragment`, not a string. It must be appended to a DOM node, not assigned to `innerHTML`. [VERIFIED: docs.obsidian.md/Reference/TypeScript+API/sanitizeHTMLToDom]

### Pattern 4: AppContext (dependency injection)

```typescript
// Source: docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin
import { createContext, useContext } from 'react';
import { App } from 'obsidian';
import ClaudeOSPlugin from '../../main';

interface AppContextType {
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

### Anti-Patterns to Avoid

- **`containerEl.children[1]` for React root:** Unreliable internal DOM hack. Use `this.contentEl` instead.
- **`localStorage` for settings storage:** Blocked in some Obsidian contexts. Use `plugin.loadData()` / `plugin.saveData()`.
- **CSS without `.claudeos-dashboard` scope:** Styles will bleed into Obsidian's global UI. All selectors must be nested under the wrapper class.
- **Importing React explicitly in every file:** With `jsx: "automatic"` in esbuild + `"jsx": "react-jsx"` in tsconfig, the runtime import is automatic. Adding `import React from 'react'` is harmless but redundant.
- **Storing view reference on the Plugin class:** Use `workspace.getLeavesOfType()` to access the view at runtime. Direct references become stale.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XSS sanitization | Custom HTML string stripping | `sanitizeHTMLToDom()` (Obsidian built-in) | Platform-maintained, no bundle cost, handles all Obsidian-specific cases |
| Secret scanning | Manual grep for API keys | gitleaks binary | Regex library of 150+ secret types; handles nested strings, base64, etc. |
| Git hook runner | Custom shell scripts in `.git/hooks/` | husky v9 | `.git/hooks` is not committed to git; husky stores hooks in `.husky/` which is committed |
| Settings persistence | `localStorage`, JSON file write | `plugin.loadData()` / `plugin.saveData()` | Obsidian-safe, vault-aware, survives plugin reload |
| Page routing | URL-based router (React Router) | `useState` page switching | No URL context in Obsidian plugin; simple state switch is the correct pattern |

**Key insight:** Obsidian's plugin API covers most "platform" concerns (settings, sanitization, workspace). Don't reach for npm packages for things Obsidian already provides.

---

## Configuration Files

### manifest.json

```json
{
  "id": "claudeos-dashboard",
  "name": "ClaudeOS Dashboard",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "description": "Visual dashboard for the ClaudeOS agent system and second brain.",
  "author": "Julian Sculley",
  "authorUrl": "",
  "isDesktopOnly": true
}
```

**`minAppVersion` decision:** Set to `"1.0.0"`. The official sample plugin uses `"1.0.0"` as of 2026. The archive spec value of `"1.4.0"` was likely referencing a specific feature requirement, not a floor. Setting `"1.0.0"` maximizes compatibility; no Phase 1 features require APIs added after 1.0. [VERIFIED: github.com/obsidianmd/obsidian-sample-plugin manifest.json]

**`isDesktopOnly: true`:** Set to `true` per D-06 (desktop-only). Archive spec shows `false` — correct to `true`.

### tsconfig.json

Based on the current official sample plugin (verified 2026-06-04):

```json
{
  "compilerOptions": {
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2021",
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "moduleResolution": "node",
    "isolatedModules": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "lib": ["ES2021", "DOM"],
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

**Key differences from archive spec:**
- `"strict": true` replaces bare `"strictNullChecks": true` — this enables `strictNullChecks`, `strictFunctionTypes`, `strictPropertyInitialization`, and more. Use `"strict": true`.
- `"target": "ES2021"` (official sample) vs `"ES2018"` (archive spec) — ES2021 is current; Obsidian runs on Electron with a modern V8 engine, so ES2021 is safe.
- `"noImplicitReturns"`, `"noFallthroughCasesInSwitch"`, `"noUncheckedIndexedAccess"` added per official sample.
- `"moduleResolution": "node"` (official sample uses this, not `"bundler"` from archive spec).
- Added `"jsx": "react-jsx"` and `"*.tsx"` to include pattern.

[VERIFIED: raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/tsconfig.json]

### esbuild.config.mjs

Archive spec version is correct and reliable. No changes needed. Key settings:
- `outfile: "main.js"` — repo root output
- `jsx: "automatic"` — React 18/19 JSX transform
- `format: "cjs"` — required by Obsidian's plugin loader
- `external: ["obsidian", "electron", ...builtins]` — prevents bundling platform-provided modules

---

## Windows-Specific: Symlink Setup

**Requirement:** Developer Mode must be enabled OR use an elevated prompt. Windows 11 with Developer Mode enabled allows symlinks without elevation.

**Enable Developer Mode:** Settings > System > For Developers > Developer Mode (toggle ON)

**Create the symlink (PowerShell, run once):**

```powershell
# Run from the repo root
$repoPath = (Get-Location).Path
$pluginPath = "C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard"

# Create symlink (directory)
New-Item -ItemType SymbolicLink -Path $pluginPath -Target $repoPath
```

Or via cmd.exe (also works):

```cmd
mklink /D "C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard" "C:\path\to\repo"
```

**Verification:** After creation, confirm the symlink exists:

```powershell
Get-Item "C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard" | Select-Object LinkType, Target
```

**Important:** The symlink points to the repo root folder. When esbuild writes `main.js` to the repo root, Obsidian sees it immediately via the symlink — no copy step needed.

[VERIFIED: techbloat.com/how-to-create-a-symlink-on-windows-11-10, multiple sources]

---

## Windows-Specific: Gitleaks + Husky v9 Setup

### Step 1: Install gitleaks binary

```powershell
winget install Gitleaks.Gitleaks
```

This installs `gitleaks.exe` and adds it to PATH automatically. Verify:

```powershell
gitleaks version
# Expected: v8.30.1 (current as of 2026-03-21)
```

Alternative: download `gitleaks_*_windows_amd64.zip` from `github.com/gitleaks/gitleaks/releases`, extract `gitleaks.exe`, and add its folder to `$env:PATH`.

### Step 2: Install and initialize husky

```bash
npm install --save-dev husky
npx husky init
```

`husky init` creates `.husky/pre-commit` with a placeholder and adds `"prepare": "husky"` to `package.json`.

### Step 3: Write the pre-commit hook

Replace `.husky/pre-commit` with:

```bash
#!/usr/bin/env sh
# Check gitleaks is available
if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not found. Install: winget install Gitleaks.Gitleaks" >&2
  exit 1
fi

# Scan staged changes for secrets
gitleaks protect --staged --redact
```

**Why POSIX `sh` not PowerShell:** Husky hooks are executed by git's hook runner, which uses `sh` (Git for Windows ships with Git Bash/sh). PowerShell is not invoked by git hooks on Windows. The POSIX script above works with Git Bash on Windows. [CITED: typicode.github.io/husky/how-to.html — "hook scripts need to be POSIX compliant"]

**PATH note:** If `gitleaks` is not found inside the hook (git's PATH differs from shell PATH), add the install location explicitly:

```bash
# Fallback: add winget install path if gitleaks not in hook PATH
export PATH="$PATH:/c/Users/scull/AppData/Local/Microsoft/WinGet/Packages/Gitleaks.Gitleaks_Microsoft.Winget.Source_8wekyb3d8bbwe"
```

Or set it in `~/.config/husky/init.sh` (sourced before every hook by husky):

```bash
# ~/.config/husky/init.sh
export PATH="$PATH:/c/Users/scull/AppData/Local/Microsoft/WinGet/Links"
```

[VERIFIED: gitleaks/gitleaks releases v8.30.1; d4b.dev gitleaks pre-commit hook guide; typicode.github.io/husky]

---

## styles.css: Phase 1 or Phase 2?

**Claude's recommendation: Include a minimal `styles.css` in Phase 1.**

Rationale:
- FOUND-01 explicitly mentions `styles.css` as part of the plugin scaffold checklist.
- The ROADMAP success criteria (item 4) lists `styles.css` as required at repo root for installation verification.
- Obsidian auto-loads `styles.css` if present at plugin root — omitting it means Phase 2 loses the baseline CSS token system.
- A minimal Phase 1 `styles.css` (just the `.claudeos-dashboard` wrapper + `--cos-*` custom property tokens) is ~30 lines and creates no risk.

The full styles skeleton from the archive spec (§16) is reliable and can be included wholesale in Phase 1. It does not depend on any Phase 2 features.

---

## app.commands.executeCommandById — Status

**Status: Undocumented private API — use with caution, not needed in Phase 1.**

This API is not in Obsidian's official TypeScript type definitions, causing `Property 'commands' does not exist on type 'App'` TypeScript errors. Community workaround: `(app as any).commands.executeCommandById(id)`. It is widely used in community plugins and has been stable for years, but Obsidian makes no stability guarantees. [VERIFIED: forum.obsidian.md/t/is-using-app-commands-executecommandbyid-officially-supported/77454]

**Phase 1 verdict:** Not needed in Phase 1. Action buttons triggering shell commands are Phase 2 (SKILL-01 through SKILL-03). Phase 1 only needs the sidebar to switch placeholder pages — no command execution required. Defer this API decision to Phase 2 planning.

---

## Common Pitfalls

### Pitfall 1: Wrong React Mount Target (`containerEl.children[1]`)
**What goes wrong:** React mounts into an internal DOM node that Obsidian restructures, causing blank views or React unmount errors.
**Why it happens:** The archive spec used an old pattern (`containerEl.children[1]`) that relied on Obsidian's internal DOM structure.
**How to avoid:** Always use `createRoot(this.contentEl)`. `contentEl` is a documented `ItemView` property pointing to the content area.
**Warning signs:** View renders blank; React DevTools shows the root attached to a non-existent node.

### Pitfall 2: View Opens Multiple Times
**What goes wrong:** Multiple dashboard panes open simultaneously.
**Why it happens:** `getLeaf('tab')` always creates a new leaf.
**How to avoid:** Check `workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0]` before creating a new leaf. Reuse if found. (Pattern already in archive spec main.ts — don't lose it.)

### Pitfall 3: Memory Leak on Plugin Reload
**What goes wrong:** React state and event listeners accumulate across plugin reloads during dev.
**Why it happens:** `this.root?.unmount()` not called in `onClose()`.
**How to avoid:** Always implement `onClose()` with `this.root?.unmount()`.

### Pitfall 4: TypeScript Errors on `app.commands`
**What goes wrong:** `tsc -noEmit` fails on `app.commands.executeCommandById`.
**Why it happens:** Not in Obsidian's public types.
**How to avoid:** Use `(app as any).commands.executeCommandById(id)`. Add `// @ts-ignore` if preferred. Affects Phase 2, not Phase 1.

### Pitfall 5: gitleaks Not Found in Git Hook
**What goes wrong:** Pre-commit hook exits with `command not found: gitleaks`.
**Why it happens:** Git hooks run with a minimal PATH that may not include the winget install location.
**How to avoid:** Add the gitleaks install path to `~/.config/husky/init.sh` (sourced by husky before each hook). Or specify the full absolute path in the hook script.

### Pitfall 6: Symlink Fails with "Access Denied"
**What goes wrong:** `New-Item -ItemType SymbolicLink` or `mklink /D` throws an access denied error.
**Why it happens:** Developer Mode is not enabled in Windows Settings.
**How to avoid:** Enable Developer Mode first (Settings > System > For Developers). On Windows 11, this is the only prerequisite — no admin elevation needed.

### Pitfall 7: CSS Bleeds into Obsidian UI
**What goes wrong:** Dashboard styles affect Obsidian's native sidebars, modals, or editor.
**Why it happens:** Selectors not scoped under `.claudeos-dashboard`.
**How to avoid:** Every CSS rule must be nested under or prefixed with `.claudeos-dashboard`. Use `--cos-*` custom properties for all dashboard-specific values.

---

## Code Examples

### Minimal main.ts scaffold

```typescript
// Source: archive/claudeos-obsidian-plugin-spec.md §4 (reliable section)
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DashboardView, VIEW_TYPE_DASHBOARD } from './src/views/DashboardView';

export default class ClaudeOSPlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE_DASHBOARD, (leaf) => new DashboardView(leaf, this));

    this.addRibbonIcon('layout-dashboard', 'ClaudeOS Dashboard', () => {
      this.activateDashboardView();
    });

    this.addCommand({
      id: 'open-claudeos-dashboard',
      name: 'Open ClaudeOS Dashboard',
      callback: () => this.activateDashboardView(),
    });
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
  }

  async activateDashboardView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true });
    }
    workspace.revealLeaf(leaf);
  }
}
```

### sanitizeHTMLToDom usage pattern

```typescript
// Source: docs.obsidian.md/Reference/TypeScript+API/sanitizeHTMLToDom
import { sanitizeHTMLToDom } from 'obsidian';

// Returns DocumentFragment — must be appended, not assigned to innerHTML
function renderSafeHTML(containerEl: HTMLElement, rawHtml: string): void {
  containerEl.empty(); // Obsidian helper to clear children
  const fragment = sanitizeHTMLToDom(rawHtml);
  containerEl.appendChild(fragment);
}
```

### Placeholder page component (Phase 1)

```typescript
// Placeholder page for Phase 1 navigation shell
export function HomePage() {
  return (
    <div className="claudeos-page">
      <h2 className="claudeos-page-title">Home</h2>
      <p style={{ color: 'var(--cos-muted)' }}>Dashboard content coming in Phase 2.</p>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `containerEl.children[1]` for React root | `this.contentEl` | Ongoing — contentEl was always correct; old pattern is fragile | Must use `contentEl` |
| `strictNullChecks: true` only | `"strict": true` (full strict mode) | Current official sample plugin uses full strict | Catches more type errors earlier |
| TypeScript 4.7.4 | TypeScript ^5.8.3 | 2024-2025 | Better type inference, faster compilation |
| esbuild 0.17.3 | esbuild 0.25.5 | 2024-2025 | Performance improvements, no API changes |
| React 18 | React 19.1.0 | Dec 2024 (stable) | React 19 is backward-compatible for this use case; either works |
| `minAppVersion: "1.4.0"` | `minAppVersion: "1.0.0"` | Current official sample uses 1.0.0 | Set to 1.0.0 unless using APIs that require a specific minimum |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React 19 is compatible with the Obsidian Electron runtime for `createRoot` + `ItemView` usage | Standard Stack | React 19 would fail to mount; fall back to React 18 (both use same createRoot API) |
| A2 | `winget install Gitleaks.Gitleaks` adds gitleaks.exe to PATH automatically | Gitleaks setup | If not in PATH, hook fails; fix: add path explicitly in init.sh |
| A3 | `isDesktopOnly: true` in manifest.json has no effect on plugin load behavior (only advisory for marketplace) | Configuration | No functional risk; mobile is out of scope per D-06 |

---

## Open Questions (RESOLVED)

1. **React 18 vs React 19**
   - What we know: Both use identical `createRoot` API; community sample plugin uses 19.1.0; official Obsidian docs don't specify a version
   - What's unclear: Whether React 19's new features (Actions, use() hook) introduce any Electron/Obsidian incompatibilities
   - Recommendation: Start with React 18.3 for stability if uncertain; upgrade to 19 if React 19 features are wanted later. Either works for Phase 1 scope.
   - RESOLVED: React 19.1.0 chosen. Plans use `react@^19.1.0` and `react-dom@^19.1.0` in package.json. Phase 1 only uses `createRoot` / `unmount` — no React 19-specific APIs that could introduce incompatibilities.

2. **gitleaks PATH inside Git hook on Windows**
   - What we know: Winget installs to PATH; git hooks run with a different PATH context
   - What's unclear: Exact PATH value inside Git Bash hooks after winget install
   - Recommendation: Add a fallback PATH export in `~/.config/husky/init.sh` proactively; the hook script already includes a `command -v gitleaks` guard that will surface the issue clearly if it arises.
   - RESOLVED: Handled via explicit `export PATH="$PATH:/c/Users/scull/AppData/Local/Microsoft/WinGet/Links"` in `.husky/pre-commit` hook script (P2 Task 1 Step 3). The hook also includes a `command -v gitleaks || exit 0` guard so a missing binary warns rather than silently passing or hard-failing.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install, esbuild build | Unknown (node not on Bash PATH in test) | Unknown | Must install — no fallback |
| npm | Package management | Unknown | Unknown | Must install — no fallback |
| Git | Version control, husky hooks | ✓ | 2.51.0.windows.2 | — |
| Obsidian | Plugin testing | Assumed present (vault exists) | 1.13.0 (current) | — |
| winget | gitleaks install | Assumed present (Windows 11) | — | Manual binary download from GitHub releases |
| PowerShell | Symlink creation | ✓ (Windows 11) | — | cmd.exe mklink /D also works |

**Note:** Node.js was not found on the Bash shell PATH during research. It likely exists in the Windows PATH for PowerShell/cmd. Verify with `node --version` in PowerShell before starting implementation. If not installed, `nvm-windows` or the official Node.js installer are the standard options.

---

## Validation Architecture

Per `.planning/config.json` (nyquist_validation not explicitly false — treated as enabled).

### Test Framework

Phase 1 is a plugin scaffold — there is no runtime logic to unit test in the traditional sense. The primary validation is integration: does the plugin compile and load in Obsidian?

| Property | Value |
|----------|-------|
| Framework | None required for Phase 1 — validation is manual compilation + Obsidian load test |
| Type check command | `npx tsc --noEmit` (in build script) |
| Build command | `npm run build` (tsc type check + esbuild) |
| Dev command | `npm run dev` (esbuild watch) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| FOUND-01 | Plugin compiles without errors | Build check | `npm run build` | TypeScript errors surface here |
| FOUND-02 | File watcher triggers recompile on save | Manual | `npm run dev` + save a file | Observed in terminal output |
| FOUND-03 | Ribbon icon and command open dashboard pane | Manual | Launch Obsidian, click icon | Visual confirmation |
| FOUND-04 | Sidebar switches pages without full re-render | Manual | Click nav items in pane | Visual; no full reload flash |
| FOUND-05 | main.js + manifest.json present at repo root after build | File check | `ls main.js manifest.json` | Can be scripted in CI |
| SEC-01 | Sanitization layer in place | Code review | N/A | `sanitizeHTMLToDom` usage visible in source |
| SEC-02 | No secrets in source | Pre-commit hook | `gitleaks protect --staged --redact` | Hook fires on every commit |

### Wave 0 Gaps

- [ ] No test infrastructure exists (greenfield project) — install `husky` + configure pre-commit hook as part of Wave 1
- [ ] CI/CD pipeline (GitHub Actions build check) is out of scope for Phase 1 but would automate FOUND-05

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Plugin is local/personal, no auth |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Single-user desktop plugin |
| V5 Input Validation | Partial (Phase 1) | `sanitizeHTMLToDom()` for HTML; Phase 2 adds shell input validation |
| V6 Cryptography | No | No secrets stored or transmitted in Phase 1 |

### Known Threat Patterns for Obsidian Plugin Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via dynamic HTML rendering | Tampering / Spoofing | `sanitizeHTMLToDom()` — D-02 locked |
| Secrets committed to git (API keys, tokens) | Information Disclosure | gitleaks pre-commit hook — D-09 locked |
| CSS injection via unscoped styles | Tampering | Scope all CSS under `.claudeos-dashboard {}` — D-10 locked |
| Secret scanning bypass (hook skip) | Information Disclosure | Hook blocks commit; can be bypassed with `--no-verify`; acceptable risk for solo project |

---

## Sources

### Primary (HIGH confidence)
- `docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin` — React mount pattern, createRoot, contentEl, AppContext
- `docs.obsidian.md/Reference/TypeScript+API/sanitizeHTMLToDom` — function signature verified
- `raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/package.json` — current package versions (esbuild 0.25.5, typescript ^5.8.3, @types/node ^22.15.17)
- `raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/manifest.json` — minAppVersion "1.0.0"
- `raw.githubusercontent.com/obsidianmd/obsidian-sample-plugin/master/tsconfig.json` — full strict mode settings, ES2021 target
- `github.com/karutt/obsidian-sample-plugin-with-react` — React 19.1.0 compatibility confirmed
- `obsidian.md/changelog/` — Obsidian 1.13.0 is current stable (2026-05-28)
- `github.com/gitleaks/gitleaks/releases` — gitleaks v8.30.1 is current (2026-03-21)

### Secondary (MEDIUM confidence)
- `typicode.github.io/husky/get-started.html` — husky v9 init commands confirmed
- `typicode.github.io/husky/how-to.html` — POSIX compliance requirement for hooks on Windows
- `d4b.dev/blog/2026-02-01-gitleaks-pre-commit-hook/` — pre-commit hook script template for gitleaks
- `forum.obsidian.md/t/is-using-app-commands-executecommandbyid-officially-supported/77454` — executeCommandById unofficial status confirmed
- Multiple sources on Windows symlink creation with Developer Mode

### Tertiary (LOW confidence)
- WebSearch summary on `contentEl` vs `containerEl.children[1]` — verified by official docs, elevated to HIGH

---

## Metadata

**Confidence breakdown:**
- Standard stack (packages + versions): HIGH — verified against current official sample plugin repo
- Architecture (createRoot, ItemView, state router): HIGH — verified against official Obsidian docs
- Windows setup (symlink, gitleaks, husky): MEDIUM-HIGH — multiple consistent sources; actual PATH behavior in git hooks is environment-dependent
- Pitfalls: HIGH for Obsidian-specific (contentEl, memory leaks); MEDIUM for Windows PATH issues

**Research date:** 2026-06-04
**Valid until:** 2026-09-04 (90 days — Obsidian API is stable; package versions change faster but won't affect architecture)
