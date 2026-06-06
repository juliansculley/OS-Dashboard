import { App, normalizePath } from 'obsidian';
import { readFile } from 'fs/promises';
import * as nodePath from 'path';

/**
 * Reads and parses a JSON file. Handles both vault-relative and absolute paths.
 * Returns null on missing file, parse error, or empty path — callers render no-data state.
 * Per D-10: empty string path returns null immediately (no read attempt).
 */
export async function readJsonFile<T>(
  app: App,
  filePath: string
): Promise<T | null> {
  if (!filePath || filePath.trim() === '') return null;
  try {
    let raw: string;
    if (nodePath.isAbsolute(filePath)) {
      // Absolute path — use Node.js fs (available as Electron builtin, marked external in esbuild)
      raw = await readFile(filePath, 'utf-8');
    } else {
      // Vault-relative path — normalize then use Obsidian DataAdapter
      raw = await app.vault.adapter.read(normalizePath(filePath));
    }
    return JSON.parse(raw) as T;
  } catch {
    // Missing file, unreadable, or malformed JSON — all map to null → no-data state
    return null;
  }
}
