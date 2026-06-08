import React from 'react';
import { useAppContext } from '../../context/AppContext';

/**
 * SkillStatusBar — persistent, always-mounted status bar between sidebar and main content.
 *
 * Reads skillStates from AppContext (lifted to DashboardRoot, survives page navigation).
 * Visibility toggled via CSS: display:none when idle (zero height, no layout shift — Pitfall 4).
 * Never returns null — conditional unmount would cause a mount-time layout shift on first run.
 *
 * Shows the first active skill entry (loading/success/error); idle entries are filtered out.
 * Text format per D-12: "[SkillName] running..." / "[SkillName] — Done" / "[SkillName] — Failed".
 */
export function SkillStatusBar(): React.JSX.Element {
  const { skillStates, app } = useAppContext();

  const activeEntries = Object.entries(skillStates).filter(
    ([, s]) => s.status !== 'idle'
  );
  const isActive = activeEntries.length > 0;

  // Extract first active entry for render (guarded: only rendered when isActive is true)
  const firstEntry = activeEntries[0];
  const skillName = firstEntry ? firstEntry[0] : '';
  const state = firstEntry ? firstEntry[1] : null;

  // Always render the wrapper — visibility via CSS class (Pitfall 4: no conditional unmount)
  return (
    <div className={`claudeos-status-bar${isActive ? ' claudeos-status-bar--active' : ''}`}>
      {isActive && state && (
        <span className="claudeos-status-bar__text">
          {state.status === 'loading' && `${skillName} running...`}
          {state.status === 'success' && (
            <>
              {skillName} {'—'} Done
              {state.outputPath && (
                <>
                  {' '}
                  <span
                    className="claudeos-status-bar__link"
                    onClick={() => app.workspace.openLinkText(state.outputPath!, '', 'tab')}
                  >
                    Open output
                  </span>
                </>
              )}
            </>
          )}
          {state.status === 'error' && `${skillName} — Failed`}
        </span>
      )}
    </div>
  );
}
