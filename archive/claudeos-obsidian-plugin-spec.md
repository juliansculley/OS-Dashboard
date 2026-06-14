# ClaudeOS Obsidian Dashboard Plugin — Research Spec for Coding Agent

> **Purpose:** Hand-off document for a coding agent. Contains all architectural decisions, API patterns, code skeletons, and styling guidance needed to build the plugin without redundant documentation research. Skip to any section relevant to current work.

---

## 1. Technology Decision: React vs. Vanilla JS vs. Next.js

### Next.js — NOT applicable
Obsidian plugins are **not web servers**. Next.js requires a Node.js runtime and a request/response model. It cannot run inside Obsidian's Electron renderer. **Eliminate immediately.**

### React (recommended for this project)
Obsidian's official docs provide a React integration guide. React is the right call for a **multi-page dashboard** with:
- Component reuse across pages (Home, Social Stats, etc.)
- State management per page
- Conditional rendering for MCP-triggered states
- Context API for global app/plugin references

**Official Obsidian React docs:** https://docs.obsidian.md/Plugins/Getting+started/Use+React+in+your+plugin

### Vanilla TypeScript
Acceptable for simple single-view plugins. For a multi-page dashboard with buttons, dynamic data, and conditional rendering — React wins on maintainability.

**Decision: React + TypeScript inside an ItemView**

---

## 2. Plugin File Structure

```
claudeos-dashboard/              ← lives in .obsidian/plugins/
├── main.ts                      ← Plugin entry point (extends Plugin)
├── manifest.json                ← Plugin metadata
├── styles.css                   ← Plugin-scoped CSS (Obsidian loads this automatically)
├── package.json
├── tsconfig.json
├── esbuild.config.mjs           ← Build config
├── src/
│   ├── views/
│   │   └── DashboardView.tsx    ← ItemView wrapper (mounts React)
│   ├── components/
│   │   ├── App.tsx              ← Root React component, router/page manager
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   └── SocialPage.tsx
│   │   ├── ui/
│   │   │   ├── Sidebar.tsx      ← Nav between pages
│   │   │   ├── StatCard.tsx
│   │   │   └── ActionButton.tsx ← Triggers Claude skills
│   │   └── context/
│   │       └── AppContext.tsx   ← Provides Obsidian `app` + plugin refs
│   └── types.ts                 ← Shared TypeScript interfaces
└── data.json                    ← Auto-generated settings storage
```

---

## 3. manifest.json

```json
{
  "id": "claudeos-dashboard",
  "name": "ClaudeOS Dashboard",
  "version": "1.0.0",
  "minAppVersion": "1.4.0",
  "description": "Visual dashboard for the ClaudeOS agent system and second brain.",
  "author": "Occam",
  "authorUrl": "",
  "isDesktopOnly": false
}
```

---

## 4. main.ts — Plugin Entry Point

```typescript
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DashboardView, VIEW_TYPE_DASHBOARD } from './src/views/DashboardView';
import { ClaudeOSSettings, DEFAULT_SETTINGS, ClaudeOSSettingTab } from './src/settings';

export default class ClaudeOSPlugin extends Plugin {
  settings: ClaudeOSSettings;

  async onload() {
    await this.loadSettings();

    // Register the custom view
    this.registerView(
      VIEW_TYPE_DASHBOARD,
      (leaf) => new DashboardView(leaf, this)
    );

    // Ribbon icon to open dashboard
    this.addRibbonIcon('layout-dashboard', 'ClaudeOS Dashboard', () => {
      this.activateDashboardView();
    });

    // Command palette entry
    this.addCommand({
      id: 'open-claudeos-dashboard',
      name: 'Open ClaudeOS Dashboard',
      callback: () => this.activateDashboardView(),
    });

    // Settings tab
    this.addSettingTab(new ClaudeOSSettingTab(this.app, this));
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
  }

  async activateDashboardView() {
    const { workspace } = this.app;

    // Avoid opening duplicates — reuse existing leaf
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0];
    if (!leaf) {
      // Open in a new tab in the main editor area
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({
        type: VIEW_TYPE_DASHBOARD,
        active: true,
      });
    }
    workspace.revealLeaf(leaf);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

---

## 5. DashboardView.tsx — ItemView + React Mount Point

This is the bridge between Obsidian's leaf system and React.

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

  getViewType() {
    return VIEW_TYPE_DASHBOARD;
  }

  getDisplayText() {
    return 'ClaudeOS Dashboard';
  }

  // Optional: set an icon for the tab
  getIcon() {
    return 'layout-dashboard';
  }

  async onOpen() {
    this.root = createRoot(this.containerEl.children[1]);
    this.root.render(
      <StrictMode>
        {/* Provide Obsidian app + plugin to all React children */}
        <AppContext.Provider value={{ app: this.app, plugin: this.plugin }}>
          <DashApp />
        </AppContext.Provider>
      </StrictMode>
    );
  }

  async onClose() {
    this.root?.unmount();
  }
}
```

**Key notes:**
- `this.containerEl.children[1]` is the content area (index 0 is the view header).
- Always call `this.root?.unmount()` in `onClose()` to avoid React memory leaks.
- Never store view references in the Plugin class — use `getLeavesOfType()` to access them.

---

## 6. AppContext.tsx — Global Obsidian Access in React

```typescript
import { createContext, useContext } from 'react';
import { App } from 'obsidian';
import ClaudeOSPlugin from '../../main';

interface AppContextType {
  app: App;
  plugin: ClaudeOSPlugin;
}

export const AppContext = createContext<AppContextType | null>(null);

// Hook for easy consumption in any child component
export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppContext.Provider');
  return context;
}
```

Usage in any component:
```typescript
const { app, plugin } = useAppContext();
// Access vault: app.vault.getMarkdownFiles()
// Access settings: plugin.settings
```

---

## 7. Multi-Page Routing (No External Router Needed)

Obsidian plugins don't use URL routing. Implement simple state-based page switching in React.

```typescript
// src/components/App.tsx
import { useState } from 'react';
import { Sidebar } from './ui/Sidebar';
import { HomePage } from './pages/HomePage';
import { SocialPage } from './pages/SocialPage';

type PageId = 'home' | 'social';

const PAGES: Record<PageId, React.ComponentType> = {
  home: HomePage,
  social: SocialPage,
};

export function App() {
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

```typescript
// src/components/ui/Sidebar.tsx
type PageId = 'home' | 'social';

const NAV_ITEMS = [
  { id: 'home' as PageId,   label: 'Home',   icon: '🏠' },
  { id: 'social' as PageId, label: 'Social',  icon: '📊' },
];

export function Sidebar({ activePage, onNavigate }: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <nav className="claudeos-sidebar">
      <div className="claudeos-logo">⚙ ClaudeOS</div>
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          className={`claudeos-nav-item ${activePage === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
```

---

## 8. Action Buttons — Triggering Claude Skills / Commands

### Pattern A: Trigger any Obsidian command by ID
```typescript
// Inside a React component
const { app } = useAppContext();

function triggerSkill(commandId: string) {
  // @ts-ignore — executeCommandById is not in the public API type defs but works
  app.commands.executeCommandById(commandId);
}

// Example usage
<button onClick={() => triggerSkill('shell-commands:my-claude-skill-id')}>
  Run Daily Brief
</button>
```

### Pattern B: Run a custom function defined in the plugin
```typescript
// Define in plugin settings/main.ts
plugin.settings.skills = [
  { id: 'daily-brief', label: 'Daily Brief', commandId: 'shell-commands:daily-brief' },
  { id: 'memory-sync',  label: 'Memory Sync',  commandId: 'shell-commands:memory-sync' },
];

// ActionButton component
export function ActionButton({ skill }: { skill: SkillConfig }) {
  const { app } = useAppContext();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    // @ts-ignore
    await app.commands.executeCommandById(skill.commandId);
    setLoading(false);
  }

  return (
    <button
      className={`claudeos-action-btn ${loading ? 'loading' : ''}`}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? '⏳' : '▶'} {skill.label}
    </button>
  );
}
```

### Pattern C: Trigger Shell Commands plugin directly
Since you have the **Shell Commands** community plugin installed, you can wire buttons to specific shell command IDs. Find a command ID by opening the command palette and hovering — the ID appears in the Shell Commands settings panel.

---

## 9. MCP Integration Architecture

MCPs are **external processes** that communicate via stdio/SSE. The plugin doesn't spawn them — it reads their output or calls a bridge.

### Recommended Architecture

```
Obsidian Plugin (UI)
      │
      ▼
  Plugin Settings (data.json) ← stores MCP endpoint URLs, tokens
      │
      ▼
  HTTP/WebSocket fetch() calls to local MCP bridge server
      │  (e.g., http://localhost:3333/mcp)
      ▼
  MCP Bridge Process (runs externally, managed by shell commands)
      │
      ├── Claude API MCP
      ├── LinkedIn MCP (data feed)
      └── X/Twitter MCP (data feed)
```

### Fetching Data from Local MCP Bridge

```typescript
// src/hooks/useMCPData.ts
import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export function useMCPData<T>(endpoint: string) {
  const { plugin } = useAppContext();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const baseUrl = plugin.settings.mcpBridgeUrl; // e.g. "http://localhost:3333"
    fetch(`${baseUrl}${endpoint}`)
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { data, error, loading };
}
```

Usage in a page:
```typescript
const { data: socialData, loading } = useMCPData<SocialStats>('/social/stats');
```

### Settings for MCP config

```typescript
// src/settings.ts
export interface ClaudeOSSettings {
  mcpBridgeUrl: string;
  skills: SkillConfig[];
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
}

export const DEFAULT_SETTINGS: ClaudeOSSettings = {
  mcpBridgeUrl: 'http://localhost:3333',
  skills: [],
  theme: 'auto',
  accentColor: '#7c6af7',
};
```

---

## 10. Displaying Social Data (LinkedIn, X)

The dashboard **displays** data — it doesn't fetch directly from LinkedIn/X APIs (which require OAuth, CORS proxies, etc.). The MCP bridge handles fetching; the plugin just renders it.

### Data Shape (define in types.ts)

```typescript
export interface SocialStats {
  linkedin: {
    followers: number;
    profileViews: number;
    postImpressions: number;
    connectionCount: number;
    lastUpdated: string;
  };
  twitter: {
    followers: number;
    following: number;
    tweets: number;
    impressions: number;
    profileViews: number;
    lastUpdated: string;
  };
}
```

### SocialPage.tsx skeleton

```typescript
export function SocialPage() {
  const { data, loading, error } = useMCPData<SocialStats>('/social/stats');

  if (loading) return <div className="claudeos-loading">Loading social data…</div>;
  if (error)   return <div className="claudeos-error">⚠ {error}</div>;

  return (
    <div className="claudeos-page">
      <h2 className="claudeos-page-title">Social Media</h2>

      <section className="claudeos-section">
        <h3>LinkedIn</h3>
        <div className="claudeos-stat-grid">
          <StatCard label="Followers"       value={data.linkedin.followers} />
          <StatCard label="Profile Views"   value={data.linkedin.profileViews} />
          <StatCard label="Post Impressions" value={data.linkedin.postImpressions} />
          <StatCard label="Connections"     value={data.linkedin.connectionCount} />
        </div>
      </section>

      <section className="claudeos-section">
        <h3>X (Twitter)</h3>
        <div className="claudeos-stat-grid">
          <StatCard label="Followers"  value={data.twitter.followers} />
          <StatCard label="Impressions" value={data.twitter.impressions} />
        </div>
      </section>
    </div>
  );
}
```

---

## 11. Branding: Colors, Fonts, and Theming

### Approach: CSS Custom Properties Scoped to Plugin

Obsidian's own design system uses CSS variables (e.g. `--color-base-00`, `--interactive-accent`). Your plugin CSS should:
1. Define its own `--claudeos-*` variables in `styles.css`
2. Default to Obsidian's variables (so the plugin respects user themes)
3. Allow overrides via plugin settings → a `<style>` tag injected at runtime

### styles.css skeleton

```css
/* ─── ClaudeOS Dashboard Plugin Styles ─── */
/* Scoped under .claudeos-dashboard to avoid polluting Obsidian global styles */

.claudeos-dashboard {
  /* Brand tokens — override these for custom branding */
  --cos-accent:        #7c6af7;         /* Purple brand accent */
  --cos-accent-hover:  #6857e0;
  --cos-sidebar-width: 200px;
  --cos-font-display:  'Inter', var(--font-interface);
  --cos-font-mono:     var(--font-monospace);

  /* Surface tokens — inherit from Obsidian theme by default */
  --cos-bg:            var(--background-primary);
  --cos-surface:       var(--background-secondary);
  --cos-border:        var(--background-modifier-border);
  --cos-text:          var(--text-normal);
  --cos-text-muted:    var(--text-muted);
  --cos-text-faint:    var(--text-faint);

  /* Layout */
  display: flex;
  height: 100%;
  font-family: var(--cos-font-display);
  background: var(--cos-bg);
  color: var(--cos-text);
}
```

### Obsidian CSS Variables Reference (key ones)

| Variable | Usage |
|---|---|
| `--background-primary` | Main canvas background |
| `--background-secondary` | Sidebar / panel backgrounds |
| `--background-modifier-border` | Borders and dividers |
| `--text-normal` | Primary text |
| `--text-muted` | Secondary text |
| `--text-faint` | Disabled / placeholder text |
| `--interactive-accent` | Obsidian's theme accent (purple by default) |
| `--font-interface` | Obsidian's UI font |
| `--font-monospace` | Monospace font |

Full reference: https://docs.obsidian.md/Reference/CSS+variables/CSS+variables

### Runtime Theme Injection (for user-customizable accent color)

```typescript
// In DashboardView.tsx or a React useEffect
useEffect(() => {
  const style = document.createElement('style');
  style.id = 'claudeos-theme-override';
  style.textContent = `
    .claudeos-dashboard {
      --cos-accent: ${plugin.settings.accentColor};
    }
  `;
  document.head.appendChild(style);
  return () => style.remove();
}, [plugin.settings.accentColor]);
```

### Font Loading in Electron/Obsidian

Obsidian runs in Electron, which means web fonts via CDN **do work** in the renderer. You can load Google Fonts or Fontshare from within your React component's `useEffect` or directly in `styles.css` via `@import`:

```css
/* In styles.css — fonts load via Electron's renderer */
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap');

.claudeos-dashboard {
  --cos-font-display: 'Satoshi', var(--font-interface);
}
```

---

## 12. Settings Tab

```typescript
// src/settings.ts (add to same file as interface)
import { App, PluginSettingTab, Setting } from 'obsidian';
import ClaudeOSPlugin from '../main';

export class ClaudeOSSettingTab extends PluginSettingTab {
  plugin: ClaudeOSPlugin;

  constructor(app: App, plugin: ClaudeOSPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'ClaudeOS Dashboard Settings' });

    new Setting(containerEl)
      .setName('MCP Bridge URL')
      .setDesc('Local URL for your MCP bridge server (e.g., http://localhost:3333)')
      .addText(text => text
        .setPlaceholder('http://localhost:3333')
        .setValue(this.plugin.settings.mcpBridgeUrl)
        .onChange(async (value) => {
          this.plugin.settings.mcpBridgeUrl = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Accent Color')
      .setDesc('Brand color for the dashboard (hex)')
      .addText(text => text
        .setPlaceholder('#7c6af7')
        .setValue(this.plugin.settings.accentColor)
        .onChange(async (value) => {
          this.plugin.settings.accentColor = value;
          await this.plugin.saveSettings();
        }));
  }
}
```

---

## 13. package.json + Build Setup

```json
{
  "name": "claudeos-dashboard",
  "version": "1.0.0",
  "scripts": {
    "dev":   "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production"
  },
  "dependencies": {
    "react":     "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react":      "^18.0.0",
    "@types/react-dom":  "^18.0.0",
    "@types/node":       "^16.11.6",
    "builtin-modules":   "3.3.0",
    "esbuild":           "0.17.3",
    "obsidian":          "latest",
    "tslib":             "2.4.0",
    "typescript":        "4.7.4"
  }
}
```

### esbuild.config.mjs

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
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  jsx: "automatic",   // ← required for React 18 JSX transform (no import React needed)
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2018",
    "allowImportingTsExtensions": true,
    "jsx": "react-jsx",
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "bundler",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["ES6", "DOM"],
    "noEmit": true
  },
  "exclude": ["node_modules"]
}
```

---

## 14. Interaction with Existing Plugins

| Installed Plugin | Integration opportunity |
|---|---|
| **Shell Commands** | Wire ActionButtons to shell command IDs — trigger Claude skills, MCP syncs |
| **Dataview** | Query vault metadata in plugin via `app.plugins.plugins['dataview']?.api` |
| **CustomJS** | Invoke registered CustomJS classes from plugin code |
| **Terminal** | Open terminal from plugin using `app.commands.executeCommandById('terminal:open')` |

### Accessing Dataview API from React:
```typescript
const { app } = useAppContext();
const dvApi = (app as any).plugins.plugins['dataview']?.api;
if (dvApi) {
  const pages = dvApi.pages('"Projects"'); // Dataview query
}
```

---

## 15. Mockup Strategy (HTML Prototype First)

Before building the full plugin, build an **HTML mockup** to validate layout and styling. This is a static HTML file — no build required.

### Recommended approach:
1. Build `claudeos-mockup.html` as a single-file prototype
2. Use the same CSS variables and class names you'll use in the plugin
3. Validate layout, colors, fonts, and navigation feel
4. Carry the proven `styles.css` directly into the plugin

### Mockup structure:
```html
<!DOCTYPE html>
<html data-theme="dark">
<head>
  <!-- Load the same font you'll use in the plugin -->
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" rel="stylesheet">
  <style>
    /* Copy CSS variable tokens from planned styles.css */
    :root[data-theme="dark"] {
      --cos-bg: #1e1e2e;
      --cos-surface: #252535;
      --cos-accent: #7c6af7;
      /* ... */
    }
  </style>
</head>
<body>
  <!-- Static mock of dashboard with sidebar + pages -->
</body>
</html>
```

---

## 16. Complete Styles Skeleton (styles.css)

```css
/* ─── Scoping wrapper ─── */
.claudeos-dashboard {
  --cos-accent:        #7c6af7;
  --cos-accent-hover:  #6857e0;
  --cos-sidebar-width: 200px;
  --cos-radius:        8px;
  --cos-font-display:  'Satoshi', var(--font-interface, sans-serif);

  /* Inherit from Obsidian theme */
  --cos-bg:         var(--background-primary);
  --cos-surface:    var(--background-secondary);
  --cos-surface-2:  var(--background-secondary-alt, var(--background-secondary));
  --cos-border:     var(--background-modifier-border);
  --cos-text:       var(--text-normal);
  --cos-muted:      var(--text-muted);
  --cos-faint:      var(--text-faint);

  display: flex;
  height: 100%;
  overflow: hidden;
  font-family: var(--cos-font-display);
  background: var(--cos-bg);
  color: var(--cos-text);
}

/* ─── Sidebar ─── */
.claudeos-sidebar {
  width: var(--cos-sidebar-width);
  background: var(--cos-surface);
  border-right: 1px solid var(--cos-border);
  display: flex;
  flex-direction: column;
  padding: 16px 8px;
  gap: 4px;
  flex-shrink: 0;
}

.claudeos-logo {
  font-size: 14px;
  font-weight: 700;
  color: var(--cos-accent);
  padding: 8px 12px 16px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.claudeos-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--cos-radius);
  font-size: 14px;
  color: var(--cos-muted);
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  transition: background 150ms, color 150ms;
}

.claudeos-nav-item:hover {
  background: var(--cos-surface-2);
  color: var(--cos-text);
}

.claudeos-nav-item.active {
  background: color-mix(in oklch, var(--cos-accent) 15%, transparent);
  color: var(--cos-accent);
  font-weight: 600;
}

/* ─── Main content area ─── */
.claudeos-main {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

/* ─── Page ─── */
.claudeos-page {}

.claudeos-page-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--cos-text);
}

/* ─── Section ─── */
.claudeos-section {
  margin-bottom: 32px;
}

.claudeos-section h3 {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--cos-muted);
  margin-bottom: 12px;
}

/* ─── Stat grid ─── */
.claudeos-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

/* ─── Stat card ─── */
.claudeos-stat-card {
  background: var(--cos-surface);
  border: 1px solid var(--cos-border);
  border-radius: var(--cos-radius);
  padding: 16px;
}

.claudeos-stat-card .stat-label {
  font-size: 12px;
  color: var(--cos-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.claudeos-stat-card .stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--cos-text);
  font-variant-numeric: tabular-nums;
}

.claudeos-stat-card .stat-delta {
  font-size: 12px;
  color: var(--color-green, #4caf50);
  margin-top: 4px;
}

/* ─── Action buttons (Claude skill triggers) ─── */
.claudeos-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--cos-accent);
  color: #fff;
  border: none;
  border-radius: var(--cos-radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms;
}

.claudeos-action-btn:hover { background: var(--cos-accent-hover); }
.claudeos-action-btn.loading { opacity: 0.7; cursor: not-allowed; }

/* ─── Loading / error states ─── */
.claudeos-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--cos-muted);
  font-size: 14px;
}

.claudeos-error {
  padding: 16px;
  background: color-mix(in oklch, var(--color-red, #e53e3e) 10%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-red, #e53e3e) 30%, transparent);
  border-radius: var(--cos-radius);
  color: var(--cos-text);
  font-size: 14px;
}
```

---

## 17. Key Obsidian API Reference (Quick Lookup)

| Need | API call |
|---|---|
| Get all markdown files | `app.vault.getMarkdownFiles()` |
| Read a file | `await app.vault.read(file)` |
| Write a file | `await app.vault.modify(file, content)` |
| Create a file | `await app.vault.create(path, content)` |
| Show a notice/toast | `new Notice('message', 4000)` |
| Open a file in a new tab | `app.workspace.getLeaf('tab').openFile(file)` |
| Get plugin settings | `plugin.settings` |
| Save plugin settings | `await plugin.saveSettings()` |
| Execute a command | `app.commands.executeCommandById('command-id')` |
| Get active file | `app.workspace.getActiveFile()` |
| Listen to vault events | `this.registerEvent(app.vault.on('create', cb))` |
| Open a modal | `new MyModal(app).open()` |

---

## 18. Development Workflow

```bash
# 1. Clone official sample plugin as starter
git clone https://github.com/obsidianmd/obsidian-sample-plugin claudeos-dashboard
cd claudeos-dashboard
npm install

# 2. Install React
npm install react react-dom
npm install --save-dev @types/react @types/react-dom

# 3. Symlink or copy into vault for live testing
# Option A: develop directly inside vault
cp -r claudeos-dashboard ~/.obsidian/plugins/claudeos-dashboard

# Option B: symlink
ln -s $(pwd) "/path/to/vault/.obsidian/plugins/claudeos-dashboard"

# 4. Run dev build (watches for changes)
npm run dev

# 5. In Obsidian: Settings > Community Plugins > Enable Hot Reload
#    (install "Hot Reload" community plugin by pjeby for instant reload on save)
```

**Recommended dev plugins:**
- `pjeby/hot-reload` — auto-reloads plugin on file change (skip manual disable/enable cycle)
- Obsidian's own "Reload app without saving" command palette action

---

## 19. Potential Gotchas

| Issue | Solution |
|---|---|
| `React is not defined` on JSX | Set `"jsx": "react-jsx"` in tsconfig + `jsx: "automatic"` in esbuild |
| View opens multiple times | Use `getLeavesOfType()` check before creating new leaf (already in main.ts above) |
| Memory leaks on close | Always call `this.root?.unmount()` in `onClose()` |
| `localStorage` blocked | Obsidian blocks localStorage in some contexts — use `plugin.loadData()` / `plugin.saveData()` instead |
| CSS bleeds into Obsidian | Scope ALL selectors under `.claudeos-dashboard { }` |
| Dataview API access | Use `(app as any).plugins.plugins['dataview']?.api` — unofficial but standard pattern |
| `executeCommandById` not typed | Use `// @ts-ignore` or extend the `App` type locally |
| fetch() to external APIs | Works fine in Electron renderer — no CORS issues for localhost; remote APIs may need CORS headers |
| Font loading offline | Electron can load web fonts — but if vault is used offline, embed fonts in assets/ instead |

---

## 20. Recommended Build Order for Coding Agent

1. **Scaffold** — `manifest.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`
2. **Stub main.ts** — Plugin class with ribbon icon, command, view registration
3. **DashboardView.tsx** — ItemView + React mount (verify it opens as a tab)
4. **App.tsx + Sidebar** — State-based router with 2 pages
5. **styles.css** — Full CSS token system (copy from §16 above)
6. **HomePage** — Stat cards with hardcoded mock data first
7. **SocialPage** — Same, with mock data
8. **ActionButton** — Wire to shell command IDs
9. **useMCPData hook** — Swap mock data for fetch calls
10. **Settings tab** — MCP URL, accent color
11. **HTML mockup** — Build `claudeos-mockup.html` for visual preview before/during plugin development

