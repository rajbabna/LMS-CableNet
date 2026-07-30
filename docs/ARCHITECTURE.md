[← Back to START-HERE](./START-HERE.md)

# Architecture — System Design & Data Flow

## Overview

Cable&Net Courses separates **content** (what courses/modules exist, their text, their links) from **code** (the HTML/JS that renders them). Content lives in Supabase; code just asks Supabase "what's here right now?" and renders whatever comes back.

```
Supabase (database)  →  JS loaders (fetch + render)  →  Browser (student sees page)
```

![Workflow Diagram](./workflow-diagram.png)

---

## The Documented Core (courses + modules)

This is the part fully covered by the other guides in `/docs`:

| Layer | Piece | Responsibility |
|---|---|---|
| Data | `courses` table | One row per course: id, title, description, port_number |
| Data | `modules` table | One row per lesson: course_id, module_number, title, content_type, content_url |
| Logic | `js/load-courses.js` | Queries `courses`, renders cards into `index.html` |
| Logic | `js/load-modules.js` | Queries `modules` filtered by `course_id`, renders list into course pages |
| Logic | `js/supabase-client.js` | Initializes the Supabase client (URL + publishable key) used by every loader |
| Logic | `js/auth-guard.js` | Gates course pages — checks logged in + approved before rendering |
| Presentation | `index.html` | Landing page, empty `.ports` container populated by `load-courses.js` |
| Presentation | `course-cabling.html`, `course-networking.html` | Empty `.module-list` container populated by `load-modules.js` |

See [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) for courses and [MODULES-IMPLEMENTATION-GUIDE.md](./MODULES-IMPLEMENTATION-GUIDE.md) for modules.

---

## ⚠️ Known Gap: Extended Schema Not Yet Documented

A live look at the Supabase Table Editor for this project (`cablenet`) shows more tables than the documentation above currently accounts for:

| Table | Likely purpose (inferred from name only) |
|---|---|
| `profiles` | Confirmed — one row per user: `id`, `email`, `full_name`, `approved`, `created_at`, `role` (e.g. "student") |
| `enrollments` | Which student is enrolled in which course |
| `instructor_enrollments` | Which instructor is assigned to which course |
| `course_progress` | Per-student progress at the course level |
| `module_completions` | Which modules a student has completed |
| `student_progress` | Likely a rollup/view of progress across modules |
| `instructor_student_progress` | Instructor-facing view of student progress |
| `stalled_overrides` | Likely manual overrides for students flagged as stalled/inactive |
| `student_audit_log` | Likely an audit trail of student account/progress changes |

**This table only lists names seen in the screenshot — column-level detail hasn't been confirmed for anything except `profiles`.** Nothing above should be treated as final until each table's actual columns are reviewed. This system already appears to have progress tracking, roles, and enrollment management built — well beyond the "not tracked yet" note in `SYSTEM-SUMMARY.md`'s "Next Steps" section, which should be revisited once this is confirmed.

**Confirmed, not just inferred:** `css/progress-tracking-styles.css` already exists and implements progress bars, a "Mark Complete" button, and toast notifications — this is real front-end evidence that the `module_completions` / `course_progress` / `student_progress` tables are an active feature, not leftover scaffolding.

**Recommended next step:** export or screenshot each table's column list (not just the table name) so this section can be filled in properly, ideally as its own `SCHEMA.md` rather than folded into this file.

---

## Security Model

- **Public landing page** — anyone can see course names; queries a read-only `courses` table
- **Protected course pages** — `auth-guard.js` checks the user is logged in and `profiles.approved = true` before rendering
- **Row-level security** — Supabase RLS policies exist on `profiles` (2 policies shown in the dashboard) and likely on the other tables; policy contents haven't been reviewed here
- **Publishable key** — `js/supabase-client.js` uses the `sb_publishable_...` key, which is designed to be exposed client-side; the `service_role` key must never appear in any file that ships to the browser

---

## Folder Structure (as confirmed so far)

```
/
├── docs/                       ← all documentation (this folder)
├── css/
│   ├── style.css                        ← full design system (colors, type, layout) — done
│   └── progress-tracking-styles.css     ← progress bars, complete button, toasts — in progress
├── js/
│   ├── supabase-client.js      ← configured ✅
│   ├── load-courses.js
│   └── load-modules.js
├── sql/
│   └── 01-supabase-schema.sql
└── (no HTML files yet — index.html, course-*.html, login.html, pending.html
     will be built fresh, not adapted from prior versions)
```

---

## Related Docs

- [SYSTEM-SUMMARY.md](./SYSTEM-SUMMARY.md) — full overview
- [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) — courses setup
- [MODULES-IMPLEMENTATION-GUIDE.md](./MODULES-IMPLEMENTATION-GUIDE.md) — modules setup
- [MODULES-QUICK-REFERENCE.md](./MODULES-QUICK-REFERENCE.md) — day-to-day cheat sheet
