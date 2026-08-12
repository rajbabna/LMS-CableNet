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
| Git source of truth | local `LMS - V2.0` (branch `main`; clean — Course Companion deployed, see §2) |
| Mirrors to keep in sync | `Sites\WEB`, `Sites\GitHub Web\cable-net-courses` |
| Client key posture | publishable key only client-side, no `service_role` key in repo/history |
| SQL migrations | `sql/01` → `sql/63` (folder is **gitignored** — local only, never ships to GitHub) |

> ✅ **Apply status:** `sql/01`–`sql/63` are all applied to the live DB.
> `sql/31`–`60` were verified live 2026-08-10 via RPC probes + working features
> (batches, quiz scoring, study packs sync, certificates, stalled report, units,
> AI escalation flags); `sql/61`–`62` applied 2026-08-10; `sql/63` (certificate
> auto-issue) applied to production 2026-08-11 after passing the pgTAP suite on
> the TEST project.
> Earlier docs only *confirmed* `01`–`30` on paper; that was
> a documentation gap, not a missing-migration gap.

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
  **Auto-issued at the moment the last module completes** (`sql/63` trigger on
  `module_completions`), so the certificate's `issued_at` reflects actual
  completion time; the page claim is display-only and idempotent.
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
### Study packs (roadmap #9, first half — built)
- **`tools/study-pack-template.html`** — single-file offline pack shell: `STUDY_PACK`
  data contract, notes + embedded quiz + immediate per-question feedback, localStorage
  progress (`study-pack:<moduleId>` + `study-pack-best:<moduleId>`), resume/retake,
  offline/online indicator, and an on-results **sign-in & sync** form for downloaded
  packs (course email/password → same-origin scope has no session).
- **`tools/build-study-packs.js`** — parses the **same** quiz banks
  (`docs/resources/quizzes/**`) + lesson bundles (`docs/cablenet-courses-bundle/*.md`)
  the online course uses and generates `tools/study-packs/<course>-module-<NN>.html`
  for modules 1–9 of both courses (cabling 1–9 → module ids 9–17; networking 1–9 → 18–26).
- **Entry points** — module cards on `course.html` show a **"Study pack → View /
  download"** link for lesson modules 1–9 only (demo/non-lesson modules excluded),
  via `js/load-modules.js`.
- **Sync** — online, the results panel saves the best score through the existing
  `submit_quiz_score` RPC sync; offline it stays in localStorage until a sign-in.
- Regenerate after editing any quiz bank / lesson markdown: `node tools/build-study-packs.js`.

### Puter course-app (roadmap #9, second half — built)
- **`tools/puter-course-companion-template.html`** — single-file, light cable-pair
  site-theme (mirrors the main LMS) "Course Companion" app shell: `COURSE_COMPANION`
  data contract, module rail + Study / Quiz / AI Mentor tabs, immediate-feedback quiz
  with best-score per module, and `puter.ai.chat` (user-pays model — each student's
  free Puter account covers usage; no API key).
- **`tools/build-puter-course-app.js`** — regenerates `tools/puter-apps/<course>-companion.html`
  for cabling + networking from the **same** quiz banks and lesson bundles as the
  online course/study packs.
- **Privacy** — signed-in progress lives in the student's own Puter cloud KV
  (`puter.kv`, private to them + this app); anonymous use falls back to localStorage.
  The app never touches Supabase (satellite practice tool, no sync decision).
- **Local-preview mode** — opened from disk (`file://`) the app skips the Puter.js SDK
  (which otherwise blocks the page with an "Unsupported Protocol" banner) and boots as a
  local-only preview: Study + Quiz work with device-local progress, AI Mentor tab
  explains it needs the hosted version (`window.CN_COMPANION_LOCAL_MODE`).
- **Entry point** — course-header footer on `course.html` shows a "Course Companion ↗"
  link beside the primary CTA (via `js/load-modules.js`).
- **Deployed (2026-08-12)** — each app uploaded to Puter and live:
  `https://cabling-companion.puter.site/cabling-companion.html` and
  `https://networking-companion.puter.site/networking-companion.html`; wired as
  `window.PUTER_COMPANION_URLS` in `js/config.js` with local-copy fallback. Apps
  were restyled to the light cable-pair site theme (AwsomeDesign tokens replaced
  the dark glassmorphism). Cache bumped, deployed on `main` + `gh-pages`.
- Regenerate after editing quiz banks / lesson markdown: `node tools/build-puter-course-app.js`.
  See `docs/content/13-puter-course-app-business-logic.md`.

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
- **Remove from course** (`sql/61`): `delete_enrollment(uuid, text)` — staff RPC
  (admin or assigned instructor) that deletes an enrollment + all course-scoped
  student data (completions, quiz scores/attempts, certificates, stalled flags, AI
  mentor history, badges) while keeping the account and other enrollments; audit
  trail written. UI: "Remove" button + confirm modal on the Students tab.
  Applied to live DB 2026-08-10.
- **Admin roster hygiene** (`sql/62`) — `get_admin_overview` students list now shows
  only accounts enrolled in ≥1 course (fully-removed students disappear; account +
  `stats.total_students` preserved). Applied to live DB 2026-08-10.

### Tooling & testing
- `tools/bump-cache-version.ps1` — content-hash `?v=` on all local JS/CSS before pushes.
- **Playwright E2E** (`tests/specs/`) — role redirects, cross-role isolation, stalled
  report, batches: 4 pass / 4 skip (student/instructor creds env-driven via `tests/.env`).
- **pgTAP RLS suite** (`tests/pgtap/`, files `00`–`09` + README) — schema integrity,
  RLS on mentor AI sessions / enrollments / completions, self-elevation guard, RPC
  authorization, batch staff-read, delete-enrollment authorization, certificate
  auto-issue. ✅ **Executed on
  a dedicated TEST Supabase project 2026-08-11 — 93/93 assertions green** (run via
  `tests/pgtap/run-pgtap.js`). Never run against production.
- Indispensable helpers: `js/auth-guard.js` (session + enrollment + preview),
  `js/supabase-client.js` (live URL + publishable key), `js/content-renderer.js`.

---

## 3. RPC surface (current, from `sql/`)

65 functions defined across the folder — the live set is: add_student,
add_student_to_batch, archive_batch, assign_instructor, auto_stalled, batch RPCs
(create_batch, get_batch_members, get_batch_progress, list_batches, remove_from,
rename, delete), create/update/delete course, unit, module, create_ai_mentor_flag,
dismiss/resolve flags, enroll_student, evaluate_achievements, extend_student_access
(+ delete_enrollment, sql/61 — applied),
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

- **Discarded** (this phase): student self-enrollment, payments, embedded simulators /
  branching scenarios, self-serve expiry/renewal UX.
- **Puter course-app** (#9 other half) IS built AND deployed — see §2 "Puter course-app".
- **Certificates** auto-issue at last-module completion (`sql/63`), so claim-vs-completion timing is no longer a gap.
- **Instructors cannot read feedback** — deliberate (keeps sql/29 scoping clean).
- **Topics summaries only** — AI Mentor raw messages are never stored or shown, by design.

## 5. Reconcile notes (which older doc is stale)

- The old status/setup docs (`RESUME`, `START-HERE`, `ACHIEVEMENTS`,
  `README-DYNAMIC-SETUP`, `IMPLEMENTATION-GUIDE`, `SYSTEM-SUMMARY`,
  `ARCHITECTURE`, etc.) were deleted — this file + `SESSION-HANDOFF.md` replace them.
- `overall-achievements.md` is a snapshot to `sql/30` (Aug 2, 2026) — superseded here.
- Every human-logged `mentor_sessions` row is still intact; just no UI.

**Suggested cadence:** after each push, update §1 (commit hash), §2 (only if behavior
changed), and §4. Next open task per docs: deploy the Course Companion apps to Puter +
onboard beta students (the
separate-account co-teaching checklist was already passed on Aug 2 — see
`docs/content/overall-achievements.md` §7). `sql/31`–`63` are all applied/verified.