import { useState } from 'react';
import { Sidebar } from './ui/Sidebar';
import { HomePage } from './pages/HomePage';
import { SocialPage } from './pages/SocialPage';
import type { PageId } from '../types';

const PAGES: Record<PageId, React.ComponentType> = {
  home: HomePage,
  social: SocialPage,
};

export function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState<PageId>('home');
  const PageComponent = PAGES[activePage];

  return (
    <div className="claudeos-dashboard">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="claudeos-main">
        <PageComponent />
      </main>
    </div>
  );
}
