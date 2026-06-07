import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { readJsonFile } from '../../utils/readJsonFile';
import type { ProjectsSnapshot, TasksSnapshot, TaskItem } from '../../types';
import { RefreshButton, isStale, formatHHmm } from '../ui/RefreshButton';
import { ListRow } from '../ui/ListRow';

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Returns today as YYYY-MM-DD string (local time). */
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Adds `days` calendar days to a YYYY-MM-DD string, returns YYYY-MM-DD. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Discriminated union type (clone of SocialPage T | null | 'error') ─────────

type SnapshotState<T> = T | null | 'error';

function isSnapshotData<T>(v: SnapshotState<T>): v is T {
  return v !== null && v !== 'error';
}

// ── Empty-state helpers ────────────────────────────────────────────────────────

function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="claudeos-empty-state">
      <div className="claudeos-empty-state__heading">{heading}</div>
      <div className="claudeos-empty-state__body">{body}</div>
    </div>
  );
}

// ── ProjectsPage ─────────────────────────────────────────────────────────────

/**
 * ProjectsPage — renders active projects and tasks with overdue/due-soon emphasis.
 *
 * NOTION-04: refreshNonce in useEffect deps causes re-reads after a successful Refresh.
 * NOTION-05: Projects (status, progress%) and Tasks (overdue/due-soon emphasis, Notion links).
 * NOTION-08: No-data and stale states degrade gracefully.
 *
 * Security (D-17): all snapshot-derived strings are rendered as JSX text children only.
 * No dangerouslySetInnerHTML in this file.
 */
export function ProjectsPage() {
  const { app, plugin, refreshNonce } = useAppContext();

  const [projects, setProjects] = useState<SnapshotState<ProjectsSnapshot>>(null);
  const [tasks, setTasks] = useState<SnapshotState<TasksSnapshot>>(null);

  // NOTION-04: refreshNonce in dependency arrays re-reads snapshots after a successful sync.
  useEffect(() => {
    const path = plugin.settings.projectsSnapshotPath;
    if (!path || path.trim() === '') {
      setProjects(null); // path empty → no-data state
      return;
    }
    readJsonFile<ProjectsSnapshot>(app, path).then(data => {
      setProjects(data !== null ? data : 'error');
    });
  }, [plugin.settings.projectsSnapshotPath, refreshNonce]);

  useEffect(() => {
    const path = plugin.settings.tasksSnapshotPath;
    if (!path || path.trim() === '') {
      setTasks(null); // path empty → no-data state
      return;
    }
    readJsonFile<TasksSnapshot>(app, path).then(data => {
      setTasks(data !== null ? data : 'error');
    });
  }, [plugin.settings.tasksSnapshotPath, refreshNonce]);

  // ── Stale detection ──────────────────────────────────────────────────────────

  const projectsStale =
    isSnapshotData(projects) && isStale(projects.generated_at);
  const tasksStale =
    isSnapshotData(tasks) && isStale(tasks.generated_at);

  // Use the older of the two timestamps for the stale label
  const staleGeneratedAt: string | null = (() => {
    if (!projectsStale && !tasksStale) return null;
    const pAt = projectsStale && isSnapshotData(projects) ? projects.generated_at : null;
    const tAt = tasksStale && isSnapshotData(tasks) ? tasks.generated_at : null;
    if (pAt && tAt) return pAt < tAt ? pAt : tAt; // return the older one
    return pAt ?? tAt;
  })();

  // ── Due-soon / overdue split ─────────────────────────────────────────────────

  const today = todayStr();
  const dueSoonLimit = addDays(today, plugin.settings.dueSoonDays);

  function classifyTask(item: TaskItem): 'overdue' | 'due-soon' | 'none' {
    if (!item.due) return 'none';
    if (item.due < today) return 'overdue';
    if (item.due >= today && item.due <= dueSoonLimit) return 'due-soon';
    return 'none';
  }

  const taskItems: TaskItem[] =
    isSnapshotData(tasks) ? tasks.items : [];

  const emphasizedTasks = taskItems.filter(t => classifyTask(t) !== 'none');
  const remainingTasks = taskItems.filter(t => classifyTask(t) === 'none');

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="claudeos-page claudeos-page--projects">
      {/* Refresh button at top of page (D-10, NOTION-04) */}
      <RefreshButton />

      {/* Stale banner — D-14: show label but still render data below */}
      {staleGeneratedAt !== null && (
        <div className="claudeos-stale-label">
          Stale — last synced {formatHHmm(staleGeneratedAt)}
        </div>
      )}

      {/* ── Projects section ── */}
      <section className="claudeos-projects-section">
        <h2 className="claudeos-section-heading">Active Projects</h2>
        {projects === null && (
          <EmptyState
            heading="No project data"
            body="Set the projects snapshot path in Settings, then Refresh."
          />
        )}
        {projects === 'error' && (
          <EmptyState
            heading="Couldn't read projects"
            body="Check the projects snapshot path."
          />
        )}
        {isSnapshotData(projects) && (
          <div className="claudeos-list">
            {projects.items.map((p, i) => {
              const badges: string[] = [p.status];
              if (typeof p.progress === 'number' && isFinite(p.progress)) {
                badges.push(`${p.progress}%`);
              }
              return (
                <ListRow key={i} name={p.name} url={p.url} badges={badges} />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Tasks section ── */}
      <section className="claudeos-tasks-section">
        <h2 className="claudeos-section-heading">Tasks</h2>
        {tasks === null && (
          <EmptyState
            heading="No task data"
            body="Set the tasks snapshot path in Settings, then Refresh."
          />
        )}
        {tasks === 'error' && (
          <EmptyState
            heading="Couldn't read tasks"
            body="Check the tasks snapshot path."
          />
        )}
        {isSnapshotData(tasks) && (
          <>
            {/* Overdue & Due Soon sub-section — only rendered when non-empty (D-13) */}
            {emphasizedTasks.length > 0 && (
              <div className="claudeos-tasks-overdue">
                <h3 className="claudeos-subsection-heading">Overdue &amp; Due Soon</h3>
                <div className="claudeos-list">
                  {emphasizedTasks.map((t, i) => {
                    const emphasis = classifyTask(t);
                    const badges: string[] = [t.status];
                    if (t.due) badges.push(t.due);
                    return (
                      <ListRow
                        key={i}
                        name={t.name}
                        url={t.url}
                        badges={badges}
                        emphasis={emphasis}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Tasks sub-section */}
            <div className="claudeos-tasks-active">
              <h3 className="claudeos-subsection-heading">Active Tasks</h3>
              <div className="claudeos-list">
                {remainingTasks.length === 0 && (
                  <p className="claudeos-list-empty">No other active tasks.</p>
                )}
                {remainingTasks.map((t, i) => {
                  const badges: string[] = [t.status];
                  if (t.due) badges.push(t.due);
                  return (
                    <ListRow key={i} name={t.name} url={t.url} badges={badges} />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
