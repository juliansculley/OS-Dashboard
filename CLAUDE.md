# OS-Dashboard Workstation

## Identity

OS-Dashboard is your command center for system health, automation, and digital operations. Work routes here when you're configuring or reviewing your operating system, testing automations, managing system-wide integrations, or building new features for your computational environment. Content creation, strategy work, and project management stay elsewhere.

## Resources

| Resource | Read when... |
|---|---|
| | (populate as needed) |

## Workflow

1. **Assess the ask** — Is this a system config, automation test, integration issue, or feature request? Clarify scope.
2. **Check current state** — Read relevant files (config, logs, status) to understand what's already in place.
3. **Execute or recommend** — Make the change or propose the approach with reasoning.
4. **Document changes** — Log any structural changes to MEMORY.md. Update this workstation's config files.
5. **Verify** — Test the change if applicable; confirm it works as intended.

## Editorial Rules

Follow my voice principles in `00_Resources/voice-principles.md`.

When documenting system configurations or automations, be direct about what changed and why. Avoid technical jargon unless necessary; explain the impact in user-facing terms. For automation workflows, always include what triggers the action and what it produces.


## Build & Deploy

**Always use `npm run deploy` (not `npm run build`) when work needs to appear in Obsidian.**

`npm run deploy` = TypeScript check + esbuild production build + copy `main.js` and `styles.css` to the Obsidian plugin directory. Works from both the main checkout and any worktree.

**Before presenting any UAT checklist:**
1. Run `npm run deploy` from the active worktree (or main checkout).
2. Tell the user to reload Obsidian (Ctrl+R or close/reopen).
3. Then present the UAT items.

If the build or copy fails, surface the error before proceeding to UAT — there is no point testing against stale code.

## Settings Paths

`data.json` (plugin settings, gitignored) lives in the Obsidian plugin directory and persists across branches. The paths that matter:

- **`syncScriptPath`**: must always point to `C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\scripts\notion-sync.mjs` (main checkout). Do not change this.
- **`nodePath`**: machine-specific, set once, never changes.
- **Snapshot paths** (`tasksSnapshotPath`, etc.): vault-relative, stable, never change.

**If a future phase modifies `notion-sync.mjs`**: the Refresh button cannot be tested until after the branch merges to master (the path stays pointing at main). Test the script directly from the command line instead: `& "C:\Users\scull\AppData\Local\nvm\v24.12.0\node.exe" scripts\notion-sync.mjs`

## Spawning Claude Subprocesses from the Plugin

The Obsidian plugin uses `child_process` to invoke Claude skills. Several non-obvious constraints apply. Violating any of them produces silent failure — no error indicator, no output. See `.planning/DECISIONS.md` for the full investigation log.

**The four rules — all are required:**

1. **Executable**: use `claude.cmd` on Windows, `claude` on Mac/Linux.  
   `spawn('claude', ...)` on Windows finds the bash wrapper script and fails with `EINVAL` synchronously (before the `'error'` event listener attaches, so it looks like nothing happened).  
   ```typescript
   const claudeExe = process.platform === 'win32' ? 'claude.cmd' : 'claude';
   ```

2. **Shell mode**: always `{ shell: true }`.  
   `.cmd` files require cmd.exe; `shell: false` throws `EINVAL` even with the correct filename.

3. **Invocation format**: `/skill-name` with the leading slash.  
   `claude -p braindump` sends "braindump" as a chat prompt — Claude replies conversationally, exits 0, writes nothing. The correct form is `claude -p /braindump`.

4. **Skills must be globally installed**: copy `SKILL.md` (and any resources) to `~/.claude/skills/<skill-name>/`.  
   A freshly spawned `claude` subprocess does not inherit the interactive session's plugin context. Skills only resolve if they exist globally. The `anthropic-skills:` namespace is not available in subprocesses.

**Permission flags that work:**
```
--allowedTools Write --permission-mode acceptEdits
```
Do not add `Bash` to `--allowedTools`. If Bash is available, Claude will use it for timestamps; `acceptEdits` does not auto-approve Bash calls, causing a silent hang for the full API timeout (~2 min), then exit 0 with no output.

**Output parsing**: skills must print `Output: vault/relative/path.md` on its own line. The plugin's `parseOutputPath()` looks for this exact pattern. If a skill does not emit this line, the Open output link will not appear (the run still counts as success).
