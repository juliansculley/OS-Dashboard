/**
 * notion-workouts-sync.mjs — ClaudeOS Workouts Dashboard Sync Script
 *
 * NOTION INTEGRATION SETUP:
 *
 * 1. Share the 'ClaudeOS Dashboard Sync' integration with all SIX workout databases:
 *    Open each database in Notion → click ••• menu → Connections → add 'ClaudeOS Dashboard Sync'
 *    Databases: Workout Schedule, Workout Logbook, Exercises, Muscles Groups,
 *               Mesocycle timeline, JS measurements
 *    NOTE: Skipping any one database will cause a 404 error for that query.
 *
 * 2. Provide the token via ONE of these methods:
 *    - Set NOTION_TOKEN as a Windows user environment variable, OR
 *    - Create the file %USERPROFILE%\.claudeos\notion.env containing exactly one line:
 *        NOTION_TOKEN=<your-internal-integration-secret>
 *
 * 3. Run the script using the full Node.js path (Node 18+ required):
 *    & "C:\Users\scull\AppData\Local\nvm\v24.12.0\node.exe" scripts\notion-workouts-sync.mjs
 *
 * REQUIREMENTS:
 * - Node 18+ (uses global fetch)
 * - No npm dependencies — uses only Node built-ins: fs/promises, path, os, url
 *
 * OUTPUT SNAPSHOTS (written to <repo>/.dashboard-data/):
 *   workouts-muscle-volume.json  — per-week-per-muscle matrix (both attribution arrays),
 *                                   per-session breakdown, ordered muscle list
 *   workouts-exercises.json      — per-exercise weight/volume/1RM series + PR tiles
 *   workouts-sessions.json       — session list with template, tags, difficulty, results,
 *                                   meso, total_sets, url
 *   workouts-meta.json           — current mesocycle + bodyweight series
 */

import { readFile, writeFile, rename, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

// ─── Valid muscle group names (design §3.4) ───────────────────────────────────
// Used for case-insensitive token matching in Notion secondary text fallback.
const KNOWN_MUSCLES = new Set([
  'Chest', 'Back', 'Lower Back', 'Shoulders', 'Side Delt',
  'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes',
  'Calves', 'Traps', 'Abs',
]);

// Build a lowercase → canonical-case map for fast token matching
const MUSCLE_LOWER_MAP = new Map();
for (const m of KNOWN_MUSCLES) {
  MUSCLE_LOWER_MAP.set(m.toLowerCase(), m);
}

// ─── Node 18+ guard ───────────────────────────────────────────────────────────
if (typeof fetch !== 'function') {
  process.stderr.write(
    `notion-workouts-sync requires Node 18+ (global fetch unavailable). Detected: ${process.version}\n`
  );
  process.exit(1);
}

// ─── Token loading (NOTION-02, T-07-01) ──────────────────────────────────────
// Token is NEVER written to any snapshot or vault file.
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

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = 'https://api.notion.com/v1/data_sources/';
const NOTION_VERSION = '2025-09-03';

// Six workout database data source UUIDs (design §2)
const DATA_SOURCES = {
  schedule:     '065624dc-9a59-45ce-9465-41023102df25',
  logbook:      '9975dd7c-65af-4639-ae63-e35b2df159c1',
  exercises:    '7bde7692-e1a6-44d3-8cf1-9420bd3da08a',
  muscles:      '518d9626-0074-43a8-9b32-2e47474f31b3',
  mesocycles:   '914a59ce-4069-44ca-b335-0cd325ca2f35',
  measurements: '636c8c04-8a87-490d-9574-cc2478a187fa',
};

// Secondary muscle attribution weight (design D2 — default 1.0 full credit)
const SECONDARY_WEIGHT = 1.0;

// Muscles excluded from all muscle-volume math (design §6.3)
const EXCLUDED_MUSCLES = new Set(['Cardio', 'knee']);

// Tags parsed from session Name (design §10 Q6)
const SESSION_TAG_TOKENS = ['Push', 'Pull', 'Full', 'Arms', 'Hyp', 'Str'];

// ─── Query helper (paginated POST, T-07-03) ───────────────────────────────────
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

// ─── Atomic write helper (stamps generated_at) ───────────────────────────────
async function writeAtomic(finalPath, obj) {
  const stamped = { ...obj, generated_at: new Date().toISOString() };
  const json = JSON.stringify(stamped, null, 2);
  const tmpPath = `${finalPath}.tmp`;
  await writeFile(tmpPath, json, 'utf-8');
  await rename(tmpPath, finalPath);
}

// ─── ISO week helper ─────────────────────────────────────────────────────────
// Returns "YYYY-Www" for a given date string "YYYY-MM-DD"
function isoWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00Z');
  // Thursday in current week decides the year (ISO 8601)
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + 3);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  const year = thursday.getUTCFullYear();
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

// ─── Date-only extraction helper ─────────────────────────────────────────────
function dateOnly(dateObj) {
  if (!dateObj) return null;
  // Notion date may be a string like "2026-05-12" or "2026-05-12T..."
  const s = typeof dateObj === 'string' ? dateObj : dateObj.start ?? '';
  return s ? s.substring(0, 10) : null;
}

// ─── Today as YYYY-MM-DD ──────────────────────────────────────────────────────
function todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Session name parsing (design §10 Q6) ────────────────────────────────────
// template = Name with the trailing MMDDYY date token stripped.
// Only the trailing 6-digit token is the session date; mid-string numbers stay.
// tags[] = tokens from SESSION_TAG_TOKENS present in the full name.
function parseSessionName(name) {
  const template = name.replace(/-?\d{6}$/, '').replace(/-$/, '');
  const tags = SESSION_TAG_TOKENS.filter(tok => name.includes(tok));
  return { template, tags };
}

// ─── Mesocycle date-join ──────────────────────────────────────────────────────
// Returns the mesocycle row whose Date range contains targetDate (YYYY-MM-DD).
function findMesocycle(mesoRows, targetDate) {
  if (!targetDate) return null;
  for (const row of mesoRows) {
    const dateRange = row.properties?.Date?.date;
    if (!dateRange) continue;
    const start = dateOnly(dateRange.start);
    const end = dateOnly(dateRange.end ?? dateRange.start);
    if (start && end && targetDate >= start && targetDate <= end) {
      return row;
    }
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const token = await loadToken();

  // Resolve output directory relative to script location
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const outputDir = join(scriptDir, '..', '.dashboard-data');
  await mkdir(outputDir, { recursive: true });

  // ── Load exercise-muscle-map.json (T-07-04: graceful degradation) ───────────
  // Keys are normalized exercise names (lowercase + trim).
  // If the file is absent or unparseable, secondary attribution falls back to
  // Notion text parse or empty — script must never crash here.
  let exerciseMuscleOverride = {};
  try {
    const mapPath = join(scriptDir, 'exercise-muscle-map.json');
    const mapText = await readFile(mapPath, 'utf-8');
    exerciseMuscleOverride = JSON.parse(mapText);
  } catch {
    process.stderr.write(
      'exercise-muscle-map.json not found or unparseable — secondary muscle attribution will fall back to Notion text\n'
    );
    exerciseMuscleOverride = {};
  }

  // ── Step 1: Fetch all six data sources ──────────────────────────────────────
  process.stdout.write('Fetching workout data from Notion...\n');

  const [scheduleRows, logbookRows, exerciseRows, muscleRows, mesoRows, measurementRows] =
    await Promise.all([
      queryDataSource(token, DATA_SOURCES.schedule, {
        sorts: [{ property: 'Date', direction: 'descending' }],
      }),
      queryDataSource(token, DATA_SOURCES.logbook, {}),
      queryDataSource(token, DATA_SOURCES.exercises, {}),
      queryDataSource(token, DATA_SOURCES.muscles, {}),
      queryDataSource(token, DATA_SOURCES.mesocycles, {}),
      queryDataSource(token, DATA_SOURCES.measurements, {}),
    ]);

  // ── Step 2: Build lookup maps ─────────────────────────────────────────────
  // muscles map: id → name
  const muscleMap = new Map();
  for (const row of muscleRows) {
    const name = row.properties?.Name?.title?.[0]?.plain_text ?? '';
    if (name) muscleMap.set(row.id, name);
  }

  // sessions map: id → { date, name }
  const sessionMap = new Map();
  for (const row of scheduleRows) {
    const date = dateOnly(row.properties?.Date?.date);
    const name = row.properties?.Name?.title?.[0]?.plain_text ?? '';
    sessionMap.set(row.id, { date, name, row });
  }

  // exercises map: id → { name, primary[], secondary_text }
  // primary[] is resolved from Prime muscle relation → muscle names via muscleMap
  const exerciseMap = new Map();
  for (const row of exerciseRows) {
    const name = row.properties?.Name?.title?.[0]?.plain_text ?? '';
    const primaryRelations = row.properties?.['Prime muscle']?.relation ?? [];
    const primary = primaryRelations
      .map(r => muscleMap.get(r.id))
      .filter(Boolean);
    // Secondary muscle is plain text (design §3.3, §4.3) — stored for fallback chain
    const secondary_text = row.properties?.['Secondary muscle']?.rich_text
      ?.[0]?.plain_text ?? '';
    exerciseMap.set(row.id, { name, primary, secondary_text });
  }

  // ── Step 3: Build exercise→muscle map (design §6.3, 07-02 enrichment) ───────
  // Primary: always from Notion Prime muscle relation (authoritative, never overridden).
  // Secondary: three-step fallback chain (design §6.3 build rule):
  //   1. exercise-muscle-map.json override file (keyed by normalized name)
  //   2. Notion Secondary muscle plain-text parse (split on commas/whitespace,
  //      case-insensitive match against KNOWN_MUSCLES set)
  //   3. empty []
  function resolveExerciseMuscles(exerciseId) {
    const ex = exerciseMap.get(exerciseId);
    if (!ex) return { primary: [], secondary: [] };

    const primary = ex.primary.filter(m => !EXCLUDED_MUSCLES.has(m));

    // Normalize exercise name for map lookup
    const normalizedName = ex.name.toLowerCase().trim();

    // Step 1: check override map
    const override = exerciseMuscleOverride[normalizedName];
    if (override && Array.isArray(override.secondary) && override.secondary.length > 0) {
      return { primary, secondary: override.secondary.filter(m => !EXCLUDED_MUSCLES.has(m)) };
    }

    // Step 2: parse Notion Secondary muscle text (sparse free text)
    if (ex.secondary_text && ex.secondary_text.trim()) {
      const tokens = ex.secondary_text.split(/[\s,]+/).filter(Boolean);
      const matched = [];
      for (const tok of tokens) {
        const canonical = MUSCLE_LOWER_MAP.get(tok.toLowerCase());
        if (canonical && !EXCLUDED_MUSCLES.has(canonical)) {
          matched.push(canonical);
        }
      }
      if (matched.length > 0) {
        return { primary, secondary: matched };
      }
    }

    // Step 3: empty
    return { primary, secondary: [] };
  }

  // ── Step 4: Join logbook lines (design §6.1) ──────────────────────────────
  const joinedLines = [];

  for (const row of logbookRows) {
    const props = row.properties;

    // Resolve Workout Log relation → session
    const sessionRelations = props?.['Workout Log']?.relation ?? [];
    if (sessionRelations.length === 0) continue;
    const sessionEntry = sessionMap.get(sessionRelations[0].id);
    if (!sessionEntry) continue;
    const sessionDate = sessionEntry.date;
    const sessionName = sessionEntry.name;
    const session_id = sessionRelations[0].id;

    // Resolve Exercise relation → exercise
    const exerciseRelations = props?.Exercise?.relation ?? [];
    if (exerciseRelations.length === 0) continue;
    const exercise_id = exerciseRelations[0].id;
    const exerciseEntry = exerciseMap.get(exercise_id);
    if (!exerciseEntry) continue;
    const exercise_name = exerciseEntry.name;

    // Plain number fields
    const sets = props?.Sets?.number ?? 0;
    const reps = props?.Reps?.number ?? null;
    const weight = props?.Weight?.number ?? null;

    // Formula fields (REST-expanded, fall back to computed)
    const volumeFormula = props?.Volume?.formula?.number ?? null;
    const volume = volumeFormula !== null ? volumeFormula
      : (sets > 0 && reps !== null && weight !== null) ? sets * reps * weight : null;
    const est_1rm = props?.['1RM']?.formula?.number ?? null;

    // Muscle attribution
    const { primary: primaryMuscles, secondary: secondaryMuscles } =
      resolveExerciseMuscles(exercise_id);

    joinedLines.push({
      session_id,
      session_date: sessionDate,
      session_name: sessionName,
      exercise_id,
      exercise_name,
      sets,
      reps,
      weight,
      volume,
      est_1rm,
      primary_muscles: primaryMuscles,
      secondary_muscles: secondaryMuscles,
    });
  }

  // ── Step 5: Muscle-group set counting (design §6.2) ───────────────────────
  // Three grains: per-session, per ISO week, window total.
  // Emit BOTH weekly_with_secondary (default, secondary at SECONDARY_WEIGHT)
  // and weekly_primary_only (only primary contributions).
  // This is the array swap the UI attribution toggle uses (design research Pitfall 6).

  const setsBySession = new Map();           // session_id → muscle → sets
  const setsByWeekWith = new Map();          // "YYYY-Www" → muscle → sets (with secondary)
  const setsByWeekPrimary = new Map();       // "YYYY-Www" → muscle → sets (primary only)
  const allMuscles = new Set();

  for (const line of joinedLines) {
    // Inclusion rule: only count lines where Sets > 0
    if (line.sets <= 0) continue;
    if (!line.session_date) continue;

    const week = isoWeek(line.session_date);
    const sid = line.session_id;

    // Initialize maps
    if (!setsBySession.has(sid)) setsBySession.set(sid, new Map());
    if (!setsByWeekWith.has(week)) setsByWeekWith.set(week, new Map());
    if (!setsByWeekPrimary.has(week)) setsByWeekPrimary.set(week, new Map());

    const sessionBucket = setsBySession.get(sid);
    const weekWithBucket = setsByWeekWith.get(week);
    const weekPrimaryBucket = setsByWeekPrimary.get(week);

    // Union primary ∪ secondary (dedup)
    const muscleUnion = new Set([...line.primary_muscles, ...line.secondary_muscles]);

    for (const muscle of muscleUnion) {
      if (EXCLUDED_MUSCLES.has(muscle)) continue;
      allMuscles.add(muscle);

      const isPrimary = line.primary_muscles.includes(muscle);
      const factor = isPrimary ? 1.0 : SECONDARY_WEIGHT;
      const contribution = line.sets * factor;

      // Per-session
      sessionBucket.set(muscle, (sessionBucket.get(muscle) ?? 0) + contribution);

      // Per-week with secondary
      weekWithBucket.set(muscle, (weekWithBucket.get(muscle) ?? 0) + contribution);

      // Per-week primary only (no secondary contribution)
      if (isPrimary) {
        weekPrimaryBucket.set(muscle,
          (weekPrimaryBucket.get(muscle) ?? 0) + line.sets
        );
      }
    }
  }

  // Build ordered muscle list (display order, Cardio/knee excluded — already excluded above)
  const muscleDisplayOrder = [
    'Chest', 'Back', 'Lower Back', 'Shoulders', 'Side Delt',
    'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings', 'Glutes',
    'Calves', 'Traps', 'Abs',
  ];
  const orderedMuscles = [
    ...muscleDisplayOrder.filter(m => allMuscles.has(m)),
    ...[...allMuscles].filter(m => !muscleDisplayOrder.includes(m)).sort(),
  ];

  // Build MuscleWeekCell[] arrays (design §8)
  const weekly_with_secondary = [];
  const weekly_primary_only = [];
  for (const [week, muscleBucket] of setsByWeekWith) {
    for (const [muscle, sets] of muscleBucket) {
      weekly_with_secondary.push({ week, muscle, sets });
    }
  }
  for (const [week, muscleBucket] of setsByWeekPrimary) {
    for (const [muscle, sets] of muscleBucket) {
      weekly_primary_only.push({ week, muscle, sets });
    }
  }

  // Build by_session array (SessionMuscleBreakdown[])
  const by_session = [];
  for (const schedRow of scheduleRows) {
    const sid = schedRow.id;
    const bucket = setsBySession.get(sid);
    if (!bucket) continue;
    const date = dateOnly(schedRow.properties?.Date?.date);
    const name = schedRow.properties?.Name?.title?.[0]?.plain_text ?? '';
    const sets_by_muscle = Object.fromEntries(bucket);
    by_session.push({ session_id: sid, date, name, sets_by_muscle });
  }
  // Sort descending by date
  by_session.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  // ── Step 6: Per-exercise series (design §6.4) ─────────────────────────────
  const exerciseSeriesMap = new Map(); // exercise_id → ExerciseSeries

  for (const line of joinedLines) {
    // Inclusion rule for volume/weight series: reps and weight must be non-null
    const hasVolumeData = line.reps !== null && line.weight !== null;
    if (!line.session_date) continue;

    if (!exerciseSeriesMap.has(line.exercise_id)) {
      const { primary, secondary } = resolveExerciseMuscles(line.exercise_id);
      exerciseSeriesMap.set(line.exercise_id, {
        exercise_id: line.exercise_id,
        name: line.exercise_name,
        primary,
        secondary,
        best_weight: null,
        best_1rm: null,
        points: [],
      });
    }

    const series = exerciseSeriesMap.get(line.exercise_id);

    if (hasVolumeData) {
      series.points.push({
        date: line.session_date,
        weight: line.weight,
        volume: line.volume,
        est_1rm: line.est_1rm,
      });

      // Track bests
      if (line.weight !== null &&
          (series.best_weight === null || line.weight > series.best_weight)) {
        series.best_weight = line.weight;
      }
      if (line.est_1rm !== null &&
          (series.best_1rm === null || line.est_1rm > series.best_1rm)) {
        series.best_1rm = line.est_1rm;
      }
    }
  }

  // Sort each exercise's points ascending by date (design §6.4)
  const exerciseSeries = [...exerciseSeriesMap.values()];
  for (const series of exerciseSeries) {
    series.points.sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── Step 7: Session rows (design §6 + D6) ────────────────────────────────
  const sessionRows = [];

  // Build per-session total_sets
  const totalSetsBySession = new Map(); // session_id → total sets across all lines
  for (const line of joinedLines) {
    if (line.sets <= 0) continue;
    totalSetsBySession.set(
      line.session_id,
      (totalSetsBySession.get(line.session_id) ?? 0) + line.sets
    );
  }

  for (const row of scheduleRows) {
    const props = row.properties;
    const name = props?.Name?.title?.[0]?.plain_text ?? '';
    const date = dateOnly(props?.Date?.date);

    const { template, tags } = parseSessionName(name);

    // Difficulty (multi-select)
    const difficulty = (props?.Difficulty?.multi_select ?? []).map(o => o.name);

    // WO results — note the TRAILING SPACE in the property name (design §3.1)
    const results = (props?.['WO results ']?.multi_select ?? []).map(o => o.name);

    // Location
    const location = props?.Location?.rich_text?.[0]?.plain_text ?? undefined;

    // Mesocycle date-join (design §6.5)
    const mesoRow = findMesocycle(mesoRows, date);
    const meso_name = mesoRow
      ? (mesoRow.properties?.Name?.title?.[0]?.plain_text ?? undefined)
      : undefined;

    const total_sets = totalSetsBySession.get(row.id) ?? 0;
    const url = notionUrl(row);

    sessionRows.push({
      session_id: row.id,
      date: date ?? '',
      name,
      template,
      tags,
      difficulty,
      results,
      location,
      meso_name,
      total_sets,
      url,
    });
  }
  // Already sorted descending from API sort

  // ── Step 8: Meta snapshot (design §6.5, §8) ──────────────────────────────
  const today = todayString();
  const currentMesoRow = findMesocycle(mesoRows, today);
  let current_meso;
  if (currentMesoRow) {
    const mp = currentMesoRow.properties;
    const dateRange = mp?.Date?.date;
    current_meso = {
      name: mp?.Name?.title?.[0]?.plain_text ?? '',
      wo_type: mp?.['WO Type']?.rich_text?.[0]?.plain_text ?? '',
      focus: mp?.Focus?.rich_text?.[0]?.plain_text ?? '',
      status: mp?.Status?.status?.name ?? '',
      end: dateOnly(dateRange?.end ?? dateRange?.start) ?? '',
    };
  }

  // Bodyweight series — measurements where Measurement == "Weight" (design §3.6)
  const bodyweight = measurementRows
    .filter(row => {
      const measureName = (row.properties?.Measurement?.title?.[0]?.plain_text ?? '').trim();
      return measureName === 'Weight';
    })
    .map(row => ({
      date: dateOnly(row.properties?.Date?.date) ?? '',
      value: row.properties?.Number?.number ?? null,
    }))
    .filter(p => p.date && p.value !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Step 9: Write four atomic snapshots ───────────────────────────────────

  // workouts-muscle-volume.json (MuscleVolumeSnapshot)
  const muscleVolumeSnapshot = {
    muscles: orderedMuscles,
    weekly_with_secondary,   // default attribution (secondary at SECONDARY_WEIGHT)
    weekly_primary_only,     // primary-only attribution (for UI attribution toggle)
    by_session,
    window_default_days: 28,
    secondary_weight: SECONDARY_WEIGHT,
  };

  // workouts-exercises.json (ExercisesSnapshot)
  const exercisesSnapshot = {
    exercises: exerciseSeries,
  };

  // workouts-sessions.json (SessionsSnapshot)
  const sessionsSnapshot = {
    sessions: sessionRows,
  };

  // workouts-meta.json (WorkoutsMetaSnapshot)
  const metaSnapshot = {
    ...(current_meso ? { current_meso } : {}),
    bodyweight,
  };

  await Promise.all([
    writeAtomic(join(outputDir, 'workouts-muscle-volume.json'), muscleVolumeSnapshot),
    writeAtomic(join(outputDir, 'workouts-exercises.json'), exercisesSnapshot),
    writeAtomic(join(outputDir, 'workouts-sessions.json'), sessionsSnapshot),
    writeAtomic(join(outputDir, 'workouts-meta.json'), metaSnapshot),
  ]);

  // ── Success summary ────────────────────────────────────────────────────────
  const sessionCount = scheduleRows.length;
  const lineCount = logbookRows.length;
  const exerciseCount = exerciseSeries.length;
  const muscleCount = orderedMuscles.length;
  process.stdout.write(
    `notion-workouts-sync OK: sessions=${sessionCount}, lines=${lineCount}, exercises=${exerciseCount}, muscles=${muscleCount}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`notion-workouts-sync error: ${err.message}\n`);
  process.exit(1);
});
