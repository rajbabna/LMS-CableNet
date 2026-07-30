[← Back to START-HERE](./START-HERE.md) · Quick start version: [README-DYNAMIC-SETUP.md](./README-DYNAMIC-SETUP.md)

# Dynamic Course Loading - Step-by-Step Guide

## What You're Getting

The course cards on your landing page load from your Supabase `courses` table instead of being hardcoded in HTML.

**Before:** Courses were hardcoded in `index.html`. To add/change anything, you'd edit the HTML file.
**After:** Courses come from Supabase. You manage them in the database, zero code changes.

---

## Files Involved

| File | What It Does |
|------|---|
| `index.html` | Landing page, has an empty `<section class="ports"></section>` container |
| `js/load-courses.js` | Fetches and renders courses from Supabase into that container |
| `js/supabase-client.js` | Initializes the Supabase client both loaders depend on |

---

## How It Works (30-Second Overview)

1. Visitor opens `index.html`
2. Page loads, runs `js/load-courses.js`
3. Script queries: `SELECT * FROM courses ORDER BY port_number`
4. Supabase returns the course rows
5. Script loops through them, creates a card for each, inserts into `.ports`
6. Visitor sees a fully populated landing page, all from the database

---

## Setup

### 1. Confirm the `courses` table exists

Supabase → Table Editor → `courses`. Expected columns:

```sql
CREATE TABLE courses (
  id TEXT PRIMARY KEY,           -- "cabling", "networking"
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  port_number INT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

### 2. Confirm `index.html` has the empty container

```html
<section class="ports"></section>
<script src="js/supabase-client.js"></script>
<script src="js/load-courses.js"></script>
```

`supabase-client.js` must load **before** `load-courses.js`, since the loader depends on the client it creates.

### 3. Confirm `js/supabase-client.js` is configured

This is already done for this project — see `js/supabase-client.js`, which has the live project URL and publishable key set.

---

## Now You Can...

### ✅ Add a Course

1. Supabase → **Table Editor** → **courses**
2. Insert row
3. Fill in `id`, `title`, `description`, `port_number`
4. Save → refresh landing page → new card appears

### ✅ Edit a Course

1. Supabase → **Table Editor** → **courses**
2. Click the cell → edit → Enter
3. Refresh page → change appears

### ✅ Remove a Course

1. Supabase → **Table Editor** → **courses**
2. Right-click row → Delete row
3. Refresh page → card gone

### ✅ Reorder Courses

Change `port_number`. Cards render in that order. Refresh to see the new order.

---

## Troubleshooting

### Q: Course cards don't appear
**A:**
1. Open DevTools (F12) → Console
2. Look for errors — most common:
   - `supabaseClient is not defined` → `supabase-client.js` isn't loading before `load-courses.js`
   - `Cannot read properties of null` → the `.ports` container is missing from `index.html`
3. Check the `courses` table actually has rows

### Q: I see a blank landing page with no error
**A:** Check the `courses` table isn't empty, and check `port_number` values aren't all NULL (NULL sorts unpredictably).

### Q: How do I change a course's title?
**A:** Supabase → Table Editor → courses → click the `title` cell → edit → Enter. Appears within seconds on refresh.

---

## Testing Checklist

- [ ] Opened `index.html` in a browser
- [ ] Course cards appear (matching `courses` table row count)
- [ ] Titles/descriptions match Supabase data
- [ ] Added a test course row → refreshed → new card appeared
- [ ] Edited a course title → refreshed → change appeared
- [ ] Deleted the test course → refreshed → card gone

---

## What's Next?

- Modules for each course work the same way — see [MODULES-IMPLEMENTATION-GUIDE.md](./MODULES-IMPLEMENTATION-GUIDE.md)
- For the bigger picture (security model, full folder layout, and the extended schema found in this project's Supabase), see [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Key Takeaway

Courses are pure data. Add, edit, reorder, or remove them from Supabase — no HTML edits, no redeploy.
