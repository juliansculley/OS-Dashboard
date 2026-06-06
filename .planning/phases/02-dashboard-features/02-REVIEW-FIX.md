---
phase: 02-dashboard-features
fixed_at: 2026-06-05T00:00:00Z
review_path: .planning/phases/02-dashboard-features/02-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 6
skipped: 2
status: partial
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-06-05
**Source review:** .planning/phases/02-dashboard-features/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (CR-01, CR-02, CR-03, WR-01, WR-02, WR-03, WR-04, WR-05)
- Fixed: 6
- Skipped: 2 (WR-01, WR-03 — structural refactors, not addressable as targeted patches)

---

## Fixed Issues

### CR-01: Shell argument injection via unquoted skill name

**Files modified:** `src/components/ui/SkillButton.tsx`
**Commit:** 91dac9e
**Applied fix:** Replaced `import { exec }` with `import { execFile }` and changed the call from `exec(\`claude -p ${skill}\`, cb)` to `execFile('claude', ['-p', skill], cb)`. No shell is spawned; the skill name is passed as a literal array element. Added SEC-03 comment to document the intent.

---

### CR-02: `toLocaleString()` called on potentially non-numeric JSON values

**Files modified:** `src/components/ui/SocialMetricCard.tsx`
**Commit:** f4cfaa6
**Applied fix:** Added `safeLocale(v: unknown): string` helper that converts the value to `Number` first and returns `'—'` for NaN. Replaced all six direct `.toLocaleString()` calls on typed data fields (`li.followers`, `li.connections`, `li.posts`, `x.followers`, `x.following`, `x.tweets`) with `safeLocale(...)`. This prevents TypeError crashes when JSON contains null, string, or missing fields.

---

### CR-03: Missing `React` import in `App.tsx`

**Files modified:** `src/components/App.tsx`
**Commit:** fbccd63
**Applied fix:** Changed `import { useState } from 'react'` to `import React, { useState } from 'react'`. The `React` namespace is now in scope, resolving the TS2304 build error caused by the `React.JSX.Element` return type annotation on the `App` function.

---

### WR-02: `formatUpdated` crashes on empty string `updated_at`

**Files modified:** `src/components/ui/SocialMetricCard.tsx`
**Commit:** f4cfaa6 (committed with CR-02 — same file, single atomic commit)
**Applied fix:** Added `new Date(iso)` validity check to `formatUpdated`: if `isNaN(d.getTime())`, returns `''` instead of a substring. Updated both LinkedIn and X `updated_at` render sites to use an IIFE pattern: `{li.updated_at && (() => { const f = formatUpdated(li.updated_at); return f ? <div>...</div> : null; })()}`. This suppresses the "Updated:" label when the date string is non-empty but invalid (e.g., `"N/A"`, `"unknown"`), and prevents `.substring` being called on a non-string type.

---

### WR-04: `.claudeos-tile-grid` not scoped under `.claudeos-dashboard`

**Files modified:** `styles.css`
**Commit:** f8f388e
**Applied fix:** Changed `.claudeos-tile-grid { ... }` to `.claudeos-dashboard .claudeos-tile-grid { ... }`, restoring compliance with the scoping contract declared in the file header.

---

### WR-05: Skill selectors not scoped under `.claudeos-dashboard`

**Files modified:** `styles.css`
**Commit:** f8f388e (committed with WR-04 — same file, single atomic commit)
**Applied fix:** Prefixed all eight skill selectors with `.claudeos-dashboard`: `.claudeos-skills-section`, `.claudeos-skills-heading`, `.claudeos-skills-row`, `.claudeos-skill-btn`, `.claudeos-skill-btn--idle`, `.claudeos-skill-btn--idle:hover:not(:disabled)`, `.claudeos-skill-btn--loading`, `.claudeos-skill-btn--success`, `.claudeos-skill-btn--error`, and `.claudeos-skill-btn--loading .cos-spinner`. All skill styles now apply only within the dashboard view.

---

## Skipped Issues

### WR-01: `useEffect` data loads never re-run after settings change mid-session

**File:** `src/components/pages/HomePage.tsx:26–46`, `src/components/pages/SocialPage.tsx:15–36`
**Reason:** Requires structural refactor — not addressable as a targeted patch. The fix requires lifting `plugin.settings` path values into React state and propagating a re-render trigger through the Obsidian settings tab `onChange` handlers. This touches at minimum `HomePage.tsx`, `SocialPage.tsx`, `SettingsTab.ts`, and likely `main.ts` (to wire a refresh callback). A targeted edit would risk incomplete wiring that silently fails or creates inconsistent state. Leaving for developer to implement as a focused feature.
**Original issue:** Effects with `plugin.settings.lastSyncPath` in the dependency array do not re-fire when Obsidian's settings tab mutates the object, because React never detects the mutation. Dashboard shows stale data until the view is closed and reopened.

---

### WR-03: `SocialPage` maps `readJsonFile` null to `'error'` — conflates two distinct states

**File:** `src/components/pages/SocialPage.tsx:22, 33`
**Reason:** Requires API change to `readJsonFile` — not addressable as a targeted patch. The fix requires extending `readJsonFile` to return a discriminated union `{ ok: true, data: T } | { ok: false, reason: 'missing' | 'parse-error' | 'empty-path' }` (or equivalent), then updating all call sites in `SocialPage.tsx` to branch on the reason field and surface distinct error messages. Changing the return type of `readJsonFile` is a breaking change that would cascade through any other callers. A targeted patch to `SocialPage` alone would require duplicating JSON parsing logic already in `readJsonFile`, which is worse than the original. Leaving for developer to implement as a focused refactor of the utility function.
**Original issue:** When `readJsonFile` returns `null` for file-not-found vs. malformed JSON, the UI shows the same "Check Settings" message for both failure modes. Users with a valid path and corrupted file are misled.

---

_Fixed: 2026-06-05_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
