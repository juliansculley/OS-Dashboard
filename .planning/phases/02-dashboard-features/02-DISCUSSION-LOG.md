# Phase 2: Dashboard Features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 2-dashboard-features
**Areas discussed:** Skill trigger design, Home page tiles, Settings UI

---

## Skill Trigger Design

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded array in source | Small fixed list baked into the component. Safe, simple, change requires code update. | ✓ |
| Configurable in plugin settings | User edits allowlist in Settings tab. More flexible but adds UI surface and validation complexity. | |
| You decide | Claude picks simpler approach. | |

**User's choice:** Hardcoded array in source

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fire and forget | Spinner then success/error indicator only. Matches SKILL-03. | ✓ |
| Capture and display stdout inline | Show skill output in button card. OUT-01 (v2) covers this properly. | |

**User's choice:** Fire and forget

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated Skills section below tiles | Clear visual separation: tiles at top, buttons below. | ✓ |
| Inline with relevant status tiles | More contextual but complicates layout. | |
| Full-width button row at bottom | All skill buttons in a row across the page bottom. | |

**User's choice:** Dedicated Skills section below tiles

---

| Option | Description | Selected |
|--------|-------------|----------|
| Just one placeholder | Minimum viable — proves the mechanism. | |
| A small set of real daily skills (2–4) | Ship something actually useful from day one. | ✓ |
| You decide | Claude picks a single placeholder. | |

**User's choice:** Real skills — `wiki-optimizer`, `braindump`, `humanizer` (provided as free text)

---

## Home Page Tiles

| Option | Description | Selected |
|--------|-------------|----------|
| JSON files | Simple key-value, easy from automations/MCPs, typed interfaces. | ✓ |
| Markdown with YAML frontmatter | Fits Obsidian-note pattern. Slightly more parsing overhead. | |

**User's choice:** JSON files

---

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: 2 tiles | Proves the tile mechanism, easy data file setup. | ✓ |
| Your actual status items | Ship tiles that are immediately useful. | |
| You decide | Claude picks 2-3 sensible defaults. | |

**User's choice:** Minimal: 2 tiles

---

| Option | Description | Selected |
|--------|-------------|----------|
| Last Claude skill run (timestamp + skill name) | Shows most recent skill triggered from dashboard. | |
| Active project count (reads from JSON) | How many projects currently active. | ✓ |
| You decide | Claude picks useful second tile. | |

**User's choice:** Active project count — Tile 1: "Last vault sync" (timestamp), Tile 2: "Active projects" (count from JSON)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show tile with '—' and muted 'No data' | Tile stays visible, layout stable. | ✓ |
| Hide the tile entirely | Cleaner but layout shifts when files appear/disappear. | |

**User's choice:** Show tile with '—' and muted 'No data'

---

## Settings UI

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — simple settings tab with configurable file paths | Required by SOCIAL-03. One settings page with data file path fields. | ✓ |
| No — paths hardcoded for now | Simpler but conflicts with SOCIAL-03 requirement. | |

**User's choice:** Yes — plugin Settings tab in Phase 2

---

| Option | Description | Selected |
|--------|-------------|----------|
| File paths only | LinkedIn path, X path, tile data paths. Skill allowlist stays hardcoded. | ✓ |
| File paths + skill list | Users can add/remove skill buttons from settings. | |

**User's choice:** File paths only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Empty strings — user must set paths before data loads | Forces explicit setup. No risk of reading wrong file by default. | ✓ |
| Convention-based defaults | Works out of the box if naming convention is followed. | |
| You decide | Claude picks sensible defaults based on vault structure. | |

**User's choice:** Empty strings — explicit setup required

---

## Claude's Discretion

- Exact JSON schema field names for LinkedIn and X data files
- Tile JSON file schema (key names for timestamp, count values)
- Settings tab label copy, help text, and section grouping
- Whether tile data paths are configured individually or as a shared data directory

## Deferred Ideas

- **Inline skill output display** — stdout/stderr in the button card — deferred to Phase 5 (OUT-01 v2 requirement)
- **Configurable skill allowlist in settings** — adds validation complexity; keep hardcoded in v1
