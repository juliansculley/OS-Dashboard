/**
 * notion-sync.mjs — ClaudeOS Dashboard Notion Sync Script
 *
 * NOTION INTEGRATION SETUP (D-16 prerequisite):
 *
 * 1. Create an internal integration at https://www.notion.so/profile/integrations
 *    - Name it "ClaudeOS Dashboard Sync"
 *    - Copy the Internal Integration Secret (starts with ntn_ or secret_)
 *
 * 2. Share the integration with all THREE databases:
 *    Open each database in Notion → click ••• menu → Connections → add "ClaudeOS Dashboard Sync"
 *    Databases: Tasks DB, Projects DB, Newsletter Content Hub
 *    NOTE: Skipping any one database will cause a 404 error for that query.
 *
 * 3. Provide the token via ONE of these methods:
 *    - Set NOTION_TOKEN as a Windows user environment variable, OR
 *    - Create the file %USERPROFILE%\.claudeos\notion.env containing exactly one line:
 *        NOTION_TOKEN=<your-internal-integration-secret>
 *
 * 4. Run the script using the full Node.js path (Node 18+ required):
 *    & "C:\Users\scull\AppData\Local\nvm\v20.20.2\node.exe" scripts\notion-sync.mjs
 *
 * REQUIREMENTS:
 * - Node 18+ (uses global fetch)
 * - No npm dependencies — uses only Node built-ins: fs/promises, path, os, url
 * - Node path on this machine: C:\Users\scull\AppData\Local\nvm\v20.20.2\node.exe
 */

import { readFile, writeFile, rename, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

// ─── Node 18+ guard ───────────────────────────────────────────────────────────
if (typeof fetch !== 'function') {
  process.stderr.write(
    `notion-sync requires Node 18+ (global fetch unavailable). Detected: ${process.version}\n`
  );
  process.exit(1);
}

// ─── Token loading (NOTION-02, D-01) ─────────────────────────────────────────
async function loadToken() {
  // Primary: environment variable
  const envToken = process.env.NOTION_TOKEN;
  if (envToken && envToken.trim()) {
    return envToken.trim();
  }

  // Fallback: %USERPROFILE%\.claudeos\notion.env
  // NEVER reads any path inside the OneDrive-synced vault
  const fallbackPath = join(homedir(), '.claudeos', 'notion.env');
  try {
    const contents = await readFile(fallbackPath, 'utf-8');
    for (const line of contents.split(/\r?\n/)) {
      if (line.startsWith('NOTION_TOKEN=')) {
        const token = line.slice('NOTION_TOKEN='.length).trim();
        if (token) return token;
      }
    }
  } catch {
    // File not found or unreadable — fall through to error below
  }

  process.stderr.write(
    'No NOTION_TOKEN found. Set the NOTION_TOKEN environment variable or create %USERPROFILE%\\.claudeos\\notion.env\n'
  );
  process.exit(1);
}

// ─── Constants (D-03, D-04) ───────────────────────────────────────────────────
const API_BASE = 'https://api.notion.com/v1/data_sources/';
const NOTION_VERSION = '2025-09-03';

const DATA_SOURCES = {
  tasks:      '1e74f78c-9804-81e4-a8b8-000bb75cf801',
  projects:   '1e74f78c-9804-818e-b085-000be0a80fc5',
  newsletter: '2b64f78c-9804-80c8-a851-000b3dea27d5',
};

// Number of days ahead considered "due soon" (mirrors dueSoonDays default in Plan 2 settings)
const DUE_SOON_DAYS = 3;

// Maximum task items to write to snapshot after sorting by due date (D-07)
const TASK_CAP = 10;

// ─── Query helper (paginated POST) ───────────────────────────────────────────
async function queryDataSource(token, uuid, body) {
  const url = `${API_BASE}${uuid}/query`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };

  let results = [];
  let startCursor = undefined;
  let hasMore = true;

  while (hasMore) {
    const requestBody = {
      page_size: 100,
      ...body,
    };
    if (startCursor) {
      requestBody.start_cursor = startCursor;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Notion API error ${response.status} for ${uuid}: ${errorText}`
      );
    }

    const data = await response.json();
    results = results.concat(data.results ?? []);
    hasMore = data.has_more ?? false;
    startCursor = data.next_cursor ?? undefined;
  }

  return results;
}

// ─── Deep link helper ─────────────────────────────────────────────────────────
function notionUrl(result) {
  return `https://notion.so/${result.id.replace(/-/g, '')}`;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function todayString() {
  // Returns local date as YYYY-MM-DD for comparison with Notion due dates
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dueSoonCutoff(dueSoonDays) {
  const now = new Date();
  now.setDate(now.getDate() + dueSoonDays);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Atomic write helper (D-08) ───────────────────────────────────────────────
async function writeAtomic(finalPath, obj) {
  const stamped = { ...obj, generated_at: new Date().toISOString() };
  const json = JSON.stringify(stamped, null, 2);
  const tmpPath = `${finalPath}.tmp`;
  await writeFile(tmpPath, json, 'utf-8');
  await rename(tmpPath, finalPath);
}

// ─── Tasks transform (D-05, D-06, D-07) ──────────────────────────────────────
function transformTasks(results) {
  const today = todayString();
  const cutoff = dueSoonCutoff(DUE_SOON_DAYS);

  // Build full item list from all active (non-Done) results
  // Filter: applied server-side (Status does_not_equal Done) — all results are active
  const allItems = results.map((result) => {
    const props = result.properties;
    // TaskItem: OMIT relation fields (D-06 — Project/Areas/Parent Task require extra fetches)
    const item = {
      name:   props.Name.title[0]?.plain_text ?? '',
      status: props.Status.status?.name,
    };

    const priority = props.Priority?.status?.name;
    if (priority !== undefined && priority !== null) {
      item.priority = priority;
    }

    const due = props.Due?.date?.start;
    if (due !== undefined && due !== null) {
      item.due = due;
    }

    // Description (rich_text)
    const descText = (props.Description?.rich_text ?? []).map(b => b.plain_text).join('');
    if (descText) item.description = descText;

    // Smart List (select — "Someday" etc.)
    const smartList = props['Smart List']?.select?.name;
    if (smartList) item.smart_list = smartList;

    // Recurrence
    const recurInterval = props['Recur Interval']?.number;
    if (typeof recurInterval === 'number' && isFinite(recurInterval) && recurInterval > 0) {
      item.recur_interval = recurInterval;
      const recurUnit = props['Recur Unit']?.select?.name;
      if (recurUnit) item.recur_unit = recurUnit;
      const days = (props.Days?.multi_select ?? []).map(d => d.name);
      if (days.length > 0) item.recur_days = days;
    }

    // Next Due (formula — computed next recurrence date)
    const nextDue = props['Next Due']?.formula?.date?.start;
    if (nextDue) item.next_due = nextDue;

    // Meta Labels (formula — recurring/sub-task indicators string)
    const metaLabels = props['Meta Labels']?.formula?.string;
    if (metaLabels) item.meta_labels = metaLabels;

    // User-defined URL field (distinct from Notion page URL)
    const link = props.URL?.url;
    if (link) item.link = link;

    item.created_at = result.created_time;
    item.edited_at = result.last_edited_time;
    item.url = notionUrl(result);
    return item;
  });

  // Compute counts over FULL active set BEFORE capping (D-07)
  const active_count = allItems.length;
  const overdue_count = allItems.filter(
    (t) => t.due && t.due < today
  ).length;
  const due_soon_count = allItems.filter(
    (t) => t.due && t.due >= today && t.due <= cutoff
  ).length;

  // Cap to first TASK_CAP items (already sorted ascending by due date via API sort)
  const items = allItems.slice(0, TASK_CAP);

  return { active_count, overdue_count, due_soon_count, items };
}

// ─── Projects transform (D-05) ────────────────────────────────────────────────
function transformProjects(results) {
  const items = results.map((result) => {
    const props = result.properties;
    const item = {
      name:   props.Name.title[0]?.plain_text ?? '',
      status: props.Status.status?.name,
    };

    // Progress: formula — % of completed tasks (number)
    const progressNum = props.Progress?.formula?.number;
    if (typeof progressNum === 'number' && isFinite(progressNum)) {
      item.progress = Math.round(progressNum);
    }

    // Meta: formula — raw string e.g. "3 active / 1 overdue" (format may vary)
    const metaStr = props.Meta?.formula?.string;
    if (metaStr) item.meta = metaStr;

    // Latest Activity: formula — most recent edit across project, tasks, and notes
    const latestActivity = props['Latest Activity']?.formula?.date?.start;
    if (latestActivity) item.latest_activity = latestActivity;

    item.created_at = result.created_time;
    item.edited_at = result.last_edited_time;
    item.url = notionUrl(result);
    return item;
  });

  return {
    active_count: items.length,
    items,
  };
}

// ─── Newsletter transform (D-05, critical findings 1 and 6) ──────────────────
function transformNewsletter(results) {
  // Title property name is "Title" NOT "Name" (critical finding)
  // Filter client-side: drop Published and Deleted stages
  const EXCLUDED_STAGES = new Set(['10. Published', '11. Deleted']);

  const items = results
    .filter((result) => {
      const stage = result.properties.Status?.status?.name;
      return !EXCLUDED_STAGES.has(stage);
    })
    .map((result) => {
      const props = result.properties;
      const item = {
        name:  props.Title.title[0]?.plain_text ?? '',
        stage: props.Status.status?.name,
      };

      const contentType = props['Content Type']?.select?.name;
      if (contentType !== undefined && contentType !== null) {
        item.content_type = contentType;
      }

      const platform = props.Platform?.select?.name;
      if (platform !== undefined && platform !== null) {
        item.platform = platform;
      }

      // Idea Merit (select)
      const ideaMerit = props['Idea Merit']?.select?.name;
      if (ideaMerit) item.idea_merit = ideaMerit;

      // Tags (multi_select)
      const tags = (props.Tags?.multi_select ?? []).map(t => t.name);
      if (tags.length > 0) item.tags = tags;

      // Idea Description (text)
      const ideaDesc = (props['Idea Description']?.rich_text ?? []).map(b => b.plain_text).join('');
      if (ideaDesc) item.idea_description = ideaDesc;

      // Publication date
      const pubDate = props['Pub Date']?.date?.start;
      if (pubDate) item.pub_date = pubDate;

      // Published checkbox
      if (props.Published?.checkbox) item.published = true;

      // Draft Doc Link / Post URL
      const draftLink = props['Draft Doc Link']?.url;
      if (draftLink) item.draft_doc_link = draftLink;
      const postUrl = props['Post URL']?.url;
      if (postUrl) item.post_url = postUrl;

      item.created_at = result.created_time;
      item.edited_at = result.last_edited_time;
      item.url = notionUrl(result);
      return item;
    });

  // Build by_stage counts — only stages that actually occur
  const by_stage = {};
  for (const item of items) {
    if (item.stage) {
      by_stage[item.stage] = (by_stage[item.stage] ?? 0) + 1;
    }
  }

  return { by_stage, items };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const token = await loadToken();

  // Resolve output directory relative to script location (D-08)
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const outputDir = join(scriptDir, '..', '.dashboard-data');
  await mkdir(outputDir, { recursive: true });

  // ── Tasks ──
  const taskResults = await queryDataSource(token, DATA_SOURCES.tasks, {
    filter: {
      property: 'Status',
      status: { does_not_equal: 'Done' },
    },
    sorts: [{ property: 'Due', direction: 'ascending' }],
  });
  const tasksSnapshot = transformTasks(taskResults);
  await writeAtomic(join(outputDir, 'tasks.json'), tasksSnapshot);

  // ── Projects ──
  const projectResults = await queryDataSource(token, DATA_SOURCES.projects, {
    filter: {
      and: [
        {
          or: [
            { property: 'Status', status: { equals: 'Work Doing' } },
            { property: 'Status', status: { equals: 'Doing' } },
            { property: 'Status', status: { equals: 'Ongoing' } },
          ],
        },
        {
          property: 'Archived',
          checkbox: { equals: false },
        },
      ],
    },
  });
  const projectsSnapshot = transformProjects(projectResults);
  await writeAtomic(join(outputDir, 'projects.json'), projectsSnapshot);

  // ── Newsletter ──
  // Fetch ALL items (no server-side status filter — client-side filter applied in transform)
  const newsletterResults = await queryDataSource(token, DATA_SOURCES.newsletter, {});
  const newsletterSnapshot = transformNewsletter(newsletterResults);
  await writeAtomic(join(outputDir, 'newsletter.json'), newsletterSnapshot);

  // Success summary
  const { active_count: ta, overdue_count: to, due_soon_count: td } = tasksSnapshot;
  const { active_count: pa } = projectsSnapshot;
  const ni = newsletterSnapshot.items.length;
  process.stdout.write(
    `notion-sync OK: tasks=${ta} active (${to} overdue, ${td} due-soon, ${tasksSnapshot.items.length} written), projects=${pa}, newsletter=${ni} items\n`
  );
}

main().catch((err) => {
  process.stderr.write(`notion-sync error: ${err.message}\n`);
  process.exit(1);
});
