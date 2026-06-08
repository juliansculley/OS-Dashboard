/**
 * ProgressionTab — exercise selector, progression line chart, PR tiles.
 *
 * Implements UI-SPEC §5: exercise select (points >= 2 only), multi-dataset
 * progression line chart (Weight / Volume / 1RM est / optional Bodyweight),
 * PR tiles (Best Weight / Best 1RM Est), and empty states.
 *
 * Canvas lifecycle: destroy-before-create + cleanup destroy (Pattern 3).
 * Colors resolved via getComputedStyle at mount (Pattern 4).
 * Exercise names sanitized via sanitizeText for select option labels (SEC-01, T-07-07).
 * Chart.js registered at module scope via chartSetup.ts import.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Chart } from 'chart.js';
import './chartSetup';
import { sanitizeText } from '../../../utils/sanitizeText';
import type { ExercisesSnapshot, ExerciseSeries, WorkoutsMetaSnapshot, BodyPoint } from '../../../types';

// ── Fallback hex colors ────────────────────────────────────────────────────────

const FALLBACK_CHART_0 = '#7c6af7'; // Weight — accent purple
const FALLBACK_CHART_1 = '#38a169'; // Volume — green
const FALLBACK_CHART_3 = '#dd6b20'; // 1RM est — orange
const FALLBACK_CHART_9 = '#718096'; // Bodyweight — grey

// ── CSS variable resolution ───────────────────────────────────────────────────

function resolveColor(canvasEl: HTMLCanvasElement, token: string, fallback: string): string {
  const val = getComputedStyle(canvasEl.ownerDocument.documentElement)
    .getPropertyValue(token)
    .trim();
  return val || fallback;
}

function resolveMutedColor(canvasEl: HTMLCanvasElement): string {
  return resolveColor(canvasEl, '--cos-muted', '#718096');
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Format ISO date string as MM-DD for compact x-axis labels */
function toMMDD(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  return `${parts[1]}-${parts[2]}`;
}

// ── Bodyweight overlap check ──────────────────────────────────────────────────

/**
 * Returns bodyweight points that overlap with the exercise series date range.
 * Returns an empty array if there is no overlap.
 */
function getOverlappingBodyweight(
  points: { date: string }[],
  bodyweight: BodyPoint[],
): BodyPoint[] {
  if (points.length === 0 || bodyweight.length === 0) return [];
  const exDates = points.map(p => p.date).sort();
  const minDate = exDates[0] ?? '';
  const maxDate = exDates[exDates.length - 1] ?? '';
  const overlapping = bodyweight
    .filter(b => b.date >= minDate && b.date <= maxDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  return overlapping;
}

// ── EmptyState (inline pattern from ProjectsPage) ─────────────────────────────

function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="claudeos-empty-state">
      <div className="claudeos-empty-state__heading">{heading}</div>
      <div className="claudeos-empty-state__body">{body}</div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProgressionTabProps {
  exercises: ExercisesSnapshot;
  meta: WorkoutsMetaSnapshot | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProgressionTab({ exercises, meta }: ProgressionTabProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  // Exercises with >= 2 data points, sorted alphabetically
  const eligibleExercises: ExerciseSeries[] = exercises.exercises
    .filter(ex => ex.points.length >= 2)
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedSeries: ExerciseSeries | null =
    eligibleExercises.find(ex => ex.exercise_id === selectedExerciseId) ?? null;

  // ── Chart effect ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current) return;

    // Pattern 3: destroy before create
    chartRef.current?.destroy();

    if (!selectedSeries || selectedSeries.points.length < 2) {
      chartRef.current = null;
      return;
    }

    const canvas = canvasRef.current;

    // Resolve colors (Pattern 4)
    const color0 = resolveColor(canvas, '--cos-chart-0', FALLBACK_CHART_0);
    const color1 = resolveColor(canvas, '--cos-chart-1', FALLBACK_CHART_1);
    const color3 = resolveColor(canvas, '--cos-chart-3', FALLBACK_CHART_3);
    const color9 = resolveColor(canvas, '--cos-chart-9', FALLBACK_CHART_9);
    const mutedColor = resolveMutedColor(canvas);

    // Sort points ascending by date
    const sortedPoints = [...selectedSeries.points].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const labels = sortedPoints.map(p => toMMDD(p.date));
    const weightData: (number | null)[] = sortedPoints.map(p => p.weight);
    const volumeData: (number | null)[] = sortedPoints.map(p => p.volume);
    const ormData: (number | null)[] = sortedPoints.map(p => p.est_1rm);

    // Bodyweight overlay — only when data covers exercise date range
    const bwPoints = meta ? getOverlappingBodyweight(sortedPoints, meta.bodyweight) : [];
    const showBodyweight = bwPoints.length > 0;

    // Build datasets
    const datasets: {
      label: string;
      data: (number | null)[];
      yAxisID?: string;
      borderColor: string;
      backgroundColor: string;
      borderDash?: number[];
      pointRadius: number;
      spanGaps: boolean;
      hidden: boolean;
      borderWidth: number;
      fill: boolean;
    }[] = [
      {
        label: 'Weight',
        data: weightData,
        yAxisID: 'y',
        borderColor: color0,
        backgroundColor: 'transparent',
        borderDash: undefined,
        pointRadius: 4,
        spanGaps: true,
        hidden: false,
        borderWidth: 2,
        fill: false,
      },
      {
        label: 'Volume',
        data: volumeData,
        yAxisID: 'y',
        borderColor: color1,
        backgroundColor: 'transparent',
        borderDash: [2, 2],
        pointRadius: 3,
        spanGaps: true,
        hidden: false,
        borderWidth: 2,
        fill: false,
      },
      {
        label: '1RM est',
        data: ormData,
        yAxisID: 'y',
        borderColor: color3,
        backgroundColor: 'transparent',
        borderDash: [1, 3],
        pointRadius: 3,
        spanGaps: true,
        hidden: true, // hidden by default — user clicks legend to toggle on
        borderWidth: 2,
        fill: false,
      },
    ];

    if (showBodyweight) {
      // Map bodyweight to progression x-axis dates (sparse — use null for missing dates)
      const bwByDate: Record<string, number> = {};
      for (const bp of bwPoints) {
        bwByDate[bp.date] = bp.value;
      }
      const bwData: (number | null)[] = sortedPoints.map(p => bwByDate[p.date] ?? null);

      datasets.push({
        label: 'Bodyweight',
        data: bwData,
        yAxisID: 'y1',
        borderColor: color9,
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        pointRadius: 3,
        spanGaps: true,
        hidden: false,
        borderWidth: 2,
        fill: false,
      });
    }

    // Build scales config
    const scales: Record<string, object> = {
      x: {
        ticks: { color: mutedColor, font: { size: 12 } },
        grid: { color: `${mutedColor}80` },
      },
      y: {
        min: 0,
        title: {
          display: true,
          text: 'Weight / Vol',
          color: mutedColor,
          font: { size: 12 },
        },
        ticks: { color: mutedColor, font: { size: 12 } },
        grid: { color: `${mutedColor}80` },
      },
    };

    if (showBodyweight) {
      scales['y1'] = {
        position: 'right' as const,
        min: 0,
        title: {
          display: true,
          text: 'BW (lbs)',
          color: mutedColor,
          font: { size: 12 },
        },
        ticks: { color: mutedColor, font: { size: 12 } },
        grid: { drawOnChartArea: false },
      };
    }

    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
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
            filter: (item) => item.raw !== null && item.raw !== undefined,
            callbacks: {
              title: (items) => sortedPoints[items[0]?.dataIndex ?? 0]?.date ?? '',
              label: (ctx) => {
                if (ctx.raw === null || ctx.raw === undefined) return '';
                return `${ctx.dataset.label}: ${ctx.raw}`;
              },
            },
          },
        },
        scales,
      },
    });

    // Pattern 3: cleanup
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [selectedExerciseId, selectedSeries]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="claudeos-workouts-tab-content">
      {/* Exercise selector (UI-SPEC 5a) */}
      <div className="claudeos-workouts-control-row">
        <label className="claudeos-workouts-control-label">EXERCISE</label>
        <select
          className="claudeos-workouts-exercise-select"
          value={selectedExerciseId}
          onChange={e => setSelectedExerciseId(e.target.value)}
        >
          <option value="" disabled>
            Select an exercise...
          </option>
          {eligibleExercises.map(ex => (
            <option key={ex.exercise_id} value={ex.exercise_id}>
              {sanitizeText(ex.name)}
            </option>
          ))}
        </select>
      </div>

      {/* Empty state: no exercise selected */}
      {!selectedExerciseId && (
        <p className="claudeos-list-empty">Select an exercise to see progression.</p>
      )}

      {/* Empty state: exercise selected but < 2 points (edge case after selection) */}
      {selectedExerciseId && selectedSeries === null && (
        <EmptyState
          heading="Not enough data"
          body="This exercise has been logged fewer than 2 times. Log more sessions to see a trend."
        />
      )}

      {/* Chart + PR tiles when exercise has data */}
      {selectedSeries && (
        <>
          {/* Progression line chart (UI-SPEC 5b) */}
          <div className="claudeos-workouts-chart-container">
            <h2 className="claudeos-workouts-chart-label">Progression</h2>
            <div style={{ height: '280px', position: 'relative' }}>
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* PR tiles (UI-SPEC 5c) */}
          <h2 className="claudeos-workouts-chart-label">Personal Records</h2>
          <div className="claudeos-pr-tiles">
            <div className="claudeos-pr-tile">
              <div className="claudeos-pr-tile__label">Best Weight</div>
              <div
                className="claudeos-pr-tile__value"
                style={selectedSeries.best_weight === null ? { color: 'var(--cos-faint)', fontWeight: 400 } : undefined}
              >
                {selectedSeries.best_weight !== null ? selectedSeries.best_weight : '—'}
              </div>
            </div>
            <div className="claudeos-pr-tile">
              <div className="claudeos-pr-tile__label">Best 1RM Est</div>
              <div
                className="claudeos-pr-tile__value"
                style={selectedSeries.best_1rm === null ? { color: 'var(--cos-faint)', fontWeight: 400 } : undefined}
              >
                {selectedSeries.best_1rm !== null ? selectedSeries.best_1rm : '—'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
