// Shared TypeScript types for ClaudeOS Dashboard

export type PageId = 'home' | 'social';

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
}

export const DEFAULT_SETTINGS: ClaudeOSSettings = {
  lastSyncPath: "",
  activeProjectsPath: "",
  linkedinDataPath: "",
  xDataPath: "",
};
