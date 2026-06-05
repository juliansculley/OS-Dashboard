import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { AppContext } from '../context/AppContext';
import { App as DashApp } from '../components/App';
import ClaudeOSPlugin from '../../main';

export const VIEW_TYPE_DASHBOARD = 'claudeos-dashboard-view';

export class DashboardView extends ItemView {
  root: Root | null = null;
  plugin: ClaudeOSPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeOSPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_DASHBOARD;
  }

  getDisplayText(): string {
    return 'ClaudeOS Dashboard';
  }

  getIcon(): string {
    return 'layout-dashboard';
  }

  async onOpen(): Promise<void> {
    // Use this.contentEl — the documented stable API for ItemView content area.
    // Do NOT use this.containerEl.children[1] — that is an undocumented internal hack.
    this.root = createRoot(this.contentEl);
    this.root.render(
      <StrictMode>
        <AppContext.Provider value={{ app: this.app, plugin: this.plugin }}>
          <DashApp />
        </AppContext.Provider>
      </StrictMode>
    );
  }

  async onClose(): Promise<void> {
    this.root?.unmount(); // Required — prevents React memory leaks on plugin reload
  }
}
