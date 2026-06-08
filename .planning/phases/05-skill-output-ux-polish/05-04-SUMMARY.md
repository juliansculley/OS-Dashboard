---
phase: 05-skill-output-ux-polish
plan: 04
status: complete
completed: 2026-06-07
---

## Objective
Close the Phase 2 T4 gap: re-run skill execution end-to-end with real input and verify a file is produced.

## Outcome
T4 closed. Braindump confirmed working: input panel opened, user provided text, skill ran via `claude.cmd`, output file written to braindumps/, Open output link navigated to the file.

## Key Findings During Execution

### Root cause of all prior skill failures
`claude -p <skill-name>` treats the argument as a plain chat prompt, not a skill invocation. The correct form is `claude -p /skill-name` (slash prefix). Skills must be installed globally in `~/.claude/skills/` to resolve in a subprocess.

### Windows spawn requirements
On Windows, `spawn('claude', ...)` fails with EINVAL because `.cmd` files cannot be executed without a shell. Required fix:
- Executable: `claude.cmd` (detect via `process.platform === 'win32'`)
- Options: `{ shell: true, windowsHide: true }`

Without `shell: true`, the error is thrown synchronously before the `'error'` event listener is attached, causing a silent uncaught exception with no "Failed" UI indicator.

### Permission mode
`--allowedTools Write --permission-mode acceptEdits` works for skills that only need the Write tool. Adding Bash to allowedTools causes Claude to attempt shell commands for timestamps; `acceptEdits` doesn't auto-approve Bash, producing a hang. Limiting to `Write` forces Claude to use its built-in date context instead.

### Skills installed globally
braindump, humanizer, wiki-optimizer, and test-skill were copied from Skills-dev to `~/.claude/skills/` so they resolve in a fresh subprocess without the anthropic-skills plugin context.

## Changes Made
- `src/components/ui/SkillButton.tsx`: fixed spawn to use `claude.cmd` + `shell: true` on Windows; added `SKILL_INVOCATIONS` map with `/skill-name` format; changed success state to persist until user dismisses (click button or Open output link); added console logging for debugging
- `src/components/ui/SkillInputPanel.tsx`: added `test-skill` to type union
- `src/components/ui/SkillsSection.tsx`: added Test Skill button
- `~/.claude/skills/`: installed braindump, humanizer, wiki-optimizer, test-skill globally
- `Skills-dev/test-skill/SKILL.md`: updated to emit `Output: test-files/filename.md` line
- `.planning/phases/02-dashboard-features/02-UAT.md`: T4 updated to pass, summary counts corrected, gap annotated resolved

## UAT Result
02-UAT.md T4: partial → pass. All 8 tests now pass.
