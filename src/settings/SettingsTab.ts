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
  }
}
