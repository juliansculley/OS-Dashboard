---
phase: 07-workouts-dashboard
reviewed: 2026-06-11T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - scripts/notion-workouts-sync.mjs
  - scripts/exercise-muscle-map.json
  - src/types.ts
  - src/utils/sanitizeText.ts
  - src/settings/SettingsTab.ts
  - src/components/App.tsx
  - src/components/ui/Sidebar.tsx
  - src/components/ui/WorkoutsRefreshButton.tsx
  - src/components/pages/WorkoutsPage.tsx
  - src/components/pages/workouts/chartSetup.ts
  - src/components/pages/workouts/MuscleVolumeTab.tsx
  - src/components/pages/workouts/ProgressionTab.tsx
  - src/components/pages/workouts/HistoryTab.tsx
  - src/components/pages/workouts/ContextTab.tsx
  - styles.css
  - package.json
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-06-11
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Phase 7 adds a Workouts page with four tabs (Muscle Volume, Progression, History, Context), a standalone sync script that queries six Notion databases, and supporting infrastructure. The security posture is solid: execFile without shell, blank-path guards, DOMPurify for Chart.js labels, no dangerouslySetInnerHTML. The NOTION_TOKEN loading is clean. The overall architecture — pre-baked snapshots with client-side aggregation and an array-swap attribution toggle — is sound.

Four issues require attention before this ships: two dead settings that mislead users, a silent fallback bug when "This Meso" mode is active and meta refreshes away the current meso, and an unsound TypeScript cast in the progression chart. Three info-level items are noted for quality.

---

## Warnings

### WR-01: `muscleWindowDays` setting is read-only dead configuration

**File:** `src/settings/SettingsTab.ts:199-206` / `src/types.ts:54`

**Issue:** The "Muscle volume window (days)" setting is exposed in the Settings UI, stored in `ClaudeOSSettings.muscleWindowDays`, and defaults to 28. However `MuscleVolumeTab` hardcodes `useState<number>(28)` and never reads `plugin.settings.muscleWindowDays`. Changing the setting in Settings has zero effect. The user will set it expecting behavior change and see nothing happen.

**Fix:** Either wire the setting as the `initialWindowDays` passed to `MuscleVolumeTab` (via `WorkoutsPage` → props), or remove the setting from `SettingsTab.ts`, `ClaudeOSSettings`, and `DEFAULT_SETTINGS` to avoid user confusion. Wiring it is preferable:

```tsx
// WorkoutsPage.tsx — pass initial window to MuscleVolumeTab
<MuscleVolumeTab
  muscleVolume={muscleVolume}
  meta={isSnapshotData(meta) ? meta : null}
  initialWindowDays={plugin.settings.muscleWindowDays}
/>

// MuscleVolumeTab.tsx
interface MuscleVolumeTabProps {
  muscleVolume: MuscleVolumeSnapshot;
  meta: WorkoutsMetaSnapshot | null;
  initialWindowDays?: number;
}
const [windowDays, setWindowDays] = useState<number>(initialWindowDays ?? 28);
```

---

### WR-02: `secondaryMuscleWeight` setting is read-only dead configuration

**File:** `src/settings/SettingsTab.ts:208-218` / `src/types.ts:55`

**Issue:** The "Secondary muscle weight" setting is exposed in the Settings UI with a description explaining values of 0.5 or 0 to change attribution. The sync script hardcodes `const SECONDARY_WEIGHT = 1.0` and never reads this setting. The two pre-baked snapshot arrays (`weekly_with_secondary` and `weekly_primary_only`) are always computed with full credit (1.0) regardless of what the user sets. Changing the setting does nothing.

The `MuscleVolumeSnapshot.secondary_weight` field even records the value used (always 1.0), making the divergence traceable — but not automatically corrected.

**Fix:** The sync script runs as a standalone Node process and cannot read Obsidian plugin settings at runtime. The options are:

1. Remove the setting from `SettingsTab`, `ClaudeOSSettings`, and `DEFAULT_SETTINGS` (simplest — the attribution toggle already provides primary-vs-all control).
2. Document prominently in the settings description that this value only takes effect after re-running the sync script AND re-building the sync script with the new value (impractical — not recommended).
3. Accept partial-credit as a future feature and mark the setting disabled/grayed out.

Option 1 is the cleanest fix.

---

### WR-03: Silent data regression when "This Meso" is active and meta refreshes away the current mesocycle

**File:** `src/components/pages/workouts/MuscleVolumeTab.tsx:127-133`

**Issue:** When the user has selected "This Meso" mode (`windowDays === 0`) and then triggers a Refresh that produces a snapshot where `current_meso` is absent (e.g., between mesocycles), `mesoStartCutoff` silently becomes `null`. `filterToWindow` with `windowDays=0` and `mesoCutoff=null` falls through to `weekCutoff(0)` — the ISO week string for the current week — showing only the current week's data with no error or indication that the window narrowed:

```typescript
// MuscleVolumeTab.tsx line 127-133
function filterToWindow(cells, windowDays, mesoCutoff) {
  if (windowDays === 0 && mesoCutoff !== null) {
    return cells.filter(c => c.week >= mesoCutoff);  // correct meso path
  }
  // Falls through here when windowDays=0 AND mesoCutoff=null
  const cutoff = weekCutoff(windowDays);  // weekCutoff(0) = current week only
  return cells.filter(c => c.week >= cutoff);
}
```

The "This Meso" button shows as `active` (the CSS class is added) but the chart now shows a single week of data. The user has no indication the window changed.

**Fix:** Reset `windowDays` to the default (28) when `currentMeso` transitions from non-null to null, or add an explicit guard in `filterToWindow`:

```typescript
// Option A: reset state in MuscleVolumeTab when meso disappears
useEffect(() => {
  if (currentMeso === null && windowDays === 0) {
    setWindowDays(28);
  }
}, [currentMeso]);

// Option B: guard in filterToWindow
function filterToWindow(cells, windowDays, mesoCutoff) {
  if (windowDays === 0) {
    if (mesoCutoff === null) {
      // Meso mode was selected but no active meso — fall back to 28d
      return cells.filter(c => c.week >= weekCutoff(28));
    }
    return cells.filter(c => c.week >= mesoCutoff);
  }
  return cells.filter(c => c.week >= weekCutoff(windowDays));
}
```

Option A (resetting state) is preferred because it also fixes the active-but-disabled visual anomaly on the button.

---

### WR-04: Unsound `as number` cast passes null to Chart.js linear x datasets

**File:** `src/components/pages/workouts/ProgressionTab.tsx:135`

**Issue:** The `makeData` helper for the linear-x chart casts the return value of `getValue(p)` to `number` at the call site:

```typescript
const makeData = (getValue: (p: typeof sorted[0]) => number | null) =>
  xType === 'linear'
    ? sorted.map(p => ({ x: toTimestamp(p.date), y: getValue(p) as number }))
    : sorted.map(p => getValue(p));
```

`getValue` for weight/volume/1RM can and does return `null` (fields are `number | null` in `ExercisePoint`). The `as number` cast suppresses TypeScript's null check — Chart.js actually receives `{ x: timestamp, y: null }` objects. This works at runtime because `spanGaps: true` is set, but the cast lies to the type system, hiding a potential issue if `spanGaps` is ever disabled or the data is consumed elsewhere.

**Fix:** Express the intent explicitly:

```typescript
const makeData = (getValue: (p: typeof sorted[0]) => number | null) =>
  xType === 'linear'
    ? sorted.map(p => ({ x: toTimestamp(p.date), y: getValue(p) }))
    : sorted.map(p => getValue(p));
```

Remove the `as number` — Chart.js accepts `null` values in data arrays and the type annotations for Chart.js datasets allow `null | undefined`.

---

## Info

### IN-01: Stale comment in ContextTab ("last 60 bodyweight points")

**File:** `src/components/pages/workouts/ContextTab.tsx:59`

**Issue:** The comment reads "Last 60 bodyweight points, sorted ascending by date" but the code immediately below filters to the last 90 calendar days (not 60 points). The rendered label on line 194 correctly reads "BODYWEIGHT (last 90 days)". The comment is wrong.

**Fix:** Update the comment to match the implementation:
```typescript
// ── Last 90 days of bodyweight measurements, sorted ascending by date ──
```

---

### IN-02: ContextTab sparkline dep array materializes a string on every render

**File:** `src/components/pages/workouts/ContextTab.tsx:146`

**Issue:** The `useEffect` dep array uses an inline expression:
```typescript
}, [bwWindow.map(p => `${p.date}:${p.value}`).join(',')]);
```

This creates a new intermediate array and a new string on every render, even when `bwWindow` hasn't changed. React correctly compares the resulting string primitive by value (not reference), so the effect only re-runs when data changes — it is functionally correct. However, the allocation runs unconditionally on every render.

**Fix:** This is a minor quality issue. Consider memoizing with `useMemo` if the component renders frequently, or use the more conventional pattern of depending on `meta.bodyweight` directly:
```typescript
}, [meta.bodyweight]); // Re-run when the bodyweight array reference changes
```

---

### IN-03: `exercise-muscle-map.json` `primary` arrays are always empty (unused field)

**File:** `scripts/exercise-muscle-map.json` (entire file)

**Issue:** Every entry in the map has `"primary": []`. The sync script's `resolveExerciseMuscles` function explicitly ignores the `primary` field from the override map — primary muscles always come from the Notion "Prime muscle" relation (by design per the comment on line 299). The `primary` array in every JSON entry is present, documented in the `_note`, but never read.

This creates a maintenance hazard: future contributors may populate the `primary` arrays thinking it will change behavior, and be confused when it does not.

**Fix:** Either remove the `primary` key from all entries and from the `_note` comment, or add a comment next to the first entry clarifying that `primary` is intentionally ignored:
```json
"_note": "... primary[] is present for documentation only — it is NOT read by the sync script. Primary muscles always come from the Notion 'Prime muscle' relation."
```

---

_Reviewed: 2026-06-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
