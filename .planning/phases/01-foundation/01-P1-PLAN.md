---
phase: 01-foundation
plan: P1
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - tsconfig.json
  - esbuild.config.mjs
  - manifest.json
  - main.ts
  - styles.css
  - .gitignore
autonomous: true
requirements:
  - FOUND-01
  - FOUND-02
  - FOUND-05

must_haves:
  truths:
    - "Running `npm run build` exits 0 and produces main.js at the repo root"
    - "Running `npm run dev` starts an esbuild file watcher that recompiles on source change"
    - "main.js and manifest.json both exist at the repo root (installable via BRAT)"
    - "styles.css exists at repo root with .claudeos-dashboard scope and --cos-* tokens"
    - "TypeScript reports zero errors on `npx tsc --noEmit`"
  artifacts:
    - path: "package.json"
      provides: "npm scripts (dev, build) and dependency declarations"
      contains: '"dev"'
    - path: "tsconfig.json"
      provides: "TypeScript compiler config"
      contains: '"strict": true'
    - path: "esbuild.config.mjs"
      provides: "Bundler config — watch mode + production build"
      contains: 'outfile: "main.js"'
    - path: "manifest.json"
      provides: "Obsidian plugin metadata"
      contains: '"id": "claudeos-dashboard"'
    - path: "main.ts"
      provides: "Plugin entry point — registers view, ribbon icon, command"
      contains: "class ClaudeOSPlugin extends Plugin"
    - path: "styles.css"
      provides: "CSS token system scoped under .claudeos-dashboard"
      contains: ".claudeos-dashboard"
    - path: ".gitignore"
      provides: "Excludes main.js build artifact and data.json from git"
      contains: "data.json"
  key_links:
    - from: "main.ts"
      to: "src/views/DashboardView.tsx"
      via: "import { DashboardView, VIEW_TYPE_DASHBOARD }"
      pattern: "VIEW_TYPE_DASHBOARD"
    - from: "esbuild.config.mjs"
      to: "main.js"
      via: "outfile: \"main.js\""
      pattern: "outfile"
---

<objective>
Bootstrap the complete TypeScript + esbuild toolchain for the ClaudeOS Obsidian plugin. This plan produces a compilable plugin scaffold: all config files, a working main.ts entry point with stubbed view registration, a CSS token system, and npm scripts for the dev watch loop and production build.

Purpose: Every subsequent plan depends on this foundation compiling cleanly.
Output: package.json, tsconfig.json, esbuild.config.mjs, manifest.json, main.ts (stub), styles.css, .gitignore — all at repo root. Running `npm run build` produces main.js.
</objective>

<execution_context>
@C:\Users\scull\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\scull\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\.planning\PROJECT.md
@C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\.planning\ROADMAP.md
@C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\.planning\REQUIREMENTS.md

<!-- Archive spec — reliable sections only: esbuild config (§build), tsconfig, manifest, main.ts scaffold -->
@C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\archive\claudeos-obsidian-plugin-spec.md

<interfaces>
<!-- Contracts the executor must implement exactly. Do not deviate. -->

LOCKED DECISIONS (NON-NEGOTIABLE):
- D-03: React + TypeScript inside Obsidian ItemView
- D-04: esbuild bundler; jsx: "automatic"; outfile: "main.js" at repo root
- D-05: file structure — main.ts at root, src/views/, src/components/, src/components/pages/, src/components/ui/, src/context/, src/types.ts
- D-08: npm run dev = esbuild file watcher; no pjeby/hot-reload dependency
- D-10: all CSS scoped under .claudeos-dashboard {}; --cos-* custom property namespace
- D-11: main.js and manifest.json committed at repo root

VERIFIED PACKAGE VERSIONS (from RESEARCH.md — use these exactly):
- react: ^19.1.0
- react-dom: ^19.1.0
- obsidian: latest
- typescript: ^5.8.3
- esbuild: 0.25.5
- builtin-modules: 3.3.0
- tslib: 2.4.0
- husky: ^9.x (installed here; configured in P2)
- @types/react: ^19.x
- @types/react-dom: ^19.x
- @types/node: ^22.15.17

TSCONFIG (exact — from RESEARCH.md verified against official sample):
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

MANIFEST.JSON (exact — from RESEARCH.md):
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

CSS TOKEN SYSTEM (exact tokens from UI-SPEC.md — do not add unlisted tokens):
.claudeos-dashboard {
  --cos-accent:        #7c6af7;
  --cos-accent-hover:  #6857e0;
  --cos-sidebar-width: 200px;
  --cos-radius:        8px;
  --cos-font-display:  'Satoshi', var(--font-interface, sans-serif);
  --cos-bg:         var(--background-primary);
  --cos-surface:    var(--background-secondary);
  --cos-surface-2:  var(--background-secondary-alt, var(--background-secondary));
  --cos-border:     var(--background-modifier-border);
  --cos-text:       var(--text-normal);
  --cos-muted:      var(--text-muted);
  --cos-faint:      var(--text-faint);
  --cos-font-mono:  var(--font-monospace);
}

VIEW_TYPE constant:
export const VIEW_TYPE_DASHBOARD = 'claudeos-dashboard-view';

ANTI-PATTERNS — do not use these:
- this.containerEl.children[1] for React root (use this.contentEl instead — RESEARCH.md §Pitfall 1)
- localStorage for settings (use plugin.loadData() / plugin.saveData())
- CSS without .claudeos-dashboard scope wrapper
- import React from 'react' in component files (jsx: "automatic" makes it implicit)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write all config files (package.json, tsconfig.json, esbuild.config.mjs, manifest.json, .gitignore)</name>
  <read_first>
    - C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\archive\claudeos-obsidian-plugin-spec.md (esbuild config section — reliable; manifest section — use corrected values from RESEARCH.md not archive values)
    - C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\.planning\phases\01-foundation\01-RESEARCH.md (verified package versions, corrected manifest values, tsconfig)
  </read_first>
  <files>
    package.json,
    tsconfig.json,
    esbuild.config.mjs,
    manifest.json,
    .gitignore
  </files>
  <action>
Create all five files at the repo root (C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\).

**package.json** — use the exact versions from RESEARCH.md (not the archive spec which has outdated versions):
```json
{
  "name": "claudeos-dashboard",
  "version": "1.0.0",
  "description": "Visual dashboard for the ClaudeOS agent system and second brain.",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc --noEmit && node esbuild.config.mjs production",
    "prepare": "husky"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.17",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "builtin-modules": "3.3.0",
    "esbuild": "0.25.5",
    "husky": "^9.0.0",
    "obsidian": "latest",
    "tslib": "2.4.0",
    "typescript": "^5.8.3"
  }
}
```

**tsconfig.json** — exact content from RESEARCH.md (do not use archive spec version):
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

**esbuild.config.mjs** — based on archive spec §build section (this section is reliable per CONTEXT.md), with jsx: "automatic" and correct target:
```javascript
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source visit the plugins github repository
*/`;

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ["main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2021",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  jsx: "automatic",
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

**manifest.json** — use corrected values from RESEARCH.md (not archive spec — archive has wrong minAppVersion and isDesktopOnly):
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

**.gitignore** — exclude build artifact and auto-generated settings:
```
node_modules/
main.js
main.js.map
data.json
```

Note: Per D-11, main.js IS committed to the repo root for distribution. Therefore remove `main.js` from .gitignore — it should be tracked. The .gitignore should only exclude: `node_modules/`, `main.js.map`, `data.json`.

Corrected .gitignore:
```
node_modules/
main.js.map
data.json
```
  </action>
  <verify>
    <automated>
      In PowerShell from C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\:
      Test-Path package.json
      Test-Path tsconfig.json
      Test-Path esbuild.config.mjs
      Test-Path manifest.json
      Test-Path .gitignore
      
      Select-String -Path package.json -Pattern '"react": "\^19'
      Select-String -Path package.json -Pattern '"esbuild": "0.25.5"'
      Select-String -Path tsconfig.json -Pattern '"strict": true'
      Select-String -Path tsconfig.json -Pattern '"jsx": "react-jsx"'
      Select-String -Path manifest.json -Pattern '"id": "claudeos-dashboard"'
      Select-String -Path manifest.json -Pattern '"isDesktopOnly": true'
      Select-String -Path manifest.json -Pattern '"minAppVersion": "1.0.0"'
      Select-String -Path esbuild.config.mjs -Pattern 'outfile: "main.js"'
      Select-String -Path esbuild.config.mjs -Pattern 'jsx: "automatic"'
    </automated>
  </verify>
  <acceptance_criteria>
    - package.json contains `"react": "^19.1.0"` and `"esbuild": "0.25.5"`
    - package.json contains scripts: `"dev"`, `"build"`, `"prepare"`
    - tsconfig.json contains `"strict": true` (not just `"strictNullChecks"`)
    - tsconfig.json contains `"jsx": "react-jsx"` and `"target": "ES2021"`
    - manifest.json contains `"id": "claudeos-dashboard"`, `"isDesktopOnly": true`, `"minAppVersion": "1.0.0"`
    - esbuild.config.mjs contains `outfile: "main.js"` and `jsx: "automatic"`
    - .gitignore contains `node_modules/` and `data.json` but does NOT exclude `main.js` (D-11: main.js is committed)
  </acceptance_criteria>
  <done>All five config files exist at repo root with exact specified content. Verified by Select-String checks.</done>
</task>

<task type="auto">
  <name>Task 2: Write main.ts plugin entry point and stub source files; run npm install and verify build</name>
  <read_first>
    - C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\.planning\phases\01-foundation\01-RESEARCH.md (main.ts scaffold, DashboardView pattern using this.contentEl, anti-patterns)
    - C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\archive\claudeos-obsidian-plugin-spec.md (§4 main.ts, §5 DashboardView, §6 AppContext — reliable sections; NOTE: ignore containerEl.children[1] — use this.contentEl per RESEARCH.md correction)
    - C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\.planning\phases\01-foundation\01-UI-SPEC.md (component inventory, nav items, page labels)
  </read_first>
  <files>
    main.ts,
    src/views/DashboardView.tsx,
    src/context/AppContext.tsx,
    src/components/App.tsx,
    src/components/ui/Sidebar.tsx,
    src/components/pages/HomePage.tsx,
    src/components/pages/SocialPage.tsx,
    src/types.ts,
    styles.css
  </files>
  <action>
Create the full Phase 1 source tree. All files are stubs — no real data, no skill triggers. The goal is a plugin that compiles, loads in Obsidian, shows a left sidebar, and switches between two placeholder pages.

**Step 1: npm install** (run first, before creating source files)
```powershell
cd C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard
npm install
```

**Step 2: Create directory structure**
```powershell
New-Item -ItemType Directory -Force -Path src\views
New-Item -ItemType Directory -Force -Path src\components\pages
New-Item -ItemType Directory -Force -Path src\components\ui
New-Item -ItemType Directory -Force -Path src\context
```

**Step 3: Write src/types.ts**
```typescript
// Shared TypeScript types for ClaudeOS Dashboard

export type PageId = 'home' | 'social';

export interface NavItem {
  id: PageId;
  label: string;
  iconId: string; // Lucide icon ID for Obsidian's setIcon()
}
```

**Step 4: Write src/context/AppContext.tsx**
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

**Step 5: Write src/views/DashboardView.tsx**
CRITICAL: Use `this.contentEl` NOT `this.containerEl.children[1]` (RESEARCH.md §Pitfall 1 correction).
```typescript
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { AppContext } from '../context/AppContext';
import { App as DashApp } from '../components/App';
import ClaudeOSPlugin from '../../main';

export const VIEW_TYPE_DASHBOARD = 'claudeos-dashboard-view';

export class DashboardView extends ItemView {
  root: Root | null = null;
  plugin: ClaudeOSPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeOSPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_DASHBOARD;
  }

  getDisplayText(): string {
    return 'ClaudeOS Dashboard';
  }

  getIcon(): string {
    return 'layout-dashboard';
  }

  async onOpen(): Promise<void> {
    // Use this.contentEl — the documented stable API for ItemView content area.
    // Do NOT use this.containerEl.children[1] — that is an undocumented internal hack.
    this.root = createRoot(this.contentEl);
    this.root.render(
      <StrictMode>
        <AppContext.Provider value={{ app: this.app, plugin: this.plugin }}>
          <DashApp />
        </AppContext.Provider>
      </StrictMode>
    );
  }

  async onClose(): Promise<void> {
    this.root?.unmount(); // Required — prevents React memory leaks on plugin reload
  }
}
```

**Step 6: Write src/components/App.tsx**
```typescript
import { useState } from 'react';
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

**Step 7: Write src/components/ui/Sidebar.tsx**
Use Obsidian Lucide icon IDs from UI-SPEC.md (not emoji stubs from archive spec):
```typescript
import { useRef, useEffect } from 'react';
import { setIcon } from 'obsidian';
import type { PageId, NavItem } from '../../types';

const NAV_ITEMS: NavItem[] = [
  { id: 'home',   label: 'Home',   iconId: 'layout-dashboard' },
  { id: 'social', label: 'Social', iconId: 'bar-chart-2' },
];

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

function NavItemButton({ item, isActive, onNavigate }: {
  item: NavItem;
  isActive: boolean;
  onNavigate: (page: PageId) => void;
}): React.JSX.Element {
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (iconRef.current) {
      setIcon(iconRef.current, item.iconId);
    }
  }, [item.iconId]);

  return (
    <button
      className={`claudeos-nav-item${isActive ? ' active' : ''}`}
      onClick={() => onNavigate(item.id)}
    >
      <span ref={iconRef} className="claudeos-nav-icon" />
      <span className="claudeos-nav-label">{item.label}</span>
    </button>
  );
}

export function Sidebar({ activePage, onNavigate }: SidebarProps): React.JSX.Element {
  return (
    <nav className="claudeos-sidebar">
      <div className="claudeos-logo">ClaudeOS</div>
      {NAV_ITEMS.map(item => (
        <NavItemButton
          key={item.id}
          item={item}
          isActive={activePage === item.id}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
```

**Step 8: Write src/components/pages/HomePage.tsx**
```typescript
export function HomePage(): React.JSX.Element {
  return (
    <div className="claudeos-page">
      <h2 className="claudeos-page-title">Home</h2>
      <p style={{ color: 'var(--cos-muted)' }}>Dashboard content coming in Phase 2.</p>
    </div>
  );
}
```

**Step 9: Write src/components/pages/SocialPage.tsx**
```typescript
export function SocialPage(): React.JSX.Element {
  return (
    <div className="claudeos-page">
      <h2 className="claudeos-page-title">Social</h2>
      <p style={{ color: 'var(--cos-muted)' }}>Social stats coming in Phase 2.</p>
    </div>
  );
}
```

**Step 10: Write main.ts plugin entry point**
```typescript
import { Plugin } from 'obsidian';
import { DashboardView, VIEW_TYPE_DASHBOARD } from './src/views/DashboardView';

export default class ClaudeOSPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(
      VIEW_TYPE_DASHBOARD,
      (leaf) => new DashboardView(leaf, this)
    );

    this.addRibbonIcon('layout-dashboard', 'ClaudeOS Dashboard', () => {
      this.activateDashboardView();
    });

    this.addCommand({
      id: 'open-claudeos-dashboard',
      name: 'Open ClaudeOS Dashboard',
      callback: () => {
        this.activateDashboardView();
      },
    });
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
  }

  async activateDashboardView(): Promise<void> {
    const { workspace } = this.app;
    // Reuse existing leaf — avoid opening duplicates
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true });
    }
    workspace.revealLeaf(leaf);
  }
}
```

**Step 11: Write styles.css** (exact tokens from UI-SPEC.md; all selectors scoped under .claudeos-dashboard per D-10):
```css
/* ClaudeOS Dashboard — styles.css
   All selectors scoped under .claudeos-dashboard to prevent global style bleed (D-10). */

@import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,600&display=swap');

.claudeos-dashboard {
  /* ── Brand tokens ── */
  --cos-accent:        #7c6af7;
  --cos-accent-hover:  #6857e0;

  /* ── Layout tokens ── */
  --cos-sidebar-width: 200px;
  --cos-radius:        8px;

  /* ── Font tokens ── */
  --cos-font-display:  'Satoshi', var(--font-interface, sans-serif);
  --cos-font-mono:     var(--font-monospace);

  /* ── Surface tokens — inherit from Obsidian theme ── */
  --cos-bg:         var(--background-primary);
  --cos-surface:    var(--background-secondary);
  --cos-surface-2:  var(--background-secondary-alt, var(--background-secondary));
  --cos-border:     var(--background-modifier-border);

  /* ── Text tokens — inherit from Obsidian theme ── */
  --cos-text:       var(--text-normal);
  --cos-muted:      var(--text-muted);
  --cos-faint:      var(--text-faint);

  /* ── Root layout ── */
  display: flex;
  height: 100%;
  font-family: var(--cos-font-display);
  background: var(--cos-bg);
  color: var(--cos-text);
}

/* Sidebar */
.claudeos-dashboard .claudeos-sidebar {
  width: var(--cos-sidebar-width);
  background: var(--cos-surface);
  border-right: 1px solid var(--cos-border);
  display: flex;
  flex-direction: column;
  padding: 16px 8px;
  gap: 8px;
  flex-shrink: 0;
}

/* Logo / wordmark */
.claudeos-dashboard .claudeos-logo {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cos-accent);
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--cos-border);
}

/* Nav items */
.claudeos-dashboard .claudeos-nav-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: var(--cos-radius);
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  color: var(--cos-muted);
  width: 100%;
  text-align: left;
  transition: background 150ms, color 150ms;
}

.claudeos-dashboard .claudeos-nav-item:hover {
  background: var(--cos-surface-2);
  color: var(--cos-text);
}

.claudeos-dashboard .claudeos-nav-item.active {
  background: color-mix(in oklch, var(--cos-accent) 15%, transparent);
  color: var(--cos-accent);
  font-weight: 600;
}

.claudeos-dashboard .claudeos-nav-icon {
  display: flex;
  align-items: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Main content area */
.claudeos-dashboard .claudeos-main {
  flex: 1;
  overflow: auto;
  padding: 24px 32px;
}

/* Page layout */
.claudeos-dashboard .claudeos-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.claudeos-dashboard .claudeos-page-title {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  margin: 0 0 24px 0;
  color: var(--cos-text);
}
```

**Step 12: Run build and verify**
```powershell
cd C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard
npm run build
```
Expect: tsc type check passes (0 errors), then esbuild writes main.js to repo root, then process exits 0.
  </action>
  <verify>
    <automated>
      In PowerShell from C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\:

      # Source files exist
      Test-Path main.ts
      Test-Path src\views\DashboardView.tsx
      Test-Path src\context\AppContext.tsx
      Test-Path src\components\App.tsx
      Test-Path src\components\ui\Sidebar.tsx
      Test-Path src\components\pages\HomePage.tsx
      Test-Path src\components\pages\SocialPage.tsx
      Test-Path src\types.ts
      Test-Path styles.css

      # Build output exists
      Test-Path main.js

      # Critical content checks
      Select-String -Path main.ts -Pattern "class ClaudeOSPlugin extends Plugin"
      Select-String -Path src\views\DashboardView.tsx -Pattern "this\.contentEl" -SimpleMatch
      Select-String -Path src\views\DashboardView.tsx -Pattern "containerEl\.children\[1\]" -SimpleMatch
      # The last grep should return NO match (containerEl.children[1] must not appear)
      Select-String -Path src\context\AppContext.tsx -Pattern "createContext"
      Select-String -Path styles.css -Pattern "\.claudeos-dashboard"
      Select-String -Path styles.css -Pattern "--cos-accent"
      Select-String -Path styles.css -Pattern "--cos-accent-hover"

      # Build exits 0
      npm run build; $LASTEXITCODE
    </automated>
  </verify>
  <acceptance_criteria>
    - All 9 source files exist at correct paths under D-05 structure
    - main.ts contains `class ClaudeOSPlugin extends Plugin`
    - DashboardView.tsx contains `this.contentEl` and does NOT contain `containerEl.children[1]`
    - DashboardView.tsx contains `this.root?.unmount()` in onClose()
    - AppContext.tsx exports `AppContext` and `useAppContext`
    - styles.css contains `.claudeos-dashboard` as the outer scope wrapper
    - styles.css contains all 13 `--cos-*` token declarations from UI-SPEC.md
    - main.js exists at repo root after `npm run build`
    - `npm run build` exits with code 0 (tsc + esbuild both succeed)
  </acceptance_criteria>
  <done>Plugin compiles cleanly. main.js at repo root. All source files exist. `npm run build` exits 0.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Developer machine → git repo | Secrets in source committed to version history |
| esbuild bundle → Obsidian runtime | Malicious bundled code could affect vault |
| External CDN (Fontshare) → Obsidian renderer | Remote CSS import loads in Obsidian WebView |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-P1-01 | Information Disclosure | git commit history | mitigate | husky + gitleaks pre-commit hook blocks secrets before they enter history (D-09; configured in P2) |
| T-01-P1-02 | Tampering | styles.css @import from Fontshare CDN | accept | Fontshare is a legitimate CDN; CSS @import cannot execute JavaScript; fallback to `var(--font-interface)` if offline. Risk: CDN injection of CSS is theoretically possible but CVSS low for a personal local plugin with no PII. |
| T-01-P1-03 | Tampering | esbuild bundle including unvetted npm packages | mitigate | All production deps are react, react-dom (well-maintained). All Obsidian APIs are external (not bundled). Lock versions in package.json; run `npm audit` after install. |
| T-01-P1-04 | Information Disclosure | data.json (Obsidian settings file) | mitigate | data.json is .gitignored — not committed to repo. No secrets stored in Phase 1 settings (Phase 1 has no settings). |
</threat_model>

<verification>
After both tasks complete:

1. `npm run build` exits 0 — TypeScript reports zero errors and main.js is written to repo root
2. `Test-Path main.js` returns True
3. `Test-Path manifest.json` returns True — both required for BRAT installation (FOUND-05)
4. `Select-String -Path src/views/DashboardView.tsx -Pattern "containerEl.children\[1\]"` returns NO match (confirms correct mount target)
5. `npm run dev` starts esbuild in watch mode without errors (Ctrl+C to stop)
</verification>

<success_criteria>
- Plugin scaffold compiles with zero TypeScript errors (FOUND-01)
- `npm run dev` starts a file watcher that recompiles on source change (FOUND-02)
- main.js and manifest.json both present at repo root, styles.css present (FOUND-05)
- All source files at paths matching D-05 file structure
- CSS token system established with all 13 --cos-* tokens from UI-SPEC.md (D-10)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-P1-SUMMARY.md` using the summary template.
</output>
