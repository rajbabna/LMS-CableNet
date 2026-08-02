# Achievements — Cable&Net Courses LMS

A summary of everything built, fixed, and shipped so far on the LMS project.
Live at: **https://rajbabna.github.io/LMS-CableNet/** (GitHub Pages, `main` branch of
`rajbabna/LMS-CableNet`; hard-refresh after each push to bypass cache).

---

## 1. Core learning platform

- **Role-based auth** — admin / instructor / student, email + password, email
  confirmation disabled. Sign-in routes users to the right dashboard by role.
- **Profiles & role badges** — one `profiles` row per user with `role` + `approved`;
  color-coded badges (Admin = copper, Instructor = teal, Student = blue).
- **Live courses & modules** — two live courses with dynamic content from the
  Supabase `modules` table:
  - **PORT 01 — Level 1 Network Foundations: Cabling & Infrastructure** (4 modules)
  - **PORT 02 — Level 2 Network Operations: Configuration & Troubleshooting** (4 modules)
- **Access control (`js/auth-guard.js`)** — course pages only render for logged-in,
  approved students; enrollment is checked per course (preview / enrolled / expired).
- **Time-limited enrollment** — admin/instructor sets an access window (24h → 180d or
  lifetime) via `enrollments.expires_at`; lapsed students downgrade to preview.
- **Progress tracking** — module completion and per-student progress via
  `course_progress`, `module_completions`, and the instructor-facing progress view.
- **Dashboards** — student dashboard (enrolled courses + progress) and instructor/admin
  dashboard (per-course students, progress bars, access status, stalled flag, enrollment
  management, course-instructor assignments, admin system overview, audit log).
- **Deployment** — static site pushed to GitHub Pages; Supabase (Postgres + RLS + RPCs)
  is the data layer, accessed with a publishable (client-safe) key only.

## 2. Networking quiz

- A themed **15-question MCQ pool**; each attempt deals **5 random questions**.
- Hosted **same-origin** on GitHub Pages (`tools/basic-network-quiz.html`) and
  CTA-linked from the landing page — one Puter sign-in covers both the quiz and the
  AI Mentor widget (origin-scoped sessions don't carry across domains).
- Score persistence via Puter KV when the student is signed in; per-attempt feedback
  with explanations. Landing page shows a compact "Test your networking basics" card.

## 3. Step 14 — Mentor sessions *(UI retired, schema kept)*

- Built a full mentor-session system: `mentor_sessions` table, RLS policies, and RPCs
  (`log_mentor_session`, `get_mentor_sessions_for_student`, `resolve_mentor_followup`),
  plus a student profile page with timeline + log form and follow-up tracking.
- **Owner decision:** the UI was retired because the AI Mentor chat summaries now give
  the instructor everything needed. The table + RPCs remain in the database (sql/27)
  for optional future use. The dashboard button now opens the student's **AI Chats** view.
- Fixed en route: the classic `42702 "column reference id is ambiguous"` bug (RETURNS
  TABLE output column shadowing `profiles.id`) and a 42P13 parameter-ordering error.

## 4. Step 15 — AI Mentor Assistant ("Ask the Mentor")

The flagship recent feature — a course-aware AI study buddy inside the course pages.

- **Feasibility validated** first (`tools/puter-ai-test.html`): Puter's keyless
  `puter.ai.chat()` works in-browser (streaming, system prompts, test mode, themed
  markdown rendering) with a free per-student Puter sign-in (User-Pays model).
- **Floating chat widget** (`js/ai-mentor.js`) on both course pages:
  - Persona is a friendly, patient, strictly on-topic study buddy.
  - **Course context** is injected from the live `modules` table so answers stay
    aligned with the curriculum.
  - Streaming replies rendered as themed markdown; clearly labelled
    "AI assistant — not a human instructor"; no grading authority.
  - Sign-in bar, offline notice, error handling; conversation lives in memory only.
- **Instructor visibility (final: always-on capture):**
  - Every real AI mentor chat is saved to `mentor_ai_sessions` (sql/28 + sql/28b) with
    course, time, message count, and a **one-sentence topic summary** — so the instructor
    can improve course delivery. **Topic summaries only, never raw messages.**
  - The widget discloses this to students: *"Chat topics are summarized for your
    instructor so they can improve the course. No raw messages are kept."*
  - Earlier sharing models (opt-in toggle → default-ON opt-out + end-of-chat prompt) were
    iterated and replaced by this always-on decision; `topic_summary` is nullable only as
    a safety net for legacy rows.
  - Instructors see results in two places: the **AI Mentor Chats** timeline on the
    student's profile page (`get_ai_mentor_sessions_for_student`) and the **AI Mentor
    Activity** panel on the instructor dashboard (`get_ai_mentor_topic_overview`,
    per-course chat counts + latest summary). Co-teaching scoping: admins see all,
    instructors see only chats for courses they're assigned to.

## 5. Data layer & infrastructure

- SQL migrations through **sql/29** (schema, indexes, RLS policies, SECURITY DEFINER
  RPCs) — all idempotent and safe to re-run in the Supabase SQL Editor.
- Security habits: publishable key only in client code, instructor-only notes never
  visible to students, student-owned-row RLS everywhere relevant, demotion-guarded role
  changes.
- Three mirrored local copies stay byte-identical: the git source of truth
  (`LMS - V2.0`), the WEB staging copy, and the GitHub Pages mirror
  (web files only — `sql/` never ships to GitHub).

## 6. Documentation

A decision-log + build-status set of docs lives in `docs/`:
`START-HERE.md`, `RESUME.md`, `SYSTEM-SUMMARY.md`, `ARCHITECTURE.md`, plus numbered
business-logic docs (7–16) covering the quiz, simulators, study packs, Puter tools,
mentor sessions, and the AI Mentor assistant. Each records **locked decisions** and
current **build status** so future sessions can resume cleanly.

---

## Testing accounts

| Role | Email | Notes |
| ---- | ----- | ----- |
| Admin | `REDACTED` | full system overview + assignments |
| Instructor | `REDACTED` | sees assigned courses, AI activity, AI Chats |
| Student | `REDACTED` (KrishB) | enrolled in both courses |
| Student | `REDACTED` (RahnV) | enrolled in networking |

## Status

Everything described above is **live and tested** except the final `sql/28b` schema
change, which needs one run in the SQL Editor to enable the sharing boost.
