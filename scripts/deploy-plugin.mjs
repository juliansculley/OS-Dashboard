/**
 * deploy-plugin.mjs — copies built artifacts to the Obsidian plugin directory.
 *
 * Run via: npm run deploy
 * Works from both the main checkout and any worktree — main.js always builds
 * to the repo root, and this script copies from there to PLUGIN_DIR.
 *
 * If you move the Obsidian vault, update PLUGIN_DIR below.
 */

import { copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const PLUGIN_DIR = 'C:\Users\scull\OneDrive\ClaudeOS\.obsidian\plugins\claudeos-dashboard';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');

for (const file of ['main.js', 'styles.css']) {
  await copyFile(join(repoRoot, file), join(PLUGIN_DIR, file));
  process.stdout.write(`Copied ${file} → ${PLUGIN_DIR}\n`);
}
process.stdout.write('Deploy complete — reload Obsidian to apply.\n');
