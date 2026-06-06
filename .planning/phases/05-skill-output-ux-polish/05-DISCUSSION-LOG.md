# Phase 5: Skill Output + UX Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 5-Skill Output + UX Polish
**Areas discussed:** Skill Classification, Skill Input UX, Output Display, Cross-Page State (OUT-02)

---

## Skill Classification

| Option | Description | Selected |
|--------|-------------|----------|
| braindump=input, humanizer=input, wiki-optimizer=self-contained | Clean split; wiki-optimizer runs against vault files it finds on its own | ✓ |
| All three need input | Even wiki-optimizer benefits from target path; more flexible but more friction | |
| All three are self-contained | Skip input UX entirely; verify skills produce output without it | |

**User's choice:** braindump = input-required, humanizer = input-required, wiki-optimizer = self-contained

---

### humanizer input type

| Option | Description | Selected |
|--------|-------------|----------|
| Raw text typed in UI | Paste or type content directly in the dashboard | |
| Vault file path | User selects or types a path to an existing vault note | |
| Either — textarea with optional file picker | Text area primary; file picker button populates from file | ✓ |

**User's choice:** Either — textarea with optional file picker  
**Notes:** User clarified that the file picker only needs to know the file path (vault-relative). Claude CLI handles reading the file; the dashboard does not need to load file content into the interface. Just a way to point to a directory or filename easily.

---

### braindump output destination

| Option | Description | Selected |
|--------|-------------|----------|
| Raw text → output written to vault file automatically | Skill organizes thoughts and writes a note; output path determined by skill | ✓ |
| Raw text → output shown inline in dashboard | Organized output appears in pane; no file written unless explicitly saved | |
| You decide | Let researcher figure out how braindump skill works | |

**User's choice:** Output written to vault file automatically by the skill

---

## Skill Input UX

### Input panel appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Expand below the button on click | Clicking reveals textarea/path field inline; Run button inside; collapses after run | ✓ |
| Modal dialog overlay | Floating dialog over dashboard; requires Obsidian modal API or React portal | |
| Always-visible input area above buttons | Textarea permanently shown; simpler but takes permanent space | |

**User's choice:** Expand below the button on click

---

### humanizer path scope

| Option | Description | Selected |
|--------|-------------|----------|
| Any filesystem path | User types absolute or relative path; no vault restriction | |
| Vault-relative paths only | Path resolved relative to vault root | ✓ |

**User's choice:** Vault-relative paths only

---

### Cancel / collapse mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Clicking the skill button again toggles it closed | Same button opens and closes; input cleared on collapse | ✓ |
| Explicit Cancel button inside expanded area | Cancel link/button next to Run; explicit but adds UI clutter | |
| Clicking anywhere outside collapses it | Click-away dismiss; familiar but can cause accidental input loss | |

**User's choice:** Clicking the skill button again toggles it closed

---

## Output Display (OUT-01)

### Output panel location

| Option | Description | Selected |
|--------|-------------|----------|
| Inline below the skill button that fired it | Output expands beneath specific button; cause and effect together | ✓ |
| Shared output panel at bottom of Home page | One output area; shows most recent run | |
| Don't show output — just confirm Done/Failed | Skills write files; user opens vault note; defer OUT-01 entirely | |

**User's choice:** Inline below the skill button that fired it

---

### Output panel content

| Option | Description | Selected |
|--------|-------------|----------|
| Raw stdout as plain text, scrollable | Whatever skill prints; no parsing; cap at line limit | |
| Rendered markdown via sanitizeHTMLToDom | Richer but needs format detection; adds complexity | |
| Summary line + 'view file' link | One status line with link to vault note | |

**User's choice:** Freeform / Other  
**Notes:** User pointed out this is an Obsidian plugin and all skill outputs are markdown. Asked: can output just display a file link that opens a new Obsidian tab? Rely on Obsidian's rendering and editing interface instead of building a new one. Decision: parse output file path from stdout, display as a clickable vault link using `app.workspace.openLinkText()`.

---

### How dashboard knows the output file path

| Option | Description | Selected |
|--------|-------------|----------|
| Each skill has configured output path in Settings | Output path per skill in plugin settings | |
| Skill prints output path to stdout — dashboard parses it | Last line or labeled line; requires predictable skill output format | ✓ |
| Most recently modified file in configured output folder | Scan folder after exit; fragile with race conditions | |

**User's choice:** Parse from stdout  
**Notes:** User noted that when any skill runs, it will know exactly where it put the output file. Path can be printed or requested as part of a simple output command. Dashboard displays the file path/name and converts it to a vault text link.

---

## Cross-Page State (OUT-02)

### State storage location

| Option | Description | Selected |
|--------|-------------|----------|
| Lift to AppContext | Add skill-state map to AppContext; clean React pattern; no persistence needed | ✓ |
| Module-level singleton | Plain JS object at module scope; no re-renders automatically | |
| Write to Obsidian plugin data | Survives plugin reload; overkill for transient run state; async complexity | |

**User's choice:** Lift to AppContext

---

### What you see after navigating away and back while a skill runs

| Option | Description | Selected |
|--------|-------------|----------|
| Button still showing spinner → Done/link on complete | Same state machine continues in context | |
| Persistent status banner above page content | Bar shows 'Braindump running...' regardless of which page you're on | |
| You decide | Let planner figure out visual treatment | |

**User's choice:** Both approaches are good — implement both  
**Notes:** User noted both approaches seem good and wouldn't add too much visual clutter if there is a persistent status bar that displays text when a skill is running, while also seeing it on the main page button itself. Good confirmation that things are running even if navigating to another page.

---

### Status bar placement

| Option | Description | Selected |
|--------|-------------|----------|
| Below sidebar navigation, above page content | Slim bar between nav and page body; only appears when running; zero height otherwise | ✓ |
| Bottom of dashboard pane | Anchored to bottom; less intrusive but easier to miss | |
| Inside sidebar as running indicator | Small spinner/dot next to nav icon; subtle but hard to surface meaningful text | |

**User's choice:** Below sidebar navigation, above page content

---

## Claude's Discretion

- Exact stdout format to parse for output file path — researcher checks how existing skills output their file location
- Status bar visual design — follow `--cos-*` token system; keep slim and non-intrusive
- Whether humanizer textarea and path field are mutually exclusive or path takes precedence when both filled

## Deferred Ideas

- **File picker with vault autocomplete** — richer picker that autocompletes from vault filenames; deferred to future polish phase
- **Markdown rendering inside dashboard** — inline formatted markdown output; deferred in favor of Obsidian's native note view
