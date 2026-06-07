import React, { useState, useRef, useEffect } from 'react';
import { execFile } from 'child_process';
import { setIcon } from 'obsidian';
import { useAppContext } from '../../context/AppContext';
import { readJsonFile } from '../../utils/readJsonFile';
import type { SnapshotMeta } from '../../types';

// ── Exported helpers (reused by ProjectsPage and Plan 4 NewsletterPage) ──────

/** Returns true when the generated_at timestamp is older than 24 hours. */
export function isStale(generatedAt: string): boolean {
  const d = new Date(generatedAt);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() > 24 * 60 * 60 * 1000;
}

/** Formats an ISO 8601 string to HH:mm (zero-padded, local time). Returns '' on invalid input. */
export function formatHHmm(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ── Internal types ─────────────────────────────────────────────────────────────

type RefreshState = 'idle' | 'loading' | 'success' | 'error';

// ── IconSlot (local — matches SkillButton pattern) ────────────────────────────

function IconSlot({ iconName }: { iconName: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      setIcon(ref.current, iconName);
    }
  }, [iconName]);
  return <span ref={ref} className="cos-icon-slot" />;
}

// ── RefreshButton ─────────────────────────────────────────────────────────────

/**
 * RefreshButton — clones SkillButton's idle/loading/success/error state machine
 * but executes the Notion sync script via execFile(nodePath, [syncScriptPath]).
 *
 * Security posture (SEC-03, D-09):
 *   - execFile called with two separate args (node executable + script path).
 *   - No shell, no string interpolation, no user-typed argument beyond the two configured paths.
 *   - If syncScriptPath is blank, sets error state immediately — does NOT call execFile.
 *
 * On success: calls triggerRefresh() from AppContext to bump refreshNonce so
 * subscribed pages re-read snapshot files (NOTION-04).
 *
 * Exports isStale and formatHHmm so ProjectsPage and NewsletterPage can reuse them.
 */
export function RefreshButton() {
  const { app, plugin, triggerRefresh } = useAppContext();
  const [state, setState] = useState<RefreshState>('idle');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const spinnerRef = useRef<HTMLSpanElement>(null);

  // Spinner icon effect (mirrors SkillButton pattern)
  useEffect(() => {
    if (state === 'loading' && spinnerRef.current) {
      setIcon(spinnerRef.current, 'loader-2');
    }
  }, [state]);

  // D-10: Read last-synced time from tasks snapshot on mount and after successful refresh.
  async function refreshLastSynced() {
    const path = plugin.settings.tasksSnapshotPath;
    const data = await readJsonFile<SnapshotMeta>(app, path);
    if (data && typeof data.generated_at === 'string') {
      const formatted = formatHHmm(data.generated_at);
      setLastSynced(formatted !== '' ? formatted : null);
    } else {
      setLastSynced(null);
    }
  }

  // Load last-synced on mount
  useEffect(() => {
    refreshLastSynced();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClick() {
    // Guard: ignore if not idle (mirrors SkillButton SKILL-02)
    if (state !== 'idle') return;

    const node = plugin.settings.nodePath || 'node';
    const script = plugin.settings.syncScriptPath;

    // D-09: If syncScriptPath is blank, the user has not configured it — error immediately.
    if (!script || script.trim() === '') {
      setState('error');
      setTimeout(() => setState('idle'), 5000);
      return;
    }

    setState('loading');

    // SEC-03 / NOTION-04: execFile with two positional args — no shell, no interpolation.
    // node executable and script path both come from plugin settings (user-controlled config),
    // NOT from runtime user input in the UI.
    execFile(node, [script], (error) => {
      if (error === null) {
        setState('success');
        triggerRefresh(); // bump refreshNonce — subscribed pages re-read snapshots
        refreshLastSynced(); // update "Last synced HH:mm" label
        setTimeout(() => setState('idle'), 3000);
      } else {
        setState('error');
        setTimeout(() => setState('idle'), 5000);
      }
    });
  }

  return (
    <div className="claudeos-refresh-bar">
      <button
        className={`claudeos-refresh-btn claudeos-refresh-btn--${state}`}
        onClick={handleClick}
        disabled={state === 'loading'}
      >
        {state === 'loading' && (
          <span ref={spinnerRef} className="cos-spinner" />
        )}
        {state === 'idle' && (
          <><IconSlot iconName="refresh-cw" /><span>Refresh</span></>
        )}
        {state === 'success' && (
          <><IconSlot iconName="check" /><span>Synced</span></>
        )}
        {state === 'error' && (
          <><IconSlot iconName="x" /><span>Failed</span></>
        )}
      </button>
      {lastSynced !== null && (
        <span className="claudeos-refresh-last-synced">Last synced {lastSynced}</span>
      )}
    </div>
  );
}
