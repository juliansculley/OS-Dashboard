import React, { useState } from 'react';
import { Sidebar } from './ui/Sidebar';
import { HomePage } from './pages/HomePage';
import { SocialPage } from './pages/SocialPage';
import type { PageId } from '../types';

// PAGES will be extended in Plans 03-03 and 03-04 with 'projects' and 'newsletter'.
// Typed as Partial so that Plan 2 (types/settings/AppContext) compiles without stubs.
const PAGES: Partial<Record<PageId, React.ComponentType>> = {
  home: HomePage,
  social: SocialPage,
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
