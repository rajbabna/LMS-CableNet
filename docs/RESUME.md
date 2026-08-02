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
- ✅ **Mentor sessions** (`mentor_sessions` table + RPCs, sql/27) — **UI retired** (per
  owner decision: AI Mentor chat summaries give the instructor what they need). The
  timeline + log form on `student-profile.html` and the dashboard "Mentor" button were
  removed; schema, RLS and RPCs remain for optional future use. The dashboard button is
  now "AI Chats" and opens the student's shared AI summaries.
- ✅ **AI Mentor feasibility validated** (`tools/puter-ai-test.html`) — Puter's keyless
  `puter.ai.chat()` works in-browser (streaming, system prompts, testMode, themed
  markdown rendering). Confirms the Step 15 path; build starts next.
- ✅ **AI Mentor widget built** (`js/ai-mentor.js`, on `course-cabling.html` +
  `course-networking.html`) — floating "Ask the Mentor" chat: course-aware persona
  (context from live `modules` table), streaming themed-markdown replies, Puter sign-in
  prompt, offline notice, clearly labeled AI (not a human instructor). Session-only
  conversation; topic-summary logging still pending.
- ✅ **AI Mentor logging built** (`sql/28` + `sql/28b` + widget toggle +
  `student-profile.html` "AI Mentor Chats" timeline + `instructor-dashboard.html`
  "AI Mentor Activity" panel) — per-chat **opt-in** topic summaries only (never raw
  messages), upserted to `mentor_ai_sessions`; admin sees all, instructors see chats for
  their assigned courses. SQL not yet applied to live DB.
- ✅ **AI Mentor sharing boost** (`sql/28b`) — superseded by the final owner decision:
  **capture is always on**. Every real AI chat is saved with course, time, message count
  AND a one-sentence topic summary; the widget discloses this to students ("topics are
  summarized for your instructor… no raw messages kept"). The opt-in toggle, default-ON
  opt-out, and end-of-chat prompt were all removed in favour of always-on capture.
- ✅ SQL/RPCs — schema through `sql/27`; RPCs: `add_student` (now with `p_expires_at`),
  `get_my_courses`, `get_course_instructors`, `assign_instructor`, `get_admin_overview`,
  `get_instructor_dashboard` (returns `expires_at`), `log_mentor_session`,
  `get_mentor_sessions_for_student`, `resolve_mentor_followup`, `set_profile_role`
  (demotion-guarded), etc. `get_pending_instructors` / `approve_instructor` were dropped
  (sql/25) — the pending-instructor flow was removed.
- ✅ Progress tracking — `module_completions` + `course_progress_view`; orphaned rows
  cleaned.
- ✅ **Co-teaching RLS hardening** (`sql/29`, not yet applied live) — the blanket
  `role IN ('admin','instructor')` SELECT policies on `enrollments`,
  `stalled_overrides`, `student_audit_log`, `course_instructors`, and
  `mentor_ai_sessions` let any instructor read ALL rows (all courses) via the REST
  API. Now course-scoped: admin sees all, instructors see only assigned courses
  (students keep own-row). Same scoping the dashboard RPCs already apply — so no UI
  change, just the direct-read path closed. Do the **separate-account test** from
  `docs/content/cablenet-lms-issues-to-flag.md` after applying.
- ✅ **Cache-busting** (`tools/bump-cache-version.ps1`) — content-hash `?v=<md5:8>`
  on every local JS/CSS asset; idempotent; externals untouched. Run before pushing;
  hard-refresh no longer needed for code updates.

## Important gotchas

- **Three local copies** must stay in sync: `LMS - V2.0` (git source of truth),
  `Sites\WEB`, `Sites\GitHub Web\cable-net-courses`. Push → GitHub Pages rebuilds in
  ~1–3 min. Run `tools\bump-cache-version.ps1` before pushing — it versions JS/CSS
  assets (`?v=<hash>`) so no hard-refresh is needed for code updates.
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
