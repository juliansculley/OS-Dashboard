import React, { useRef, useEffect } from 'react';
import { setIcon } from 'obsidian';

// ── IconSlot (local — matches SkillButton/RefreshButton pattern) ───────────────

function IconSlot({ iconName }: { iconName: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      setIcon(ref.current, iconName);
    }
  }, [iconName]);
  return <span ref={ref} className="cos-icon-slot" />;
}

// ── ListRow ────────────────────────────────────────────────────────────────────

interface ListRowProps {
  name: string;
  url: string;
  badges?: string[];
  emphasis?: 'overdue' | 'due-soon' | 'none';
}

/**
 * ListRow — shared row component for task/project/newsletter entries.
 *
 * Security (D-17, SEC-01):
 *   - `name` is rendered as a JSX text child — XSS-safe natively in React.
 *   - `dangerouslySetInnerHTML` is NOT used anywhere in this file.
 *
 * T-03-03: URLs come from the trusted sync script (Notion page IDs).
 * rel="noopener noreferrer" added on target="_blank" anchor.
 */
export function ListRow({ name, url, badges = [], emphasis = 'none' }: ListRowProps) {
  return (
    <a
      className={`claudeos-list-row claudeos-list-row--${emphasis}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="claudeos-list-row__name">{name}</span>
      {badges.length > 0 && (
        <span className="claudeos-list-row__badges">
          {badges.map((badge, i) => (
            <span key={i} className="claudeos-list-row__badge">{badge}</span>
          ))}
        </span>
      )}
      <IconSlot iconName="external-link" />
    </a>
  );
}
