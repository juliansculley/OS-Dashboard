import { Plugin } from 'obsidian';
import { DashboardView, VIEW_TYPE_DASHBOARD } from './src/views/DashboardView';
import { ClaudeOSSettings, DEFAULT_SETTINGS } from './src/types';
import { SettingsTab } from './src/settings/SettingsTab';

export default class ClaudeOSPlugin extends Plugin {
  settings: ClaudeOSSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new SettingsTab(this.app, this));

    this.registerView(
      VIEW_TYPE_DASHBOARD,
      (leaf) => new DashboardView(leaf, this)
    );

    this.addRibbonIcon('layout-dashboard', 'ClaudeOS Dashboard', () => {
      this.activateDashboardView();
    });

    this.addCommand({
      id: 'open-claudeos-dashboard',
      name: 'Open ClaudeOS Dashboard',
      callback: () => {
        this.activateDashboardView();
      },
    });
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
  }

  async activateDashboardView(): Promise<void> {
    const { workspace } = this.app;
    // Reuse existing leaf — avoid opening duplicates
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0];
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
