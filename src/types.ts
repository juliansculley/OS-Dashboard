// Shared TypeScript types for ClaudeOS Dashboard

export type PageId = 'home' | 'social' | 'projects' | 'newsletter' | 'workouts';

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
  // Phase 7: Workouts Data settings
  workoutsSyncScriptPath: string;      // default: "" (user must set — absolute path to notion-workouts-sync.mjs)
  workoutsMuscleVolumePath: string;    // default: "OS-Dashboard/.dashboard-data/workouts-muscle-volume.json"
  workoutsExercisesPath: string;       // default: "OS-Dashboard/.dashboard-data/workouts-exercises.json"
  workoutsSessionsPath: string;        // default: "OS-Dashboard/.dashboard-data/workouts-sessions.json"
  workoutsMetaPath: string;            // default: "OS-Dashboard/.dashboard-data/workouts-meta.json"
  muscleWindowDays: number;            // default: 28 (window for muscle-volume aggregation)
  secondaryMuscleWeight: number;       // default: 1.0 (attribution weight for secondary muscles)
}

export const DEFAULT_SETTINGS: ClaudeOSSettings = {
  lastSyncPath: "",
  activeProjectsPath: "",
  linkedinDataPath: "",
  xDataPath: "",
  // Phase 3: Notion sync defaults
  tasksSnapshotPath: "OS-Dashboard/.dashboard-data/tasks.json",
  projectsSnapshotPath: "OS-Dashboard/.dashboard-data/projects.json",
  newsletterSnapshotPath: "OS-Dashboard/.dashboard-data/newsletter.json",
  syncScriptPath: "",
  nodePath: "",
  dueSoonDays: 3,
  // Phase 7: Workouts Data defaults
  workoutsSyncScriptPath: "",
  workoutsMuscleVolumePath: "OS-Dashboard/.dashboard-data/workouts-muscle-volume.json",
  workoutsExercisesPath: "OS-Dashboard/.dashboard-data/workouts-exercises.json",
  workoutsSessionsPath: "OS-Dashboard/.dashboard-data/workouts-sessions.json",
  workoutsMetaPath: "OS-Dashboard/.dashboard-data/workouts-meta.json",
  muscleWindowDays: 28,
  secondaryMuscleWeight: 1.0,
};

// Phase 5: Skill execution state types (per D-10, OUT-02)
export type SkillRunStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SkillRunState {
  status: SkillRunStatus;
  outputPath: string | null; // null when no output parsed or skill not complete
}

export type SkillStateMap = Record<string, SkillRunState>;

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

// Phase 7: Workouts snapshot interfaces (field names match notion-workouts-sync.mjs output exactly — 07-01-SUMMARY.md)

/** One cell in the per-ISO-week-per-muscle matrix */
export interface MuscleWeekCell {
  week: string;   // ISO week string e.g. "2026-W23"
  muscle: string; // muscle group name e.g. "Chest"
  sets: number;   // attributed set count
}

/** Per-session muscle breakdown (for the "this workout" view) */
export interface SessionMuscleBreakdown {
  session_id: string;
  date: string;
  name: string;
  sets_by_muscle: Record<string, number>; // muscle name → attributed sets
}

/**
 * Snapshot written by notion-workouts-sync.mjs — muscle group set volume.
 * Contains both primary-only and primary+secondary attribution arrays so
 * the UI attribution toggle is a simple array swap (see 07-RESEARCH.md Pitfall 6).
 */
export interface MuscleVolumeSnapshot extends SnapshotMeta {
  muscles: string[];                          // ordered display list (Cardio/knee excluded)
  weekly_with_secondary: MuscleWeekCell[];    // per ISO week per muscle — all attribution
  weekly_primary_only: MuscleWeekCell[];      // per ISO week per muscle — primary muscles only
  by_session: SessionMuscleBreakdown[];
  window_default_days: number;                // e.g. 28
  secondary_weight: number;                   // attribution weight used (default 1.0)
}

/** One data point in an exercise progression series */
export interface ExercisePoint {
  date: string;
  weight: number | null;
  volume: number | null;
  est_1rm: number | null;
}

/** Per-exercise progression series with PR summary */
export interface ExerciseSeries {
  exercise_id: string;
  name: string;
  primary: string[];
  secondary: string[];
  best_weight: number | null;
  best_1rm: number | null;
  points: ExercisePoint[];
}

/** Snapshot written by notion-workouts-sync.mjs — per-exercise progression */
export interface ExercisesSnapshot extends SnapshotMeta {
  exercises: ExerciseSeries[];
}

/** One session row in the session history list */
export interface SessionRow {
  session_id: string;
  date: string;
  name: string;
  template?: string;      // Name minus trailing MMDDYY date token (e.g. "Hyp-25-Push-C")
  tags: string[];         // tokens matched in Name: Push/Pull/Full/Arms/Hyp/Str
  difficulty: string[];
  results: string[];
  location?: string;
  meso_name?: string;
  total_sets: number;
  url: string;
}

/** Snapshot written by notion-workouts-sync.mjs — session history */
export interface SessionsSnapshot extends SnapshotMeta {
  sessions: SessionRow[];
}

/** One bodyweight data point */
export interface BodyPoint {
  date: string;
  value: number;
}

/**
 * Snapshot written by notion-workouts-sync.mjs — meta context
 * (current mesocycle + bodyweight series)
 */
export interface WorkoutsMetaSnapshot extends SnapshotMeta {
  current_meso?: {
    name: string;
    wo_type: string;
    focus: string;
    status: string;
    end: string;
  };
  bodyweight: BodyPoint[];
}
