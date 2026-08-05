# Build List — Active Roadmap

Features we're building now. Everything else in the original checklist was reviewed and **discarded for this phase** (see appendix at the bottom).

## 1. Instructor approval flow
- Wire `get_pending_instructors` + `approve_instructor` into `instructor-dashboard.html` (admin-only section to review/approve pending instructors).

## 2. Mentor escalation / manual mentor sessions
- ✅ **Manual mentor sessions UI**: log form + timeline + resolve-follow-up on `student-profile.html` (wired `log_mentor_session`, `get_mentor_sessions_for_student`, `resolve_mentor_followup`). AI Mentor topic summaries already visible there ("AI Mentor Chats").
- ✅ **Escalation flags** (sql/42 + js/ai-mentor.js + js/mentor-sessions.js + student-profile.html): `ai_mentor_flags` table + consent-only "want me to flag it?" offer in the chat + "Flagged Topics" panel with resolve/dismiss on the student profile.

## 3. Per-module quiz scoring
- Persist quiz results in the DB (per student per module), score display, and results retrieval for instructors.
- ✅ **Student-facing persistence** (sql/37): `quiz_scores` table + `submit_quiz_score` RPC + dedicated "Basic Network Quiz" module (id 27); `tools/basic-network-quiz.html` now syncs best score to the course account when the student is signed in (localStorage + Puter still work for guests).
- ⏳ **Instructor results view**: `get_quiz_scores_for_course` RPC exists but isn't wired into `instructor-dashboard.html` yet (avoid editing that page while terminal 1 works on it).
- `tools/basic-network-quiz.html` currently stands alone; add score persistence.
- See `docs/content/08-quiz-game-modules.md`.

## 4. Achievements
- Badges/scoring system on top of quiz scores + module completions.
- See `docs/ACHIEVEMENTS.md`, `docs/content/overall-achievements.md`.

## 5. Video/PDF/interactive content types
- ✅ Render non-`lesson` `content_type` modules (`video | pdf | interactive | text`) on course pages.
- ✅ `js/content-renderer.js` modal overlay: video (html5/.mp4 + YouTube), pdf (iframe), interactive (iframe tool), text (fetched article). Non-lesson cards open the modal; `sql/43-demo-content-modules.sql` seeds one demo of each for preview.

## 6. Admin course/module editor
- In-dashboard CRUD for courses and modules (replaces SQL-migration-only editing).

## 7. Hosted video
- Real video hosting/embeds for video-type modules.

## 8. Certificate issuance
- Generate certificates when a course is completed (all modules complete).
- Certification-prep chapter already exists in the content bundle.

## 9. Study packs & Puter course-app
- See `docs/content/12-study-packs-business-logic.md`, `13-puter-course-app-business-logic.md`.

## 10. Automated testing
- See `docs/test/17-testing-strategy-playwright-pgtap.md` (Playwright + pgTAP).

---

## Discarded for now (this phase)
- **Student self-enrollment / request flow** — enrollment stays admin-driven (`add_student`).
- **Payment / paid enrollment** — stays free, time-limited.
- **Simulators / branching scenarios** — content text only, no embedded tools.
- **Expiry self-service / renewal UX** — dashboard shows expiry date; no countdown/renewal flow.
