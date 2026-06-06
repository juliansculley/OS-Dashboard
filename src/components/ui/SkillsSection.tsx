import React from 'react';
import { SkillButton } from './SkillButton';

export function SkillsSection() {
  return (
    <section className="claudeos-skills-section">
      <div className="claudeos-skills-heading">Skills</div>
      <div className="claudeos-skills-row">
        <SkillButton skill="wiki-optimizer" label="Wiki Optimizer" />
        <SkillButton skill="braindump" label="Braindump" />
        <SkillButton skill="humanizer" label="Humanizer" />
      </div>
    </section>
  );
}
