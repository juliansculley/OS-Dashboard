---
phase: 05-skill-output-ux-polish
plan: "01"
subsystem: skills
tags: [skill-output, stdout-contract, braindump, humanizer, wiki-optimizer]
dependency_graph:
  requires: []
  provides: [Output-line-contract-braindump, Output-line-contract-humanizer, Output-line-contract-wiki-optimizer]
  affects: [05-03-dashboard-output-parsing, 05-04-t4-rerun]
tech_stack:
  added: []
  patterns: [Output-line-stdout-contract]
key_files:
  created: []
  modified:
    - C:/Users/scull/OneDrive/ClaudeOS/Skills-dev/braindump/SKILL.md
    - C:/Users/scull/OneDrive/ClaudeOS/Skills-dev/humanizer/SKILL.md
    - C:/Users/scull/OneDrive/ClaudeOS/Skills-dev/wiki-optimizer/SKILL.md
decisions:
  - "humanizer output path: braindumps/humanized-YYYY-MM-DD-HHmmss.md (researcher default, not user-confirmed at execution — see note)"
  - "Output line format: bare unformatted line (not backtick-wrapped) so Select-String/grep verify checks pass against ^Output:"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-07"
  tasks_completed: 3
  files_modified: 3
---

# Phase 5 Plan 01: Skill Output Line Contracts Summary

**One-liner:** Added machine-parseable `Output: <vault-relative-path>` stdout lines to braindump, humanizer, and wiki-optimizer skills, plus a Cowork-mode file-write step for humanizer.

## What Was Built

Three SKILL.md files outside the git worktree were edited in-place via PowerShell. Each now instructs the skill to emit a final stdout line matching the dashboard regex `/^Output:\s+(.+)$/m` (D-08).

**IMPORTANT — out-of-repo files:** All three SKILL.md files live at `C:/Users/scull/OneDrive/ClaudeOS/Skills-dev/` which is OUTSIDE this git worktree. They were edited directly on the filesystem. They are NOT committed in this repo. Only this SUMMARY.md file is committed here.

## Tasks Completed

### Task 1: braindump SKILL.md

**Output line added:**
```
Output: braindumps/YYYY-MM-DD_braindump.md
```

Added to Step 5 "Cowork mode" section, after the existing `> File saved...` chat line. The instruction reads: "After saving, also print a final line for tooling (vault-relative path, no drive letter):" followed by the bare Output line. The Mobile/standard-app branch and file-write logic are unchanged.

### Task 2: humanizer SKILL.md

**New section added:** "## Cowork Mode: Save Output to File" — inserted between the existing `## Process` section (after step 9) and the existing `## Output Format` section.

**Cowork-mode additions:**
1. Get timestamp via `date +%Y%m%d-%H%M%S`
2. Write final humanized rewrite to `braindumps/humanized-YYYY-MM-DD-HHmmss.md`
3. Print Output line:

```
Output: braindumps/humanized-YYYY-MM-DD-HHmmss.md
```

Mobile/standard-app inline-only behavior is preserved with explicit "do NOT print an Output line" instruction for that mode. All 29 existing pattern sections are intact (verified by grep count).

**humanizer output path decision:** Adopted researcher default `braindumps/humanized-YYYY-MM-DD-HHmmss.md` from RESEARCH.md Open Question 1 (RESOLVED). This was not user-confirmed at execution time — the plan note said "confirm at execution if possible; otherwise use this default and record in SUMMARY." The default was used. If the user wants a different folder (e.g., `humanized/` vs `braindumps/`), SKILL.md can be updated before 05-04 T4 re-run.

### Task 3: wiki-optimizer SKILL.md

**Output line added to Phase 3 step 2:**

```
Output: wiki/optimizer-reports/OPTIMIZER-YYYY-MM-DD.md
```

Added as an addendum to step 2's instruction ("After presenting, also print a final line for tooling..."). The approval prompt remains step 3 (numbering unchanged). Phase 0-4 logic, report template, log-line format, and approval prompt are all unchanged.

## Output Line Formats (Contract Summary)

| Skill | Output line format | Vault-relative? |
|-------|-------------------|-----------------|
| braindump | `Output: braindumps/YYYY-MM-DD_braindump.md` | Yes |
| humanizer | `Output: braindumps/humanized-YYYY-MM-DD-HHmmss.md` | Yes |
| wiki-optimizer | `Output: wiki/optimizer-reports/OPTIMIZER-YYYY-MM-DD.md` | Yes |

All three use vault-relative paths (no `C:\` drive prefix). The dashboard regex `/^Output:\s+(.+)$/m` (added in 05-03) will match each skill's final line.

## Verification Results

All three files passed their acceptance criteria:

**braindump:**
- `Select-String -Pattern '^Output: braindumps/'` → True
- `Select-String -Pattern '^Output: C:'` → False
- `File saved` line still present → True

**humanizer:**
- `Select-String -Pattern 'braindumps/humanized-'` → True
- `Select-String -Pattern '^Output: braindumps/humanized-'` → True
- `Select-String -Pattern '^Output: C:'` → False
- 29 pattern sections still present → verified by grep count

**wiki-optimizer:**
- `Select-String -Pattern '^Output: wiki/optimizer-reports/OPTIMIZER-'` → True
- Approval prompt still at step 3 → verified

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Minor formatting decision (not a deviation):** The Output line in braindump was initially written as a backtick code span (`` `Output: braindumps/...` ``). Since the verify check uses `^Output:` which requires the line to start with the literal character O (not a backtick), I removed the backtick wrapping. This is correct behavior — the SKILL.md line instructs the skill what to print to stdout; the backtick formatting was cosmetic and would have caused the verify regex to fail without changing the skill's behavior.

## Key Decisions

1. **humanizer output path:** `braindumps/humanized-YYYY-MM-DD-HHmmss.md` — researcher default adopted without user confirmation at execution. HHmmss timestamp prevents same-day collisions. If the user prefers a different folder, update SKILL.md before the 05-04 T4 re-run.

2. **Output line placement in wiki-optimizer:** Added as inline addendum to Phase 3 step 2 rather than as a new numbered step, to preserve the existing step 3 approval prompt numbering per the acceptance criteria.

3. **Output line format (bare vs. code-span):** All Output lines are bare (unformatted) text lines, not wrapped in backtick code spans, so the `^Output:` regex matches them in both verification scripts and skill stdout parsing.

## Known Stubs

None. All three Output line instructions are complete and point to the actual output paths each skill writes.

## Threat Flags

No new threat surface introduced. All Output lines use vault-relative paths (T-05-01 mitigated). No `Output: C:` forms are present in any file (verified). The `..` traversal guard (T-05-02) is implemented downstream in 05-03 and is not in scope for this plan.

## Self-Check: PASSED

- braindump/SKILL.md modified: verified (grep confirms Output line at line 118)
- humanizer/SKILL.md modified: verified (grep confirms Output line and 29 patterns)
- wiki-optimizer/SKILL.md modified: verified (grep confirms Output line at line 103)
- No absolute Output lines in any file: verified
- Existing behavior preserved in all three files: verified
