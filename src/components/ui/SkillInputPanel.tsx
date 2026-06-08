import React, { useState } from 'react';

type SkillWithInput = 'braindump' | 'humanizer' | 'test-skill';

interface SkillInputPanelProps {
  skill: SkillWithInput;
  isExpanded: boolean;
  onRun: (input: string) => void;
}

export function SkillInputPanel({ skill, isExpanded, onRun }: SkillInputPanelProps) {
  const [text, setText] = useState('');
  const [filePath, setFilePath] = useState('');

  function buildInput(): string {
    if (skill === 'humanizer' && filePath.trim()) {
      return `File: ${filePath.trim()}`; // path takes precedence (CONTEXT D-03)
    }
    return text;
  }

  const isEmpty = skill === 'humanizer'
    ? text.trim() === '' && filePath.trim() === ''
    : text.trim() === '';  // braindump and test-skill both just check text

  return (
    <div className={`claudeos-input-panel${isExpanded ? '' : ' claudeos-input-panel--hidden'}`}>
      {(skill === 'braindump' || skill === 'test-skill') && (
        <div className="claudeos-input-panel__field">
          <label className="claudeos-input-panel__label">Input</label>
          <textarea
            className="claudeos-input-panel__textarea"
            placeholder={skill === 'test-skill' ? 'Type test input...' : 'Paste or type your braindump here...'}
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>
      )}
      {skill === 'humanizer' && (
        <>
          <div className="claudeos-input-panel__field">
            <label className="claudeos-input-panel__label">Text</label>
            <textarea
              className="claudeos-input-panel__textarea"
              placeholder="Paste text to humanize..."
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>
          <div className="claudeos-input-panel__field">
            <label className="claudeos-input-panel__label">Or vault path</label>
            <input
              type="text"
              className="claudeos-input-panel__path"
              placeholder="e.g. braindumps/note.md (takes precedence)"
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
            />
          </div>
        </>
      )}
      <button
        className="claudeos-run-btn"
        disabled={isEmpty}
        onClick={() => onRun(buildInput())}
      >
        Run
      </button>
    </div>
  );
}
