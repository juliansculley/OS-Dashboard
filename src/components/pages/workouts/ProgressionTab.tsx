/**
 * ProgressionTab — exercise selector, two progression charts, PR tiles.
 *
 * Chart 1 (category x): evenly spaced per workout — shows workout-by-workout delta.
 * Chart 2 (linear time x): real calendar spacing — shows true progress over time.
 *
 * Left y-axis: Weight + 1RM est. Right y-axis: Volume (different scale).
 *
 * Canvas lifecycle: destroy-before-create + cleanup destroy (Pattern 3).
 * Colors resolved via getComputedStyle at mount (Pattern 4).
 * Chart.js registered at module scope via chartSetup.ts import.
 */
import React, { useRef, useEffect } from 'react';
import { Chart } from 'chart.js';
import './chartSetup';
import { sanitizeText } from '../../../utils/sanitizeText';
import type { ExercisesSnapshot, ExerciseSeries } from '../../../types';

// ── Fallback hex colors ────────────────────────────────────────────────────────

const FALLBACK_CHART_0 = '#7c6af7'; // Weight
const FALLBACK_CHART_1 = '#38a169'; // Volume
const FALLBACK_CHART_3 = '#dd6b20'; // 1RM est

// ── CSS variable resolution ───────────────────────────────────────────────────

function resolveColor(canvasEl: HTMLCanvasElement, token: string, fallback: string): string {
  return getComputedStyle(canvasEl.ownerDocument.documentElement)
    .getPropertyValue(token).trim() || fallback;
}

function resolveMuted(canvasEl: HTMLCanvasElement): string {
  return resolveColor(canvasEl, '--cos-muted', '#718096');
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toMMDD(isoDate: string): string {
  const parts = isoDate.split('-');
  return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : isoDate;
}

function toTimestamp(isoDate: string): number {
  return new Date(isoDate + 'T00:00:00').getTime();
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// ── Shared scale config builder ───────────────────────────────────────────────

function buildScales(muted: string, xType: 'category' | 'linear') {
  return {
    x: {
      type: xType as 'category' | 'linear',
      ticks: {
        color: muted,
        font: { size: 12 },
        ...(xType === 'linear' ? {
          callback: (val: number | string) =>
            typeof val === 'number' ? fmtDate(val) : val,
          maxTicksLimit: 8,
        } : {}),
      },
      grid: { color: `${muted}80` },
    },
    y: {
      min: 0,
      position: 'left' as const,
      title: { display: true, text: 'Weight (lbs)', color: muted, font: { size: 11 } },
      ticks: { color: muted, font: { size: 12 } },
      grid: { color: `${muted}80` },
    },
    y1: {
      min: 0,
      position: 'right' as const,
      title: { display: true, text: 'Volume', color: muted, font: { size: 11 } },
      ticks: { color: muted, font: { size: 12 } },
      grid: { drawOnChartArea: false },
    },
  };
}

// ── EmptyState ────────────────────────────────────────────────────────────────

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
  selectedExerciseId: string;
  onExerciseChange: (id: string) => void;
}

// ── useProgressionChart hook ──────────────────────────────────────────────────

function useProgressionChart(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  chartRef: React.MutableRefObject<Chart | null>,
  series: ExerciseSeries | null,
  xType: 'category' | 'linear',
) {
  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    if (!series || series.points.length < 2) {
      chartRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    const color0 = resolveColor(canvas, '--cos-chart-0', FALLBACK_CHART_0);
    const color1 = resolveColor(canvas, '--cos-chart-1', FALLBACK_CHART_1);
    const color3 = resolveColor(canvas, '--cos-chart-3', FALLBACK_CHART_3);
    const muted = resolveMuted(canvas);

    const sorted = [...series.points].sort((a, b) => a.date.localeCompare(b.date));

    // For linear x, use {x, y} objects; for category, use label + array data.
    const makeData = (getValue: (p: typeof sorted[0]) => number | null) =>
      xType === 'linear'
        ? sorted.map(p => ({ x: toTimestamp(p.date), y: getValue(p) as number }))
        : sorted.map(p => getValue(p));

    const labels = xType === 'category' ? sorted.map(p => toMMDD(p.date)) : undefined;

    const datasets = [
      {
        label: 'Weight',
        data: makeData(p => p.weight),
        yAxisID: 'y',
        borderColor: color0,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 4,
        spanGaps: true,
        hidden: false,
        fill: false,
        borderDash: [] as number[],
      },
      {
        label: 'Volume',
        data: makeData(p => p.volume),
        yAxisID: 'y1',
        borderColor: color1,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        spanGaps: true,
        hidden: false,
        fill: false,
        borderDash: [2, 2],
      },
      {
        label: '1RM est',
        data: makeData(p => p.est_1rm),
        yAxisID: 'y',
        borderColor: color3,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        spanGaps: true,
        hidden: true,
        fill: false,
        borderDash: [1, 3],
      },
    ];

    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            mode: 'index',
            intersect: false,
            filter: item => item.raw !== null && item.raw !== undefined,
            callbacks: {
              title: items => {
                const idx = items[0]?.dataIndex ?? 0;
                return sorted[idx]?.date ?? '';
              },
              label: ctx => {
                if (ctx.raw === null || ctx.raw === undefined) return '';
                const val = typeof ctx.raw === 'object' && 'y' in (ctx.raw as object)
                  ? (ctx.raw as { y: number }).y
                  : ctx.raw;
                return `${ctx.dataset.label}: ${val}`;
              },
            },
          },
        },
        scales: buildScales(muted, xType),
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [series?.exercise_id, xType]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProgressionTab({ exercises, selectedExerciseId, onExerciseChange }: ProgressionTabProps) {
  const canvasRef1 = useRef<HTMLCanvasElement>(null);
  const chartRef1 = useRef<Chart | null>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  const chartRef2 = useRef<Chart | null>(null);

  const eligibleExercises: ExerciseSeries[] = exercises.exercises
    .filter(ex => ex.points.length >= 2)
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedSeries: ExerciseSeries | null =
    eligibleExercises.find(ex => ex.exercise_id === selectedExerciseId) ?? null;

  useProgressionChart(canvasRef1, chartRef1, selectedSeries, 'category');
  useProgressionChart(canvasRef2, chartRef2, selectedSeries, 'linear');

  return (
    <div className="claudeos-workouts-tab-content">
      {/* Exercise selector */}
      <div className="claudeos-workouts-control-row">
        <label className="claudeos-workouts-control-label">EXERCISE</label>
        <select
          className="claudeos-workouts-exercise-select"
          value={selectedExerciseId}
          onChange={e => onExerciseChange(e.target.value)}
        >
          <option value="" disabled>Select an exercise...</option>
          {eligibleExercises.map(ex => (
            <option key={ex.exercise_id} value={ex.exercise_id}>
              {sanitizeText(ex.name)}
            </option>
          ))}
        </select>
      </div>

      {!selectedExerciseId && (
        <p className="claudeos-list-empty">Select an exercise to see progression.</p>
      )}

      {selectedExerciseId && selectedSeries === null && (
        <EmptyState
          heading="Not enough data"
          body="This exercise has been logged fewer than 2 times. Log more sessions to see a trend."
        />
      )}

      {selectedSeries && (
        <>
          {/* Chart 1: per-workout spacing */}
          <div className="claudeos-workouts-chart-container">
            <h2 className="claudeos-workouts-chart-label">Progression (per workout)</h2>
            <div style={{ height: '260px', position: 'relative' }}>
              <canvas ref={canvasRef1} />
            </div>
          </div>

          {/* Chart 2: real calendar spacing */}
          <div className="claudeos-workouts-chart-container">
            <h2 className="claudeos-workouts-chart-label">Progression (over time)</h2>
            <div style={{ height: '260px', position: 'relative' }}>
              <canvas ref={canvasRef2} />
            </div>
          </div>

          {/* PR tiles */}
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
