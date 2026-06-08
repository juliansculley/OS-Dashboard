/**
 * WorkoutsPage — shell that loads all four workout snapshots, owns tab state,
 * renders the WorkoutsRefreshButton + tab bar, routes to the four tab components
 * from 07-04/05, and handles null/error/stale states per the NOTION-04 pattern.
 *
 * Pattern matches ProjectsPage:
 *   - SnapshotState<T> = T | null | 'error' discriminated union
 *   - isSnapshotData<T> type guard
 *   - Four useEffects keyed on [path, refreshNonce] — re-reads snapshots on refresh
 *   - Inline EmptyState component
 *   - Stale banner via isStale/formatHHmm
 *
 * Security (T-07-12): all snapshot-derived strings are rendered as React text
 * children (auto-escaped) or via sanitizeText for Chart.js labels.
 * No dangerouslySetInnerHTML in this file.
 *
 * Security (T-07-13): session URLs only used in href via ListRow (inherited pattern).
 */
import React, { useEffect, useRef, useState } from 'react';
import { setIcon } from 'obsidian';
import { useAppContext } from '../../context/AppContext';
import { readJsonFile } from '../../utils/readJsonFile';
import { isStale, formatHHmm } from '../ui/RefreshButton';
import { WorkoutsRefreshButton } from '../ui/WorkoutsRefreshButton';
import { MuscleVolumeTab } from './workouts/MuscleVolumeTab';
import { ProgressionTab } from './workouts/ProgressionTab';
import { HistoryTab } from './workouts/HistoryTab';
import { ContextTab } from './workouts/ContextTab';
import type {
  MuscleVolumeSnapshot,
  ExercisesSnapshot,
  SessionsSnapshot,
  WorkoutsMetaSnapshot,
} from '../../types';

// ── Discriminated union type (copied verbatim from ProjectsPage) ──────────────

type SnapshotState<T> = T | null | 'error';

function isSnapshotData<T>(v: SnapshotState<T>): v is T {
  return v !== null && v !== 'error';
}

// ── Empty-state helper (copied verbatim from ProjectsPage) ────────────────────

function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="claudeos-empty-state">
      <div className="claudeos-empty-state__heading">{heading}</div>
      <div className="claudeos-empty-state__body">{body}</div>
    </div>
  );
}

// ── Tab types ─────────────────────────────────────────────────────────────────

type WorkoutsTab = 'muscle-volume' | 'progression' | 'history' | 'context';

interface TabConfig {
  id: WorkoutsTab;
  label: string;
  iconId: string;
}

const TABS: TabConfig[] = [
  { id: 'muscle-volume', label: 'Muscle Volume', iconId: 'bar-chart-2' },
  { id: 'progression',   label: 'Progression',   iconId: 'trending-up' },
  { id: 'history',       label: 'History',        iconId: 'list' },
  { id: 'context',       label: 'Context',        iconId: 'info' },
];

// ── TabButton (renders Lucide icon via setIcon at 14px) ───────────────────────

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (iconRef.current) {
      setIcon(iconRef.current, tab.iconId);
      // Force 14px icon size
      const svg = iconRef.current.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
      }
    }
  }, [tab.iconId]);

  return (
    <button
      className={`claudeos-workouts-tab${isActive ? ' active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span ref={iconRef} className="claudeos-workouts-tab-icon" />
      <span className="claudeos-workouts-tab-label">{tab.label}</span>
    </button>
  );
}

// ── WorkoutsPage ──────────────────────────────────────────────────────────────

/**
 * WorkoutsPage — connects WORKOUT-01..05 into a navigable page with four tabs.
 *
 * NOTION-04: refreshNonce in useEffect dep arrays causes re-reads after a
 * successful Refresh via WorkoutsRefreshButton.
 */
export function WorkoutsPage() {
  const { app, plugin, refreshNonce } = useAppContext();

  // Active tab — resets to 'muscle-volume' on navigation away/back (local state)
  const [activeTab, setActiveTab] = useState<WorkoutsTab>('muscle-volume');

  // Four snapshot states — each starts null (no-data) until read completes
  const [muscleVolume, setMuscleVolume] = useState<SnapshotState<MuscleVolumeSnapshot>>(null);
  const [exercises, setExercises] = useState<SnapshotState<ExercisesSnapshot>>(null);
  const [sessions, setSessions] = useState<SnapshotState<SessionsSnapshot>>(null);
  const [meta, setMeta] = useState<SnapshotState<WorkoutsMetaSnapshot>>(null);

  // ── Snapshot loading: NOTION-04 pattern ──────────────────────────────────────

  useEffect(() => {
    const path = plugin.settings.workoutsMuscleVolumePath;
    if (!path || path.trim() === '') {
      setMuscleVolume(null);
      return;
    }
    readJsonFile<MuscleVolumeSnapshot>(app, path).then(data => {
      setMuscleVolume(data !== null ? data : 'error');
    });
  }, [plugin.settings.workoutsMuscleVolumePath, refreshNonce]);

  useEffect(() => {
    const path = plugin.settings.workoutsExercisesPath;
    if (!path || path.trim() === '') {
      setExercises(null);
      return;
    }
    readJsonFile<ExercisesSnapshot>(app, path).then(data => {
      setExercises(data !== null ? data : 'error');
    });
  }, [plugin.settings.workoutsExercisesPath, refreshNonce]);

  useEffect(() => {
    const path = plugin.settings.workoutsSessionsPath;
    if (!path || path.trim() === '') {
      setSessions(null);
      return;
    }
    readJsonFile<SessionsSnapshot>(app, path).then(data => {
      setSessions(data !== null ? data : 'error');
    });
  }, [plugin.settings.workoutsSessionsPath, refreshNonce]);

  useEffect(() => {
    const path = plugin.settings.workoutsMetaPath;
    if (!path || path.trim() === '') {
      setMeta(null);
      return;
    }
    readJsonFile<WorkoutsMetaSnapshot>(app, path).then(data => {
      setMeta(data !== null ? data : 'error');
    });
  }, [plugin.settings.workoutsMetaPath, refreshNonce]);

  // ── Stale detection — use the oldest available generated_at timestamp ─────────

  const timestamps: string[] = [];
  if (isSnapshotData(muscleVolume) && isStale(muscleVolume.generated_at)) {
    timestamps.push(muscleVolume.generated_at);
  }
  if (isSnapshotData(exercises) && isStale(exercises.generated_at)) {
    timestamps.push(exercises.generated_at);
  }
  if (isSnapshotData(sessions) && isStale(sessions.generated_at)) {
    timestamps.push(sessions.generated_at);
  }
  if (isSnapshotData(meta) && isStale(meta.generated_at)) {
    timestamps.push(meta.generated_at);
  }

  // Sort ascending, take the oldest (smallest ISO string) for the stale label
  const staleGeneratedAt: string | null =
    timestamps.length > 0 ? (timestamps.sort()[0] ?? null) : null;

  // ── Tab content renderer ──────────────────────────────────────────────────────

  function renderTabContent() {
    switch (activeTab) {
      case 'muscle-volume':
        if (muscleVolume === null) {
          return (
            <EmptyState
              heading="No workout data"
              body="Run a sync first — click Refresh to pull workout data from Notion."
            />
          );
        }
        if (muscleVolume === 'error') {
          return (
            <EmptyState
              heading="Couldn't read workout data"
              body="Check the snapshot path in Settings, then Refresh."
            />
          );
        }
        return (
          <MuscleVolumeTab
            muscleVolume={muscleVolume}
            meta={isSnapshotData(meta) ? meta : null}
          />
        );

      case 'progression':
        if (exercises === null) {
          return (
            <EmptyState
              heading="No workout data"
              body="Click Refresh to pull workout data from Notion."
            />
          );
        }
        if (exercises === 'error') {
          return (
            <EmptyState
              heading="Couldn't read workout data"
              body="Check the snapshot path in Settings."
            />
          );
        }
        return (
          <ProgressionTab
            exercises={exercises}
            meta={isSnapshotData(meta) ? meta : null}
          />
        );

      case 'history':
        if (sessions === null) {
          return (
            <EmptyState
              heading="No session data"
              body="Click Refresh to pull workout sessions from Notion."
            />
          );
        }
        if (sessions === 'error') {
          return (
            <EmptyState
              heading="Couldn't read session data"
              body="Check the snapshot path in Settings."
            />
          );
        }
        return <HistoryTab sessions={sessions} />;

      case 'context':
        if (meta === null) {
          return (
            <EmptyState
              heading="No context data"
              body="Click Refresh to load mesocycle and bodyweight data."
            />
          );
        }
        if (meta === 'error') {
          return (
            <EmptyState
              heading="Couldn't read context data"
              body="Check the snapshot path in Settings."
            />
          );
        }
        return <ContextTab meta={meta} />;

      default:
        return null;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="claudeos-page claudeos-page--workouts">
      <h1 className="claudeos-page-title">Workouts</h1>

      {/* Refresh bar — WorkoutsRefreshButton runs notion-workouts-sync.mjs */}
      <WorkoutsRefreshButton />

      {/* Stale banner — D-14: show label but still render data below */}
      {staleGeneratedAt !== null && (
        <div className="claudeos-stale-label">
          Stale — last synced {formatHHmm(staleGeneratedAt)}
        </div>
      )}

      {/* Tab bar */}
      <div className="claudeos-workouts-tabs">
        {TABS.map(tab => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* Tab content area */}
      <div className="claudeos-workouts-tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
