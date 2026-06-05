---
phase: 01-foundation
reviewed: 2026-06-05T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - main.ts
  - src/views/DashboardView.tsx
  - src/context/AppContext.tsx
  - src/components/App.tsx
  - src/components/ui/Sidebar.tsx
  - src/components/pages/HomePage.tsx
  - src/components/pages/SocialPage.tsx
  - src/types.ts
  - styles.css
  - esbuild.config.mjs
  - .husky/pre-commit
  - package.json
  - tsconfig.json
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-05
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Foundation layer for the ClaudeOS Dashboard Obsidian plugin. The React/TypeScript skeleton is structurally sound — view lifecycle, context wiring, and the safe-HTML contract are all correctly implemented. The critical issue is a network privacy leak from the font import that fires on every plugin load. Five warnings cover unawaited async calls, dead code, a pre-commit hook portability gap, a deprecated TypeScript config option, and a CSS compatibility risk. Three info items address minor quality gaps.

---

## Critical Issues

### CR-01: Third-party font CDN leaks user IP on every plugin load

**File:** `styles.css:4`
**Issue:** `@import url('https://api.fontshare.com/v2/css?...')` fires an outbound network request each time the plugin loads, unconditionally sending the user's IP address and Obsidian version headers to an external CDN (fontshare.com). This is a privacy violation for users in air-gapped environments, corporate networks with egress restrictions, and anyone who expects a local plugin to make no outbound calls. Obsidian's plugin review guidelines explicitly flag external network calls as a security concern requiring disclosure. Additionally, if fontshare.com is unavailable, the import will stall or error, degrading the UI on every open.

**Fix:** Either bundle the Satoshi font files locally (add them to `assets/fonts/` and use `@font-face` with relative paths), or remove the import entirely and fall back to the existing `var(--font-interface, sans-serif)` chain already defined in `--cos-font-display`. The fallback already exists and works — the CDN import is the only thing bypassing it.

```css
/* Remove line 4 entirely: */
/* @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,600&display=swap'); */

/* The existing token already falls back gracefully: */
--cos-font-display: 'Satoshi', var(--font-interface, sans-serif);
/* Without the @import, 'Satoshi' will never resolve and the fallback activates. */
```

---

## Warnings

### WR-01: Unhandled promise — activateDashboardView never awaited

**File:** `main.ts:12,19`
**Issue:** `this.activateDashboardView()` is called in the ribbon icon callback (line 12) and command callback (line 19) without `await`. The method is `async` and calls `await leaf.setViewState(...)` internally. If `setViewState` rejects (e.g., the workspace is in a bad state during plugin reload), the rejection becomes an unhandled promise, which Obsidian surfaces as an uncaught error in the console and can leave the view in a partially-opened state with no user feedback.

**Fix:** Both callbacks are synchronous lambdas — they cannot use `await` directly. Wrap with an explicit catch:

```ts
this.addRibbonIcon('layout-dashboard', 'ClaudeOS Dashboard', () => {
  this.activateDashboardView().catch((err) =>
    console.error('ClaudeOS: failed to open dashboard', err)
  );
});

this.addCommand({
  id: 'open-claudeos-dashboard',
  name: 'Open ClaudeOS Dashboard',
  callback: () => {
    this.activateDashboardView().catch((err) =>
      console.error('ClaudeOS: failed to open dashboard', err)
    );
  },
});
```

### WR-02: Dead export — renderSafeHTML is defined but never called

**File:** `src/views/DashboardView.tsx:55-59`
**Issue:** `renderSafeHTML` is exported and documented as the mandatory path for all dynamic HTML, but it has zero callers anywhere in the codebase. The `sanitizeHTMLToDom` import on line 1 exists solely to support this function. Dead exported infrastructure creates two risks: (1) future contributors may use `innerHTML` directly because the safe path "doesn't seem to be used anyway," undermining the SEC-01 contract; (2) `sanitizeHTMLToDom` in the import is an unused import that will generate a lint warning if a linter is added later.

**Fix:** If `renderSafeHTML` is scaffolded for future use, document that intent explicitly. If it will be needed in Phase 2+, keep it but add a `// Used by: <phase>` comment. If it is purely speculative, remove it — dead code in security-critical paths is more harmful than useful.

```ts
// Option A: Keep with clear intent marker
/**
 * SEC-01: All dynamic HTML must go through this function — never use innerHTML directly.
 * NOTE: No callers yet — will be wired in Phase 2 for <widget content>.
 */
export function renderSafeHTML(containerEl: HTMLElement, rawHtml: string): void {

// Option B: Remove the function and the sanitizeHTMLToDom import until needed.
```

### WR-03: Pre-commit hook hardcodes a single user's Windows path

**File:** `.husky/pre-commit:6-7`
**Issue:** The `PATH` extension hardcodes `/c/Users/scull/AppData/Local/...`. Any contributor who clones this repo will have the hook silently fail `command -v gitleaks` on line 9 and abort every commit with "gitleaks not found," effectively disabling the secret scanner for all non-owner contributors. The hook also only covers WinGet install locations — contributors using Scoop, Chocolatey, or a system-level install will be blocked unnecessarily.

**Fix:** Either make the path extension conditional on `$USERNAME`, or rely on contributors having `gitleaks` on their standard `PATH` and remove the hardcoded augmentation. The simplest safe version:

```sh
#!/usr/bin/env sh
# Soft-fail with a warning if gitleaks is not installed, rather than blocking all contributors.
if ! command -v gitleaks >/dev/null 2>&1; then
  echo "WARNING: gitleaks not found — secret scan skipped. Install: winget install Gitleaks.Gitleaks" >&2
  exit 0  # or exit 1 if enforcement is required; document the choice
fi

gitleaks protect --staged --redact
```

If hard enforcement is required (exit 1), document it in the README so contributors know why their commits fail.

### WR-04: tsconfig moduleResolution "node" is deprecated for ESNext modules

**File:** `tsconfig.json:12`
**Issue:** `"moduleResolution": "node"` is the legacy CommonJS resolution algorithm and is deprecated in TypeScript 5.x when combined with `"module": "ESNext"`. With `moduleResolution: "node"`, TypeScript does not enforce `.js` extensions in imports or understand `exports` fields in `package.json`, which can cause resolved types to diverge from what the bundler (esbuild) actually resolves. This combination is explicitly called out in the TypeScript 5.0 release notes as a misconfiguration.

**Fix:** Switch to `"moduleResolution": "bundler"`, which is the correct pairing for projects using a bundler like esbuild with ESNext output. The `"bundler"` setting also requires `"allowImportingTsExtensions": true` or no extension in imports — verify existing imports are compatible:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### WR-05: color-mix(in oklch) has limited renderer coverage for older Obsidian versions

**File:** `styles.css:86`
**Issue:** `.claudeos-nav-item.active` uses `color-mix(in oklch, var(--cos-accent) 15%, transparent)` for the active nav highlight. While modern Chromium versions (used in recent Obsidian builds) support this, Obsidian versions prior to approximately 1.4.0 (Electron 25 / Chromium 112) do not. If `color-mix` is unsupported, the active nav item will have `background: transparent` — visually identical to an inactive item. The active state becomes invisible.

**Fix:** Add a `background-color` fallback before the `color-mix` line:

```css
.claudeos-dashboard .claudeos-nav-item.active {
  background: rgba(124, 106, 247, 0.15); /* fallback for older Chromium */
  background: color-mix(in oklch, var(--cos-accent) 15%, transparent);
  color: var(--cos-accent);
  font-weight: 600;
}
```

---

## Info

### IN-01: onunload is async for no reason

**File:** `main.ts:24`
**Issue:** `async onunload(): Promise<void>` contains only `this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD)`, which is synchronous. The `async` keyword wraps the return in an unnecessary `Promise<void>`, adds a microtask tick, and misleads readers into thinking there is async work happening here.

**Fix:**
```ts
onunload(): void {
  this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
}
```

### IN-02: App.tsx PAGES lookup has no runtime guard for unknown PageId

**File:** `src/components/App.tsx:14`
**Issue:** `const PageComponent = PAGES[activePage]` — with `noUncheckedIndexedAccess` enabled in tsconfig, TypeScript correctly types this as `React.ComponentType | undefined`. However, the code uses `PageComponent` directly as a JSX element on line 21 without a null guard. TypeScript currently allows this because `activePage` is typed as `PageId` (a closed union) and the PAGES keys exactly cover that union, so `PAGES[activePage]` is always defined in practice. But if `PageId` is extended in `types.ts` and `PAGES` is not updated, this silently renders nothing or throws at runtime. The `noUncheckedIndexedAccess` flag was enabled precisely to catch this pattern.

**Fix:** Add an explicit guard or use a non-null assertion with a comment explaining why it is safe:

```ts
// Safe: PAGES must cover all PageId values — enforce with exhaustive check
const PageComponent = PAGES[activePage];
if (!PageComponent) {
  console.error(`ClaudeOS: no page registered for id "${activePage}"`);
  return <div className="claudeos-dashboard"><p>Unknown page.</p></div>;
}
```

### IN-03: Sidebar NavItemButton is not accessibility-labelled

**File:** `src/components/ui/Sidebar.tsx:29-36`
**Issue:** The `<button>` elements render an icon `<span>` (populated by `setIcon`) and a text label, but have no `aria-label` or `aria-current` attribute. Screen readers and keyboard navigation tools will announce the button by its text content (which works), but the active-state is conveyed only visually via CSS class — there is no `aria-current="page"` to communicate the active nav item to assistive technology.

**Fix:**
```tsx
<button
  className={`claudeos-nav-item${isActive ? ' active' : ''}`}
  onClick={() => onNavigate(item.id)}
  aria-current={isActive ? 'page' : undefined}
>
```

---

_Reviewed: 2026-06-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
