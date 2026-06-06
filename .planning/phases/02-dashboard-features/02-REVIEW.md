---
phase: 02-dashboard-features
reviewed: 2026-06-05T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/settings/SettingsTab.ts
  - src/components/ui/SkillButton.tsx
  - src/components/ui/SkillsSection.tsx
  - src/utils/readJsonFile.ts
  - src/types.ts
  - src/components/ui/StatusTile.tsx
  - src/components/ui/TileGrid.tsx
  - src/components/pages/HomePage.tsx
  - src/components/ui/SocialMetricCard.tsx
  - src/components/pages/SocialPage.tsx
  - main.ts
  - styles.css
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-05
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed all Phase 2 source files covering the tile data system, social metrics page, skill launcher buttons, settings tab, and supporting utilities. The implementation is generally coherent and the security stance on the skill allowlist is sound. However, three blockers exist: an unquoted shell argument that survives the allowlist (enabling argument injection), a silent JSON type-coercion bug in the social cards that can crash the renderer on malformed data, and a missing `React` import in `App.tsx` that will break the JSX transform at runtime. Five warnings cover stale-data risk from unsubscribed effects, a crash path on empty `updated_at` strings, misleading error mapping in `SocialPage`, and two CSS scope gaps.

---

## Critical Issues

### CR-01: Shell argument injection via unquoted skill name

**File:** `src/components/ui/SkillButton.tsx:45`
**Issue:** The `exec` call interpolates `skill` directly into the shell command string without quoting:
```ts
exec(`claude -p ${skill}`, (error) => {
```
Although `skill` is typed as `AllowedSkill` and checked against `ALLOWED_SKILLS` at runtime, the allowlist values themselves (`wiki-optimizer`, `braindump`, `humanizer`) contain a hyphen. Any future allowlist value containing a space, `$`, backtick, or semicolon — or a hypothetical compile-time widening of the union — would become a shell injection vector. Even today, if the TypeScript type guard is bypassed (e.g., via a `.js` consumer or a cast), the unquoted interpolation executes arbitrary shell code. The safe form requires either `execFile` (no shell, no injection) or quoting the argument.

**Fix:**
```ts
import { execFile } from 'child_process';

// Replace exec with execFile — no shell spawned, argument passed as array element
execFile('claude', ['-p', skill], (error) => {
  if (error === null) {
    setState('success');
    setTimeout(() => setState('idle'), 3000);
  } else {
    setState('error');
    setTimeout(() => setState('idle'), 5000);
  }
});
```

---

### CR-02: `toLocaleString()` called on potentially non-numeric JSON values — crash path in SocialMetricCard

**File:** `src/components/ui/SocialMetricCard.tsx:56–64, 82–90`
**Issue:** After the `null` and `'error'` guards pass, the component unconditionally casts `data` to `LinkedInData` or `XData` and calls `.toLocaleString()` on each numeric field:
```tsx
<div className="claudeos-metric__value">{li.followers.toLocaleString()}</div>
```
`readJsonFile` returns `JSON.parse(raw) as T` — a bare type assertion with no runtime validation. If the JSON file contains `{"followers": null}`, `{"followers": "1234"}`, or omits a field entirely, `li.followers` is `null`, a string, or `undefined`. Calling `.toLocaleString()` on `null` or `undefined` throws `TypeError: Cannot read properties of null`, which crashes the React render tree (no error boundary is visible in the reviewed files). The same applies to `connections`, `posts`, `following`, and `tweets`.

**Fix:** Validate fields before rendering, with a fallback:
```tsx
function safeLocale(v: unknown): string {
  const n = Number(v);
  return isNaN(n) ? '—' : n.toLocaleString();
}

// Then in render:
<div className="claudeos-metric__value">{safeLocale(li.followers)}</div>
```
Alternatively, add a JSON schema validation step inside `readJsonFile` or at the call site in `SocialPage` before passing data to the card.

---

### CR-03: Missing `React` import in `App.tsx` — JSX runtime failure

**File:** `src/components/App.tsx:1`
**Issue:** `App.tsx` uses JSX (`<div>`, `<Sidebar>`, etc.) but does not import `React`. The esbuild config sets `jsx: "automatic"`, which injects `react/jsx-runtime` — this normally works. However, `App.tsx` also uses `React.JSX.Element` as the return type annotation on line 12:
```ts
export function App(): React.JSX.Element {
```
Without `import React from 'react'` or `import type { JSX } from 'react'`, the `React` namespace is not in scope and TypeScript will emit `error TS2304: Cannot find name 'React'`. The build script runs `tsc --noEmit` before esbuild, so this is a build-time failure that blocks production builds. (It may succeed in dev watch mode if `tsc` is skipped, masking the error.)

**Fix:**
```ts
import React from 'react';
// or, more precisely:
import { type JSX } from 'react';
// and change return type to JSX.Element
```
`HomePage.tsx` imports React correctly on line 1; `App.tsx` must do the same.

---

## Warnings

### WR-01: `useEffect` data loads never re-run after settings change mid-session — stale tile data

**File:** `src/components/pages/HomePage.tsx:26–46`, `src/components/pages/SocialPage.tsx:15–36`
**Issue:** Both pages use `useEffect` with `plugin.settings.lastSyncPath` (etc.) in the dependency array. This works correctly on initial mount, but `plugin.settings` is a plain mutable object — React has no way to detect when Obsidian's settings tab mutates it. If the user changes a file path in Settings and returns to the dashboard, the effects do not re-fire because the dependency reference (`plugin.settings.lastSyncPath`) has already been evaluated at render time and React sees no change to the prop/state that would trigger re-render.

In practice the tiles will show stale data (or the wrong empty state) until the view is closed and reopened. This is a correctness issue for the settings-change workflow described in the UI spec.

**Fix:** Lift the path values into state in the parent or pass them as explicit props derived from state, so React can diff them. Alternatively, have the settings `onChange` handler call a refresh method on the view, or store the paths in React state that mirrors `plugin.settings`.

---

### WR-02: `formatUpdated` crashes on empty string `updated_at`

**File:** `src/components/ui/SocialMetricCard.tsx:11–13`
**Issue:** The guard `{li.updated_at && ...}` treats empty string as falsy in JavaScript, so `formatUpdated` is never called with `""`. However, `formatUpdated` does no length/validity check:
```ts
function formatUpdated(iso: string): string {
  return iso.substring(0, 10);
}
```
If `updated_at` is any non-empty string (e.g., `"N/A"` or `"unknown"`), `substring(0, 10)` silently returns a malformed fragment and renders garbage. If `updated_at` is provided as a non-string type (number, object) due to a JSON mismatch, `.substring` throws `TypeError`. There is no date validation.

**Fix:**
```ts
function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return iso.substring(0, 10);
}
```
Then suppress rendering when the result is `''`: `{formatted && <div>Updated: {formatted}</div>}`.

---

### WR-03: `SocialPage` maps `readJsonFile` null to `'error'` — conflates two distinct states

**File:** `src/components/pages/SocialPage.tsx:22, 33`
**Issue:**
```ts
setLinkedInData(data !== null ? data : 'error');
```
`readJsonFile` returns `null` for three distinct reasons: empty path (already guarded above), file not found, and malformed JSON. When a file path is set but the file doesn't exist, the user sees "Couldn't read LinkedIn data — Check that the file path in Settings is correct." This is accurate. But when the file exists and contains invalid JSON, the user gets the identical message. The two failure modes have different fixes (wrong path vs. bad file content) but the UI gives the same advice, which is misleading.

This is a UX correctness issue: users with a valid path and a corrupted data file will spend time checking Settings instead of fixing the file.

**Fix:** Extend `readJsonFile` to return a discriminated union (`{ ok: true, data: T } | { ok: false, reason: 'missing' | 'parse-error' | 'empty-path' }`) so callers can surface actionable messages. Alternatively, catch JSON parse errors separately from file-not-found errors in `readJsonFile` and return distinct sentinel values.

---

### WR-04: `.claudeos-tile-grid` not scoped under `.claudeos-dashboard` — style leakage risk

**File:** `styles.css:132–137`
**Issue:** The comment on line 2 states "All selectors scoped under `.claudeos-dashboard` to prevent global style bleed." The tile grid rule breaks this contract:
```css
.claudeos-tile-grid {          /* NOT scoped */
  display: grid;
  ...
}
```
Compare with correctly-scoped rules like `.claudeos-dashboard .claudeos-tile { ... }` (line 140). Any other Obsidian plugin or theme that applies `.claudeos-tile-grid` to an element will inherit this plugin's grid layout.

**Fix:**
```css
.claudeos-dashboard .claudeos-tile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--cos-space-md, 16px);
  width: 100%;
}
```

---

### WR-05: `.claudeos-skills-section`, `.claudeos-skills-heading`, `.claudeos-skills-row`, `.claudeos-skill-btn*` not scoped under `.claudeos-dashboard`

**File:** `styles.css:185–253`
**Issue:** Same scoping contract violation as WR-04. All skill-related selectors are unscoped globals. The skill button rules in particular (`.claudeos-skill-btn--idle`, `--loading`, `--success`, `--error`) apply to any element with those class names anywhere in Obsidian, not just within the dashboard view.

**Fix:** Prefix all selectors in the skills block with `.claudeos-dashboard`:
```css
.claudeos-dashboard .claudeos-skills-section { ... }
.claudeos-dashboard .claudeos-skills-heading { ... }
.claudeos-dashboard .claudeos-skills-row { ... }
.claudeos-dashboard .claudeos-skill-btn { ... }
/* etc. */
```

---

## Info

### IN-01: `formatTimestamp` returns `''` on invalid date — silently shows nothing

**File:** `src/components/pages/HomePage.tsx:9–18`
**Issue:** When `formatTimestamp` receives an unparseable string it returns `''`. The caller guards `formatted !== '' ? formatted : null`, so the tile correctly shows "No data." However, this means a file with a non-empty but invalid `timestamp` field (e.g., `"timestamp": "yesterday"`) is silently treated as missing data with no log or diagnostic. This makes it hard to distinguish a misconfigured file from a genuinely absent one.

**Fix:** Not critical, but consider logging a console warning in development when an invalid timestamp is encountered, so users can debug their automation output.

---

### IN-02: `SettingsTab` saves on every keystroke — excessive write amplification

**File:** `src/settings/SettingsTab.ts:25–28, 36–39, 47–50, 58–61`
**Issue:** Each `onChange` handler calls `await this.plugin.saveSettings()` on every character typed. For a vault with slow storage or a long path string, this fires a `saveData` write to Obsidian's data store for every keypress.

**Fix:** Debounce the save, or save only `onBlur`. Obsidian's own core settings do this. This is consistent with Obsidian plugin convention and avoids unnecessary I/O during typing.

---

### IN-03: `Satoshi` font reference in CSS with no fallback load mechanism

**File:** `styles.css:14`
**Issue:** `--cos-font-display: 'Satoshi', var(--font-interface, sans-serif)` references the Satoshi typeface. Satoshi is not a system font, not a web font loaded by the plugin, and not guaranteed to be present. Phase 1 fixed a Fontshare CDN import (commit `e6b590f`) but the font name remains in the token. If Satoshi is not installed locally, the browser silently falls back to `--font-interface` — which is fine — but the token name `--cos-font-display` implies intentional branding that will silently not appear for most users.

**Fix:** Either document that Satoshi must be user-installed, remove the name and rely solely on `var(--font-interface, sans-serif)`, or use a font that ships with Obsidian's theme system. This is informational since the fallback is functional, but it should be a deliberate choice rather than a silent miss.

---

_Reviewed: 2026-06-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
