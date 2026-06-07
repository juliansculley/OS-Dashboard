import { App, PluginSettingTab, Setting } from 'obsidian';
import type ClaudeOSPlugin from '../../main';

export class SettingsTab extends PluginSettingTab {
  plugin: ClaudeOSPlugin;

  constructor(app: App, plugin: ClaudeOSPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Data File Paths')
      .setHeading();

    new Setting(containerEl)
      .setName('Last Vault Sync File')
      .setDesc('Path to a JSON file with a "timestamp" field (ISO 8601). Written by your vault sync automation.')
      .addText(text => text
        .setValue(this.plugin.settings.lastSyncPath)
        .onChange(async (value) => {
          this.plugin.settings.lastSyncPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Active Projects File')
      .setDesc('Path to a JSON file with a "count" field (integer). Written by your project tracking automation.')
      .addText(text => text
        .setValue(this.plugin.settings.activeProjectsPath)
        .onChange(async (value) => {
          this.plugin.settings.activeProjectsPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('LinkedIn Data File')
      .setDesc('Path to a JSON file with LinkedIn metrics (followers, connections, posts).')
      .addText(text => text
        .setValue(this.plugin.settings.linkedinDataPath)
        .onChange(async (value) => {
          this.plugin.settings.linkedinDataPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('X (Twitter) Data File')
      .setDesc('Path to a JSON file with X metrics (followers, following, tweets).')
      .addText(text => text
        .setValue(this.plugin.settings.xDataPath)
        .onChange(async (value) => {
          this.plugin.settings.xDataPath = value;
          await this.plugin.saveSettings();
        })
      );

    // Phase 3: Notion Sync settings (D-12)
    new Setting(containerEl)
      .setName('Notion Sync')
      .setHeading();

    new Setting(containerEl)
      .setName('Node executable path')
      .setDesc('Path to node.exe used to run the sync script. Use the full path if node is not on Obsidian\'s PATH (e.g. C:\\Users\\scull\\AppData\\Local\\nvm\\v20.20.2\\node.exe). Default: node')
      .addText(text => text
        .setValue(this.plugin.settings.nodePath)
        .onChange(async (value) => {
          this.plugin.settings.nodePath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Sync script path')
      .setDesc('Absolute path to scripts/notion-sync.mjs. Required — set this once.')
      .addText(text => text
        .setValue(this.plugin.settings.syncScriptPath)
        .onChange(async (value) => {
          this.plugin.settings.syncScriptPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Tasks snapshot file')
      .setDesc('Path to tasks.json written by the sync script.')
      .addText(text => text
        .setValue(this.plugin.settings.tasksSnapshotPath)
        .onChange(async (value) => {
          this.plugin.settings.tasksSnapshotPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Projects snapshot file')
      .setDesc('Path to projects.json written by the sync script.')
      .addText(text => text
        .setValue(this.plugin.settings.projectsSnapshotPath)
        .onChange(async (value) => {
          this.plugin.settings.projectsSnapshotPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Newsletter snapshot file')
      .setDesc('Path to newsletter.json written by the sync script.')
      .addText(text => text
        .setValue(this.plugin.settings.newsletterSnapshotPath)
        .onChange(async (value) => {
          this.plugin.settings.newsletterSnapshotPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Due-soon window (days)')
      .setDesc('Tasks due within this many days are emphasized. Default: 3')
      .addText(text => text
        .setValue(String(this.plugin.settings.dueSoonDays))
        .onChange(async (value) => {
          const n = parseInt(value, 10);
          this.plugin.settings.dueSoonDays = Number.isFinite(n) && n >= 0 ? n : 3;
          await this.plugin.saveSettings();
        })
      );
  }
}
