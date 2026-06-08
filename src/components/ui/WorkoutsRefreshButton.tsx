/**
 * WorkoutsRefreshButton — clone of RefreshButton.tsx targeting the workout sync script.
 *
 * Changes from RefreshButton.tsx:
 *   - Reads script path from `plugin.settings.workoutsSyncScriptPath` (not syncScriptPath)
 *   - Reads last-synced from `plugin.settings.workoutsMetaPath` (not tasksSnapshotPath)
 *   - All state machine logic, IconSlot, spinner, guards, and execFile call are identical.
 *
 * Security posture (SEC-02, SEC-03):
 *   - execFile called with [node, script] as separate positional args — no shell, no interpolation.
 *   - If workoutsSyncScriptPath is blank, sets error state immediately — does NOT call execFile.
 *
 * On success: calls triggerRefresh() from AppContext to bump refreshNonce so WorkoutsPage
 * re-reads all four snapshot files (NOTION-04 pattern).
 *
 * Re-exports isStale and formatHHmm from RefreshButton (not redefined here).
 */
import React, { useState, useRef, useEffect } from 'react';
import { execFile } from 'child_process';
import { setIcon } from 'obsidian';
import { useAppContext } from '../../context/AppContext';
import { readJsonFile } from '../../utils/readJsonFile';
import { isStale, formatHHmm } from './RefreshButton';
import type { SnapshotMeta } from '../../types';

// Re-export helpers so callers can import from one place if needed
export { isStale, formatHHmm };

// ── Internal types ─────────────────────────────────────────────────────────────

type RefreshState = 'idle' | 'loading' | 'success' | 'error';

// ── IconSlot (local — matches RefreshButton pattern) ──────────────────────────

function IconSlot({ iconName }: { iconName: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      setIcon(ref.current, iconName);
    }
  }, [iconName]);
  return <span ref={ref} className="cos-icon-slot" />;
}

// ── WorkoutsRefreshButton ─────────────────────────────────────────────────────

/**
 * WorkoutsRefreshButton — runs notion-workouts-sync.mjs via execFile.
 * Identical visual state machine to RefreshButton. Reads settings from
 * workoutsSyncScriptPath and workoutsMetaPath instead of their task counterparts.
 */
export function WorkoutsRefreshButton() {
  const { app, plugin, triggerRefresh } = useAppContext();
  const [state, setState] = useState<RefreshState>('idle');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const spinnerRef = useRef<HTMLSpanElement>(null);

  // Spinner icon effect (mirrors RefreshButton pattern)
  useEffect(() => {
    if (state === 'loading' && spinnerRef.current) {
      setIcon(spinnerRef.current, 'loader-2');
    }
  }, [state]);

  // D-10 (workouts variant): read last-synced from workouts meta snapshot.
  async function refreshLastSynced() {
    const path = plugin.settings.workoutsMetaPath;
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
    // Guard: ignore if not idle (mirrors RefreshButton SKILL-02)
    if (state !== 'idle') return;

    const node = plugin.settings.nodePath || 'node';
    const script = plugin.settings.workoutsSyncScriptPath;

    // SEC-02/SEC-03: If workoutsSyncScriptPath is blank, error immediately — no execFile call.
    if (!script || script.trim() === '') {
      setState('error');
      setTimeout(() => setState('idle'), 5000);
      return;
    }

    setState('loading');

    // SEC-03: execFile with two positional args — no shell, no string interpolation.
    // Both node and script come from plugin settings (user-controlled config),
    // NOT from runtime user input in the UI.
    execFile(node, [script], (error) => {
      if (error === null) {
        setState('success');
        triggerRefresh(); // bump refreshNonce — WorkoutsPage re-reads snapshots
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
