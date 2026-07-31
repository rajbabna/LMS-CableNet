[← Back to START-HERE](./START-HERE.md)

# 🔖 Resume Point — Read This First When You're Back

**Repo:** https://github.com/rajbabna/LMS-CableNet
**Last confirmed push:** `main → main`, commit `3084a43..3a1ebc6` — clean, all docs + `supabase-client.js` + both CSS files pushed.

---

## Where we left off

We were working through a step-by-step plan, one step at a time. **Step 1 (git baseline) is done.** Next up is **Step 2**.

## The Plan

1. ✅ **Git repo baseline** — committed & pushed
2. ⏳ **Build HTML files** — none exist yet (`index.html`, `course-cabling.html`, `course-networking.html`, `login.html`, `pending.html`). These will be built fresh against `css/style.css`, not adapted from old versions.
3. ⏳ **Fix the console error** — "Supabase client not initialized" / suspected ES-version issue. Deferred until HTML files exist to test against.
4. ⏳ **`h1` clarification** — still unresolved whether "edit the h1" meant the visual style (already done in `style.css`) or the literal text content (e.g. "CABLE&NET COURSES"). Ask before touching this.
5. ⏳ **Schema documentation gap** — live Supabase project has 9 tables; only `courses`, `modules`, and `profiles` (partially) are documented. Need column-level detail on: `enrollments`, `instructor_enrollments`, `course_progress`, `module_completions`, `student_progress`, `instructor_student_progress`, `stalled_overrides`, `student_audit_log`.

## Known, not yet resolved

- `css/progress-tracking-styles.css` is a **later-stage feature** (progress bars, "Mark Complete" button, toast notifications) tied to the progress-tracking tables above — not part of core theming. Don't confuse it with `style.css`, which is the actual done theme.
- `sql/01-supabase-schema.sql` exists in the repo but its contents haven't been reviewed against the 9 live tables yet.

## What to say when you resume

Something like: *"Continuing from RESUME.md — let's do Step 2, building the HTML files."*

---

**First file to open:** [START-HERE.md](./START-HERE.md) — it's the full index. This file just tells you where in the plan you stopped.
