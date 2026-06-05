# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 1-foundation
**Areas discussed:** Navigation layout, XSS sanitization library, Obsidian vault + dev setup, Secret scanning approach

---

## Navigation Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Left sidebar | Persistent sidebar nav with icon + label items — per the archive spec's Sidebar.tsx skeleton | ✓ |
| Horizontal tab bar | Tab bar as stated in ROADMAP success criteria | |

**User's choice:** Left sidebar
**Notes:** User stated "nav to pages on leftside bar is preferred UX" before the formal discussion began. Overrides the "tab bar" language in the ROADMAP success criteria.

---

## XSS Sanitization Library

| Option | Description | Selected |
|--------|-------------|----------|
| Obsidian built-in sanitizeHTMLToDom() | Platform-native sanitizer, zero bundle size, maintained by Obsidian team | ✓ |
| DOMPurify npm package | Industry-standard library, ~45KB bundle, battle-tested across web apps | |

**User's choice:** Obsidian built-in sanitizeHTMLToDom()
**Notes:** User initially asked for tradeoff explanation ("these options seem very similar to me"). After explanation — both options are similar in protection level for a local personal plugin; built-in wins on simplicity and zero bundle cost. User confirmed built-in after explanation.

---

## Obsidian Vault + Dev Setup

| Option | Description | Selected |
|--------|-------------|----------|
| C:\Users\scull\OneDrive\ClaudeOS | Based on OneDrive/ClaudeOS folder where the project lives | ✓ |
| C:\Users\scull\Documents\Obsidian | Default Obsidian vault location on Windows | |

**User's choice:** `C:\Users\scull\OneDrive\ClaudeOS`

| Option | Description | Selected |
|--------|-------------|----------|
| pjeby/hot-reload (BRAT install) | True hot-reload — just the plugin, no full Obsidian restart | |
| esbuild watch + Obsidian reload command | npm run dev watches + built-in "Reload app" command, no extra plugins | ✓ |

**User's choice:** esbuild watch + Obsidian "Reload app without saving" command
**Notes:** pjeby/hot-reload not available in community plugins store directly. User noted it hasn't been updated in ~1 year. User comfortable with "restart Obsidian because that only takes a second" — confirmed built-in approach is preferred.

| Option | Description | Selected |
|--------|-------------|----------|
| Symlink | Repo folder symlinked into .obsidian/plugins/ — changes reflect instantly | ✓ |
| Build outputs to vault folder | esbuild outfile configured to write directly into vault plugins folder | |

**User's choice:** Symlink

---

## Secret Scanning

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions CI | Scan runs on push to GitHub, zero local setup | |
| Local pre-commit Git hook | Runs before every commit, catches secrets before Git history | ✓ |
| Both | Belt and suspenders | |

**User's choice:** Local pre-commit Git hook
**Risk level:** High — "lock it down locally too"

| Option | Description | Selected |
|--------|-------------|----------|
| gitleaks | Single binary, no deps, works on Windows, husky integration | ✓ |
| detect-secrets | Python-based, creates baseline file, heavier setup | |

**User's choice:** gitleaks via husky

---

## Claude's Discretion

- manifest.json `minAppVersion` value — researcher should validate against current Obsidian release
- Exact TypeScript strictness settings beyond `strictNullChecks`
- Whether to include `styles.css` in Phase 1 build or defer styling to Phase 2

## Deferred Ideas

None — discussion stayed within Phase 1 scope.
