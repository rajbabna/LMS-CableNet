# Cable&Net Courses — LMS

A live, database-driven learning management system for cable & networking training.
Course content, modules, students, instructors, and progress are all managed through
Supabase — no hardcoding.

**Live site:** https://rajbabna.github.io/LMS-CableNet

---

## Features

- **Dynamic landing page** — course cards load from Supabase with login-aware status
  (Access by invitation / Awaiting approval / Preview available / Enrolled / Access expired /
  Staff access) and a single "Log in to access" CTA.
- **Auth (email/password)** — sign-in only; the **admin creates all accounts** from the
  dashboard (no self-signup, no `pending.html`).
- **Roles** — admin, instructor, student. Instructors see only their assigned courses;
  admins get the full account/enrollment/assignment UI.
- **Preview mode** — students can view any course (module titles/descriptions) but
  resources and "Mark Complete" stay locked unless they're enrolled.
- **Time-limited enrollment** — the admin picks an access window per student
  (24h / 7 / 30 / 90 / 180 days / lifetime). When `enrollments.expires_at` passes, the
  student is downgraded to preview/expired automatically across the site.
- **Progress tracking** — `module_completions` + `course_progress_view` drive student
  progress bars.
- **Course assignment** — admin assigns instructors to courses via `assign_instructor`;
  dropdowns/filters populate from `get_my_courses()`.
- **Mentor sessions** — (retired from UI, schema kept for optional future use) the
  `mentor_sessions` table + RPCs still exist but there is no logging form or timeline
  shown anymore; the instructor dashboard button now opens the student's **AI Chats** view.
- **AI Mentor (Ask the Mentor)** — a floating chat widget on the course pages powered by
  Puter's keyless AI layer (`js/ai-mentor.js`). Course-aware study buddy that explains and
  guides; clearly labeled as an AI assistant; requires connectivity and a free Puter sign-in.
  Chat **topic summaries are always captured** (`mentor_ai_sessions`, never raw messages;
  disclosed in the widget) so instructors can improve the course; instructors see them on
  the student profile and an aggregate activity panel on the instructor dashboard.

## Tech

- Static HTML/CSS/JS served on **GitHub Pages**
- **Supabase** (PostgreSQL + Auth) via the UMD `supabase-js` client (`js/config.js`)
- RPCs in `sql/` (run `01` → `27` in the Supabase SQL Editor in order)

## Project layout

```
index.html                  dynamic landing page
login.html                  sign-in only
student-dashboard.html      student dashboard (all courses + progress)
instructor-dashboard.html   instructor/admin dashboard
student-profile.html        instructor mentor log for one student (timeline + form)
course-cabling.html         course page (preview-locked)
course-networking.html      course page (preview-locked)
js/                         config, client, loaders, auth-guard, progress, mentor-sessions
css/                        design system + progress styles
sql/                        01–27: schema, RPCs, triggers, cleanup scripts
docs/                       documentation + future interactive-content plan
```

## Accounts (dev)

| Role | Email | Password |
|------|-------|----------|
| Admin | REDACTED | REDACTED |
| Instructor | REDACTED | REDACTED |
| Student | REDACTED | REDACTED |
| Student | REDACTED | REDACTED |

## Deploy

The site auto-deploys on push to `main` (GitHub Pages, ~1–3 min rebuild).
Three local copies must stay in sync — `LMS - V2.0` is the git source of truth;
mirrors live in `Sites\WEB` and `Sites\GitHub Web\cable-net-courses`.

See `docs/RESUME.md` and `docs/START-HERE.md` for the current project state and
parked future work (course content, certificates, admin module manager).
