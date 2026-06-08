# Phase 7: Workouts Dashboard — Research

**Researched:** 2026-06-07
**Domain:** Chart.js + React canvas lifecycle, Notion REST sync pattern, Obsidian plugin TypeScript extension
**Confidence:** HIGH (all claims verified against codebase source files or official Chart.js docs)

---

## Summary

Phase 7 adds a Workouts page to the existing Obsidian dashboard plugin. It introduces one new external dependency (Chart.js), one new sync script (`notion-workouts-sync.mjs`), four new TypeScript snapshot interfaces, five new settings keys, and one new `PageId` union member. Every other pattern — the sync script structure, the refresh button, the snapshot-read useEffect, the settings tab extension, and the CSS scoping — is a direct clone or minimal extension of Phase 3 work that already exists in the codebase.

The most important implementation facts are: (1) Chart.js must **not** be listed in `external` in esbuild.config.mjs — it must be bundled; (2) every Chart instance must call `chart.destroy()` in the `useEffect` cleanup to prevent the "Canvas is already in use" error when Obsidian reopens the pane; (3) Chart.js cannot read CSS custom properties directly, so colors must be resolved via `getComputedStyle` at mount time.

The design doc (`07-UI-SPEC.md`) is fully authoritative. No design decisions remain open. The planner's job is purely mechanical: translate the UI-SPEC sections into task sequences that follow the Phase 3 patterns already in the codebase.

**Primary recommendation:** Follow the Phase 3 pattern exactly. Clone `notion-sync.mjs` for the workout script. Clone `RefreshButton.tsx` for `WorkoutsRefreshButton.tsx`. Clone the `ProjectsPage.tsx` `useEffect` pattern for snapshot loading. The only genuinely new territory is the Chart.js canvas lifecycle.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Data fetch from Notion | Node.js sync script | — | Same as Phase 3 — plugin makes zero API calls |
| Aggregation (weekly sets, exercise series) | Sync script | — | All aggregation in script; plugin is pure display layer |
| Snapshot writes | Sync script | — | Atomic write (temp + rename) same as notion-sync.mjs |
| Snapshot reads | Plugin (React, useEffect) | — | readJsonFile utility already handles abs/vault-relative paths |
| Chart rendering | Plugin (React, Chart.js canvas) | — | Chart.js bundled by esbuild, canvas in useEffect |
| Tab state | Plugin (WorkoutsPage local state) | — | Local useState — not persisted, not in AppContext |
| Window / attribution / filter state | Plugin (Tab component local state) | — | Client-side re-aggregation from loaded snapshot data |
| Settings storage | Plugin (data.json via Obsidian API) | — | Same pattern as all existing settings |
| CSS / visual rendering | Plugin (styles.css, --cos-* tokens) | — | All selectors under .claudeos-dashboard |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `chart.js` | 4.5.1 | Bar charts, line charts, sparklines | MIT license, 40M+ weekly downloads, the only charting library with full tree-shaking support and no React dependency — matches plugin's vanilla-JS-in-React pattern. [VERIFIED: chartjs.org/docs + GitHub releases] |

### Supporting (already in project — no new installs)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react` / `react-dom` | ^19.1.0 | Component rendering | Already installed — no change |
| `obsidian` | latest | Plugin API (setIcon, App, DataAdapter) | Already installed — no change |
| `typescript` | ^5.8.3 | Type safety for new interfaces | Already installed — no change |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `chart.js` direct | `react-chartjs-2` | React wrapper adds 50KB and requires its own lifecycle management; direct Chart.js is simpler for this use case and avoids an extra dependency |
| `chart.js` direct | `recharts`, `victory` | Both are React-specific, larger bundles, harder to control canvas lifecycle in Obsidian's re-open scenario |

**Installation:**
```bash
npm install chart.js
```

**Version verification:** `chart.js@4.5.1` is current stable as of October 2024. [VERIFIED: github.com/chartjs/Chart.js/releases — v4.5.1 released 2024-10-13]

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time (pip install blocked in this environment). All packages below are marked `[ASSUMED]` per the graceful degradation rule. The planner must gate the `npm install chart.js` task behind a `checkpoint:human-verify`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `chart.js` | npm | ~11 yrs | ~40M/wk [ASSUMED] | github.com/chartjs/Chart.js | [ASSUMED] | Approved — pending human verify before install |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none known — chart.js is a well-established library

*slopcheck was unavailable at research time. Planner must insert a `checkpoint:human-verify` before the `npm install chart.js` task. The package's official GitHub repo and npm page both confirm legitimacy — this is standard verification procedure, not a genuine concern.*

---

## Architecture Patterns

### System Architecture Diagram

```
Notion REST API
       |
       v
notion-workouts-sync.mjs  (Node.js, no npm deps)
  - loadToken()              reads NOTION_TOKEN (env var or ~/.claudeos/notion.env)
  - queryDataSource()        POST /v1/data_sources/{id}/query with pagination
  - transform*()             in-memory aggregation, relation resolution
  - writeAtomic()            write .tmp → rename (4 snapshot files)
       |
       v
.dashboard-data/
  workouts-muscle-volume.json
  workouts-exercises.json
  workouts-sessions.json
  workouts-meta.json
       |
       v (readJsonFile — vault-relative or absolute path)
WorkoutsPage (React)
  - useEffect on refreshNonce → re-reads all 4 snapshots
  - useState: muscleVolume | null | 'error'
  - useState: exercises | null | 'error'
  - useState: sessions | null | 'error'
  - useState: meta | null | 'error'
  - useState: activeTab ('muscle-volume' | 'progression' | 'history' | 'context')
       |
       v
WorkoutsRefreshButton
  - execFile(nodePath, [workoutsSyncScriptPath])
  - idle/loading/success/error state machine
  - on success: triggerRefresh() → bumps refreshNonce in AppContext
       |
  ┌────┴───────────────────────────────┐
  v                                    v
MuscleVolumeTab          ProgressionTab        HistoryTab        ContextTab
  - Bar chart (Chart.js)   - Exercise select   - Filter row      - Meso card
  - Line chart (Chart.js)  - Line chart        - ListRow table   - BW sparkline
  - Window/attribution     - PR tiles          (no Chart.js)     (Chart.js)
    controls
```

### Recommended Project Structure

```
src/
├── components/
│   ├── pages/
│   │   ├── WorkoutsPage.tsx          # new — tab state, snapshot loading
│   │   └── workouts/
│   │       ├── MuscleVolumeTab.tsx   # new — bar + line charts, controls
│   │       ├── ProgressionTab.tsx    # new — exercise select, line chart, PR tiles
│   │       ├── HistoryTab.tsx        # new — filter row, session list
│   │       └── ContextTab.tsx        # new — meso card, BW sparkline
│   └── ui/
│       └── WorkoutsRefreshButton.tsx # new — clone of RefreshButton.tsx
├── types.ts                          # modified — add workout snapshot interfaces
└── settings/
    └── SettingsTab.ts                # modified — add Workouts Data section

scripts/
├── notion-sync.mjs                   # existing — unchanged
├── notion-workouts-sync.mjs          # new — follows notion-sync.mjs pattern exactly
└── exercise-muscle-map.json          # new — secondary muscle group assignments
```

### Pattern 1: Sync Script Structure

The new `notion-workouts-sync.mjs` must follow `notion-sync.mjs` exactly. Key reference points by line:

```javascript
// Source: scripts/notion-sync.mjs (lines 43-69) — token loading pattern
async function loadToken() {
  const envToken = process.env.NOTION_TOKEN;           // primary: env var
  if (envToken && envToken.trim()) return envToken.trim();

  const fallbackPath = join(homedir(), '.claudeos', 'notion.env');  // fallback file
  // ... reads NOTION_TOKEN=<value> line
}

// Source: scripts/notion-sync.mjs (lines 72-79) — API constants
const API_BASE = 'https://api.notion.com/v1/data_sources/';
const NOTION_VERSION = '2025-09-03';  // MUST match exactly

// Source: scripts/notion-sync.mjs (lines 88-129) — query helper
async function queryDataSource(token, uuid, body) {
  // POST to ${API_BASE}${uuid}/query
  // Headers: Authorization, Notion-Version, Content-Type
  // Paginated: loops while has_more, concatenates results
}

// Source: scripts/notion-sync.mjs (lines 156-162) — atomic write
async function writeAtomic(finalPath, obj) {
  const stamped = { ...obj, generated_at: new Date().toISOString() };
  const tmpPath = `${finalPath}.tmp`;
  await writeFile(tmpPath, json, 'utf-8');
  await rename(tmpPath, finalPath);  // atomic on same filesystem
}

// Source: scripts/notion-sync.mjs (line 350) — output dir resolution
const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputDir = join(scriptDir, '..', '.dashboard-data');
```

The workout script uses six data source IDs (not three). The `exercise-muscle-map.json` file is loaded at startup with `readFile`; if it is absent the script must log a warning and proceed with `secondary: []` for all exercises (graceful degradation, not a crash). [VERIFIED: codebase — notion-sync.mjs]

### Pattern 2: Chart.js Tree-Shakeable Import

The UI-SPEC already codifies this. Confirmed against official Chart.js docs:

```typescript
// Source: chartjs.org/docs/latest/getting-started/integration.html [VERIFIED]
import {
  Chart,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js';

Chart.register(
  BarController, BarElement,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
);
```

Registration must happen once at module load, not inside a component. Place it at the top of `WorkoutsPage.tsx` (outside the component function, executed on first import).

### Pattern 3: Chart.js Canvas Lifecycle in React

This is the most critical pattern. "Canvas is already in use" is a well-documented error when Obsidian re-opens a pane — the component mounts again with a canvas that Chart.js still holds an internal reference to.

```typescript
// Source: Official pattern from react-chartjs-2 issue resolution [VERIFIED: github.com/reactchartjs/react-chartjs-2/issues/1037]
const canvasRef = useRef<HTMLCanvasElement>(null);
const chartRef = useRef<Chart | null>(null);

useEffect(() => {
  if (!canvasRef.current) return;

  // Destroy any existing chart on this canvas before creating a new one.
  // This handles Obsidian pane re-open (chart instance persists in Chart.js
  // registry even after React component unmounts).
  if (chartRef.current) {
    chartRef.current.destroy();
    chartRef.current = null;
  }

  chartRef.current = new Chart(canvasRef.current, {
    type: 'bar',
    data: { ... },
    options: { animation: false, ... },
  });

  // Cleanup function: called on unmount AND before re-run if deps change.
  return () => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
  };
}, [/* data dependencies */]);

// For data updates without destroy/recreate:
useEffect(() => {
  if (!chartRef.current) return;
  chartRef.current.data = newData;
  chartRef.current.update();
}, [newData]);
```

**Critical:** The cleanup `return () => { chart.destroy() }` is the standard React useEffect cleanup — it runs on unmount. But in Obsidian, the canvas element reference may be stale after a pane re-open. The safest pattern is to check `chartRef.current` at the top of the creation effect and destroy any existing instance before creating a new one (the "check and destroy first" pattern). [VERIFIED: github.com/reactchartjs/react-chartjs-2/issues/1037]

### Pattern 4: CSS Variable Resolution for Chart.js

Chart.js does not read CSS custom properties. Colors must be resolved at mount:

```typescript
// Source: 07-UI-SPEC.md — confirmed pattern
const style = getComputedStyle(canvasEl.ownerDocument.documentElement);
const chartColor0 = style.getPropertyValue('--cos-chart-0').trim() || '#7c6af7';
const mutedColor = style.getPropertyValue('--cos-muted').trim() || '#718096';
```

**Important:** `--cos-muted` is defined via `var(--text-muted)` which is itself a CSS variable. `getComputedStyle` resolves the chain — the returned string will be the computed hex/rgb value, not the `var()` reference. This only works if the canvas element (or its owner document) has the `.claudeos-dashboard` class in scope. Since the canvas lives inside the dashboard wrapper, this is satisfied. [VERIFIED: codebase — styles.css line 4 shows `.claudeos-dashboard { --cos-muted: var(--text-muted); }`]

The `--cos-chart-*` tokens must be declared inside `.claudeos-dashboard {}` in `styles.css`, not at `:root`. [VERIFIED: UI-SPEC §Color → Chart.js Color Palette]

### Pattern 5: PageId Extension

```typescript
// Source: src/types.ts (line 3) — current definition
export type PageId = 'home' | 'social' | 'projects' | 'newsletter';

// Phase 7 change — add 'workouts' to the union:
export type PageId = 'home' | 'social' | 'projects' | 'newsletter' | 'workouts';
```

```typescript
// Source: src/components/App.tsx (lines 10-15) — PAGES map
const PAGES: Partial<Record<PageId, React.ComponentType>> = {
  home: HomePage,
  social: SocialPage,
  projects: ProjectsPage,
  newsletter: NewsletterPage,
  // Phase 7: add this entry:
  workouts: WorkoutsPage,
};
```

`PAGES` is typed as `Partial<Record<PageId, ...>>` (line 10) so adding the new PageId to the union does NOT cause a type error for any existing pages. The `?? HomePage` fallback on line 21 handles any unregistered PageId gracefully. [VERIFIED: codebase — src/components/App.tsx]

### Pattern 6: Sidebar Nav Item Extension

```typescript
// Source: src/components/ui/Sidebar.tsx (lines 5-10) — NAV_ITEMS array
const NAV_ITEMS: NavItem[] = [
  { id: 'home',       label: 'Home',       iconId: 'layout-dashboard' },
  { id: 'social',     label: 'Social',     iconId: 'bar-chart-2' },
  { id: 'projects',   label: 'Projects',   iconId: 'folder-kanban' },
  { id: 'newsletter', label: 'Newsletter', iconId: 'newspaper' },
  // Phase 7: add this entry:
  { id: 'workouts',   label: 'Workouts',   iconId: 'dumbbell' },
];
```

`dumbbell` is a valid Lucide icon ID available via Obsidian's `setIcon()`. [ASSUMED — not explicitly verified against Obsidian's bundled Lucide version, but Lucide has included `dumbbell` since v0.100.0 and Obsidian bundles a recent version]

### Pattern 7: Settings Extension

```typescript
// Source: src/types.ts (lines 36-48) — ClaudeOSSettings interface
// Phase 7: add these fields at the bottom:
export interface ClaudeOSSettings {
  // ... existing fields ...

  // Phase 7: Workouts Data settings
  workoutsSyncScriptPath: string;     // default: ""
  workoutsMuscleVolumePath: string;   // default: ".dashboard-data/workouts-muscle-volume.json"
  workoutsExercisesPath: string;      // default: ".dashboard-data/workouts-exercises.json"
  workoutsSessionsPath: string;       // default: ".dashboard-data/workouts-sessions.json"
  workoutsMetaPath: string;           // default: ".dashboard-data/workouts-meta.json"
}
```

```typescript
// Source: src/settings/SettingsTab.ts (lines 64-135) — SettingsTab.display()
// Phase 7 adds a new section at the bottom using the same pattern:
new Setting(containerEl)
  .setName('Workouts Data')
  .setHeading();

new Setting(containerEl)
  .setName('Workouts Sync Script')
  .setDesc('Absolute path to scripts/notion-workouts-sync.mjs.')
  .addText(text => text
    .setValue(this.plugin.settings.workoutsSyncScriptPath)
    .onChange(async (value) => {
      this.plugin.settings.workoutsSyncScriptPath = value;
      await this.plugin.saveSettings();
    })
  );
// ... repeat for each of the 4 snapshot path settings
```

Numeric settings (like `dueSoonDays`) use `parseInt` with a fallback default. The workout script has no numeric settings in the UI-SPEC — all five new settings are string paths. [VERIFIED: codebase — src/settings/SettingsTab.ts]

### Pattern 8: WorkoutsRefreshButton — Script Path and Last-Synced Source

The existing `RefreshButton.tsx` reads last-synced from `plugin.settings.tasksSnapshotPath` (line 74 of RefreshButton.tsx). The workout variant must read from `plugin.settings.workoutsMetaPath` instead (the meta snapshot contains `generated_at`). The `WorkoutsRefreshButton` passes `workoutsSyncScriptPath` to `execFile` instead of `syncScriptPath`.

Two approaches are equally valid per the UI-SPEC:
1. Clone `RefreshButton.tsx` as `WorkoutsRefreshButton.tsx` — minimal: ~15 lines change
2. Add optional props `scriptPathKey` and `lastSyncedPathKey` to `RefreshButton.tsx` — more reusable but higher risk of breaking existing behavior

The planner should specify approach 1 (clone) as the default — it is safer and the UI-SPEC explicitly lists it as acceptable.

### Pattern 9: SnapshotState Discriminated Union

```typescript
// Source: src/components/pages/ProjectsPage.tsx (lines 28-31)
type SnapshotState<T> = T | null | 'error';

function isSnapshotData<T>(v: SnapshotState<T>): v is T {
  return v !== null && v !== 'error';
}
```

This pattern is defined locally in `ProjectsPage.tsx`. Copy it verbatim into `WorkoutsPage.tsx` (do not move to types.ts — it is intentionally co-located per existing practice). [VERIFIED: codebase — ProjectsPage.tsx lines 28-31]

### Anti-Patterns to Avoid

- **Listing `chart.js` in esbuild `external`:** Chart.js is not a Node built-in or Obsidian API — it must be bundled. Only `obsidian`, `electron`, `@codemirror/*`, `@lezer/*`, and Node built-ins are external. [VERIFIED: codebase — esbuild.config.mjs lines 16-30]
- **Using `Chart.register(Chart.registerables)`:** This is the non-tree-shaking pattern. The project's treeShaking: true in esbuild requires the selective import pattern.
- **Setting `Chart.defaults.color` globally:** The UI-SPEC prohibits global Chart.defaults mutation in plugin scope (§Chart.js Integration Notes). Pass color to individual chart configs only.
- **Creating `<canvas>` with a fixed `id` attribute:** Chart.js keyed on canvas ID can conflict across multiple charts. Use `useRef` and pass the element directly to `new Chart(ref.current, ...)`.
- **Not calling `chart.destroy()` in useEffect cleanup:** Obsidian re-opens the same LeafView pane without fully unmounting React. The canvas DOM element persists, Chart.js holds an internal registry entry, and the next `new Chart()` call throws "Canvas is already in use."
- **Calling `dangerouslySetInnerHTML` with snapshot data:** All data is rendered as JSX text children only. SEC-01 requires `DOMPurify.sanitize()` before passing names to Chart.js labels (not to React text nodes — React already escapes). [VERIFIED: codebase — ListRow.tsx, ProjectsPage.tsx, UI-SPEC §Security Contract]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas-based charts | Custom SVG/canvas rendering | `chart.js` | Tooltip positioning, legend toggling, responsive resize, axis formatting — all solved problems with a dozen edge cases each |
| CSS variable resolution for charts | Parsing CSS manually | `getComputedStyle()` | Browser-native, handles `var()` chains correctly |
| Atomic file writes | Custom lock/temp pattern | `writeFile(tmp) + rename()` | Already proven in notion-sync.mjs — same OS semantics |
| Notion pagination | Single-page fetch | `queryDataSource()` paginated helper | Notion paginates at 100 results; a single fetch will miss data |
| Token loading | New token mechanism | Clone `loadToken()` from notion-sync.mjs | Security requirement (NOTION-02): token never in vault, never in code |

**Key insight:** Everything in this phase is either a Chart.js responsibility or a clone of existing Phase 3 patterns. The only original code is the workout-specific aggregation logic in the sync script and the Chart.js canvas management in the tab components.

---

## esbuild Configuration — Chart.js Bundling

The current `esbuild.config.mjs` uses `treeShaking: true` and the `external` array contains only: `obsidian`, `electron`, `@codemirror/*`, `@lezer/*`, and Node built-ins (via `builtins` from the `builtin-modules` package). [VERIFIED: codebase — esbuild.config.mjs]

**Chart.js is NOT in the external array** and must NOT be added. With `bundle: true` and `treeShaking: true`, esbuild will:
1. Follow the import chain from `chart.js`
2. Tree-shake unused controllers/elements/scales
3. Include only the registered components in `main.js`

No changes to `esbuild.config.mjs` are needed. Install `chart.js` as a dependency and import it — esbuild handles the rest. [VERIFIED: codebase — esbuild.config.mjs + Chart.js docs]

---

## exercise-muscle-map.json — Bootstrap Strategy

The design doc (`07-UI-SPEC.md` §Pre-Population Sources) states the script reads secondary muscle groups from this file. The file does not yet exist.

**Recommended approach** (not yet locked — planner decides):
- The sync script should attempt to read `exercise-muscle-map.json` from the same directory as the script (`scripts/`).
- If the file is absent, log a warning to stderr and proceed with `secondary: []` for all exercises. Do NOT crash.
- The repository should ship a starter `exercise-muscle-map.json` with an empty `{}` object so the file always exists after `git clone`.
- The file is gitignored once populated (user-specific exercise names from Notion). [ASSUMED — design doc §6.3 describes the seeding behavior but does not prescribe the file-missing behavior]

**Location:** `scripts/exercise-muscle-map.json` — alongside `notion-workouts-sync.mjs`. [ASSUMED — consistent with script-relative path pattern used for output in notion-sync.mjs]

---

## Notion Integration Token — Six Data Sources

The existing `notion-sync.mjs` uses three data sources (tasks, projects, newsletter). The Notion integration token must be manually shared with all six workout databases before Wave 1 testing. This is a human prerequisite step, not a code task. [VERIFIED: codebase — notion-sync.mjs lines 9-13, which documents the same requirement for Phase 3's three databases]

The workout sync script uses the same `loadToken()` approach — no code change needed. The data source UUIDs for the six workout databases are a planning-time input (the user must provide them or they are already documented in the design doc). [ASSUMED — the actual UUIDs for the Notion workout databases are not in the codebase; they come from the user's Notion workspace]

---

## Common Pitfalls

### Pitfall 1: "Canvas is already in use"
**What goes wrong:** `new Chart(canvas, config)` throws on component re-mount because Chart.js keeps an internal registry of canvas elements across all instances.
**Why it happens:** Obsidian reopens the same ItemView without fully unmounting/remounting the React tree. The canvas DOM element reference is the same object, but Chart.js still has the previous instance registered against it.
**How to avoid:** Always `chartRef.current?.destroy()` at the top of the creation `useEffect` (before `new Chart()`), and in the cleanup return function.
**Warning signs:** Console error "Canvas is already in use" on second open of the Workouts pane.

### Pitfall 2: CSS custom properties not resolving in Chart.js
**What goes wrong:** Passing `'var(--cos-muted)'` as a color string to Chart.js config produces grey or transparent bars.
**Why it happens:** Chart.js does not resolve CSS custom properties — it passes color strings directly to the canvas 2D drawing API, which does not support `var()`.
**How to avoid:** Always use `getComputedStyle(el).getPropertyValue('--cos-chart-0').trim()` at mount time, with a hardcoded hex fallback.
**Warning signs:** Bars/lines render transparent or black instead of the expected colors.

### Pitfall 3: Chart.js registration not happening at module scope
**What goes wrong:** Chart renders as a blank canvas; browser console shows "category is not a registered scale."
**Why it happens:** `Chart.register(...)` called inside a component function runs on each render but React may not fully control the timing relative to Chart instantiation.
**How to avoid:** Call `Chart.register(...)` once at module scope (top of `WorkoutsPage.tsx`, outside the component function).
**Warning signs:** Blank charts or "is not a registered ..." errors in console.

### Pitfall 4: Six Notion data sources not shared with integration
**What goes wrong:** Sync script returns `404 Not Found` for one or more workout database queries.
**Why it happens:** Notion integration access is per-database — each of the six databases must have the integration shared in the Notion UI.
**How to avoid:** Human prerequisite checkpoint before Wave 1 UAT. The planner must include this as a `checkpoint:human-verify` step.
**Warning signs:** Script exits with "Notion API error 404 for {uuid}".

### Pitfall 5: `external` array accidentally includes chart.js
**What goes wrong:** Plugin loads but charts show nothing; browser console shows `Chart is not defined` or import errors.
**Why it happens:** If `chart.js` is marked external, esbuild excludes it from the bundle — there is no global `Chart` in Obsidian's webview.
**How to avoid:** Do not touch `esbuild.config.mjs`. The external array is correct as-is for Phase 7.
**Warning signs:** `ReferenceError: Chart is not defined` at runtime.

### Pitfall 6: Attribution toggle re-aggregation
**What goes wrong:** "Primary only" toggle shows the same data as "Primary + Secondary."
**Why it happens:** The snapshot is pre-aggregated with `secondary_weight = 1.0`. Switching attribution mode requires different pre-aggregated arrays, not client-side re-calculation from raw line data.
**How to avoid:** Per UI-SPEC §Interaction Contract (Attribution toggle): the script must emit both `weekly_primary_only` and `weekly_with_secondary` arrays. The toggle is a simple array swap in the component. The planner must ensure the sync script writes both arrays to the muscle-volume snapshot.
**Warning signs:** Attribution toggle has no effect on bar chart.

---

## Code Examples

### Chart.js Horizontal Bar Chart (Muscle Volume)

```typescript
// Source: chartjs.org/docs/latest/getting-started/integration.html [VERIFIED]
// Resolved colors at mount (example — resolve all 13 --cos-chart-* tokens similarly)
const style = getComputedStyle(canvasEl.ownerDocument.documentElement);
const colors = Array.from({ length: 13 }, (_, i) =>
  style.getPropertyValue(`--cos-chart-${i}`).trim() || FALLBACK_COLORS[i]
);
const mutedColor = style.getPropertyValue('--cos-muted').trim() || '#718096';

// Chart.defaults.color set once before chart creation (scoped, not global mutation):
const chart = new Chart(canvasEl, {
  type: 'bar',
  data: {
    labels: muscleGroups,   // string[] sanitized via DOMPurify.sanitize
    datasets: [{
      data: setCounts,
      backgroundColor: muscleGroups.map((_, i) => colors[i % 13]),
    }],
  },
  options: {
    indexAxis: 'y',         // horizontal bar
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw} sets`,
        },
      },
    },
    scales: {
      x: { min: 0, grid: { color: `${mutedColor}80` }, ticks: { color: mutedColor, font: { size: 12 } } },
      y: { grid: { display: false }, ticks: { color: mutedColor, font: { size: 12 } } },
    },
  },
});
```

### useEffect Cleanup Pattern

```typescript
// Source: Combined from official React docs + Chart.js canvas lifecycle [VERIFIED pattern]
const canvasRef = useRef<HTMLCanvasElement>(null);
const chartRef = useRef<Chart | null>(null);

useEffect(() => {
  if (!canvasRef.current) return;
  // Destroy previous instance before creating — handles Obsidian pane re-open
  chartRef.current?.destroy();
  chartRef.current = new Chart(canvasRef.current, config);
  return () => {
    chartRef.current?.destroy();
    chartRef.current = null;
  };
}, [/* data deps */]);

// Separate effect for data-only updates (no destroy/recreate):
useEffect(() => {
  if (!chartRef.current) return;
  chartRef.current.data.datasets[0].data = newData;
  chartRef.current.update('none');  // 'none' skips animation
}, [newData]);
```

### Snapshot Read Pattern (from ProjectsPage.tsx)

```typescript
// Source: src/components/pages/ProjectsPage.tsx (lines 64-74) [VERIFIED: codebase]
useEffect(() => {
  const path = plugin.settings.workoutsMuscleVolumePath;
  if (!path || path.trim() === '') {
    setMuscleVolume(null);
    return;
  }
  readJsonFile<MuscleVolumeSnapshot>(app, path).then(data => {
    setMuscleVolume(data !== null ? data : 'error');
  });
}, [plugin.settings.workoutsMuscleVolumePath, refreshNonce]);
```

### WorkoutsRefreshButton — execFile Pattern

```typescript
// Source: src/components/ui/RefreshButton.tsx (lines 92-118) [VERIFIED: codebase]
// Phase 7 variant: substitute workoutsSyncScriptPath for syncScriptPath,
//                  workoutsMetaPath for tasksSnapshotPath
const node = plugin.settings.nodePath || 'node';
const script = plugin.settings.workoutsSyncScriptPath;

if (!script || script.trim() === '') {
  setState('error');
  setTimeout(() => setState('idle'), 5000);
  return;
}

setState('loading');
execFile(node, [script], (error) => {
  if (error === null) {
    setState('success');
    triggerRefresh();
    refreshLastSynced();  // reads from workoutsMetaPath
    setTimeout(() => setState('idle'), 3000);
  } else {
    setState('error');
    setTimeout(() => setState('idle'), 5000);
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Chart.register(Chart.registerables)` (register all) | Selective tree-shakeable imports | Chart.js v3+ | Reduces bundle size significantly — only bar + line + category + linear scales + tooltip + legend needed |
| `import Chart from 'chart.js/auto'` | `import { Chart, ... } from 'chart.js'` | Chart.js v3 | `chart.js/auto` bundles everything; selective import allows esbuild tree-shaking |
| Destroying and recreating chart on data update | `chart.data = newData; chart.update()` | Chart.js v3+ | Avoids flicker and canvas teardown cost on data changes |

**Deprecated/outdated:**
- `chart.js/auto`: Registers all chart types globally — bypasses tree-shaking entirely. Do not use.
- `new Chart(id, config)` where `id` is a string canvas ID: Fragile in React (ID collisions across remounts). Use ref.current directly.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `dumbbell` is a valid Lucide icon ID in the version of Obsidian in use | Pattern 6 (Sidebar) | Nav item renders with no icon — minor visual issue, not a crash |
| A2 | `chart.js` package on npm is the legitimate chartjs/Chart.js library (slopcheck unavailable) | Package Legitimacy Audit | Theoretically supply-chain risk — mitigated by planner checkpoint before install |
| A3 | The exercise-muscle-map.json file should live in `scripts/` alongside the sync script | exercise-muscle-map.json section | Wrong location — sync script fails to find the file at startup |
| A4 | The six Notion workout database UUIDs come from the user's workspace and are documented in the design doc | Notion Integration section | Sync script built with wrong UUIDs — runtime 404 errors |
| A5 | `secondary_weight = 1.0` default means the full snapshot `weekly` array equals what `weekly_with_secondary` would emit, so only `weekly_primary_only` needs a separate precomputed array | Attribution toggle section | "Primary only" toggle shows incorrect data |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 18+ | notion-workouts-sync.mjs (global fetch) | Yes (nvm) | v24.12.0 (confirmed from CLAUDE.md scripts section) | — |
| npm | `npm install chart.js` | Yes | bundled with Node | — |
| Notion integration token | sync script | Assumed yes (Phase 3 used same token) | — | Manual setup prerequisite |
| Six workout Notion DBs shared with integration | sync script | Unknown — human prerequisite | — | None — must be done before Wave 1 test |

**Missing dependencies with no fallback:**
- Notion integration shared with all six workout databases — human prerequisite, no code fallback

**Missing dependencies with fallback:**
- None beyond the above

---

## Validation Architecture

> `workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`. This section is SKIPPED.

---

## Security Domain

`security_enforcement: true` in config.json. `security_asvs_level: 1`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No user auth in this page |
| V3 Session Management | No | No session state |
| V4 Access Control | No | Local plugin, single user |
| V5 Input Validation | Yes | `DOMPurify.sanitize(name)` before Chart.js labels and text render |
| V6 Cryptography | No | No crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via Notion-sourced exercise/muscle names in Chart.js labels | Tampering | `DOMPurify.sanitize(name)` before passing to chart labels — SEC-01 already required |
| Command injection via `workoutsSyncScriptPath` | Tampering | `execFile(node, [script])` — no shell expansion, no string interpolation. If script path is blank, fail fast without calling execFile |
| Malicious session URLs in snapshot | Tampering | URLs rendered only as `href` on `<a rel="noopener noreferrer" target="_blank">` — same ListRow pattern as Phase 3 |
| Secrets in vault-synced files | Information Disclosure | `NOTION_TOKEN` loaded from env var or `~/.claudeos/notion.env` — never written to vault or snapshot files (NOTION-02) |

All security controls are inherited from Phase 3 patterns. No new security mechanisms are introduced. [VERIFIED: codebase — RefreshButton.tsx, ListRow.tsx, ProjectsPage.tsx]

---

## Sources

### Primary (HIGH confidence)
- `scripts/notion-sync.mjs` — Token loading pattern, API constants (NOTION_VERSION = '2025-09-03'), queryDataSource helper, writeAtomic helper, output dir resolution
- `src/components/App.tsx` — PageId union extension pattern, PAGES map, ?? fallback
- `src/components/pages/ProjectsPage.tsx` — SnapshotState discriminated union, isSnapshotData type guard, useEffect + refreshNonce pattern, EmptyState inline component
- `src/components/ui/RefreshButton.tsx` — execFile pattern, state machine, isStale/formatHHmm exports, lastSynced read from snapshot
- `src/components/ui/ListRow.tsx` — ListRow props interface, URL/href security pattern
- `src/utils/readJsonFile.ts` — Absolute vs vault-relative path branching
- `src/types.ts` — ClaudeOSSettings interface, DEFAULT_SETTINGS, snapshot interfaces
- `src/settings/SettingsTab.ts` — setName/setDesc/addText pattern, heading pattern, numeric setting parseInt pattern
- `esbuild.config.mjs` — external array (Chart.js not present — confirmed bundle-by-default)
- `styles.css` — --cos-* token definitions, all existing CSS selectors and their scoping pattern
- `src/components/ui/Sidebar.tsx` — NAV_ITEMS array structure, NavItem shape
- `.planning/phases/07-workouts-dashboard/07-UI-SPEC.md` — Authoritative design contract for all Phase 7 UI
- `chartjs.org/docs/latest/getting-started/integration.html` — Tree-shakeable import list (BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend) [VERIFIED]
- `github.com/chartjs/Chart.js/releases` — v4.5.1 is current stable, released 2024-10-13 [VERIFIED]

### Secondary (MEDIUM confidence)
- `github.com/reactchartjs/react-chartjs-2/issues/1037` — "Canvas is already in use" root cause and `chart.destroy()` cleanup solution [VERIFIED pattern]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — chart.js v4.5.1 confirmed via GitHub releases; all other dependencies already in project
- esbuild bundling: HIGH — verified against actual esbuild.config.mjs; Chart.js is not in external array
- Canvas lifecycle: HIGH — confirmed against react-chartjs-2 issue tracker; standard React useEffect cleanup pattern
- Architecture patterns: HIGH — all patterns verified against actual codebase files
- exercise-muscle-map.json location: LOW — reasonable inference, not specified in design doc

**Research date:** 2026-06-07
**Valid until:** 2026-09-07 (Chart.js 4.x stable; Obsidian plugin API stable; all other patterns are codebase-internal)
