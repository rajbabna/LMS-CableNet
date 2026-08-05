# Cable&Net Courses — LMS

A live, database-driven learning management system for cable & networking training.
Course content, modules, students, instructors, and progress are all managed through
Supabase — no hardcoding.

**Live site:** https://rajbabna.github.io/LMS-CableNet

---

## AI token usage & cost report

This project is developed with an AI coding assistant (opencode). The report below
shows the workload's token usage and what it **would have cost** if the same sessions
had been billed on paid subscription tiers of DeepSeek, Gemini, ChatGPT and Claude —
converted to Mauritian Rupees (1 USD = 47.04 MUR).

![Token usage & cost chart](token-cost-chart.svg)

| Provider       | Type  | Model              | Cost (USD) | Cost (MUR) |
|----------------|-------|--------------------|-----------:|-----------:|
| DeepSeek       | Free  | v4-flash-free      | $0.00      | Rs 0.00    |
| DeepSeek       | Paid  | v4-flash           | $3.99      | Rs 187.59  |
| DeepSeek       | Paid  | v4-pro             | $11.13     | Rs 523.46  |
| Gemini         | Free  | Flash free tier    | $0.00      | Rs 0.00    |
| Gemini         | Paid  | 2.5 Flash-Lite     | $5.17      | Rs 243.05  |
| Gemini         | Paid  | 3.5 Flash          | $138.41    | Rs 6,510.74|
| Gemini         | Paid  | 3.1 Pro            | $109.90    | Rs 5,169.47|
| ChatGPT (OpenAI)| Paid | GPT-4o-mini        | $22.68     | Rs 1,066.88|
| ChatGPT (OpenAI)| Paid | GPT-5.6 Luna       | $10.99     | Rs 516.95  |
| ChatGPT (OpenAI)| Paid | GPT-5.6 Terra      | $109.90    | Rs 5,169.47|
| ChatGPT (OpenAI)| Paid | GPT-5.6 Sol        | $274.74    | Rs 12,923.67|
| Claude         | Free  | (no free tier)     | $0.00      | Rs 0.00    |
| Claude         | Paid  | Haiku 4.5          | $53.31     | Rs 2,507.63|
| Claude         | Paid  | Sonnet 5 (intro)   | $106.62    | Rs 5,015.26|
| Claude         | Paid  | Opus 5             | $266.54    | Rs 12,538.16|

> Full interactive report with per-session breakdown, timestamps and live-updating
> numbers: [token-cost-report.html](https://rajbabna.github.io/LMS-CableNet/token-cost-report.html)

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

Test-account emails and passwords are kept out of this public repo — see the internal
beta-test kit on the owner's machine for credentials.

## Deploy

The site auto-deploys on push to `main` (GitHub Pages, ~1–3 min rebuild).
Three local copies must stay in sync — `LMS - V2.0` is the git source of truth;
mirrors live in `Sites\WEB` and `Sites\GitHub Web\cable-net-courses`.

See `docs/RESUME.md` and `docs/START-HERE.md` for the current project state and
parked future work (course content, certificates, admin module manager).
