# Architecture Decisions

Cross-cutting decisions and hard-won findings that span phases. Read this before planning any phase that touches skill execution, subprocess invocation, or Windows-specific Node.js behavior.

---

## D-001 — Claude CLI Subprocess Invocation (Phase 5)

**Context:** The plugin needs to invoke Claude Code skills from an Obsidian Electron renderer process using `child_process`.

**Decision:** Use `spawn(claudeExe, args, { shell: true, windowsHide: true })` where `claudeExe = process.platform === 'win32' ? 'claude.cmd' : 'claude'`.

### What was tried and why it failed

| Approach | Result | Why |
|---|---|---|
| `spawn('claude', ['-p', 'braindump'])` | Silent: 2-min hang then idle, no file | Runs bash wrapper script (`claude` no-extension); `EINVAL` thrown before `'error'` listener attaches — looks like nothing happened |
| `spawn('claude.cmd', [...], { shell: false })` | `EINVAL` immediately | `.cmd` files need cmd.exe; `shell: false` rejects them at the OS level |
| `claude -p "braindump"` | Exit 0, Claude replies conversationally | Treats "braindump" as a chat message, not a skill call |
| `claude -p "/test-skill"` (skill not in `~/.claude/skills/`) | "test-skill isn't a registered skill" | Subprocess has no plugin context; anthropic-skills namespace not available |
| `claude -p "/anthropic-skills:braindump"` | "skill not found" | Same — anthropic-skills plugin not loaded in fresh subprocess |
| `--allowedTools Write,Bash,Read,Edit --permission-mode acceptEdits` | 2-min hang then exit 0, no file | Bash in allowedTools → Claude uses shell for timestamps → `acceptEdits` doesn't auto-approve Bash → blocks waiting for permission |

### What works

```typescript
const claudeExe = process.platform === 'win32' ? 'claude.cmd' : 'claude';
spawn(claudeExe, [
  '--allowedTools', 'Write',
  '--permission-mode', 'acceptEdits',
  '-p', '/skill-name'   // leading slash is required
], { shell: true, windowsHide: true });
```

Input via stdin only — never in the args array:
```typescript
child.stdin.write(input, 'utf8');
child.stdin.end();
```

### Skill installation requirement

Skills must be in `~/.claude/skills/<skill-name>/SKILL.md` to resolve in a subprocess. The interactive session's `anthropic-skills:` namespace is loaded from the Skills-dev cowork plugin and is not available to fresh subprocesses.

To install: copy the skill folder from `C:\Users\scull\OneDrive\ClaudeOS\Skills-dev\<skill-name>\` to `~\.claude\skills\<skill-name>\`.

Currently installed globally: `braindump`, `humanizer`, `wiki-optimizer`, `test-skill`.

### Output line convention

Skills that produce a file must print this exact line to stdout for the plugin to parse it:
```
Output: vault/relative/path.md
```
No backticks, no extra text. The plugin's `parseOutputPath()` matches `^Output:\s+(.+)$`.

### Diagnostic pattern for silent failures

If a skill button spins then returns to idle with no file:
1. Open Obsidian dev tools (Ctrl+Shift+I) → Console
2. Look for `[ClaudeOS] spawning:` log — confirms the subprocess started
3. Look for `[ClaudeOS] skill "X" closed. code=N stdout=[...]` — shows what Claude actually returned
4. `EINVAL` in the console = wrong executable or missing `shell: true`
5. `code=0 stdout=[]` = skill ran but produced no output (check allowedTools, check skill is globally installed)
6. `code=0 stdout=[Output: ...]` but no file on disk = skill ran but Write was blocked (check hooks, check cwd)

---
