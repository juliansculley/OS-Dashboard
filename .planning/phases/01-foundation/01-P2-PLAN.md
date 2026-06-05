---
phase: 01-foundation
plan: P2
type: execute
wave: 2
depends_on:
  - 01-P1
files_modified:
  - .husky/pre-commit
  - package.json
autonomous: false
requirements:
  - FOUND-03
  - FOUND-04
  - SEC-01
  - SEC-02

must_haves:
  truths:
    - "Clicking the ribbon icon opens the ClaudeOS Dashboard pane in a new tab"
    - "The 'Open ClaudeOS Dashboard' command appears in the Obsidian command palette and opens the dashboard"
    - "Left sidebar shows 'Home' and 'Social' nav items with Lucide icons"
    - "Clicking 'Home' nav item shows the Home placeholder page without re-rendering the sidebar"
    - "Clicking 'Social' nav item shows the Social placeholder page without re-rendering the sidebar"
    - "Active nav item shows accent color (#7c6af7) background tint and text"
    - "gitleaks pre-commit hook blocks a commit containing a fake API key string"
    - "Attempting to inject `<script>alert(1)</script>` through sanitizeHTMLToDom() produces no script execution"
  artifacts:
    - path: ".husky/pre-commit"
      provides: "gitleaks secret scanning on every commit"
      contains: "gitleaks protect --staged --redact"
    - path: "src/views/DashboardView.tsx"
      provides: "Obsidian ItemView mounting React root at this.contentEl"
      contains: "this.contentEl"
    - path: "src/components/App.tsx"
      provides: "State-based page router — no URL routing"
      contains: "useState"
    - path: "src/components/ui/Sidebar.tsx"
      provides: "Left nav with Lucide icons via setIcon()"
      contains: "setIcon"
  key_links:
    - from: "main.ts (addRibbonIcon)"
      to: "activateDashboardView()"
      via: "ribbon click callback"
      pattern: "activateDashboardView"
    - from: "App.tsx (activePage state)"
      to: "Sidebar.tsx onNavigate prop"
      via: "setActivePage passed as onNavigate"
      pattern: "onNavigate"
    - from: "sanitizeHTMLToDom"
      to: "containerEl.appendChild"
      via: "returns DocumentFragment — must be appended, not innerHTML"
      pattern: "sanitizeHTMLToDom"
---

<objective>
Verify the Phase 1 navigation shell works end-to-end in Obsidian, establish the Windows symlink for the dev loop, configure the gitleaks + husky pre-commit hook, and verify the XSS sanitization layer.

Purpose: This plan closes the gap between "plugin compiles" (P1) and "plugin is verified working in Obsidian with security primitives live" (Phase 1 done).
Output: Symlink from vault to repo, .husky/pre-commit with gitleaks, human-verified Obsidian load and navigation.
</objective>

<execution_context>
@C:\Users\scull\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\scull\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\.planning\PROJECT.md
@C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\.planning\ROADMAP.md
@C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\.planning\phases\01-foundation\01-P1-SUMMARY.md

<interfaces>
<!-- Contracts the executor needs from P1 output -->

SYMLINK TARGET (D-07):
  Repo path:    C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard
  Plugin path:  C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard
  Type:         Directory symlink (mklink /D or New-Item -ItemType SymbolicLink)
  Prerequisite: Windows Developer Mode must be enabled (Settings > System > For Developers)

GITLEAKS INSTALL (D-09, from RESEARCH.md):
  Method:  winget install Gitleaks.Gitleaks
  Binary:  gitleaks.exe added to PATH automatically
  Version: v8.30.1 (current as of 2026-03-21)
  Verify:  gitleaks version (in PowerShell)

HUSKY v9 INIT (from RESEARCH.md):
  Commands: npx husky init  (adds "prepare": "husky" to package.json, creates .husky/pre-commit)
  Note: package.json already has "prepare": "husky" from P1 — husky init may update it; that is fine

PRE-COMMIT HOOK CONTENT (from RESEARCH.md — POSIX sh, not PowerShell, because git runs hooks via git-bash sh):
#!/usr/bin/env sh
# ClaudeOS Dashboard — pre-commit secret scanner
# Requires: gitleaks installed via `winget install Gitleaks.Gitleaks`

# Add winget links dir to PATH in case git's env doesn't include it
export PATH="$PATH:/c/Users/scull/AppData/Local/Microsoft/WinGet/Links"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not found. Install: winget install Gitleaks.Gitleaks" >&2
  exit 1
fi

gitleaks protect --staged --redact

SANITIZE PATTERN (SEC-01 — from RESEARCH.md, D-02):
  import { sanitizeHTMLToDom } from 'obsidian';
  const fragment = sanitizeHTMLToDom(untrustedHtml); // returns DocumentFragment
  containerEl.appendChild(fragment);                 // must append, not innerHTML
  
  The sanitizeHTMLToDom API is verified at this signature. It strips script tags,
  event handlers, and other XSS vectors. Phase 1 uses it as a utility — not yet
  wired to any real user input, but the import and usage pattern must be present
  in DashboardView.tsx or a utility file so it's verifiable in source.

PATH NOTE FOR GIT HOOKS ON WINDOWS (from RESEARCH.md §Pitfall 5):
  Git hooks run with a minimal PATH (git-bash env, not user PowerShell env).
  The winget install location for gitleaks is typically:
    C:\Users\scull\AppData\Local\Microsoft\WinGet\Packages\Gitleaks.Gitleaks_*
  The WinGet\Links symlink directory is:
    C:\Users\scull\AppData\Local\Microsoft\WinGet\Links
  Adding this to PATH in the hook (or in ~/.config/husky/init.sh) ensures gitleaks
  is found even when the hook runs in git-bash's restricted environment.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install gitleaks, initialize husky, write pre-commit hook, create vault symlink</name>
  <read_first>
    - C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\.planning\phases\01-foundation\01-RESEARCH.md (Gitleaks + Husky v9 setup section, Windows symlink section, Pitfall 5 gitleaks PATH note)
    - C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard\package.json (verify "prepare": "husky" already present from P1)
  </read_first>
  <files>
    .husky/pre-commit,
    package.json
  </files>
  <action>
**Step 1: Install gitleaks via winget (run in PowerShell)**
```powershell
winget install Gitleaks.Gitleaks
```
Wait for installation to complete. Then verify:
```powershell
gitleaks version
```
Expected output: `v8.30.1` (or later). If the command is not found in PowerShell PATH, close and reopen the terminal — winget updates PATH on install.

If winget fails (uncommon on Windows 11), fallback: download gitleaks_windows_amd64.zip from https://github.com/gitleaks/gitleaks/releases/latest, extract gitleaks.exe, place in C:\Users\scull\AppData\Local\Microsoft\WinGet\Links\ manually.

**Step 2: Initialize husky (run in PowerShell from repo root)**
```powershell
cd C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard
npx husky init
```
This creates .husky/pre-commit (with a placeholder) and may update package.json with "prepare": "husky". Since P1 already added "prepare": "husky", the update is a no-op or identical — no problem either way.

**Step 3: Write the pre-commit hook**
Replace the content of .husky/pre-commit with this exact content (POSIX sh — NOT PowerShell; git uses sh from Git for Windows):

```sh
#!/usr/bin/env sh
# ClaudeOS Dashboard — pre-commit secret scanner
# Requires: gitleaks installed via `winget install Gitleaks.Gitleaks`

# Add WinGet links to PATH — git-bash PATH may not include winget install location
export PATH="$PATH:/c/Users/scull/AppData/Local/Microsoft/WinGet/Links"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not found. Install: winget install Gitleaks.Gitleaks" >&2
  exit 1
fi

gitleaks protect --staged --redact
```

The file must be saved with LF line endings (not CRLF) — use the Write tool which produces LF by default.

**Step 4: Create vault symlink (run in PowerShell with Developer Mode enabled)**
```powershell
$pluginPath = "C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard"
$repoPath = "C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard"

# Only create if symlink doesn't already exist
if (-not (Test-Path $pluginPath)) {
  New-Item -ItemType SymbolicLink -Path $pluginPath -Target $repoPath
} else {
  Write-Host "Symlink already exists at $pluginPath"
}
```

If this fails with "Access Denied": Developer Mode is not enabled. Open Settings > System > For Developers > Developer Mode (toggle ON), then retry.

Verify symlink creation:
```powershell
Get-Item "C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard" | Select-Object LinkType, Target
```
Expected output: LinkType = SymbolicLink, Target = C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard

**Step 5: Add sanitizeHTMLToDom utility to DashboardView.tsx**
To make SEC-01 verifiable in source, add an import and a utility function to DashboardView.tsx. This documents that sanitization is the required pattern for any future dynamic HTML rendering in this plugin.

Add to the import block at top of src/views/DashboardView.tsx:
```typescript
import { ItemView, WorkspaceLeaf, sanitizeHTMLToDom } from 'obsidian';
```

Add after the class declaration (as a module-level utility function at the bottom of the file):
```typescript
/**
 * Renders sanitized HTML into a container element.
 * SEC-01: All dynamic HTML must go through this function — never use innerHTML directly.
 * sanitizeHTMLToDom() strips script tags, event handlers, and other XSS vectors.
 * Returns a DocumentFragment that must be appended to the DOM (not assigned to innerHTML).
 */
export function renderSafeHTML(containerEl: HTMLElement, rawHtml: string): void {
  containerEl.empty();
  const fragment = sanitizeHTMLToDom(rawHtml);
  containerEl.appendChild(fragment);
}
```

Run build to confirm no TypeScript errors:
```powershell
cd C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard
npm run build
```
  </action>
  <verify>
    <automated>
      In PowerShell:
      
      # gitleaks installed
      gitleaks version
      
      # Hook file exists and contains key line
      Test-Path .husky\pre-commit
      Select-String -Path .husky\pre-commit -Pattern "gitleaks protect --staged --redact"
      
      # Symlink exists and points to repo
      (Get-Item "C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard").LinkType
      
      # sanitizeHTMLToDom imported in DashboardView
      Select-String -Path src\views\DashboardView.tsx -Pattern "sanitizeHTMLToDom"
      
      # Build still passes after DashboardView edit
      npm run build; $LASTEXITCODE
    </automated>
  </verify>
  <acceptance_criteria>
    - `gitleaks version` exits 0 and prints a version string starting with `v`
    - `.husky/pre-commit` exists and contains `gitleaks protect --staged --redact`
    - `.husky/pre-commit` contains the PATH export line for WinGet Links
    - `Get-Item .obsidian\plugins\claudeos-dashboard` (in vault) has LinkType = SymbolicLink
    - `src/views/DashboardView.tsx` contains `sanitizeHTMLToDom` import and `renderSafeHTML` export
    - `npm run build` still exits 0 after DashboardView.tsx edit
  </acceptance_criteria>
  <done>gitleaks installed, husky hook live, symlink created, sanitizeHTMLToDom pattern present in source.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    P1 compiled the full plugin scaffold (main.ts, DashboardView, App, Sidebar, pages, styles.css, all config files).
    This task created:
    - Vault symlink at C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard pointing to the repo
    - Gitleaks pre-commit hook (.husky/pre-commit)
    - sanitizeHTMLToDom utility in DashboardView.tsx

    The plugin should now be loadable in Obsidian. Verify all four Phase 1 success criteria from ROADMAP.md.
  </what-built>
  <how-to-verify>
    **1. Load the plugin in Obsidian**
    - Open Obsidian (vault: C:\Users\scull\OneDrive\ClaudeOS)
    - Go to Settings > Community Plugins > Installed plugins
    - You should see "ClaudeOS Dashboard" listed (loaded from the symlink)
    - Enable it if not already enabled
    - Close Settings

    **2. FOUND-03 — Ribbon icon and command palette**
    - Look for a grid/dashboard icon in the left ribbon (leftmost vertical bar)
    - Click it — a new tab should open titled "ClaudeOS Dashboard"
    - Close that tab
    - Open the command palette (Ctrl+P)
    - Type "ClaudeOS" — "Open ClaudeOS Dashboard" should appear
    - Select it — the tab should open again
    - Expected: Tab opens without error. Title bar shows "ClaudeOS Dashboard".

    **3. FOUND-04 — Sidebar navigation without full re-render**
    - In the dashboard tab, you should see a left sidebar with "ClaudeOS" wordmark (purple/accent color)
    - Two nav items should be visible: "Home" and "Social", each with an icon
    - Click "Home" — main area should show "Home" heading
    - Click "Social" — main area should switch to "Social" heading
    - Click back to "Home"
    - Expected: Page switches are instant. Sidebar does not flash or reload. Active item shows purple accent background and text.

    **4. FOUND-02 — Hot-reload dev loop**
    - In PowerShell: `cd C:\Users\scull\OneDrive\ClaudeOS\OS-Dashboard && npm run dev`
    - Make a trivial edit to src/components/pages/HomePage.tsx (e.g., change placeholder text)
    - Save the file
    - Observe the terminal — esbuild should log a rebuild within ~1 second
    - In Obsidian: run "Reload app without saving" from the command palette (Ctrl+P)
    - The dashboard should reflect the changed text after reload
    - Expected: esbuild rebuild logged in terminal within 2 seconds of save. Obsidian shows updated text after reload command.

    **5. SEC-01 — Sanitization layer verifiable in source**
    - This is a code verification, not visual: confirm `renderSafeHTML` function exists in src/views/DashboardView.tsx
    - PowerShell: `Select-String -Path src\views\DashboardView.tsx -Pattern "sanitizeHTMLToDom"`
    - Expected: One or more matches found.

    **6. SEC-02 — No secrets in source (gitleaks hook)**
    - Test the pre-commit hook by staging a fake secret:
      ```powershell
      # Add a fake API key to a test file
      Add-Content -Path test-secret.txt -Value "STRIPE_SECRET_KEY=sk_live_fakekey1234567890abcdef"
      git add test-secret.txt
      git commit -m "test secret scanning"
      ```
    - Expected: git commit FAILS with a gitleaks error message about detected secrets. The commit does not proceed.
    - Clean up: `git restore --staged test-secret.txt; Remove-Item test-secret.txt`
  </how-to-verify>
  <resume-signal>
    Type "approved" if all 6 checks pass.
    Or describe any failures (e.g., "plugin not showing in list", "sidebar not rendering", "hook not firing") and the executor will diagnose and fix before re-checking.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Staged git changes → commit history | Secrets could enter version history before hook fires |
| Symlink → Obsidian plugin loader | Symlink target must be the repo root; wrong target silently loads stale/wrong files |
| Obsidian renderer → React DOM | Dynamic HTML injected without sanitization would execute in the Electron WebView |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-P2-01 | Information Disclosure | git pre-commit hook | mitigate | gitleaks protect --staged --redact blocks secrets before commit; PATH export in hook ensures binary is found in git-bash environment (Pitfall 5 from RESEARCH.md) |
| T-01-P2-02 | Tampering / Spoofing | sanitizeHTMLToDom() usage | mitigate | renderSafeHTML utility enforces the pattern — all dynamic HTML goes through sanitizeHTMLToDom(); returns DocumentFragment (cannot be assigned to innerHTML). ASVS V5.2 compliant. |
| T-01-P2-03 | Tampering | CSS @import Fontshare CDN (styles.css) | accept | CSS @import cannot execute JavaScript. Fontshare is a legitimate CDN. Risk is purely cosmetic (wrong font if CDN is down). Fallback `var(--font-interface)` keeps plugin functional. Acceptable for a personal local tool. |
| T-01-P2-04 | Information Disclosure | git hook bypass (--no-verify) | accept | Solo developer project. User can bypass with --no-verify. This is acceptable risk — the hook provides friction and catch against accidental secrets, not a security boundary against a malicious actor with repo access. |
| T-01-P2-05 | Elevation of Privilege | Windows symlink creation | accept | Symlink requires Developer Mode enabled. Developer Mode is a known-safe system setting for dev environments on Windows 11. No elevation (admin) required. Acceptable risk for a development tool. |
</threat_model>

<verification>
After both tasks in this plan complete (including checkpoint approval):

1. Plugin appears in Obsidian Settings > Community Plugins (FOUND-01 confirmed via load)
2. Ribbon icon and command palette both open the dashboard (FOUND-03)
3. Left sidebar navigation switches pages without full re-render (FOUND-04)
4. `npm run dev` watcher recompiles on source save (FOUND-02)
5. `Select-String -Path src\views\DashboardView.tsx -Pattern "sanitizeHTMLToDom"` returns match (SEC-01)
6. Staging a fake API key string and running `git commit` is blocked by gitleaks (SEC-02)
7. main.js and manifest.json both present at repo root (FOUND-05)
</verification>

<success_criteria>
Phase 1 is complete when:
- Running `npm run dev` starts a file watcher; saving any source file triggers recompile within 2 seconds (FOUND-02)
- A ribbon icon and command palette entry both open the dashboard pane; left sidebar switches between placeholder pages without full re-render (FOUND-03, FOUND-04)
- Sanitization layer (sanitizeHTMLToDom) is present and verifiable in source (SEC-01)
- main.js, manifest.json, styles.css present at repo root; plugin loads from GitHub symlink (FOUND-01, FOUND-05)
- Pre-commit hook blocks commits containing secrets (SEC-02)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-P2-SUMMARY.md` using the summary template.
</output>
