import React, { useState, useRef, useEffect } from 'react';
import { spawn, execFile } from 'child_process';
import { setIcon } from 'obsidian';
import { useAppContext } from '../../context/AppContext';
import { SkillInputPanel } from './SkillInputPanel';

// SEC-03: Allowlist is a hardcoded TypeScript const — never derived from user input.
// Per D-01: changes require a code update, enforcing security structurally.
const ALLOWED_SKILLS = ['wiki-optimizer', 'braindump', 'humanizer'] as const;
type AllowedSkill = typeof ALLOWED_SKILLS[number];

interface SkillButtonProps {
  skill: AllowedSkill;
  label: string;
}

function IconSlot({ iconName }: { iconName: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      setIcon(ref.current, iconName);
    }
  }, [iconName]);
  return <span ref={ref} className="cos-icon-slot" />;
}

// Module-scope utility: parses "Output: path/to/file.md" from skill stdout.
// Returns the vault-relative path or null if not present.
function parseOutputPath(stdout: string): string | null {
  const match = stdout.match(/^Output:\s+(.+)$/m);
  if (!match || match[1] === undefined) return null;
  return match[1].trim();
}

// T-05-07: Traversal guard — reject any parsed path whose segments include '..'.
// The path is only used with openLinkText (Obsidian API), but we guard before
// storing it in context to prevent unexpected vault resolution.
function applyTraversalGuard(raw: string | null): string | null {
  if (raw === null) return null;
  const segments = raw.split(/[/\\]/);
  if (segments.includes('..')) return null;
  return raw;
}

export function SkillButton({ skill, label }: SkillButtonProps) {
  // Context reads: skill run state lives in AppContext (D-10, OUT-02).
  // No local useState for run state — all transitions call setSkillState.
  const { app, skillStates, setSkillState } = useAppContext();
  const skillState = skillStates[skill] ?? { status: 'idle', outputPath: null };

  // Local state: panel expand toggle only (not propagated to context — UI-SPEC State Machine).
  const [expanded, setExpanded] = useState(false);

  const spinnerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (skillState.status === 'loading' && spinnerRef.current) {
      setIcon(spinnerRef.current, 'loader-2');
    }
  }, [skillState.status]);

  // handleRun: for input-required skills (braindump, humanizer).
  // Guard ORDER is MANDATORY (SEC-03 / Pitfall 1): status check FIRST, then allowlist,
  // then state update, then spawn. Input flows via stdin only — never in args array (T-05-09).
  function handleRun(input: string) {
    // Guard 1: non-idle no-op
    if (skillState.status !== 'idle') return;
    // Guard 2: SEC-03 runtime allowlist — must precede spawn
    if (!ALLOWED_SKILLS.includes(skill)) return;

    setSkillState(skill, { status: 'loading', outputPath: null });
    setExpanded(false); // collapse panel on Run

    const child = spawn('claude', ['-p', skill]);
    // Closure-scoped accumulators (Pitfall 2 — declared inside handler, never shared across runs)
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        const raw = parseOutputPath(stdout);
        const outputPath = applyTraversalGuard(raw); // T-05-07 guard
        setSkillState(skill, { status: 'success', outputPath });
        setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 3000);
      } else {
        setSkillState(skill, { status: 'error', outputPath: null });
        setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 5000);
      }
    });

    // Input flows via stdin only — never concatenated into the args array (T-05-09)
    if (input) child.stdin.write(input, 'utf8');
    child.stdin.end();
  }

  // handleClickSelfContained: for wiki-optimizer (no input panel).
  // Same guard order as handleRun; uses execFile with stdout capture (D-08).
  function handleClickSelfContained() {
    // Guard 1: non-idle no-op
    if (skillState.status !== 'idle') return;
    // Guard 2: SEC-03 runtime allowlist — must precede execFile
    if (!ALLOWED_SKILLS.includes(skill)) return;

    setSkillState(skill, { status: 'loading', outputPath: null });

    // Keep execFile for self-contained skills; upgraded to capture stdout (D-08).
    // Skill name is the validated allowlist value; shell: false (default) — args never interpreted by shell (T-05-08).
    execFile('claude', ['-p', skill], (error, stdout) => {
      if (error === null) {
        const raw = parseOutputPath(stdout);
        const outputPath = applyTraversalGuard(raw); // T-05-07 guard
        setSkillState(skill, { status: 'success', outputPath });
        setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 3000);
      } else {
        setSkillState(skill, { status: 'error', outputPath: null });
        setTimeout(() => setSkillState(skill, { status: 'idle', outputPath: null }), 5000);
      }
    });
  }

  // Routing: wiki-optimizer fires directly; braindump/humanizer toggle the panel.
  function handleButtonClick() {
    if (skill === 'wiki-optimizer') {
      handleClickSelfContained();
    } else {
      // Input-required: toggle panel when idle; no-op when non-idle
      if (skillState.status !== 'idle') return;
      setExpanded(prev => !prev);
    }
  }

  // Button label: Cancel when expanded (idle + panel open), else use provided label.
  // Spinner/Done/Failed labels override for loading/success/error states.
  const isInputRequired = skill === 'braindump' || skill === 'humanizer';
  const buttonLabel = isInputRequired && expanded && skillState.status === 'idle'
    ? 'Cancel'
    : label;

  // CSS class: use --expanded when panel is open (Cancel visual overrides accent fill)
  const btnStatusClass = skillState.status === 'idle' && expanded
    ? 'expanded'
    : skillState.status;

  return (
    <div>
      <button
        className={`claudeos-skill-btn claudeos-skill-btn--${btnStatusClass}`}
        onClick={handleButtonClick}
        disabled={skillState.status === 'loading'}
      >
        {skillState.status === 'loading' && (
          <span ref={spinnerRef} className="cos-spinner" />
        )}
        {skillState.status === 'idle' && <span>{buttonLabel}</span>}
        {skillState.status === 'success' && (
          <><IconSlot iconName="check" /><span>Done</span></>
        )}
        {skillState.status === 'error' && (
          <><IconSlot iconName="x" /><span>Failed</span></>
        )}
      </button>

      {/* Output link: shown when success + parsed output path present (D-07, UI-SPEC §2) */}
      {skillState.status === 'success' && skillState.outputPath && (
        <div className="claudeos-output-link">
          <IconSlot iconName="external-link" />
          <span
            className="claudeos-output-link__text"
            onClick={() => app.workspace.openLinkText(skillState.outputPath!, '', 'tab')}
          >
            Open output
          </span>
        </div>
      )}

      {/* Input panel: only for input-required skills (braindump, humanizer) */}
      {isInputRequired && (
        <SkillInputPanel
          skill={skill as 'braindump' | 'humanizer'}
          isExpanded={expanded}
          onRun={handleRun}
          key={expanded ? 'open' : 'closed'}
        />
      )}
    </div>
  );
}
