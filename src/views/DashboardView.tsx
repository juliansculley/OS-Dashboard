import { ItemView, WorkspaceLeaf, sanitizeHTMLToDom } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { StrictMode, useState, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { App as DashApp } from '../components/App';
import ClaudeOSPlugin from '../../main';
import { App } from 'obsidian';

export const VIEW_TYPE_DASHBOARD = 'claudeos-dashboard-view';

/**
 * DashboardRoot — React function component that holds refreshNonce state and supplies the
 * full AppContext.Provider value (app, plugin, refreshNonce, triggerRefresh).
 *
 * This wrapper exists because DashboardView.onOpen is a class method and cannot call useState
 * directly. DashboardRoot is the React boundary that owns the refresh state. (D-10, D-11)
 *
 * Plan 3 (RefreshButton) calls triggerRefresh() on sync success.
 * Plans 3/4 (Projects, Newsletter pages) subscribe to refreshNonce in their useEffect deps.
 */
function DashboardRoot({ app, plugin }: { app: App; plugin: ClaudeOSPlugin }): React.JSX.Element {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshNonce(n => n + 1), []);

  return (
    <AppContext.Provider value={{ app, plugin, refreshNonce, triggerRefresh }}>
      <DashApp />
    </AppContext.Provider>
  );
}

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
        <DashboardRoot app={this.app} plugin={this.plugin} />
      </StrictMode>
    );
  }

  async onClose(): Promise<void> {
    this.root?.unmount(); // Required — prevents React memory leaks on plugin reload
  }
}

/**
 * Renders sanitized HTML into a container element.
 * SEC-01: All dynamic HTML must go through this function — never use innerHTML directly.
 * sanitizeHTMLToDom() strips script tags, event handlers, and other XSS vectors.
 * Returns a DocumentFragment that must be appended to the DOM (not assigned to innerHTML).
 */
export function renderSafeHTML(containerEl: HTMLElement, rawHtml: string): void {
  containerEl.empty();
  const fragment = sanitizeHTMLToDom(rawHtml);
  containerEl.appendChild(fragment);
}
