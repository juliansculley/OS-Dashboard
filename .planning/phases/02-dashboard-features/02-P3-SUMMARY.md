---
phase: 02-dashboard-features
plan: P3
subsystem: social-stats-page
tags: [react, obsidian-plugin, social-metrics, settings-driven]
completed: "2026-06-06"

dependency_graph:
  requires:
    - 02-P1  # types.ts (LinkedInData, XData, ClaudeOSSettings), readJsonFile, settings fields
    - 02-P2  # AppContext hook, styles.css social selectors, claudeos-page CSS class
  provides:
    - SocialMetricCard component (src/components/ui/SocialMetricCard.tsx)
    - SocialPage full implementation (src/components/pages/SocialPage.tsx)
  affects:
    - Obsidian plugin Social Stats tab — now renders real data from configured JSON files

tech_stack:
  added: []
  patterns:
    - Discriminated union state (T | null | 'error') for distinguishing path-empty vs read-failed
    - useEffect with settings path as dependency for data refresh on path change
    - toLocaleString() for locale-aware number formatting
    - substring(0,10) to safely trim updated_at ISO string to YYYY-MM-DD

key_files:
  created:
    - src/components/ui/SocialMetricCard.tsx
  modified:
    - src/components/pages/SocialPage.tsx  # replaced Phase 1 stub with full implementation
    - main.js                              # rebuilt artifact

decisions:
  - SocialData<T> = T | null | 'error' discriminated union — null means path was empty (no read attempted), 'error' means path set but file unreadable or malformed; this distinction drives two different empty-state copy variants
  - formatUpdated uses substring(0,10) not date parsing — satisfies T-02-09 (XSS mitigation on updated_at) while keeping implementation simple and avoiding date library dependency
  - SocialPage uses two separate useEffect hooks (one per platform) with the settings path as the dependency array — if the user updates one path in Settings, only that card's data re-reads

metrics:
  duration: "~3 minutes"
  completed: "2026-06-06"
  tasks: 2
  files: 3
---

# Phase 2 Plan 3: Social Stats Page Summary

Social Stats page built: SocialMetricCard UI component plus SocialPage container reading LinkedIn and X data from user-configured file paths in plugin settings.

## What Was Built

**Task 1 — SocialMetricCard** (`1277d9a`)

New component `src/components/ui/SocialMetricCard.tsx` that renders one social platform card. Accepts `platform: 'linkedin' | 'x'` and `data: LinkedInData | XData | null | 'error'`. Three render paths:

- `null` (path empty): platform-specific empty state — "No LinkedIn data" / "No X data" with body "Set a file path in Settings to load metrics."
- `'error'` (file unreadable): "Couldn't read LinkedIn data" / "Couldn't read X data" with body "Check that the file path in Settings is correct."
- Data object: metrics row with toLocaleString()-formatted numbers, optional "Updated: YYYY-MM-DD" footer.

**SocialMetricCard props interface (for Phase 3 social data pipeline reference):**
```typescript
interface SocialMetricCardProps {
  platform: 'linkedin' | 'x';
  data: LinkedInData | XData | null | 'error';
}
```

**Task 2 — SocialPage** (`20cebac`)

Replaced Phase 1 stub in `src/components/pages/SocialPage.tsx`. Reads both settings paths on mount, translates the readJsonFile null-return into the `'error'` discriminated state, and renders two SocialMetricCards (LinkedIn first, X second). All data path references come exclusively from `plugin.settings` — no hardcoded paths.

## Settings Paths — Confirmed Settings-Only

Both paths come from plugin settings:
```typescript
plugin.settings.linkedinDataPath  // LinkedIn JSON path
plugin.settings.xDataPath         // X JSON path
```

Settings fields are configured in SettingsTab (02-P1). No fallback defaults or hardcoded paths exist in SocialPage or SocialMetricCard.

## Example JSON Files for Testing

**LinkedIn data file** (e.g., path: `social/linkedin.json` in vault or `C:\path\to\linkedin.json`):
```json
{
  "followers": 1240,
  "connections": 500,
  "posts": 87,
  "updated_at": "2026-06-01T00:00:00Z"
}
```

**X data file** (e.g., path: `social/x.json` in vault):
```json
{
  "followers": 3800,
  "following": 412,
  "tweets": 1056,
  "updated_at": "2026-06-01T00:00:00Z"
}
```

Both files support optional `updated_at`. With the above values, display will show: "Followers: 1,240 | Connections: 500 | Posts: 87" and "Updated: 2026-06-01".

## Verification Results

- `tsc --noEmit` exits 0 — confirmed clean on both Task 1 and Task 2
- `npm run build` exits 0 — main.js produced
- `grep -c "linkedinDataPath\|xDataPath" SocialPage.tsx` returns 4 (>=2 required)
- `grep -c "SocialMetricCard" SocialPage.tsx` returns 3 (>=2 required)
- `grep -c "toLocaleString" SocialMetricCard.tsx` returns 6 (>=3 required)

## Deviations from Plan

None — plan executed exactly as written. The implementation matches the code snippets provided in the plan tasks.

## Threat Model Mitigations Applied

| Threat ID | Mitigation Confirmed |
|-----------|---------------------|
| T-02-08 | Metric values are typed `number`; pass through `toLocaleString()` producing plain string; rendered as React text children (HTML-escaped by React) |
| T-02-09 | `updated_at` passes through `formatUpdated()` which calls `substring(0, 10)` — caps at 10 chars, strips any injection attempt; rendered as React text child |
| T-02-10 | Accepted (single-user local plugin, read-only access) |
| T-02-11 | Accepted (two concurrent reads on mount; small files, single user) |

## Known Stubs

None. SocialPage reads real data from configured paths. Both cards render meaningful empty states when paths are unconfigured.

## Self-Check

- [x] `src/components/ui/SocialMetricCard.tsx` exists
- [x] `src/components/pages/SocialPage.tsx` contains `plugin.settings.linkedinDataPath`
- [x] Commit `1277d9a` exists (SocialMetricCard)
- [x] Commit `20cebac` exists (SocialPage)
- [x] TypeScript clean, build clean
