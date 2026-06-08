import React from 'react';
import { SkillButton } from './SkillButton';

// Each SkillButton renders its own expanded input panel below itself.
// The row uses align-items: flex-start (CSS) so expanded panels push down
// their own column without stretching sibling buttons.
export function SkillsSection() {
  return (
    <section className="claudeos-skills-section">
      <div className="claudeos-skills-heading">Skills</div>
      <div className="claudeos-skills-row">
        <SkillButton skill="wiki-optimizer" label="Wiki Optimizer" />
        <SkillButton skill="braindump" label="Braindump" />
        <SkillButton skill="humanizer" label="Humanizer" />
        <SkillButton skill="test-skill" label="Test Skill" />
      </div>
    </section>
  );
}
