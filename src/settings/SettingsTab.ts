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

    // Phase 7: Workouts Data settings
    new Setting(containerEl)
      .setName('Workouts Data')
      .setHeading();

    new Setting(containerEl)
      .setName('Workouts Sync Script')
      .setDesc('Absolute path to scripts/notion-workouts-sync.mjs. Required to use the Refresh button on the Workouts page.')
      .addText(text => text
        .setValue(this.plugin.settings.workoutsSyncScriptPath)
        .onChange(async (value) => {
          this.plugin.settings.workoutsSyncScriptPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Workouts — Muscle Volume Snapshot')
      .setDesc('Vault-relative path to workouts-muscle-volume.json written by the sync script.')
      .addText(text => text
        .setValue(this.plugin.settings.workoutsMuscleVolumePath)
        .onChange(async (value) => {
          this.plugin.settings.workoutsMuscleVolumePath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Workouts — Exercises Snapshot')
      .setDesc('Vault-relative path to workouts-exercises.json written by the sync script.')
      .addText(text => text
        .setValue(this.plugin.settings.workoutsExercisesPath)
        .onChange(async (value) => {
          this.plugin.settings.workoutsExercisesPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Workouts — Sessions Snapshot')
      .setDesc('Vault-relative path to workouts-sessions.json written by the sync script.')
      .addText(text => text
        .setValue(this.plugin.settings.workoutsSessionsPath)
        .onChange(async (value) => {
          this.plugin.settings.workoutsSessionsPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Workouts — Meta Snapshot')
      .setDesc('Vault-relative path to workouts-meta.json written by the sync script.')
      .addText(text => text
        .setValue(this.plugin.settings.workoutsMetaPath)
        .onChange(async (value) => {
          this.plugin.settings.workoutsMetaPath = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Muscle volume window (days)')
      .setDesc('Default look-back window for the Muscle Volume tab. Default: 28')
      .addText(text => text
        .setValue(String(this.plugin.settings.muscleWindowDays))
        .onChange(async (value) => {
          const n = parseInt(value, 10);
          this.plugin.settings.muscleWindowDays = Number.isFinite(n) && n >= 0 ? n : 28;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Secondary muscle weight')
      .setDesc('Attribution weight for secondary muscles in set-counting (0–1). Default: 1.0 (full credit). Use 0.5 for half credit, 0 to disable secondary attribution.')
      .addText(text => text
        .setValue(String(this.plugin.settings.secondaryMuscleWeight))
        .onChange(async (value) => {
          const n = parseFloat(value);
          this.plugin.settings.secondaryMuscleWeight = Number.isFinite(n) && n >= 0 ? n : 1.0;
          await this.plugin.saveSettings();
        })
      );
  }
}
