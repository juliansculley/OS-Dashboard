import { createContext, useContext } from 'react';
import { App } from 'obsidian';
import ClaudeOSPlugin from '../../main';

export interface AppContextType {
  app: App;
  plugin: ClaudeOSPlugin;
  // Phase 3 (D-11): nonce-based refresh signal — pages subscribe in their useEffect dependency arrays.
  // Backward-compatible addition: existing pages (Home, Social) ignore these fields.
  refreshNonce: number;       // starts at 0; increments on each successful sync
  triggerRefresh: () => void; // call to bump refreshNonce and cause pages to re-read snapshots
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppContext.Provider');
  return ctx;
}
