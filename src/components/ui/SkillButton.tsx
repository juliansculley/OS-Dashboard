import React, { useState, useRef, useEffect } from 'react';
import { execFile } from 'child_process';
import { setIcon } from 'obsidian';

// SEC-03: Allowlist is a hardcoded TypeScript const — never derived from user input.
// Per D-01: changes require a code update, enforcing security structurally.
const ALLOWED_SKILLS = ['wiki-optimizer', 'braindump', 'humanizer'] as const;
type AllowedSkill = typeof ALLOWED_SKILLS[number];

type SkillState = 'idle' | 'loading' | 'success' | 'error';

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

export function SkillButton({ skill, label }: SkillButtonProps) {
  const [state, setState] = useState<SkillState>('idle');
  const spinnerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (state === 'loading' && spinnerRef.current) {
      setIcon(spinnerRef.current, 'loader-2');
    }
  }, [state]);

  function handleClick() {
    // SKILL-02 + SEC-03: Guard at runtime — TypeScript type is compile-time enforcement;
    // this check is the runtime enforcement. Never reaches exec if guard fails.
    if (state !== 'idle') return;
    if (!ALLOWED_SKILLS.includes(skill)) return;

    setState('loading');
    // SKILL-01: Execute claude -p <skill>. Skill name comes from hardcoded array, never user input.
    // SEC-03: execFile avoids shell invocation — argument is passed as array element, never interpolated.
    execFile('claude', ['-p', skill], (error) => {
      // SKILL-03: Transition to success/error based on exit code, then auto-reset.
      if (error === null) {
        setState('success');
        setTimeout(() => setState('idle'), 3000);
      } else {
        setState('error');
        setTimeout(() => setState('idle'), 5000);
      }
    });
  }

  return (
    <button
      className={`claudeos-skill-btn claudeos-skill-btn--${state}`}
      onClick={handleClick}
      disabled={state === 'loading'}
    >
      {state === 'loading' && (
        <span ref={spinnerRef} className="cos-spinner" />
      )}
      {state === 'idle' && <span>{label}</span>}
      {state === 'success' && (
        <><IconSlot iconName="check" /><span>Done</span></>
      )}
      {state === 'error' && (
        <><IconSlot iconName="x" /><span>Failed</span></>
      )}
    </button>
  );
}
