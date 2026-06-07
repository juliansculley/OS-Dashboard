// Shared TypeScript types for ClaudeOS Dashboard

export type PageId = 'home' | 'social' | 'projects' | 'newsletter';

export interface NavItem {
  id: PageId;
  label: string;
  iconId: string; // Lucide icon ID for Obsidian's setIcon()
}

// Phase 2: Tile data schemas (per D-05, D-06, UI-SPEC Data Schema Contract)
export interface TileSyncData {
  timestamp: string; // ISO 8601
}

export interface TileCountData {
  count: number;
}

// Phase 2: Social stats data schemas (per D-11, UI-SPEC Data Schema Contract)
export interface LinkedInData {
  followers: number;
  connections: number;
  posts: number;
  updated_at?: string;
}

export interface XData {
  followers: number;
  following: number;
  tweets: number;
  updated_at?: string;
}

// Phase 2: Plugin settings (per D-08, D-09, D-10)
export interface ClaudeOSSettings {
  lastSyncPath: string;       // default: ""
  activeProjectsPath: string; // default: ""
  linkedinDataPath: string;   // default: ""
  xDataPath: string;          // default: ""
  // Phase 3: Notion sync settings (D-12)
  tasksSnapshotPath: string;      // default: ".dashboard-data/tasks.json"
  projectsSnapshotPath: string;   // default: ".dashboard-data/projects.json"
  newsletterSnapshotPath: string; // default: ".dashboard-data/newsletter.json"
  syncScriptPath: string;         // default: "" (user must set once — D-09)
  nodePath: string;               // default: "node" (override with full path if not on Obsidian's PATH)
  dueSoonDays: number;            // default: 3 (D-05)
}

export const DEFAULT_SETTINGS: ClaudeOSSettings = {
  lastSyncPath: "",
  activeProjectsPath: "",
  linkedinDataPath: "",
  xDataPath: "",
  // Phase 3: Notion sync defaults
  tasksSnapshotPath: ".dashboard-data/tasks.json",
  projectsSnapshotPath: ".dashboard-data/projects.json",
  newsletterSnapshotPath: ".dashboard-data/newsletter.json",
  syncScriptPath: "",
  nodePath: "node",
  dueSoonDays: 3,
};

// Phase 3: Notion snapshot interfaces (field names match notion-sync.mjs output exactly — 03-01-SUMMARY.md)

/** Common metadata header on every snapshot file */
export interface SnapshotMeta {
  generated_at: string; // ISO 8601
}

/** One task row from tasks.json */
export interface TaskItem {
  name: string;
  status: string;
  priority?: string; // conditionally present — omitted when undefined
  due?: string;      // YYYY-MM-DD, conditionally present — omitted when null
  url: string;       // https://notion.so/<id-without-dashes>
  // NOTE: no `project` field — relation resolution deferred (D-06)
}

/** Snapshot written by notion-sync.mjs for the Tasks DB */
export interface TasksSnapshot extends SnapshotMeta {
  active_count: number;
  overdue_count: number;
  due_soon_count: number;
  items: TaskItem[]; // capped at TASK_CAP=10, sorted by due date
}

/** One project row from projects.json */
export interface ProjectItem {
  name: string;
  status: string;
  progress?: number; // integer 0–100, conditionally present — omitted when not finite
  url: string;
  // NOTE: no active_tasks/overdue_tasks — Meta formula format undocumented, omitted (03-01 critical finding)
}

/** Snapshot written by notion-sync.mjs for the Projects DB */
export interface ProjectsSnapshot extends SnapshotMeta {
  active_count: number;
  items: ProjectItem[]; // all active projects (typically < 20)
}

/** One newsletter item row from newsletter.json */
export interface NewsletterItem {
  name: string;
  stage: string;
  content_type?: string; // conditionally present
  platform?: string;     // conditionally present
  url: string;
}

/** Snapshot written by notion-sync.mjs for the Newsletter Content Hub DB */
export interface NewsletterSnapshot extends SnapshotMeta {
  by_stage: Record<string, number>; // stage name → count (only stages with items)
  items: NewsletterItem[];          // all non-Published/non-Deleted items
}
