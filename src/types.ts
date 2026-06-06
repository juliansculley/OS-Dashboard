// Shared TypeScript types for ClaudeOS Dashboard

export type PageId = 'home' | 'social';

export interface NavItem {
  id: PageId;
  label: string;
  iconId: string; // Lucide icon ID for Obsidian's setIcon()
}
