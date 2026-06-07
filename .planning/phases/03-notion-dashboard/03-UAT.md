# Phase 03 — UAT Checklist

**Phase:** 03-notion-dashboard  
**Status:** Complete — UAT signed off 2026-06-06  
**Automated score:** 18/18 must-haves passed  
**Items requiring Obsidian:** 5

---

## Human Verification Items

### UAT-01 — Refresh state machine
**Where:** Projects page → Refresh button  
**Steps:**
1. Click Refresh
2. Observe button transitions: idle → loading (spinner) → success ("Synced") → idle (after 3 s)
3. Confirm "Last synced HH:mm" label updates after success

**Pass criteria:** All three states render correctly; timestamp updates

---

### UAT-02 — Overdue / due-soon CSS emphasis
**Where:** Projects page → "Overdue & Due Soon" section  
**Steps:**
1. Confirm the section appears only when there are overdue or due-soon tasks
2. Confirm overdue rows render with `emphasis="overdue"` styling (red/warning color)
3. Confirm due-soon rows render with `emphasis="due-soon"` styling (amber/caution color)
4. If all tasks are future-dated, confirm the section is hidden entirely

**Pass criteria:** Visual emphasis matches task urgency; section absent when no urgent tasks

---

### UAT-03 — NewsletterPage stage filtering and sort
**Where:** Newsletter page  
**Steps:**
1. Open Newsletter page
2. Confirm stage summary shows only stages with at least one item (zero-count stages absent)
3. Confirm stages are sorted alphabetically
4. Confirm "Published" and "Deleted" stages are excluded

**Pass criteria:** Stage counts accurate; no zeros; correct exclusions

---

### UAT-04 — No-data vs error state copy
**Where:** Projects page and Newsletter page  
**Steps:**
1. With valid paths configured: confirm data renders normally
2. (Optional) Clear a snapshot path in Settings → confirm "No project data / Set the path…" copy appears
3. (Optional) Set a path to a non-existent file → confirm "Couldn't read projects / Check the path…" copy appears

**Pass criteria:** Correct empty-state copy shown for each condition

---

### UAT-05 — Notion deep links
**Where:** Projects page (project rows and task rows) and Newsletter page (item rows)  
**Steps:**
1. Click any project name in the Projects section
2. Confirm it opens the correct Notion page in the default browser
3. Click any task name in the Tasks section — confirm same
4. Click any newsletter item — confirm same

**Pass criteria:** Links open correct Notion pages in browser (not in Obsidian)

---

## Results (2026-06-06)

| Item | Result | Notes |
|------|--------|-------|
| UAT-01 | Deferred | Sync appears to run ("Synced" shown) but timestamp does not update — known worktree/path split issue; resolves after branch merge |
| UAT-02 | Pass | Overdue/due-soon CSS emphasis and section visibility correct |
| UAT-03 | Pass | Stage filtering, sort, and exclusions correct |
| UAT-04 | Skip | — |
| UAT-05 | Pass | Notion deep links open correct pages in browser |

## Sign-off

Phase 3 complete. UAT accepted with UAT-01 deferred (known issue, resolves on merge).
