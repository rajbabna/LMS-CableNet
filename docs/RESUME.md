[← Back to START-HERE](./START-HERE.md)

# 🔖 Resume Point — Read This First When You're Back

**Repo:** https://github.com/rajbabna/LMS-CableNet (GitHub Pages live site)
**Last confirmed push:** `main`, commit `9288079` — clean tree, all synced.

---

## Where we are now

The platform is **live and fully functional** on GitHub Pages. Supabase project
`mantjzpfhikezztonrga` (email/password auth, email confirmation OFF) is wired in.

**Roles & access:**
- **Admin** — `REDACTED` — creates accounts, enrolls students, assigns
  instructors to courses, approves nothing (self-signup is removed).
- **Instructor** — `REDACTED` — sees only assigned courses; enrolls
  students in them.
- **Students** — `REDACTED`, `REDACTED` — see enrolled courses for
  full access; unenrolled courses in **Preview mode** (module list visible, resources +
  completion locked).

## What's built (all working)

- ✅ Dynamic landing page (`index.html` + `js/load-courses.js`) — login-aware status
  (Registration open / Awaiting approval / Preview available / Enrolled / Staff access),
  single "Log in to access" CTA.
- ✅ Auth (`login.html` + `js/auth-guard.js`) — sign-in only; admin creates all accounts
  via the dashboard (GoTrue `signUp` + `add_student` RPC, approved immediately).
- ✅ Instructor/admin dashboard (`instructor-dashboard.html`) — course filter from
  `get_my_courses()`, student enrollment, admin-only course-assignment UI, add-account
  form (hidden for instructors).
- ✅ Student dashboard (`student-dashboard.html` + `js/progress/student-dashboard.js`) —
  all courses with "Preview only" badges + progress tracking.
- ✅ Course pages (`course-cabling.html`, `course-networking.html`) — module loading,
  preview locking (`<body data-course>`, `authGuardReady`, `data-enrolled`),
  `deriveCourseFromUrl()` fallback.
- ✅ SQL/RPCs — schema through `sql/24`; RPCs: `add_student`, `get_my_courses`,
  `get_course_instructors`, `assign_instructor`, `get_admin_overview`,
  `approve_instructor`, `set_profile_role` (demotion-guarded), etc.
- ✅ Progress tracking — `module_completions` + `course_progress_view`; orphaned rows
  cleaned.

## Important gotchas

- **Three local copies** must stay in sync: `LMS - V2.0` (git source of truth),
  `Sites\WEB`, `Sites\GitHub Web\cable-net-courses`. Push → GitHub Pages rebuilds in
  ~1–3 min; hard-refresh/incognito to beat browser cache.
- **Email confirmation is OFF** to avoid `429 over_email_send_rate_limit`. `confirmed_at`
  is a generated column; only `email_confirmed_at` is updatable.
- **No self-signup** — `pending.html` was deleted; unapproved users land on `index.html`.
- **`set_profile_role` cannot demote** an existing admin/instructor (sql/24 guard).

## Future work (parked)

- **Course content** — real module materials (PDF/video/interactive) for the
  `modules` table; see `docs/content/` for the interactive-content plan
  (quizzes, simulators, scenarios — steps 07–11).
- Certificates, admin module manager, stalled-student reports.

---

**First file to open:** [START-HERE.md](./START-HERE.md) — full index. This file just
tells you where things stand.
