import React, { useState } from 'react';
import { ListRow } from '../../ui/ListRow';
import { sanitizeText } from '../../../utils/sanitizeText';
import type { SessionsSnapshot, SessionRow } from '../../../types';

// ── Empty-state helper (inline pattern from ProjectsPage) ──────────────────────

function EmptyState({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="claudeos-empty-state">
      <div className="claudeos-empty-state__heading">{heading}</div>
      <div className="claudeos-empty-state__body">{body}</div>
    </div>
  );
}

// ── Split tokens (UI-SPEC §6a) ────────────────────────────────────────────────

const SPLIT_TOKENS = ['Push', 'Pull', 'Full', 'Arms', 'Hyp', 'Str'] as const;

// ── Negative results values (UI-SPEC §6b, threat T-07-10) ────────────────────

const NEGATIVE_RESULTS = new Set(['joint pain', 'None']);

// ── HistoryTab ─────────────────────────────────────────────────────────────────

/**
 * HistoryTab — filterable, reverse-chronological session history list.
 *
 * Security (T-07-10): session template/name passed to sanitizeText before
 * rendering in ListRow. ListRow renders name as React text child (auto-escaped).
 * URLs are only used in href (ListRow already adds rel="noopener noreferrer"
 * target="_blank"). No dangerouslySetInnerHTML anywhere in this file.
 *
 * Filter semantics: AND across filter types, OR within the SPLIT multi-select.
 *
 * Negative-result handling (UI-SPEC §6b): sessions whose results[] contains
 * "joint pain" or "None" are rendered with emphasis="overdue" on ListRow, which
 * maps to the error-tinted .claudeos-list-row--overdue modifier. This approach
 * reuses ListRow without modifying it (see plan action: "choose the approach that
 * reuses ListRow without modifying it").
 */
export function HistoryTab({ sessions }: { sessions: SessionsSnapshot }) {
  // ── Filter state ─────────────────────────────────────────────────────────────

  const [splitTags, setSplitTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string>('All');
  const [results, setResults] = useState<string>('All');
  const [meso, setMeso] = useState<string>('All');

  const allSessions: SessionRow[] = sessions.sessions;

  // ── Unique option values for each select ─────────────────────────────────────

  function unique<T>(items: T[]): T[] {
    return Array.from(new Set(items));
  }

  const difficultyOptions: string[] = unique(
    allSessions.flatMap(s => s.difficulty)
  ).sort();

  const resultsOptions: string[] = unique(
    allSessions.flatMap(s => s.results)
  ).sort();

  // Mesocycle names sorted descending by the first session date that uses each name
  const mesoNames: string[] = (() => {
    const firstDate: Record<string, string> = {};
    for (const s of allSessions) {
      if (s.meso_name) {
        const existing = firstDate[s.meso_name];
        if (!existing || s.date < existing) {
          firstDate[s.meso_name] = s.date;
        }
      }
    }
    return Object.keys(firstDate).sort((a, b) => {
      const da = firstDate[a] ?? '';
      const db = firstDate[b] ?? '';
      return db < da ? -1 : db > da ? 1 : 0;
    });
  })();

  // ── Toggle a split tag (OR within multi-select) ───────────────────────────────

  function toggleSplit(tag: string) {
    setSplitTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  // ── Filter logic (AND across types, OR within splitTags) ─────────────────────

  const filtered: SessionRow[] = allSessions
    .filter(s => {
      // SPLIT: OR within multi-select — session.tags intersects selected splitTags
      if (splitTags.length > 0) {
        const hasMatch = splitTags.some(t => s.tags.includes(t));
        if (!hasMatch) return false;
      }
      // DIFFICULTY: match when session.difficulty[] includes the selected value
      if (difficulty !== 'All' && !s.difficulty.includes(difficulty)) {
        return false;
      }
      // RESULTS: match when session.results[] includes the selected value
      if (results !== 'All' && !s.results.includes(results)) {
        return false;
      }
      // MESOCYCLE: match meso_name
      if (meso !== 'All' && s.meso_name !== meso) {
        return false;
      }
      return true;
    })
    // Sort reverse-chronologically
    .sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0));

  // ── Empty state: zero total sessions ─────────────────────────────────────────

  if (allSessions.length === 0) {
    return (
      <EmptyState
        heading="No sessions yet"
        body="Log your first workout in Notion, then Refresh."
      />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="claudeos-workouts-history">

      {/* Filter row */}
      <div className="claudeos-workouts-filter-row">
        <span
          className="claudeos-workouts-control-label"
          style={{ width: '100%', marginBottom: 4 }}
        >
          FILTERS
        </span>

        {/* SPLIT multi-select pill group */}
        <div className="claudeos-workouts-filter-group">
          <span className="claudeos-workouts-control-label">SPLIT</span>
          <div className="claudeos-workouts-split-btns">
            {SPLIT_TOKENS.map(tag => (
              <button
                key={tag}
                className={`claudeos-workouts-split-btn${splitTags.includes(tag) ? ' active' : ''}`}
                onClick={() => toggleSplit(tag)}
                type="button"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* DIFFICULTY native select */}
        <div className="claudeos-workouts-filter-group">
          <span className="claudeos-workouts-control-label">DIFFICULTY</span>
          <select
            className="claudeos-workouts-filter-select"
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
          >
            <option value="All">All</option>
            {difficultyOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* RESULTS native select */}
        <div className="claudeos-workouts-filter-group">
          <span className="claudeos-workouts-control-label">RESULTS</span>
          <select
            className="claudeos-workouts-filter-select"
            value={results}
            onChange={e => setResults(e.target.value)}
          >
            <option value="All">All</option>
            {resultsOptions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* MESOCYCLE native select */}
        <div className="claudeos-workouts-filter-group">
          <span className="claudeos-workouts-control-label">MESOCYCLE</span>
          <select
            className="claudeos-workouts-filter-select"
            value={meso}
            onChange={e => setMeso(e.target.value)}
          >
            <option value="All">All</option>
            {mesoNames.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Session list */}
      {filtered.length === 0 ? (
        <p className="claudeos-list-empty">
          No sessions match the active filters. Clear a filter to see more.
        </p>
      ) : (
        <div
          className="claudeos-list claudeos-workouts-session-list"
          style={filtered.length > 100 ? { maxHeight: '400px', overflowY: 'auto' } : undefined}
        >
          {filtered.map((s, i) => {
            // SEC-01 / T-07-10: sanitize session name via sanitizeText before passing to ListRow
            const displayName = sanitizeText(s.template || s.name);

            // Build badge array: date, tags, difficulty values, total sets
            const badges: string[] = [
              s.date,
              ...s.tags,
              ...s.difficulty,
              `${s.total_sets} sets`,
            ];

            // Negative results: pass emphasis="overdue" to get error tint from
            // .claudeos-list-row--overdue modifier. This reuses ListRow without
            // modifying the component — the overdue modifier applies the error
            // tint to the entire row, making the negative result visually distinct.
            const hasNegativeResult = s.results.some(r => NEGATIVE_RESULTS.has(r));

            return (
              <ListRow
                key={s.session_id || i}
                name={displayName}
                url={s.url}
                badges={badges}
                emphasis={hasNegativeResult ? 'overdue' : 'none'}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
