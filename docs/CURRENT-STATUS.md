# Cable&Net LMS — Current Status (single source of truth)

*Reconciled against the repo at commit `HEAD` (main). This document supersedes the
older per-feature status notes in START-HERE / RESUME / ACHIEVEMENTS where they conflict
with the current `sql/` folder and the latest commits.*

---

## 1. Snapshot

| Item | Value |
|------|-------|
| Live site | https://rajbabna.github.io/LMS-CableNet (GitHub Pages, auto-deploy on push to `main`) |
| Backend | Supabase project `mantjzpfhikezztonrga` — email/password auth, email confirmation OFF |
| Git source of truth | local `LMS - V2.0` (branch `main`, tree clean) |
| Mirrors to keep in sync | `Sites\WEB`, `Sites\GitHub Web\cable-net-courses` |
| Client key posture | publishable key only client-side, no `service_role` key in repo/history |
| SQL migrations | `sql/01` → `sql/60` (folder is **gitignored** — local only, never ships to GitHub) |

> ⚠️ **Apply status caveat:** docs confirm `sql/01`–`sql/30` are applied to the live DB.
> `sql/31`–`sql/60` exist on disk and their features ship in the pages, but nothing in
> the docs confirms they have all run in the SQL Editor. Before depending on any of
> those features live, re-run the relevant migration(s) — all files are idempotent.

---

## 2. What's working (all live / tested)

### Auth & access
- Role-based sign-in (admin / instructor / student) with automatic redirect to the right dashboard.
- **No self-signup** — the admin creates every account (GoTrue `signUp` + `add_student`,
  approval immediate); `pending.html` flow removed (sql/25).
- Time-limited enrollment — admin/instructor sets 24h / 7 / 30 / 90 / 180d / lifetime
  (`enrollments.expires_at`); expired students auto-downgrade to **preview mode**
  (deliberate design).
- Renew / extend access per student from the instructor dashboard (`sql/52`, `sql/53`).
- `set_profile_role` cannot demote staff; **self-elevation gap closed** (`sql/60`):
  insert makes only `student`, conflict only rewrites `student`→`student`, signup trigger
  ignores role metadata.

### Courses & content
- Two live courses — PORT 01 Cabling (4 modules) + PORT 02 Networking (4 modules),
  loaded dynamically from Supabase.
- **Units** (`sql/45`) — modules grouped under `course_units`; unit + module CRUD via
  admin RPCs (`sql/46`).
- **Content-type rendering** (`js/content-renderer.js`) — non-lesson modules open a modal:
  `video` (mp4 via Supabase Storage / YouTube), `pdf` (iframe), `interactive` (iframe),
  `text` (fetched article); `sql/43` seeds one demo of each.
- **Hosted video** — public `course-videos` bucket + upload policy in the module editor
  (`sql/44`).

### Student dashboard (`student-dashboard.html`)
- Course cards: progress bars, status (Not Started / In Progress / Completed / Expired / Preview), access-expiry line.
- **Achievements gallery** — badges driven by `evaluate_achievements` (`sql/38`).
- **Certificates** — "View certificate" on completion → `certificate.html` →
  `issue_certificate`; Certificates list via `get_my_certificates` (`sql/41`).
- **Give Feedback** modal — 1–5 stars + comment, optional course → `submit_feedback`
  (`sql/30`); students own-row only.
- "Reset progress" flow (`reset_student_progress`) — also clears quiz state + badges.

### Instructor / admin dashboard (`instructor-dashboard.html`, 8-tab sidebar shell)
- **Dashboard** — overview.
- **Students** — enrolled students, add account (admin-only), access windows,
  extend/renew, reset progress, stalled toggle, mark test/real student (`sql/55`).
- **Courses** — assigned courses; course/unit/module editor (**Settings** tab gives
  in-dashboard CRUD — `sql/37` module editor + `sql/45/46` units).
- **Mentoring** — student profile / AI Chats view.
- **Analytics** — per-course progress, quiz scores (`get_quiz_scores_for_course`),
  AI Mentor topic overview, stalled-report detail.
- **Stalled** — auto-detected (14-day inactivity rule) + manual flags, un-stall action
  (`sql/58`).
- **Batches** — admin cohorts `batch-YYYY-NNN`, create/assign/archive/delete,
  per-batch progress + avg quiz + 14-day-quiet status (`sql/59`; `list_batches`,
  `create_batch`, `add_student_to_batch`, `get_batch_members`, `get_batch_progress`, …).
- **Settings** — profile card for all roles; admin progress-management tool.

### Quizzes
- **`tools/basic-network-quiz.html`** — 15-question MCQ pool, 5 random per round
  (recently shortened from 12), same-origin on GitHub Pages, Puter sign-in covers both
  this and the AI Mentor widget. Score sync: best score → `submit_quiz_score`
  (signed-in) or Puter KV / localStorage (guest).
- `sql/49-50` add **question banks + quiz attempts** (`get_module_quiz_questions`,
  `save_quiz_question`, `delete_quiz_question`, `get_quiz_progress_for_course`,
  `reset_quiz_for_module`).
- **Study packs** — same pools also feed per-module offline packs (see §4).

### AI Mentor ("Ask the Mentor")
- Floating chat widget on both course pages (`js/ai-mentor.js`) — course-aware persona,
  streaming, themed markdown, offline notice, clearly labelled AI.
- **Always-on capture** — every chat logged to `mentor_ai_sessions` (course, time,
  message count, one-sentence topic summary; never raw messages) — `sql/28` + `sql/28b`.
- Instructor visibility: per-student AI Chats timeline + dashboard "AI Mentor Activity"
  (`get_ai_mentor_topic_overview`).
- **Escalation flags** — consent-based, ai_mentor_flags + resolve/dismiss on profile
  (`sql/42`; `create_` / `get_…_for_student` / `resolve_` / `dismiss_` RPCs).

### Mentor sessions (history)
- Schema + RPCs remain (`sql/27`, `27b`, `29-seed`, `36-digest`) for the retired human
  log UI; access legacy rows via SQL editor only — accepted trade-off.

### Security
- RLS scoped to assigned courses for staff reads (`sql/29`) — admins see all,
  instructors assigned-courses only, students own-row.
- All writes via SECURITY DEFINER RPCs checking `auth.uid()`.
- Git history purged of passwords/emails/full sql (main rewritten; `262e026`+).
- `sql/60` closes the self-elevation gap.

### Tooling & testing
- `tools/bump-cache-version.ps1` — content-hash `?v=` on all local JS/CSS before pushes.
- **Playwright E2E** (`tests/specs/`) — role redirects, cross-role isolation, stalled
  report, batches: 4 pass / 4 skip (student/instructor creds env-driven via `tests/.env`).
- **pgTAP RLS suite** (`tests/pgtap/`, files `00`–`07` + README) — schema integrity,
  RLS on mentor AI sessions / enrollments / completions, self-elevation guard, RPC
  authorization, batch staff-read. ⏳ **Authored but NOT yet executed** — needs, and must
  be run on, a dedicated TEST Supabase project (never production).
- Indispensable helpers: `js/auth-guard.js` (session + enrollment + preview),
  `js/supabase-client.js` (live URL + publishable key), `js/content-renderer.js`.

---

## 3. RPC surface (current, from `sql/`)

65 functions defined across the folder — the live set is: add_student,
add_student_to_batch, archive_batch, assign_instructor, auto_stalled, batch RPCs
(create_batch, get_batch_members, get_batch_progress, list_batches, remove_from,
rename, delete), create/update/delete course, unit, module, create_ai_mentor_flag,
dismiss/resolve flags, enroll_student, evaluate_achievements, extend_student_access,
feedback (`get_beta_feedback`, `submit_feedback`), get_admin_overview,
get_ai_mentor_sessions_for_student + topic overview + flags, get_course_instructors,
get_instructor_dashboard, get_mentor_sessions_digest + for_student,
get_module_quiz_questions, get_my_certificates, get_my_courses,
get_quiz_progress_for_course, get_quiz_scores_for_course, get_stalled_report,
get_student_history, issue_certificate, log_ai_mentor_summary, log_mentor_session,
mark_student_stalled, reset_quiz_for_module, reset_student_progress,
resolve_mentor_followup, save_quiz_question, set_enrollment_window, set_profile_role,
set_student_is_test, submit_quiz_score, unassign_instructor, update_enrollment_status.

Legacy leftovers still defined but unused: `approve_instructor`, `get_pending_instructors`
(superseded by sql/25).

---

## 4. Not built / accepted trade-offs

- **Study packs** — downloadable single-file offline packs (`tools/study-pack-template.html` +
  `tools/build-study-packs.js` layout on disk) generate `tools/study-packs/<course>-module-<NN>.html`
  per module (1–9) from the same quiz banks + lesson bundles the online course uses. Module cards
  link "Study pack → View / download". Packs: offline notes + quiz + localStorage progress; online
  sign-in (course email/password) then `submit_quiz_score` sync of the best score.
- **Discarded** (this phase): student self-enrollment, payments, embedded simulators /
  branching scenarios, self-serve expiry/renewal UX.
- **Puter course-app** (#9 other half) — business logic only, never built.
- **Certificates** auto-issued on claim (not exactly at the moment of last-module
  completion) — minor polish remains.
- **Instructors cannot read feedback** — deliberate (keeps sql/29 scoping clean).
- **Topics summaries only** — AI Mentor raw messages are never stored or shown, by design.
- **pgTAP suite unexecuted** — the only testing gap; needs a throwaway TEST Supabase.

## 5. Reconcile notes (which older doc is stale)

- `README.md` "run sql/01 → 27" → now `01` → `60`.
- `START-HERE.md` "SQL through 27" → now through `60`; new dashboard tabs (Batches,
  Stalled), achievements, certificates, quiz scoring are absent there — see this file.
- `overall-achievements.md` is a snapshot to `sql/30` (Aug 2, 2026) — superseded here.
- Every human-logged `mentor_sessions` row is still intact; just no UI.

**Suggested cadence:** after each push, update §1 (commit hash), §2 (only if behavior
changed), and §4. Next open task per docs: run `sql/31`–`60` in the SQL editor, confirm
unit/quiz/certificate/batch tables exist, execute the separate-account checklist
(`docs/content/separate-account-checklist.md`), then onboard beta students.