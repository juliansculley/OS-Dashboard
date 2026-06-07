import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { readJsonFile } from '../../utils/readJsonFile';
import type { NewsletterSnapshot } from '../../types';
import { RefreshButton, isStale, formatHHmm } from '../ui/RefreshButton';
import { ListRow } from '../ui/ListRow';

// ── Discriminated union type (same pattern as ProjectsPage / SocialPage) ──────

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

// ── NewsletterPage ─────────────────────────────────────────────────────────────

/**
 * NewsletterPage — renders newsletter pipeline stage counts and item list.
 *
 * NOTION-06: Stage counts (non-zero stages only) and item list (name, stage, content type)
 *            each linking to its Notion page.
 * NOTION-07: Same code path as Refresh button — snapshot re-reads on refreshNonce.
 * NOTION-08: Degrades to no-data state when snapshot is missing/unreadable;
 *            labels stale (>24h) snapshots while still rendering data.
 *
 * Security (D-17): all snapshot-derived strings rendered as JSX text children only.
 * No dangerouslySetInnerHTML in this file.
 */
export function NewsletterPage() {
  const { app, plugin, refreshNonce } = useAppContext();

  const [newsletter, setNewsletter] = useState<SnapshotState<NewsletterSnapshot>>(null);

  // NOTION-04: refreshNonce in dependency array re-reads snapshot after a successful sync.
  useEffect(() => {
    const path = plugin.settings.newsletterSnapshotPath;
    if (!path || path.trim() === '') {
      setNewsletter(null); // path empty → no-data state
      return;
    }
    readJsonFile<NewsletterSnapshot>(app, path).then(data => {
      setNewsletter(data !== null ? data : 'error');
    });
  }, [plugin.settings.newsletterSnapshotPath, refreshNonce]);

  // ── Stale detection ────────────────────────────────────────────────────────

  const newsletterStale =
    isSnapshotData(newsletter) && isStale(newsletter.generated_at);

  // ── Stage count processing (Specific Idea: only stages with items) ─────────

  const nonZeroStages: [string, number][] = isSnapshotData(newsletter)
    ? Object.entries(newsletter.by_stage)
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => a.localeCompare(b))
    : [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="claudeos-page claudeos-page--newsletter">
      {/* Refresh button at top of page (D-10, NOTION-04) */}
      <RefreshButton />

      {/* Stale banner — D-14: show label but still render data below */}
      {newsletterStale && isSnapshotData(newsletter) && (
        <div className="claudeos-stale-label">
          Stale — last synced {formatHHmm(newsletter.generated_at)}
        </div>
      )}

      {/* ── No-data / error states ── */}
      {newsletter === null && (
        <EmptyState
          heading="No newsletter data"
          body="Set the newsletter snapshot path in Settings, then Refresh."
        />
      )}
      {newsletter === 'error' && (
        <EmptyState
          heading="Couldn't read newsletter data"
          body="Check the newsletter snapshot path."
        />
      )}

      {/* ── Pipeline section — stage counts (non-zero only) ── */}
      {isSnapshotData(newsletter) && (
        <>
          <section className="claudeos-newsletter-section">
            <h2 className="claudeos-section-heading">Pipeline</h2>
            <div className="claudeos-stage-count-list">
              {nonZeroStages.length === 0 && (
                <p className="claudeos-list-empty">No items in pipeline.</p>
              )}
              {nonZeroStages.map(([stage, count]) => (
                <div key={stage} className="claudeos-stage-count">
                  <span className="claudeos-stage-count__name">{stage}</span>
                  <span className="claudeos-stage-count__count">{count}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Items section ── */}
          <section className="claudeos-newsletter-section">
            <h2 className="claudeos-section-heading">Items</h2>
            <div className="claudeos-list">
              {newsletter.items.length === 0 && (
                <p className="claudeos-list-empty">No newsletter items.</p>
              )}
              {newsletter.items.map((item, i) => {
                const badges: string[] = [item.stage];
                if (item.content_type) badges.push(item.content_type);
                if (item.platform) badges.push(item.platform);
                return (
                  <ListRow
                    key={i}
                    name={item.name}
                    url={item.url}
                    badges={badges}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
