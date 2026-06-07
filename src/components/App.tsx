import React, { useState } from 'react';
import { Sidebar } from './ui/Sidebar';
import { HomePage } from './pages/HomePage';
import { SocialPage } from './pages/SocialPage';
import { ProjectsPage } from './pages/ProjectsPage';
import type { PageId } from '../types';

// PAGES will be extended in Plan 03-04 with 'newsletter'.
// Typed as Partial so that Plan 04 compiles before newsletter is registered.
const PAGES: Partial<Record<PageId, React.ComponentType>> = {
  home: HomePage,
  social: SocialPage,
  projects: ProjectsPage,
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
