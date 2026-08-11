# Build List — Active Roadmap

Features we're building now. Everything else in the original checklist was reviewed and **discarded for this phase** (see appendix at the bottom).

## 1. Instructor approval flow
- ✅ **Superseded**. Self-signup / pending-instructor state was removed back in sql/25 (dropped `get_pending_instructors` + `approve_instructor`); accounts are staff-created only, so there is no "pending" flow left to manage.
- ✅ The dead Approve button was removed from the admin overview (now shows "Active / Admin-created" status-only), and the stale `approveInstructor` + `approve_instructor` call was removed from `instructor-dashboard.html`.

## 2. Mentor escalation / manual mentor sessions
- ✅ **Manual mentor sessions UI**: log form + timeline + resolve-follow-up on `student-profile.html` (wired `log_mentor_session`, `get_mentor_sessions_for_student`, `resolve_mentor_followup`). AI Mentor topic summaries already visible there ("AI Mentor Chats").
- ✅ **Escalation flags** (sql/42 + js/ai-mentor.js + js/mentor-sessions.js + student-profile.html): `ai_mentor_flags` table + consent-only "want me to flag it?" offer in the chat + "Flagged Topics" panel with resolve/dismiss on the student profile.

## 3. Per-module quiz scoring
- Persist quiz results in the DB (per student per module), score display, and results retrieval for instructors.
- ✅ **Student-facing persistence** (sql/37): `quiz_scores` table + `submit_quiz_score` RPC + dedicated "Basic Network Quiz" module (id 27); `tools/basic-network-quiz.html` now syncs best score to the course account when the student is signed in (localStorage + Puter still work for guests).
- ✅ **Instructor results view**: `get_quiz_scores_for_course` RPC wired into the Analytics tab (Quiz Scores section, per-course via `courseFilter`). Verified live against the networking course.
- `tools/basic-network-quiz.html` currently stands alone; add score persistence.
- See `docs/content/08-quiz-game-modules.md`.

## 4. Achievements
- ✅ **Merged**. Badges/scoring system wired on top of quiz scores + module completions via `sql/38-achievements.sql`; `loadAchievements`/achievements UI live in the student dashboard.
- See `docs/content/overall-achievements.md` (local-only snapshot).

## 5. Video/PDF/interactive content types
- ✅ Render non-`lesson` `content_type` modules (`video | pdf | interactive | text`) on course pages.
- ✅ `js/content-renderer.js` modal overlay: video (html5/.mp4 + YouTube), pdf (iframe), interactive (iframe tool), text (fetched article). Non-lesson cards open the modal; `sql/43-demo-content-modules.sql` seeds one demo of each for preview.

## 6. Admin course/module editor
- ✅ **Module editor shipped** (sql/37 + Settings tab): in-dashboard CRUD for courses, units, and modules — replaces SQL-migration-only editing.

## 7. Hosted video
- ✅ Real video hosting via **Supabase Storage**: `sql/44` creates a public `course-videos` bucket + staff upload policies; the module editor's video modal gains an "Upload .mp4" control that uploads and auto-fills the Content URL; the course-page renderer plays the `.mp4` inline.

## 8. Certificate issuance
- ✅ **Claim flow live** (sql/41 + certificate.html): completing every module shows the completion banner → "View certificate" → `certificate.html` calls `issue_certificate` and the student's Certificates tab lists them via `get_my_certificates`.
- Minor polish later: auto-issuing at the exact moment the last module completes (vs. on claim).

## 9. Study packs & Puter course-app
- ✅ **Downloadable study packs built** (study-pack half of #9): `tools/study-pack-template.html` (single-file offline pack: notes + embedded quiz + localStorage progress + cloud sync) and `tools/build-study-packs.js`, which generates `tools/study-packs/<course>-module-<NN>.html` per module from the **same** quiz banks + lesson bundles the online course uses. Module cards on `course.html` show a "Study pack → View / download" link for modules 1–9; demo/non-lesson modules are excluded. Packs work fully offline; when online they offer click-to-sign-in (course email/password) then sync the best score via `submit_quiz_score`. See `docs/content/12-study-packs-business-logic.md`.
- ⏳ **Puter course-app** not built — business logic only. See `docs/content/13-puter-course-app-business-logic.md`.

## 10. Automated testing
- ✅ **Playwright E2E suite** in `tests/`: role redirects, cross-role isolation, stalled-report, batches — 4 pass / 4 skip (student/instructor creds unknown → env-driven skips).
- ✅ **pgTAP RLS/security suite authored** in `tests/pgtap/` (files `00`–`08` + README): schema integrity, mentor AI sessions / enrollments / module completions RLS, profile role guard (self-elevation gap **fixed** in sql/60), RPC authorization, batch staff-read, delete-enrollment authorization. ⏳ Not yet executed — requires a dedicated TEST Supabase project (never production). Run instructions: `tests/pgtap/README.md` + `docs/test/17-testing-strategy-playwright-pgtap.md`.
- ✅ **Self-elevation gap closed** (sql/60): `set_profile_role` can no longer create an elevated role — insert path only ever makes `student`, conflict path only rewrites `student` → `student`; the signup trigger ignores `options.data.role` metadata; one-time cleanup demotes any elevated-but-unapproved profile (staff roles are admin-assigned via `add_student` only).

---

## Added beyond the original roadmap
- ✅ **Stalled students report** (sql/58): auto-detects inactive enrollments (14-day rule) + manual flags; admin Stalled tab lists them and offers Un-stall.
- ✅ **Student batches** (sql/59): admin Groups them into `batch-YYYY-NNN` cohorts and views per-batch progress, avg quiz, and 14-day-quiet status.
- ✅ **Remove student from course** (sql/61, ⏳ not applied live): `delete_enrollment` staff RPC + confirm-gated Remove button on the Students tab — deletes the enrollment + course-scoped progress/quiz/certificate/stalled/AI data, keeps the account + other enrollments.

---

## Discarded for now (this phase)
- **Student self-enrollment / request flow** — enrollment stays admin-driven (`add_student`).
- **Payment / paid enrollment** — stays free, time-limited.
- **Simulators / branching scenarios** — content text only, no embedded tools.
- **Expiry self-service / renewal UX** — dashboard shows expiry date; no countdown/renewal arithmetic.