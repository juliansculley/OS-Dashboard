import { useRef, useEffect } from 'react';
import { setIcon } from 'obsidian';
import type { PageId, NavItem } from '../../types';

const NAV_ITEMS: NavItem[] = [
  { id: 'home',   label: 'Home',   iconId: 'layout-dashboard' },
  { id: 'social', label: 'Social', iconId: 'bar-chart-2' },
];

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

function NavItemButton({ item, isActive, onNavigate }: {
  item: NavItem;
  isActive: boolean;
  onNavigate: (page: PageId) => void;
}): React.JSX.Element {
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (iconRef.current) {
      setIcon(iconRef.current, item.iconId);
    }
  }, [item.iconId]);

  return (
    <button
      className={`claudeos-nav-item${isActive ? ' active' : ''}`}
      onClick={() => onNavigate(item.id)}
    >
      <span ref={iconRef} className="claudeos-nav-icon" />
      <span className="claudeos-nav-label">{item.label}</span>
    </button>
  );
}

export function Sidebar({ activePage, onNavigate }: SidebarProps): React.JSX.Element {
  return (
    <nav className="claudeos-sidebar">
      <div className="claudeos-logo">ClaudeOS</div>
      {NAV_ITEMS.map(item => (
        <NavItemButton
          key={item.id}
          item={item}
          isActive={activePage === item.id}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
