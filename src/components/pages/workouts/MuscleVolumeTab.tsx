/**
 * MuscleVolumeTab — bar chart of total sets/muscle + weekly trend line chart.
 *
 * Implements UI-SPEC §4: window preset controls (7d/14d/28d/This Meso),
 * attribution toggle (Primary + Secondary / Primary only), horizontal bar chart,
 * weekly trend line chart, and empty states.
 *
 * All client-side aggregation — no API calls between refreshes (D7).
 * Chart.js imported from chartSetup.ts (module-scope registration, Pattern 2).
 * Canvas lifecycle: destroy-before-create + cleanup destroy (Pattern 3).
 * Labels sanitized via sanitizeText (SEC-01, T-07-07).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chart } from 'chart.js';
import './chartSetup';
import { sanitizeText } from '../../../utils/sanitizeText';
import type { MuscleVolumeSnapshot, MuscleWeekCell, WorkoutsMetaSnapshot } from '../../../types';

// ── Fallback hex colors matching --cos-chart-* tokens ─────────────────────────

const FALLBACK_COLORS = [
  '#7c6af7', // 0 Chest
  '#38a169', // 1 Back
  '#e53e3e', // 2 Triceps (note: UI-SPEC assigns index 2 to Triceps in bar chart)
  '#dd6b20', // 3 Biceps
  '#3182ce', // 4 Shoulders
  '#805ad5', // 5 Side Delt
  '#d69e2e', // 6 Quadriceps
  '#319795', // 7 Hamstrings
  '#e84393', // 8 Glutes
  '#718096', // 9 Lower Back
  '#63b3ed', // 10 Traps
  '#68d391', // 11 Abs
  '#b794f4', // 12 Calves
];

// ── Muscle group display order (UI-SPEC §Muscle Group Display Order) ──────────

const MUSCLE_DISPLAY_ORDER = [
  'Chest',
  'Back',
  'Shoulders',
  'Side Delt',
  'Triceps',
  'Biceps',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Lower Back',
  'Traps',
  'Abs',
  'Calves',
];

/** Maps muscle name to its canonical palette index (UI-SPEC Chart.js Color Palette) */
const MUSCLE_PALETTE_INDEX: Record<string, number> = {
  Chest: 0,
  Back: 1,
  Shoulders: 4,
  'Side Delt': 5,
  Triceps: 2,
  Biceps: 3,
  Quadriceps: 6,
  Hamstrings: 7,
  Glutes: 8,
  'Lower Back': 9,
  Traps: 10,
  Abs: 11,
  Calves: 12,
};

/** Excluded muscle names (UI-SPEC §Muscle Group Display Order) */
const EXCLUDED_MUSCLES = new Set(['Cardio', 'knee']);

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns the ISO week string (YYYY-Www) for a given Date. */
function toISOWeek(d: Date): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns the ISO week string that is `days` days before today.
 * Used to compute the week cutoff for the window presets.
 */
function weekCutoff(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toISOWeek(d);
}

// ── CSS variable resolution helpers ──────────────────────────────────────────

function resolveChartColors(canvasEl: HTMLCanvasElement): string[] {
  const style = getComputedStyle(canvasEl.ownerDocument.documentElement);
  return Array.from({ length: 13 }, (_, i) => {
    const val = style.getPropertyValue(`--cos-chart-${i}`).trim();
    return val || FALLBACK_COLORS[i] || '#7c6af7';
  });
}

function resolveMutedColor(canvasEl: HTMLCanvasElement): string {
  const val = getComputedStyle(canvasEl.ownerDocument.documentElement)
    .getPropertyValue('--cos-muted')
    .trim();
  return val || '#718096';
}

// ── Aggregation helpers ───────────────────────────────────────────────────────

type AttributionMode = 'both' | 'primary';

/**
 * Filters MuscleWeekCell[] to cells within the selected window.
 * windowDays = 0 means "This Meso" special mode — caller supplies mesoCutoff.
 */
function filterToWindow(
  cells: MuscleWeekCell[],
  windowDays: number,
  mesoCutoff: string | null,
): MuscleWeekCell[] {
  if (windowDays === 0 && mesoCutoff !== null) {
    // This Meso: include weeks on or after mesoCutoff
    return cells.filter(c => c.week >= mesoCutoff);
  }
  const cutoff = weekCutoff(windowDays);
  return cells.filter(c => c.week >= cutoff);
}

/**
 * Sort muscles by display order, appending unknowns alphabetically.
 * Excludes Cardio/knee.
 */
function sortMuscles(muscles: string[]): string[] {
  const known = muscles.filter(m => MUSCLE_DISPLAY_ORDER.includes(m));
  const unknown = muscles
    .filter(m => !MUSCLE_DISPLAY_ORDER.includes(m) && !EXCLUDED_MUSCLES.has(m))
    .sort();
  known.sort((a, b) => MUSCLE_DISPLAY_ORDER.indexOf(a) - MUSCLE_DISPLAY_ORDER.indexOf(b));
  return [...known, ...unknown];
}

/**
 * Aggregate cells into total sets per muscle (bar chart data).
 * Returns muscles sorted by display order.
 */
function aggregateByMuscle(
  cells: MuscleWeekCell[],
): { muscles: string[]; totals: number[] } {
  const totals: Record<string, number> = {};
  for (const cell of cells) {
    if (EXCLUDED_MUSCLES.has(cell.muscle)) continue;
    totals[cell.muscle] = (totals[cell.muscle] ?? 0) + cell.sets;
  }
  const muscles = sortMuscles(Object.keys(totals).filter(m => (totals[m] ?? 0) > 0));
  return { muscles, totals: muscles.map(m => totals[m] ?? 0) };
}

/**
 * Aggregate cells into weekly per-muscle series (trend line data).
 * Returns sorted weeks and per-muscle dataset data.
 */
function aggregateTrend(
  cells: MuscleWeekCell[],
  muscles: string[],
): { weeks: string[]; series: Record<string, number[]> } {
  const weekSet = new Set<string>();
  for (const cell of cells) {
    if (!EXCLUDED_MUSCLES.has(cell.muscle)) weekSet.add(cell.week);
  }
  const weeks = Array.from(weekSet).sort();

  const series: Record<string, number[]> = {};
  for (const m of muscles) {
    series[m] = weeks.map(() => 0);
  }
  for (const cell of cells) {
    if (!muscles.includes(cell.muscle)) continue;
    const idx = weeks.indexOf(cell.week);
    const muscleData = series[cell.muscle];
    if (idx >= 0 && muscleData) {
      muscleData[idx] = (muscleData[idx] ?? 0) + cell.sets;
    }
  }
  return { weeks, series };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface MuscleVolumeTabProps {
  muscleVolume: MuscleVolumeSnapshot;
  meta: WorkoutsMetaSnapshot | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MuscleVolumeTab({ muscleVolume, meta }: MuscleVolumeTabProps) {
  // windowDays = 0 signals "This Meso" mode
  const [windowDays, setWindowDays] = useState<number>(28);
  const [attributionMode, setAttributionMode] = useState<AttributionMode>('both');

  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<Chart | null>(null);
  const trendCanvasRef = useRef<HTMLCanvasElement>(null);
  const trendChartRef = useRef<Chart | null>(null);

  // "This Meso" is enabled only when current_meso exists.
  const currentMeso = meta?.current_meso ?? null;

  /**
   * Compute the cutoff week for "This Meso".
   * WorkoutsMetaSnapshot.current_meso has `end` but no `start` field.
   * We approximate meso start as 16 weeks (112 days) before today, which covers
   * a typical mesocycle length. A future types.ts update adding `current_meso.start`
   * would allow a precise cutoff.
   */
  const mesoStartCutoff: string | null = currentMeso
    ? weekCutoff(112) // 16-week meso approximation — see comment above
    : null;

  // Select source array by attribution mode
  const sourceArray =
    attributionMode === 'both'
      ? muscleVolume.weekly_with_secondary
      : muscleVolume.weekly_primary_only;

  // Filter to selected window
  const filteredCells = filterToWindow(sourceArray, windowDays, mesoStartCutoff);

  // Aggregate
  const { muscles, totals } = aggregateByMuscle(filteredCells);
  const hasData = muscles.length > 0;
  const { weeks, series } = hasData ? aggregateTrend(filteredCells, muscles) : { weeks: [], series: {} };

  // ── Bar chart effect ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!barCanvasRef.current) return;

    // Pattern 3: destroy before create (handles Obsidian pane re-open)
    barChartRef.current?.destroy();

    if (!hasData) {
      barChartRef.current = null;
      return;
    }

    const colors = resolveChartColors(barCanvasRef.current);
    const mutedColor = resolveMutedColor(barCanvasRef.current);

    // Sanitize labels (SEC-01, T-07-07)
    const sanitizedLabels = muscles.map(m => sanitizeText(m));
    const barColors: string[] = muscles.map(m => {
      const idx = MUSCLE_PALETTE_INDEX[m] ?? (MUSCLE_DISPLAY_ORDER.length % 13);
      return colors[idx % 13] ?? '#7c6af7';
    });

    barChartRef.current = new Chart(barCanvasRef.current, {
      type: 'bar',
      data: {
        labels: sanitizedLabels,
        datasets: [{
          data: totals,
          backgroundColor: barColors,
          borderColor: barColors,
          borderWidth: 2,
        }],
      },
      options: {
        indexAxis: 'y',
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.raw} sets`,
            },
          },
        },
        scales: {
          x: {
            min: 0,
            grid: { color: `${mutedColor}80` },
            ticks: { color: mutedColor, font: { size: 12 } },
          },
          y: {
            grid: { display: false },
            ticks: { color: mutedColor, font: { size: 12 } },
          },
        },
      },
    });

    // Pattern 3: cleanup on unmount / before re-run
    return () => {
      barChartRef.current?.destroy();
      barChartRef.current = null;
    };
  }, [hasData, muscles, totals, windowDays, attributionMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trend line chart effect ─────────────────────────────────────────────────

  useEffect(() => {
    if (!trendCanvasRef.current) return;

    // Pattern 3: destroy before create
    trendChartRef.current?.destroy();

    if (!hasData || weeks.length === 0) {
      trendChartRef.current = null;
      return;
    }

    const colors = resolveChartColors(trendCanvasRef.current);
    const mutedColor = resolveMutedColor(trendCanvasRef.current);

    const datasets = muscles.map(m => {
      const idx = MUSCLE_PALETTE_INDEX[m] ?? 0;
      const color = colors[idx % 13] ?? '#7c6af7';
      const data: number[] = series[m] ?? [];
      return {
        label: sanitizeText(m), // SEC-01
        data,
        borderColor: color,
        backgroundColor: 'transparent' as const,
        fill: false as const,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      };
    });

    trendChartRef.current = new Chart(trendCanvasRef.current, {
      type: 'line',
      data: { labels: weeks, datasets },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: (items) => `Week ${items[0]?.label ?? ''}`,
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} sets`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: mutedColor, font: { size: 12 } },
            grid: { color: `${mutedColor}80` },
          },
          y: {
            min: 0,
            ticks: { color: mutedColor, font: { size: 12 } },
            grid: { color: `${mutedColor}80` },
          },
        },
      },
    });

    // Pattern 3: cleanup
    return () => {
      trendChartRef.current?.destroy();
      trendChartRef.current = null;
    };
  }, [hasData, muscles, weeks, series, windowDays, attributionMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="claudeos-workouts-tab-content">
      {/* Controls (UI-SPEC 4a) */}
      <div className="claudeos-workouts-controls">
        {/* Window preset group */}
        <div className="claudeos-workouts-control-row">
          <span className="claudeos-workouts-control-label">WINDOW</span>
          <div className="claudeos-workouts-btn-group">
            {([7, 14, 28] as const).map(days => (
              <button
                key={days}
                className={`claudeos-workouts-preset-btn${windowDays === days ? ' active' : ''}`}
                onClick={() => setWindowDays(days)}
              >
                {days}d
              </button>
            ))}
            <button
              className={`claudeos-workouts-preset-btn${windowDays === 0 ? ' active' : ''}`}
              onClick={() => currentMeso && setWindowDays(0)}
              disabled={currentMeso === null}
              style={
                currentMeso === null
                  ? { color: 'var(--cos-faint)', cursor: 'default', pointerEvents: 'none' }
                  : undefined
              }
            >
              This Meso
            </button>
          </div>
        </div>

        {/* Attribution toggle group */}
        <div className="claudeos-workouts-control-row">
          <span className="claudeos-workouts-control-label">ATTRIBUTION</span>
          <div className="claudeos-workouts-btn-group">
            <button
              className={`claudeos-workouts-preset-btn${attributionMode === 'both' ? ' active' : ''}`}
              onClick={() => setAttributionMode('both')}
            >
              Primary + Secondary
            </button>
            <button
              className={`claudeos-workouts-preset-btn${attributionMode === 'primary' ? ' active' : ''}`}
              onClick={() => setAttributionMode('primary')}
            >
              Primary only
            </button>
          </div>
        </div>
      </div>

      {/* Empty state: no sets in selected window */}
      {!hasData && (
        <p className="claudeos-list-empty">No sessions in this window. Try a wider range.</p>
      )}

      {/* Bar chart: Total Sets (UI-SPEC 4b) */}
      {hasData && (
        <div className="claudeos-workouts-chart-container">
          <h2 className="claudeos-workouts-chart-label">Total Sets</h2>
          <div style={{ height: '320px', position: 'relative' }}>
            <canvas ref={barCanvasRef} />
          </div>
        </div>
      )}

      {/* Trend line chart: Weekly Trend (UI-SPEC 4c) */}
      {hasData && weeks.length > 0 && (
        <div className="claudeos-workouts-chart-container">
          <h2 className="claudeos-workouts-chart-label">Weekly Trend</h2>
          <div style={{ height: '200px', position: 'relative' }}>
            <canvas ref={trendCanvasRef} />
          </div>
        </div>
      )}
    </div>
  );
}
