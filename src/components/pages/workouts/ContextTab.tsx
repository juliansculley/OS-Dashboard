import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
// Import chartSetup for Filler registration side-effect (Pattern 2/3, 07-RESEARCH.md).
// The Filler plugin is required for fill:'origin' on the bodyweight sparkline.
import './chartSetup';
import type { WorkoutsMetaSnapshot, BodyPoint } from '../../../types';

// ── Empty-state helper (inline pattern from ProjectsPage) ──────────────────────

function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="claudeos-empty-state">
      <div className="claudeos-empty-state__heading">{heading}</div>
      <div className="claudeos-empty-state__body">{body}</div>
    </div>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns today as YYYY-MM-DD string (local time). */
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Compute signed day difference: (endDate - startDate) in whole days.
 * Positive = endDate is in the future; negative = endDate is in the past.
 */
function dayDiff(startStr: string, endStr: string): number {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

// ── ContextTab ─────────────────────────────────────────────────────────────────

/**
 * ContextTab — current mesocycle card + bodyweight sparkline.
 *
 * Canvas lifecycle (T-07-11 / RESEARCH Pattern 3): destroy-before-create at the
 * top of the creation useEffect, plus cleanup destroy in the return function.
 * This prevents the "Canvas is already in use" error when Obsidian re-opens the pane.
 *
 * CSS variable resolution (RESEARCH Pattern 4): getComputedStyle resolves
 * --cos-chart-9 at mount time (Chart.js cannot read CSS custom properties).
 *
 * Security: meta strings are React text children (auto-escaped). No
 * dangerouslySetInnerHTML anywhere in this file.
 */
export function ContextTab({ meta }: { meta: WorkoutsMetaSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  // ── Last 60 bodyweight points, sorted ascending by date ───────────────────────

  const bwWindow: BodyPoint[] = [...meta.bodyweight]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-60);

  const latestBw: BodyPoint | null =
    bwWindow.length > 0 ? (bwWindow[bwWindow.length - 1] ?? null) : null;

  // ── Sparkline useEffect — destroy-before-create + cleanup destroy ─────────────
  // Pattern 3 (07-RESEARCH.md): chartRef.*destroy called at top (before new Chart)
  // and in the cleanup return. Satisfies T-07-11 (DoS/memory — canvas re-open).

  useEffect(() => {
    if (!canvasRef.current || bwWindow.length === 0) return;

    // Destroy any existing chart instance on this canvas BEFORE creating a new one.
    // This handles Obsidian pane re-open where Chart.js keeps an internal registry
    // entry for the canvas even after React unmounts (07-RESEARCH.md Pattern 3).
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // Resolve --cos-chart-9 at mount (Pattern 4 — Chart.js cannot read CSS vars)
    const style = getComputedStyle(canvasRef.current.ownerDocument.documentElement);
    const lineColor = style.getPropertyValue('--cos-chart-9').trim() || '#718096';

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: bwWindow.map(p => p.date),
        datasets: [
          {
            data: bwWindow.map(p => p.value),
            borderColor: lineColor,
            borderWidth: 2,
            pointRadius: 2,
            fill: 'origin',
            backgroundColor: 'rgba(113,128,150,0.10)',
            tension: 0,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              // Tooltip format: "{YYYY-MM-DD}: {N} lbs" (UI-SPEC §Tooltip copy)
              label: (ctx) => `${ctx.label}: ${ctx.raw} lbs`,
            },
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    });

    // Cleanup: destroy chart on unmount (or before next effect run if deps change).
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [bwWindow.map(p => `${p.date}:${p.value}`).join(',')]);
  // Deps: stringify the window data so the effect re-runs when bodyweight data changes.

  // ── Days remaining computation ───────────────────────────────────────────────

  const today = todayStr();
  const meso = meta.current_meso;
  const daysRemaining: number | null = meso ? dayDiff(today, meso.end) : null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="claudeos-workouts-context">

      {/* ── Mesocycle card (UI-SPEC 7a) ── */}
      <div className="claudeos-workouts-meso-card">
        <div className="claudeos-workouts-meso-card__label">CURRENT MESOCYCLE</div>

        {meso == null ? (
          <EmptyState
            heading="No active mesocycle"
            body="No mesocycle block covers today's date."
          />
        ) : (
          <>
            <div className="claudeos-workouts-meso-card__name">{meso.name}</div>
            <div className="claudeos-workouts-meso-card__detail">
              Type: {meso.wo_type} · Focus: {meso.focus}
            </div>
            <div className="claudeos-workouts-meso-card__detail">
              Status: {meso.status}
            </div>
            {daysRemaining !== null && daysRemaining >= 0 ? (
              <div className="claudeos-workouts-meso-card__detail">
                Ends: {meso.end}&nbsp;&nbsp;({daysRemaining} days remaining)
              </div>
            ) : (
              <div className="claudeos-workouts-meso-card__overdue">
                Ended {daysRemaining !== null ? Math.abs(daysRemaining) : 0} days ago
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bodyweight sparkline (UI-SPEC 7b) ── */}
      <div className="claudeos-workouts-sparkline">
        <div className="claudeos-workouts-sparkline-label">
          BODYWEIGHT (last 60 days)
        </div>

        {bwWindow.length === 0 ? (
          <p className="claudeos-list-empty">No bodyweight measurements found.</p>
        ) : (
          <>
            <div
              className="claudeos-workouts-chart-container"
              style={{ height: '100px' }}
            >
              <canvas ref={canvasRef} />
            </div>
            {latestBw && (
              <div className="claudeos-workouts-sparkline-latest">
                {latestBw.value} lbs&nbsp;&nbsp;as of {latestBw.date}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
