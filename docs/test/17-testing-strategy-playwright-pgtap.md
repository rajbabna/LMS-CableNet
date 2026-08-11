# Step 17 — Testing Strategy: Playwright (User Flows) + pgTAP (RLS Policies)

## Business Logic & System Design

---

## Overview

The app currently has no automated test suite — verification has been manual, via screenshots and walkthroughs. This step defines a two-part testing strategy that matches the app's actual architecture: a static HTML/JS frontend backed by Supabase, where correctness depends both on **what the UI shows** and **what the database allows**, independently of each other.

**Goal:** Catch regressions in role-based flows and RLS-policy correctness automatically, before they reach the live GitHub Pages site — especially for the sensitive paths (AI Mentor chat visibility, enrollment access, role scoping) that took several iterations to get right.

**Why split into two tools rather than one:** Playwright tests what a browser experiences — button clicks, redirects, what renders. pgTAP tests what the database enforces — row-level security — regardless of what the UI does or doesn't show. A UI that correctly *hides* a button is not the same as a database that correctly *blocks* the underlying read. Only pgTAP proves the second one.

---

## Test Workflows

### Workflow 1: Running Playwright Tests Locally

```
1. Developer runs the Playwright test command
   ↓
2. Playwright launches a real browser (Chromium/Firefox/WebKit)
   ↓
3. Executes scripted flows — sign in as each role, navigate, click,
   assert what's on screen
   ↓
4. Reports pass/fail per flow, with a screenshot captured automatically
   on any failure
```

### Workflow 2: Running pgTAP Tests Against a Test Supabase Project

```
1. Developer connects to a dedicated TEST Supabase project
   (never the production one)
   ↓
2. Runs the pgTAP test suite (via SQL Editor or CLI)
   ↓
3. Each test asserts one specific RLS behavior
   (e.g. "student A cannot read student B's AI Mentor session")
   ↓
4. Results returned as pass/fail per assertion, directly from Postgres
```

### Workflow 3: Catching a Regression Before It Ships

```
1. A change is made — a new RLS policy, an update to auth-guard.js,
   a new migration
   ↓
2. Both test suites are run before pushing
   ↓
3. A failure points to exactly which flow or policy broke
   ↓
4. Fix is made and tests re-run, before the change reaches the live
   GitHub Pages site or the production Supabase project
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      PLAYWRIGHT                           │
│                                                             │
│  Launches a real browser → drives the actual app            │
│  (local copy or live GitHub Pages URL)                       │
│           │                                                  │
│           ▼                                                  │
│  App calls Supabase with the publishable client key,          │
│  same as a real student/instructor/admin would                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                        PGTAP                               │
│                                                             │
│  Runs INSIDE Postgres, directly against a TEST Supabase      │
│  project's schema and RLS policies — no browser involved      │
└─────────────────────────────────────────────────────────┘
```

The two suites never need to run against each other — they test different layers of the same system independently.

---

## Playwright Coverage — User-Facing Flows

| Flow | What's Verified |
|---|---|
| Login | Correct role redirect (student → dashboard, instructor → instructor dashboard, admin → admin panel); wrong credentials rejected |
| Student dashboard | Only enrolled courses appear; progress % matches seeded data; expired enrollment shows preview access, not full lock-out |
| Course page | Module list matches the live `modules` table; "Mark Complete" updates progress correctly |
| AI Mentor widget | Labeled "AI assistant — not a human instructor"; Puter sign-in bar shown when signed out; offline notice appears when connectivity is simulated as unavailable |
| Instructor dashboard | Only students in assigned courses appear (Course Assignments scoping); status/stalled/history actions function; AI Mentor Activity panel shows correct per-course chat counts |
| Admin panel | System overview counts match seeded data; Add Student/Account correctly enrolls an existing email vs. creates a new account; Course Assignments correctly restricts an instructor's visible students |
| Cross-role isolation | A student navigating directly to an instructor or admin URL is redirected or blocked — not just visually hidden by CSS |

---

## pgTAP Coverage — RLS Policies

| Policy Area | What's Asserted |
|---|---|
| `mentor_ai_sessions` | A student can only read their own rows; an instructor can only read rows for courses they're assigned to; an admin can read all |
| `enrollments` | A student cannot modify their own `expires_at`; only admin/instructor roles can |
| `course_progress` / `module_completions` | A student cannot write progress rows under another student's `user_id` |
| `profiles` | A student cannot self-elevate their own `role` field (matches the "demotion-guarded role changes" already built) |
| SECURITY DEFINER RPCs (`log_mentor_session`, `get_ai_mentor_sessions_for_student`, etc.) | Each RPC returns only rows the calling user is authorized to see, even though the function itself runs with elevated privilege internally |

---

## What Each Tool Catches That the Other Won't

| Scenario | Playwright | pgTAP |
|---|---|---|
| UI hides a button, but the underlying query still returns another student's data if called directly | May miss — looks correct visually | Catches it directly |
| A redirect bug in `auth-guard.js` sends a student to the wrong dashboard | Catches it | Has no visibility into frontend redirect logic |
| RLS policy is correct, but the UI breaks or shows a blank row on a null `topic_summary` | Catches it | Data access is correctly protected, but display bugs aren't its job |

This is the core reason for running both — each one is blind to the layer the other covers.

---

## Test Data & Environment Considerations

- **pgTAP must run against a dedicated test Supabase project or isolated schema — never production.** Seed it with equivalent test accounts to the ones already in use, but kept separate from the real data.
- **Playwright can run against a local copy of the static site or the live GitHub Pages URL.** Running locally is faster to iterate on and avoids the "hard-refresh to bypass cache" issue interfering with test development itself.
- **No CI pipeline exists yet**, and none is required to start — both suites can begin as commands run manually before a push, with the option to wire into GitHub Actions later without changing how the tests themselves are written.

---

## Checklist

- [x] Start with a Playwright test covering the three role-based sign-in redirects — highest value, lowest effort first test
- [x] Add Playwright coverage for student → instructor/admin URL isolation (cross-role redirect)
- [x] Add a regression guard for the Stalled-students report tab (sql/58)
- [x] Set up a dedicated test Supabase project (or isolated schema) before writing any pgTAP tests
- [x] Add pgTAP tests for `mentor_ai_sessions` and `enrollments` RLS policies first, since those protect the most sensitive data
- [x] Add Playwright coverage for the AI Mentor widget's offline notice — a state that's easy to forget to test manually
- [x] Treat a test failure as the first place to check before assuming a GitHub Pages cache issue

## Playwright suite — how to run

The suite lives in `tests/` (uses `@playwright/test`; requires Node + Python on PATH;
Chromium is installed via `npx playwright install chromium` on first run).

```sh
# 1. Set credentials once — never commit these
cp tests/.env.example tests/.env
#    fill LMS_ADMIN_* (required). Add LMS_STUDENT_* / LMS_INSTRUCTOR_* to
#    enable the role-redirect and cross-role tests (they bag quietly otherwise).

# 2. Run against the repo root (a local http.server on :4173 is auto-started)
cd tests
npx playwright test          # headless
npx playwright test --headed # watch it run
```

Test roles that skip (no credentials in `tests/.env`) show as ⏭ skipped, not
failed — so the suite stays green for a fresh clone that only has an admin email.

What the suite covers today:

| Spec | Assertions |
|---|---|
| `auth-role-redirect.spec.js` | admin → `instructor-dashboard.html`; instructor → same; student → `student-dashboard.html`; bad credentials stay on `login.html` with an error |
| `cross-role-isolation.spec.js` | a logged-in student who hand-navigates to `instructor-dashboard.html` is bounced to the student dashboard, not just hidden via CSS |
| `stalled-report.spec.js` | admin opens the Stalled tab; stat cards populate; auto + manual counts equal total; each row has an Un-stall action |
| `remove-from-course.spec.js` | instructor Remove flow for an enrolled student — regression guard for sql/61 (`delete_enrollment`) |
| `batches.spec.js` | partner batch behavior for the batch-management UI (sql/59) |
| `ai-mentor-offline.spec.js` | offline notice in the AI Mentor widget (`navigator.onLine === false` → `.ai-mentor-offline` bar; no offline notice while online) |
