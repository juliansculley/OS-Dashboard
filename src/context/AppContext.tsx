import { createContext, useContext } from 'react';
import { App } from 'obsidian';
import ClaudeOSPlugin from '../../main';

export interface AppContextType {
  app: App;
  plugin: ClaudeOSPlugin;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppContext.Provider');
  return ctx;
}
