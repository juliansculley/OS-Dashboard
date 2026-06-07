import React, { useState } from 'react';
import { Sidebar } from './ui/Sidebar';
import { HomePage } from './pages/HomePage';
import { SocialPage } from './pages/SocialPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { NewsletterPage } from './pages/NewsletterPage';
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
  // PageComponent may be undefined if a PageId entry is not yet registered (Plans 03-03/03-04 will add them).
  const PageComponent = PAGES[activePage] ?? HomePage;

  return (
    <div className="claudeos-dashboard">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="claudeos-main">
        <PageComponent />
      </main>
    </div>
  );
}
