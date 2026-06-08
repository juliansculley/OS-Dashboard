import React, { useState } from 'react';
import { Sidebar } from './ui/Sidebar';
import { HomePage } from './pages/HomePage';
import { SocialPage } from './pages/SocialPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { NewsletterPage } from './pages/NewsletterPage';
import { SkillStatusBar } from './ui/SkillStatusBar';
import type { PageId } from '../types';

// All PageId entries registered — PageId = 'home' | 'social' | 'projects' | 'newsletter'.
const PAGES: Partial<Record<PageId, React.ComponentType>> = {
  home: HomePage,
  social: SocialPage,
  projects: ProjectsPage,
  newsletter: NewsletterPage,
};

export function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState<PageId>('home');
  // PageComponent may be undefined if a PageId entry is not yet registered.
  const PageComponent = PAGES[activePage] ?? HomePage;

  return (
    <div className="claudeos-dashboard">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      {/* content-wrapper: flex column stacking status bar above main (D-11, Pitfall 4) */}
      <div className="claudeos-content-wrapper">
        {/* Always mounted — visibility toggled via CSS --active class, no layout shift */}
        <SkillStatusBar />
        <main className="claudeos-main">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
