# CableNet LMS — Issues Worth Flagging

*Updated Aug 2, 2026, against ACHIEVEMENTS.md (sql/28b now run — feature-complete as scoped)*

---

## Resolved Since Last Review

These were open questions in earlier reviews and are now settled by design decisions in ACHIEVEMENTS.md:

- **Instructor/admin visibility into mentor notes** — resolved by retiring the human-logged Mentor Sessions UI in favor of AI Mentor's always-on capture, with explicit admin-sees-all / instructor-sees-assigned-only scoping (same model as Course Assignments elsewhere in the app).
- **Summary vs. full transcript for AI Mentor visibility** — resolved as topic-summary-only, never raw messages, disclosed to students in the widget.
- **Whether the AI Mentor chat logic was functional** — resolved; sql/28b completing the sharing boost implies the full chat → summary → dashboard pipeline is live and tested.
- **Two separate Puter sign-ins (quiz vs. AI Mentor)?** — resolved by consolidating: the quiz is no longer hosted standalone on `cablenet-quiz.puter.site`; it's served **same-origin** on GitHub Pages (`tools/basic-network-quiz.html`). Because Puter sessions are origin-scoped (localStorage), one sign-in now covers both the quiz's KV score-sync and the AI Mentor widget. The quiz also gained an explicit "Sign in with Puter" button (the GitHub Pages origin has no platform auto-login) and its sign-in checks now use `puter.auth.isSignedIn()` (the legacy `puter.isSignedIn()` was not reliable in puter.js v2). Note: score history on the old puter-site app doesn't carry over (KV is app-scoped).
- **Access-duration "downgrade to preview" behavior** — resolved: it is a **deliberate, documented design**, not an unexamined default. Confirmed in `README.md` ("student is downgraded to preview/expired automatically"), `START-HERE.md`, `RESUME.md`, `ACHIEVEMENTS.md`, the admin UI copy ("After it expires the student's access downgrades to preview", `instructor-dashboard.html`), and the code path (`js/auth-guard.js` sets `data-enrollmentExpired`; `js/load-modules.js` renders the expired banner + preview-locked resources/completion). Rationale: students can still review module titles/descriptions after access lapses, which is friendlier than a hard lock-out and keeps the preview as an upsell path.
- **GitHub Pages cache reliance** — resolved: added `tools/bump-cache-version.ps1` (content-hash `?v=<md5:8>` on every local JS/CSS asset in all pages; idempotent; externals untouched). Run it before pushing and a stale cache can no longer be mistaken for a real bug. Hard-refresh is no longer required for JS/CSS to update (HTML pages are revalidated by GitHub Pages).
- **Add Student/Account modal — repeated fields in screenshot** — resolved: confirmed a screenshot artifact, not a bug. The live modal (`instructor-dashboard.html`) is a single clean form: Role, Email, Full Name, Temporary Password, Course, Access Duration + Cancel/Add. No repeated-entry list. (The `old/` variants also exist but are not deployed.)
- **No UI path to historical `mentor_sessions` data** — resolved as an **accepted trade-off** (deliberate, not an oversight): the human-logged Mentor Sessions UI was retired in favour of AI Mentor chat summaries, and rebuilding a dashboard for it would duplicate that purpose. If an old session ever needs review (e.g. the KrishB cable-testing / T568A/B sessions), access is via the Supabase SQL editor (`SELECT * FROM mentor_sessions ORDER BY created_at DESC;`) — the table, RLS, and RPCs remain intact. Re-open this if real instructors ask for the old logs.
- **`topic_summary` nullable safety net** — resolved: both dashboards handle a null summary gracefully with fallback text (`instructor-dashboard.html` "AI Mentor Activity" → "No summary shared"; `js/mentor-sessions.js` AI Chats timeline has a fallback line). And with always-on capture, new chats always write a summary, so null only ever affects pre-decision legacy rows.

---

## Still Worth Confirming

**Testing accounts are all personal-email variants**
Admin, instructor, and both student test accounts are on close variants of the same personal Gmail address. Reasonable for early solo testing, but before real students are onboarded, it's worth testing at least one flow (e.g. co-teaching scoping, or a second real instructor account) with genuinely separate accounts — some permission edge cases only show up when the accounts aren't all controlled by the same person.

**Status (code review, Aug 2, 2026): a real bug found and fixed.**
- The blanket staff SELECT policies on `enrollments`, `stalled_overrides`,
  `student_audit_log`, `course_instructors`, and `mentor_ai_sessions` used
  `role IN ('admin','instructor')` — with the publishable key, ANY instructor could
  read every row (all courses) through the REST API, and the dashboard's "Recent
  Activity" panel showed audit entries for students outside the instructor's courses.
- Fixed by `sql/29-scope-staff-rls.sql` (course-scoped: admin all, instructors only
  assigned courses, students own-row). Apply it in the Supabase SQL editor, then run
  this checklist with a genuinely separate instructor account:
  1. Create a second instructor via the admin dashboard's add-account form; approve
     and assign them to ONE course (`assign_instructor`).
  2. Log in as that instructor: the dashboard must list only that course's students;
     the Recent Activity panel must only show that course's entries.
  3. In the browser console as that instructor, try
     `supabase.from('enrollments').select('*')` and
     `supabase.from('mentor_ai_sessions').select('*')` — both must return only the
     assigned course's rows (students' own rows only for students).
  4. Assign the second instructor to the SAME course as the first → both must see the
     same students (co-teaching).
  5. Verify the admin still sees everything after the policy change.

---

## Engineering Notes Worth Preserving

- The `42702 "column reference id is ambiguous"` and `42P13` parameter-ordering RPC bugs are the kind of thing that's easy to re-introduce in a future migration — worth keeping a short note of the fix pattern (e.g. explicit column aliasing in `RETURNS TABLE`) somewhere close to the migration files, not just in the achievements log.
- `sql/` is correctly excluded from the GitHub Pages mirror, and only the publishable Supabase key is used client-side — good security posture to keep enforcing as new features get added, since it's easy for a future migration or debug script to accidentally end up in the web-files copy.

---

## Summary

Most of the structural open questions from earlier reviews are now resolved by deliberate design decisions, not left ambiguous. What remains is mostly verification work (confirm intended behavior matches actual behavior) rather than new design decisions — a good sign that the project has moved from "figuring out the shape of it" to "hardening what's built."
