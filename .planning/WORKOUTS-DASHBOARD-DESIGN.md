# Workouts Dashboard — Design & Requirements (Phase 7 input)

**Status:** Design proposal / research foundation, ready for `/gsd-discuss-phase 7`
**Author:** Drafted with Claude, 2026-06-07
**Relationship to prior work:** This phase reuses the Phase 3 pipeline pattern verbatim (external Node sync script → compact JSON snapshots in `<vault>/.dashboard-data/` → plugin reads + renders). See `NOTION-PIPELINE-DESIGN.md` for the established architecture. Phase 7 adds one new sync target group (the workout databases) and one new dashboard page (Workouts) with charts and aggregations.

> **Purpose of this document.** Give the gsd-planning agent a complete, verified picture of the Notion workout data so it does **not** need to re-explore via MCP/API. Every property name below is verbatim from the live schema (sampled 2026-06-07). Schemas, data-quality gotchas, the aggregation algorithms, and proposed data contracts are all here. The planning agent should validate the open questions in §10 and turn §9 into plans.

---

## 1. What the user wants (scope)

A new **Workouts page** in the ClaudeOS Obsidian dashboard with three capabilities:

1. **Progress trends over time** — for a given exercise, plot weight and volume across sessions so progression is visible. Also support strength/bodyweight overlays.
2. **Workout history listing** — list workouts performed by date, filterable by properties on the session (e.g. workout type / phase, difficulty/RIR, location, mesocycle).
3. **Muscle-group set volume** — count sets per muscle group over a chosen window (e.g. 1 month), aggregated per workout and rolled up across weeks, with trends. Worked example from the user:

   > In one workout: 3 sets bench press (chest + triceps) + 4 sets tricep extension (triceps only) = **3 sets chest, 7 sets triceps** for that workout. Aggregate this across whole workouts and across multiple weeks to see totals and trends.

This is the standard "weekly sets per muscle group" hypertrophy-tracking metric. It is the most logic-heavy part of the phase and the reason this research doc exists.

---

## 2. The workout data model in Notion

There are **five real databases** plus one timeline DB and a body-measurement DB. They live under the `Workout DBs` page (`1e74f78c980480b89e0fc870ed56109e` → under Databases → LifeOS). Critically, **the training tables are linked by Notion relations, but the mesocycle/measurement tables are NOT — they join only by date.**

```
🗄️Workout Schedule  (one row per SESSION, holds the Date)
        │  Exercises  ◀──relation──▶  Workout Log
        ▼
🗄️Workout Logbook   (one row per SESSION × EXERCISE line: Sets/Reps/Weight)
        │  Exercise   ◀──relation──▶  Workout
        ▼
🗄️Exercises         (catalog; Prime muscle → relation, Secondary muscle → TEXT)
        │  Prime muscle ◀──relation──▶ Excercises (sic)
        ▼
🗄️Muscles Groups    (catalog of muscle names)

🗄️Mesocycle timeline   (date-range blocks; NO relation — date-join only)
🗄️JS measurements      (bodyweight/metrics time-series; NO relation — date-join only)
```

### Data source IDs (for the REST sync script — strip `collection://`, use as `/v1/data_sources/{id}/query`)

| Database | Data source UUID | DB page id |
|---|---|---|
| 🗄️Workout Schedule (sessions) | `065624dc-9a59-45ce-9465-41023102df25` | `d929b85f5b96470f89bc2b9bac534271` |
| 🗄️Workout Logbook (exercise lines) | `9975dd7c-65af-4639-ae63-e35b2df159c1` | `e8c0510927f54105ae8aec953baff67a` |
| 🗄️Exercises (catalog) | `7bde7692-e1a6-44d3-8cf1-9420bd3da08a` | `9ee5727e-4ab8-43c4-9ca5-4e7080cdec13` |
| 🗄️Muscles Groups (catalog) | `518d9626-0074-43a8-9b32-2e47474f31b3` | `7972ebb016d5466e84d0ce0946e4aadc` |
| 🗄️Mesocycle timeline | `914a59ce-4069-44ca-b335-0cd325ca2f35` | `5da201f0e1974a75973c3c0a64779acb` |
| 🗄️JS measurements (bodyweight) | `636c8c04-8a87-490d-9574-cc2478a187fa` | `16d4f78c980480279e9dceb837d62f7d` |

> Add these to `Notion LifeOS/notion-ids.md` — they were not previously documented there.

---

## 3. Full schemas (verbatim property names)

### 3.1 🗄️Workout Schedule — the session record (grain: one workout on a date)

| Property (verbatim) | Type | Notes / options |
|---|---|---|
| `Name` | title | Session name, e.g. `Hyp-25-Push-C-1`, `Hyp-25-Pull-C-060326`. **Encodes phase/split in the string** (`Hyp`=hypertrophy block, `Push`/`Pull`/`Full`/`Arms`=split, `25`=year, trailing block/letter/date). There is no structured split/phase field — it must be parsed from `Name` or joined to the mesocycle by date. |
| `Date` | date (date-only) | **The authoritative workout date.** No time component. |
| `Time` | text | e.g. `"19:30"`, `"8:30"` |
| `Location` | text | e.g. `"UFC"` |
| `Energy level at start /10` | number | e.g. `8` |
| `Difficulty` | multi-select | `3-4RIR`, `2RIR`, `1RIR`, `0RIR`, `maint mode`, `Easy`, `Medium`, `Hard` |
| `WO results ` (**trailing space in name**) | multi-select | `Pump`, `Feel good`, `DOMS`, `joint pain`, `None` |
| `Exercises` | relation → Workout Logbook | Links session to its logbook lines. (Confusingly named — it points at the Logbook, not the Exercises catalog.) |
| `URL` (`userDefined:URL`) | url | Usually empty |

There is **no Tags property** and **no rollup/formula** on the session. The "tags" the user wants to filter by are effectively: `Difficulty`, `WO results `, `Location`, the parsed `Name` tokens, and the date-joined mesocycle `WO Type`/`Focus`.

### 3.2 🗄️Workout Logbook — the exercise line (grain: one exercise within one session)

**This is the table all aggregation runs on.**

| Property (verbatim) | Type | Notes |
|---|---|---|
| `Note` | title | Free-text note, e.g. `"wide grip"`, `"45* still DOMS from Sunday"` |
| `Sets` | number | Single integer, e.g. `4`. **This is the number summed for set-counting.** |
| `Reps` | number | Single integer = reps per set (not total reps) |
| `Weight` | number | Single number. **Unit-agnostic** — no lb/kg field. Value is exercise-dependent (machine stack number, dumbbell lbs, barbell total, or `1` placeholder for bodyweight). See §4. |
| `RIR` | multi-select | `3-4RIR`, `2RIR`, `1RIR`, `0RIR` |
| `Done` | checkbox | **Unreliable** — sampled rows on completed sessions still read `NO`. Do not filter on this. |
| `Duration` | text | Usually empty |
| `Exercise` | relation → Exercises catalog | One exercise per line. The join key for muscle attribution. |
| `Workout Log` | relation → Workout Schedule | Back-link to the session (and therefore the date). |
| `Volume` | formula | `Sets × Reps × Weight` — a proxy for total work that normalizes effort (e.g. 1×10×100 ≈ 1×11×90). An approximation, handy for per-exercise trend analysis. Pull from REST; recompute as fallback. |
| `1RM` | formula | Estimated 1-rep max from Weight & Reps. |
| `Best Weight` | formula | Max weight for that exercise. |
| `Date` | rollup | Pulls the session `Date` onto the line (so lines can be grouped by date directly). |
| `Date Rollup` | formula | Date helper derived from the rollup. |
| `Muscle Group` | rollup | Rolls up `Prime muscle` from the related Exercise. |
| `2nd Muscle Group` | rollup | Rolls up `Secondary muscle` from the related Exercise (sparse — see §4). |

### 3.3 🗄️Exercises — the catalog

| Property (verbatim) | Type | Notes |
|---|---|---|
| `Name` | title | Exercise name |
| `Prime muscle` | relation → Muscles Groups | **PRIMARY muscle(s). Structured and reliable.** Can hold multiple (Deadlift → Hamstrings + Lower Back; Smith Squat → Quadriceps + Glutes). |
| `Secondary muscle` | **text (plain string)** | **Not a relation. Mostly empty.** When present it's freeform lowercase (Deadlift = `"back"`). Cannot be joined; no weighting. See §4. |
| `Workout` | relation → Workout Logbook | All logbook lines for this exercise |
| `Best Weight` | rollup (max of logbook Weight) | |
| `Last Workout` | rollup (latest logbook date) | |
| `Days Ago` | formula | Days since last performed |
| `Workout Date` | date | Largely unused |
| `rating` | text | Subjective grade, e.g. `"S"`, `"A"`, `"B"` |
| `Notes` | text | |
| `URL` (`userDefined:URL`) | url | |

### 3.4 🗄️Muscles Groups — the catalog

| Property (verbatim) | Type | Notes |
|---|---|---|
| `Name` | title | Muscle group name |
| `Excercises` (**misspelled**) | relation → Exercises | Inverse of `Prime muscle` |

**All muscle groups present:** Chest, Back, Lower Back, Shoulders, Side Delt, Biceps, Triceps, Quadriceps, Hamstrings, Glutes, Calves, Traps, Abs, Cardio, knee. (Note: `Shoulders` and `Side Delt` both exist and may overlap; `Cardio` and `knee` are non-muscle entries that should be filtered or bucketed.)

### 3.5 🗄️Mesocycle timeline — phase blocks (date-join only)

| Property (verbatim) | Type | Notes |
|---|---|---|
| `Name` | title | e.g. `"Strength1-Full"`, `"Hyp1-Full"` |
| `Date` | date **range** | Block start → end. The only key linking a block to sessions. |
| `Focus` | text | e.g. `"Full"` |
| `WO Type` | text | e.g. `"Strength"`, `"Hypertrophy"` |
| `Status` | status | `Not started`, `In progress`, `Burned out`, `Met goals`, `Stalled` |

A session belongs to whichever mesocycle's date range contains its `Date`. **No relation exists** — attribution is a date-range lookup.

### 3.6 🗄️JS measurements — body metrics (date-join only)

| Property (verbatim) | Type | Notes |
|---|---|---|
| `Measurement` | title | Metric name, almost always `"Weight"` (bodyweight) |
| `Number` | number | The value, e.g. `152.6` |
| `Text` | text | Optional note (e.g. `"Dehydrated?"`) |
| `Date` | date | Single date |

Useful as a bodyweight trend overlay and for relative-strength (lift weight ÷ bodyweight). Joins to training data only by date.

### Not databases (ignore as data sources)

- **💪 Workout Focus view** (`1e74f78c-9804-8098-bdf3-c50e57029d47`) — a linked **view** of Workout Schedule, no own data source.
- **Workout Program** (`3574f78c-9804-805f-86b3-eb678ebdcd50`) — a row in the **Projects DB** tracking the build-out of this app, not training data.

---

## 4. Data-quality findings that drive the design

These are the non-obvious constraints the planning agent must design around. They are the main value of this research.

1. **MCP cannot expand rollups/formulas; REST can.** Via the Notion MCP `fetch`, `Volume`/`1RM`/`Best Weight` return `formulaResult://…` handles and `Muscle Group`/`Date` rollups return `<omitted/>`. The **REST API** (`POST /v1/data_sources/{id}/query`, `Notion-Version: 2025-09-03`) returns computed `formula` and `rollup` values in the property payload. The sync script (REST) can therefore read `Volume`, `1RM`, and the `Date` rollup directly. **However, the `Muscle Group` rollup rolls up a relation, so via REST it returns an array of relation references (IDs), not muscle names** — they'd still need resolving against the Muscles Groups catalog. Recommendation in §6: don't rely on the logbook rollups for muscle attribution; compute it in the script from the Exercises catalog, which gives full control.

2. **`Weight` has no unit and is exercise-specific.** A line can read `Weight=20` (dumbbell), `165` (machine), `380` (leg press), or `1` (bodyweight placeholder). **Consequence: you cannot sum or compare `Weight` or `Volume` across different exercises.** Weight/volume trends must be **per-exercise** (the user asked for exactly this — "trends … of weight and volume per exercise"). The only metric that aggregates cleanly across exercises is **set count**, which is unit-free — which is why muscle-group volume is measured in sets, not tonnage.

3. **Secondary-muscle data is sparse and unstructured.** `Secondary muscle` is free text, almost always empty, no weighting. But the user's own worked example *requires* secondary attribution (bench → triceps). So the set-per-muscle-group feature needs an **enrichment layer**: a curated `exercise → {primary[], secondary[]}` map maintained in the app (seeded from `Prime muscle`, hand-filled for secondary). See §6.3. Relying on Notion's secondary field alone will undercount triceps/shoulders/etc.

4. **`Done` is unreliable.** Completed sessions show `Done = NO`. Use the session `Date` and presence of `Reps`/`Weight` to decide whether a line counts, not `Done`.

5. **Incomplete lines exist.** Some logbook rows have `Sets` but blank `Reps`/`Weight` (planned-but-not-done, or quick notes). Define an inclusion rule (e.g. count a line's sets only if `Sets > 0`; count its volume only if `Reps` and `Weight` are both present).

6. **Phase/split lives in a string.** No structured split field. Session `Name` = `<TemplateName>-<MMDDYY>`; the string before the trailing `MMDDYY` date is the template name, and tokens `Push`/`Pull`/`Full`/`Arms`/`Hyp`/`Str` within it act as filter/display tags (§10 Q6). Mesocycle `WO Type`/`Focus` is also available via date-join as a coarser phase label.

7. **Volume is small.** Sessions, lines, exercises are each well under a few hundred rows; mesocycles go back to early 2024. One-to-three REST pages per database. No performance concern; the script can pull the full history every run.

---

## 5. Proposed dashboard views (Workouts page)

One new `workouts` page with sub-sections (tabs or stacked panels — planning agent decides). Reuse existing `StatusTile`/`TileGrid`/list-row components; add a charting lib (see §8 open question on chart rendering inside Obsidian).

**A. Muscle-group set volume (the headline view)**
- Selectable time window (default last 28 days; presets 7/14/28 days, "this mesocycle", custom).
- Bar chart: total sets per muscle group over the window.
- Weekly trend: stacked/line chart of sets per muscle group per ISO week, to see whether weekly volume per muscle is trending up/down and sitting in a target range.
- Optional per-session breakdown table (the user's worked example view: one workout → sets per muscle group).
- Toggle: **primary-only** vs **primary + secondary** attribution; and full (1.0) vs fractional (e.g. 0.5) secondary weighting.

**B. Exercise progression**
- Pick an exercise → line chart of `Weight` and `Volume` over time (per-exercise, units consistent within the exercise). Optional `1RM` estimate line and a bodyweight overlay from JS measurements for relative strength.
- Small-multiples / "recent PRs" tile: best weight and best estimated 1RM per exercise.

**C. Workout history**
- Reverse-chronological list of sessions: date, parsed type/split, difficulty/RIR, location, # exercises, total sets, (per-exercise units prevent a meaningful total-volume column across exercises — show total sets instead).
- Filters: by parsed split (Push/Pull/Full/Arms), by `Difficulty`, by `WO results `, by mesocycle, by date range.
- Click-through to the Notion session page.

**D. Context strip (optional)**
- Current mesocycle (date-joined): name, WO Type, Focus, Status, days remaining.
- Bodyweight trend sparkline from JS measurements.

---

## 6. Aggregation logic (the core algorithms)

All aggregation happens in the **sync script** at fetch time, writing pre-computed snapshots. The plugin stays a pure display layer (project principle). Recompute fully each run — data is small.

### 6.1 Build the joined line records

For each Logbook line, produce a flat record by resolving relations:

```
line = {
  date:        session.Date            // via Workout Log relation → Schedule.Date
  session_id, session_name,
  exercise_id, exercise_name,          // via Exercise relation → Exercises.Name
  sets:   line.Sets,
  reps:   line.Reps,
  weight: line.Weight,
  volume: line.Volume (REST formula) OR sets*reps*weight if null,
  est_1rm: line.1RM (REST formula),
  primary_muscles:   exerciseMuscleMap[exercise].primary,    // see 6.3
  secondary_muscles: exerciseMuscleMap[exercise].secondary,
}
```

Inclusion rule: keep a line for set-counting if `sets > 0`; include in volume/weight series only if `reps != null && weight != null`.

### 6.2 Set-counting per muscle group (the user's headline metric)

The user wants each set to count **fully** toward every muscle the exercise trains (primary and secondary), matching the worked example (bench 3 sets → +3 chest AND +3 triceps). Algorithm:

```
for each line:
    muscles = primary_muscles ∪ secondary_muscles          // dedup
    for m in muscles:
        weight_factor = 1.0 if m in primary_muscles
                        else SECONDARY_WEIGHT   // default 1.0; configurable to 0.5
        bucket[window][m] += line.sets * weight_factor
```

Worked example check (default weights, secondary=1.0):
- Bench Press, 3 sets, primary=[Chest], secondary=[Triceps] → Chest +3, Triceps +3
- Tricep Extension, 4 sets, primary=[Triceps], secondary=[] → Triceps +4
- **Totals: Chest 3, Triceps 7.** ✓ Matches the user's expectation exactly.

Aggregate at three grains, all from the same per-line pass:
- **per session** (`bucket` keyed by session) — the "this workout" breakdown,
- **per ISO week** (`YYYY-Www`) — the weekly-sets-per-muscle trend,
- **per window total** — the headline bar chart (sum weeks in range).

> Design note on secondary weighting: full (1.0) double-counts assistance work, which inflates triceps/shoulders/etc. Offer the fractional option (0.5) and primary-only as toggles, but **default to 1.0** because that reproduces the user's stated mental model. Document the tradeoff in the UI tooltip.

### 6.3 The exercise → muscle map (enrichment layer)

Because `Secondary muscle` in Notion is unusable (free text, mostly blank), maintain a resolved map the script consumes:

```
exercise-muscle-map.json   // committed in OS-Dashboard, hand-maintainable
{
  "<exercise_id or normalized name>": {
     "primary":   ["Chest"],          // seeded from Notion Prime muscle relation
     "secondary": ["Triceps","Shoulders"]   // hand-filled; Notion secondary is sparse
  }
}
```

Build rule: the script seeds `primary` from each exercise's `Prime muscle` relation (resolved to muscle names via the Muscles Groups catalog) automatically every run. `secondary` is read from this override file; if an exercise is missing, fall back to parsing Notion's `Secondary muscle` text (split on commas/spaces, case-insensitive match to known muscle names), else empty. The build phase seeds `secondary` from a standard exercise reference for the user's exercise list (§10 Q4), not blank. **Keep `Side Delt`→and `Shoulders` as separate buckets — no merging.** Drop `Cardio`/`knee` from muscle-volume math.

This keeps primary attribution always-correct-from-source while letting the user improve secondary coverage over time without touching Notion. Alternative considered: clean up the Notion `Secondary muscle` field into a proper relation. Rejected for now — out of scope, slower, and the app shouldn't depend on a Notion schema migration. (Flag for the user as a possible future improvement.)

### 6.4 Per-exercise weight/volume trend

Group included lines by `exercise_id`, sort by date, emit `{date, weight, volume, est_1rm}` series. Keep units within-exercise only (never sum across exercises). Provide a list of exercises with ≥ N sessions so the UI dropdown only shows trackable ones.

### 6.5 Mesocycle & bodyweight date-joins

- Tag each session with its mesocycle by finding the timeline row whose `Date` range contains the session date. Emit `meso_name`, `wo_type`, `focus`.
- Bodyweight series: pass through JS measurements where `Measurement == "Weight"`, sorted by date, for overlay and relative-strength.

---

## 7. Snapshot/sync design (extends Phase 3)

Add the workout pull to the existing pattern. Two reasonable shapes — planning agent picks:

- **Option A (recommended): one `notion-workouts-sync.mjs`** sibling to `notion-sync.mjs`, writing several snapshot files. Keeps workout logic isolated; the existing Notion/Projects sync stays untouched. The Refresh button on the Workouts page runs this script.
- **Option B:** extend `notion-sync.mjs` with the workout queries. Fewer scripts, but couples unrelated syncs and bloats one file.

**Queries (REST, `2025-09-03`):** Schedule (all, sort `Date` desc), Logbook (all), Exercises (all), Muscles Groups (all), Mesocycle timeline (all), JS measurements (`Measurement == "Weight"`). Resolve relations client-side in the script (all six tables are small enough to hold in memory and join by ID).

**Output snapshots** (in `<vault>/.dashboard-data/`, atomic writes, each with `generated_at`):

| File | Contents |
|---|---|
| `workouts-muscle-volume.json` | per-window totals, per-week series, per-session breakdown, by muscle group |
| `workouts-exercises.json` | per-exercise progression series (weight/volume/1RM), PR tiles |
| `workouts-sessions.json` | session list with parsed split, difficulty, results, location, mesocycle tag, total sets |
| `workouts-meta.json` | current mesocycle, bodyweight series, muscle-group list, last-synced |

**Refresh model: manual-only (§10 Q7).** A single Refresh button on the Workouts page runs the script on demand (user syncs ~weekly). No scheduled/automatic sync. All window, filter, and attribution-toggle math runs **locally** against the snapshots between refreshes — so the script must emit enough granularity for client-side recompute: the per-week-per-muscle matrix (re-sum any window), per-session breakdowns, and the per-exercise series. The plugin makes zero API calls; only the script does, only when the button is pressed.

---

## 8. Data contracts (proposed `types.ts` additions)

```ts
export interface SnapshotMeta { generated_at: string; }

export interface MuscleWeekCell { week: string; muscle: string; sets: number; }
export interface SessionMuscleBreakdown {
  session_id: string; date: string; name: string;
  sets_by_muscle: Record<string, number>;
}
export interface MuscleVolumeSnapshot extends SnapshotMeta {
  muscles: string[];                       // ordered display list (Cardio/knee excluded)
  weekly: MuscleWeekCell[];                // per ISO week per muscle — UI re-sums any window
  by_session: SessionMuscleBreakdown[];
  window_default_days: number;             // e.g. 28
  secondary_weight: number;                // attribution weight used (default 1.0)
}

export interface ExercisePoint { date: string; weight: number|null; volume: number|null; est_1rm: number|null; }
export interface ExerciseSeries {
  exercise_id: string; name: string;
  primary: string[]; secondary: string[];
  best_weight: number|null; best_1rm: number|null;
  points: ExercisePoint[];
}
export interface ExercisesSnapshot extends SnapshotMeta { exercises: ExerciseSeries[]; }

export interface SessionRow {
  session_id: string; date: string; name: string;
  template?: string;                       // Name minus trailing MMDDYY date (e.g. "Hyp-25-Push-C")
  tags: string[];                          // tokens matched in Name: Push/Pull/Full/Arms/Hyp/Str
  difficulty: string[]; results: string[]; location?: string;
  meso_name?: string; total_sets: number; url: string;
}
export interface SessionsSnapshot extends SnapshotMeta { sessions: SessionRow[]; }

export interface BodyPoint { date: string; value: number; }
export interface WorkoutsMetaSnapshot extends SnapshotMeta {
  current_meso?: { name: string; wo_type: string; focus: string; status: string; end: string; };
  bodyweight: BodyPoint[];
}
```

Add settings paths (default `.dashboard-data/<name>.json`): `workoutsMuscleVolumePath`, `workoutsExercisesPath`, `workoutsSessionsPath`, `workoutsMetaPath`, plus `muscleWindowDays` (default 28) and `secondaryMuscleWeight` (default 1.0).

---

## 9. Suggested implementation waves (planning agent to evaluate)

**Wave 1 — Sync script + joins (no plugin changes).** Write `notion-workouts-sync.mjs`: the six REST queries, in-memory relation joins, the §6 aggregations, atomic snapshot writes. Seed the auto primary-muscle map from `Prime muscle`. Verify by running by hand and inspecting JSON against the worked example (Chest 3 / Triceps 7). De-risks the whole phase.

**Wave 2 — Enrichment map.** Create `exercise-muscle-map.json` with primary auto-seeded and secondary hand-filled for the most-used exercises; wire the fallback chain (override → Notion text parse → empty). Re-verify totals.

**Wave 3 — Types + settings + read wiring.** Add §8 contracts, settings paths, `readJsonFile` hookups, no-data states.

**Wave 4 — Workouts page UI.** New `PageId`/nav entry; Chart.js charts (muscle-group bars + weekly trend, per-exercise progression) with interactive tooltips/legend toggles; session history table with filters (template, tags, difficulty, mesocycle, date range); window presets and attribution toggle driving local recompute; manual Refresh button cloning the existing `execFile` state machine to run the workouts sync. Mesocycle/bodyweight context strip. Sanitize all Notion-sourced strings before render (SEC-01). UAT against the §11 worked-example test.

> No scheduling wave — refresh is manual-only by design (§10 Q7).

---

## 10. Resolved decisions (confirmed by user 2026-06-07)

All open questions are now answered. These are locked; the planning agent should build to them.

1. **Charting library — `Chart.js` (bundled via esbuild).** User wants interactive charts with toggles/filters, doesn't care about implementation. Chart.js gives interactive tooltips and native legend-click series toggling out of the box; the window/filter/attribution toggles are React UI driving the data feed. (uPlot is lighter but needs more hand-wiring for interactivity; ECharts is heavier. Chart.js is the balance.) Keep it the only chart dependency; sanitize any label strings sourced from Notion before they reach the chart.
2. **Secondary-muscle attribution = 1.0 (full).** Confirmed default. Still expose a primary-only toggle in the UI (cheap, useful for comparison), but ship 1.0 as the default and the only weighting that needs to be correct.
3. **`Side Delt` and `Shoulders` stay separate buckets.** Do **not** merge. No normalization between them anywhere in the pipeline.
4. **Exercise-muscle map — the build phase seeds it.** Wave 2 auto-seeds `primary` from Notion `Prime muscle` and populates `secondary` from a standard exercise→muscle reference for the user's actual exercise list (not left blank). User edits `exercise-muscle-map.json` over time. Whatever is easier/cleaner to code wins here.
5. **`Volume` — pull from the Notion REST formula, fall back to `Sets×Reps×Weight` if null.** Confirmed: Volume is a `Sets × Reps × Weight` proxy for total work (normalizes e.g. 1×10×100 ≈ 1×11×90). REST returns it directly so there's no reason to recompute, but the fallback keeps lines with a null formula usable. It's an approximation, used for per-exercise trend analysis only (never summed across exercises — see §4.2).
6. **Split/phase parsing — template name = everything before the trailing date.** Session `Name` format is `<TemplateName>-<MMDDYY>` (e.g. `Hyp-25-Push-C-060326`, `Full-26-A-...`). The full string before the trailing `MMDDYY` date token is the **template name** used. Additionally, scan the name for the tokens `Push`/`Pull`/`Full`/`Arms`/`Hyp`/`Str` and surface each present token as a **tag** for filtering/display. Emit both `template` (string before the date) and `tags[]` (matched tokens) on each session row. Some names embed a year like `25`/`26` mid-string — only the **trailing** `MMDDYY` is the session date; strip that, keep the rest as the template name.
7. **Refresh is manual-only; compute locally.** No automatic/scheduled sync. A single manual Refresh button on the Workouts page does the full API pull (user runs it ~weekly). Once pulled into local snapshot tables, all aggregation/window math happens locally with no further API calls. Therefore: emit the per-week-per-muscle matrix and per-line records so the UI can re-sum any window, change attribution toggle, or filter entirely client-side between refreshes. **Drop the scheduling wave** (was Wave 5) — not wanted.
8. **Sync script — Option A: separate `notion-workouts-sync.mjs`.** Confirmed. Workout data updates much less frequently than tasks/projects, so it gets its own script run only on demand, fully decoupled from `notion-sync.mjs`.

---

## 11. Handoff notes

- **Reuse from Phase 3:** `src/utils/readJsonFile.ts` (path-flexible, null-safe), `src/components/ui/SkillButton.tsx` / RefreshButton `execFile` pattern, `SettingsTab.ts` + `ClaudeOSSettings`, the atomic-write + `generated_at` snapshot convention, and the REST query shape (`POST /v1/data_sources/{id}/query`, `Notion-Version: 2025-09-03`, token from outside the synced vault per `NOTION-PIPELINE-DESIGN.md` §4).
- **Notion token:** same integration must be shared with all six workout data sources (Connections → add integration) or queries 404. Per Phase 3 open-Q answer, the integration was "not set up" as of 2026-06-05 — verify it exists and is shared with the Workout DBs before Wave 1 testing.
- **Add to `Notion LifeOS/notion-ids.md`:** the six data-source UUIDs in §2.
- **Verified 2026-06-07:** all property names verbatim from live schema; relation directions confirmed; live logbook row confirms `Sets`/`Reps`/`Weight` as plain numbers and `Volume`/`1RM`/`Muscle Group`/`Date` as formula/rollup handles (MCP-opaque, REST-expandable).
- **Worked-example acceptance test for Wave 1:** a window containing one session of 3 sets bench (Chest/Triceps) + 4 sets tricep extension (Triceps) must produce Chest = 3, Triceps = 7.
```
