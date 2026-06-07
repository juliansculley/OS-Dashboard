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
