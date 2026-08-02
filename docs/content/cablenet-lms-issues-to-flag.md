# CableNet LMS — Issues Worth Flagging

*Updated Aug 2, 2026, against ACHIEVEMENTS.md (sql/28b now run — feature-complete as scoped)*

---

## Resolved Since Last Review

These were open questions in earlier reviews and are now settled by design decisions in ACHIEVEMENTS.md:

- **Instructor/admin visibility into mentor notes** — resolved by retiring the human-logged Mentor Sessions UI in favor of AI Mentor's always-on capture, with explicit admin-sees-all / instructor-sees-assigned-only scoping (same model as Course Assignments elsewhere in the app).
- **Summary vs. full transcript for AI Mentor visibility** — resolved as topic-summary-only, never raw messages, disclosed to students in the widget.
- **Whether the AI Mentor chat logic was functional** — resolved; sql/28b completing the sharing boost implies the full chat → summary → dashboard pipeline is live and tested.
- **Two separate Puter sign-ins (quiz vs. AI Mentor)?** — resolved by consolidating: the quiz is no longer hosted standalone on `cablenet-quiz.puter.site`; it's served **same-origin** on GitHub Pages (`tools/basic-network-quiz.html`). Because Puter sessions are origin-scoped (localStorage), one sign-in now covers both the quiz's KV score-sync and the AI Mentor widget. The quiz also gained an explicit "Sign in with Puter" button (the GitHub Pages origin has no platform auto-login) and its sign-in checks now use `puter.auth.isSignedIn()` (the legacy `puter.isSignedIn()` was not reliable in puter.js v2). Note: score history on the old puter-site app doesn't carry over (KV is app-scoped).

---

## Still Worth Confirming

**Access-duration "downgrade to preview" behavior**
Expired student access falls back to preview content rather than a full lock-out. Not addressed in the achievements doc — still worth a deliberate check that this is the intended behavior rather than an unexamined default, especially once real enrollment expirations start happening.

**Add Student/Account modal — repeated fields in screenshot**
Likely a scrolling-screenshot capture artifact (fixed-position modal + full-page screenshot tool), not a real bug — but worth opening the modal directly once to confirm it's a single clean form, not an unintended repeated-entry list.

**`topic_summary` nullable safety net**
Kept nullable "for legacy rows" from earlier iterations (opt-in → opt-out → always-on). Worth confirming the AI Mentor Activity panel and student AI Chats timeline handle a null summary gracefully (a sensible fallback line) rather than showing a blank or broken row for those older records.

**GitHub Pages cache reliance**
The live-URL note says to "hard-refresh after each push to bypass cache" — a manual step that depends on remembering to do it. Worth considering a lightweight cache-busting approach (versioned asset filenames, or a query-string cache buster on deploy) so a missed hard-refresh doesn't get mistaken for a real bug during future testing.

**No UI path to historical `mentor_sessions` data**
The table and RPCs are kept in the database, but the UI now opens AI Mentor Chats instead. If there's ever a need to reference an old human-logged session (e.g. the KrishB cable-testing and T568A/B sessions from earlier), there's currently no dashboard path to it — only direct database access. Worth confirming that's an acceptable trade-off rather than an oversight.

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
