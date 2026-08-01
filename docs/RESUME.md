[← Back to START-HERE](./START-HERE.md)

# 🔖 Resume Point — Read This First When You're Back

**Repo:** https://github.com/rajbabna/LMS-CableNet (GitHub Pages live site)
**Last confirmed push:** `main`, commit `2516f0d` — clean tree, all synced.

---

## Where we are now

The platform is **live and fully functional** on GitHub Pages. Supabase project
`mantjzpfhikezztonrga` (email/password auth, email confirmation OFF) is wired in.

**Roles & access:**
- **Admin** — `REDACTED` — creates accounts, enrolls students (with an
  optional access window), assigns instructors to courses, approves nothing (self-signup
  is removed).
- **Instructor** — `REDACTED` — sees only assigned courses; enrolls
  students in them (can also set an access window).
- **Students** — `REDACTED`, `REDACTED` — see enrolled courses for
  full access; unenrolled or **expired** courses show in **Preview mode** (module list
  visible, resources + completion locked).

## What's built (all working)

- ✅ Dynamic landing page (`index.html` + `js/load-courses.js`) — login-aware status
  (Access by invitation / Awaiting approval / Preview available / Enrolled / Access
  expired / Staff access), single "Log in to access" CTA.
- ✅ Auth (`login.html` + `js/auth-guard.js`) — sign-in only; admin creates all accounts
  via the dashboard (GoTrue `signUp` + `add_student` RPC, approved immediately).
- ✅ Instructor/admin dashboard (`instructor-dashboard.html`) — course filter from
  `get_my_courses()`, student enrollment, admin-only course-assignment UI, add-account
  form (hidden for instructors).
- ✅ Student dashboard (`student-dashboard.html` + `js/progress/student-dashboard.js`) —
  all courses with "Preview only"/"Access expired" badges, "Access until {date}" expiry
  line, and progress tracking.
- ✅ Course pages (`course-cabling.html`, `course-networking.html`) — module loading,
  preview locking (`<body data-course>`, `authGuardReady`, `data-enrolled`),
  `deriveCourseFromUrl()` fallback, expired-enrollment banner.
- ✅ **Time-limited enrollment** (`enrollments.expires_at`, sql/26) — admin/instructor
  picks 24h/7/30/90/180d/lifetime per student; expiry downgrades access site-wide
  (dashboard, landing, course pages). Guests are onboarded manually as student accounts
  with a 24-hour window — no self-serve trial.
- ✅ **Mentor sessions** (`mentor_sessions` table, sql/27, `student-profile.html` +
  `js/mentor-sessions.js`) — instructors log per-student check-ins (topic, notes,
  outcome, optional follow-up) with open/resolved tracking. Instructor-only notes;
  co-instructors read-only; students never see them. Reached via a "Mentor" button on
  each row of the instructor dashboard.
- ✅ SQL/RPCs — schema through `sql/27`; RPCs: `add_student` (now with `p_expires_at`),
  `get_my_courses`, `get_course_instructors`, `assign_instructor`, `get_admin_overview`,
  `get_instructor_dashboard` (returns `expires_at`), `log_mentor_session`,
  `get_mentor_sessions_for_student`, `resolve_mentor_followup`, `set_profile_role`
  (demotion-guarded), etc. `get_pending_instructors` / `approve_instructor` were dropped
  (sql/25) — the pending-instructor flow was removed.
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
- **AI Mentor Assistant (Step 15)** — Puter keyless AI chat widget on course pages
  (course context on, topic-summary opt-in logging, AI-labeled). Decisions locked in
  `docs/content/15-...`; needs the AI-layer feasibility test first.
- Certificates, admin module manager, stalled-student reports.

---

**First file to open:** [START-HERE.md](./START-HERE.md) — full index. This file just
tells you where things stand.
