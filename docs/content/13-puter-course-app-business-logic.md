# Step 13 — Custom Puter App for Courses

## Implemented Status

The generic design below was realized as a **Course Companion** app:

- **Builder:** `tools/build-puter-course-app.js` reads the same quiz banks
  (`docs/resources/quizzes/**`) and lesson bundles (`docs/cablenet-courses-bundle/*.md`)
  the live course/study packs use, and emits one single-file app per course:
  `tools/puter-apps/<course>-companion.html` (cabling + networking).
- **Template:** `tools/puter-course-companion-template.html` — dark AwsomeDesign
  glassmorphism shell with a module rail and three tabs (Study notes / Quiz / AI Mentor).
- **AI Mentor:** built-in `puter.ai.chat()` chat (user-pays model — ga student's own
  free Puter account covers usage, no API key), grounded in the course curriculum and the
  active module.
- **Storage:** per-student private progress via `puter.kv` when signed in with Puter;
  localStorage fallback for anonymous use. The app never touches Supabase (Option A below).
- **Entry point:** "Course Companion ↗" link in the course-header footer on `course.html`.
- **Deploy (owner action):** upload each generated `.html` to Puter under the trainer's
  account → Puter issues a shareable URL → post the link on the course page.
- Regenerate after editing quiz banks / lesson markdown: `node tools/build-puter-course-app.js`.

## Business Logic & System Design

---

## Overview

A **Puter App** is a lightweight, self-hosted web app that runs on Puter's cloud OS — giving students and trainers a course-specific mini-application (notes, exercises, mini-dashboards, tools) without needing a dedicated server, hosting bill, or backend deployment.

**Goal:** Give each course (or module) its own small interactive app — hosted for free, accessible from any device with a login, with built-in file storage and user accounts — without duplicating the main Supabase-backed system.

**Where it fits:** This sits *alongside* the main course platform (Supabase-backed), not instead of it. Puter apps are best for self-contained tools (calculators, simulators, flashcard sets, cabling reference tools) rather than the core enrolment/progress system.

---

## User Workflows

### Workflow 1: Trainer Publishes a New Course Tool

```
1. Trainer identifies a need
   (e.g. "students need a subnet calculator" or
    "students need a T568A/B wiring quiz tool")
   ↓
2. Trainer builds the app content (structure, questions, reference data)
   ↓
3. App is deployed to Puter under the trainer's account
   ↓
4. Puter generates a shareable URL for the app
   ↓
5. Trainer posts the link on the course page / shares with students
   ↓
6. Students open the link — no install needed, runs in browser
```

### Workflow 2: Student Uses the App

```
1. Student clicks the shared course-tool link
   ↓
2. App loads in browser (hosted by Puter, not the main course server)
   ↓
3. Student signs in with Puter account (or uses app anonymously,
   depending on how the app is configured)
   ↓
4. Student interacts with the tool (calculator, quiz, reference sheet)
   ↓
5. If the app stores personal data (scores, notes), it's saved to
   the student's own Puter cloud storage — private to them
   ↓
6. Student can return anytime; their saved data persists
```

### Workflow 3: Trainer Updates the App

```
1. Trainer edits the app content/logic
   ↓
2. Re-deploys to the same Puter app URL
   ↓
3. All students automatically see the updated version next time
   they open the link — no re-download, no version mismatch
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     PUTER (Cloud OS)                    │
│                                                          │
│  ┌──────────────────┐   ┌──────────────────┐            │
│  │ Trainer's App     │   │ Per-user storage │            │
│  │ (hosted code +    │   │ (each student's  │            │
│  │  content)         │   │  own private KV) │            │
│  └──────────────────┘   └──────────────────┘            │
│           ▲                       ▲                      │
│           │                       │                      │
│      Trainer deploys        Student's app data           │
│      updates here           lives here, isolated         │
│                              per account                  │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Shareable link
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  STUDENT'S BROWSER                       │
│  Opens the app URL — no install, runs entirely in-browser│
└─────────────────────────────────────────────────────────┘
```

**Key distinction from the main course system:**
- The main platform (Supabase) owns enrolment, official grades, and the instructor dashboard — this is the system of record.
- A Puter app is a *satellite tool* — useful for practice, reference, or ungraded self-checks — that doesn't need to touch the official database at all.
- If a Puter app's results ever need to count toward official progress, that becomes a deliberate sync decision (see below), not a default.

---

## Data Ownership Model

| Data type | Where it lives | Who can see it |
|---|---|---|
| App code/content (quiz questions, reference tables) | Trainer's Puter account | Trainer manages; students consume via link |
| Student's in-app activity (answers, notes, scratch work) | Student's own Puter storage | Private to that student only |
| Official grades / enrolment / attendance | Main Supabase system | Instructor dashboard (per existing RLS policies) |

This separation means a Puter tool can be built and iterated on quickly, without needing to touch the Supabase schema, RLS policies, or instructor dashboard at all — it's a low-stakes sandbox for course tools.

---

## Should Results Sync to the Main System?

Two deliberate options, decided per-app rather than by default:

**Option A — Practice tool, no sync (recommended default)**
- Used for self-study, drilling, reference lookup
- Results stay in the student's own Puter storage
- Nothing touches Supabase
- Lowest effort, safest, no data-consistency risk

**Option B — Graded/tracked tool, explicit sync**
- Only for tools where a score should count toward official progress
- Requires an explicit "Save to Course Dashboard" action initiated by the student (same pattern as the offline study-pack sync flow)
- Treated as an addition to the official `quiz_scores`-style record, not a replacement for it
- Should be reserved for a small number of tools to avoid two parallel sources of truth

---

## When to Use a Puter App vs. the Main Platform

| Use a Puter app when… | Use the main Supabase platform when… |
|---|---|
| It's a standalone reference tool or calculator | It affects official grades or attendance |
| Students should be able to use it without enrolment | It needs the instructor dashboard to see results |
| Fast iteration matters more than formal tracking | Data needs RLS-protected, auditable storage |
| The tool is optional/supplementary | The tool is a required course deliverable |

---

## Checklist

- [x] Confirm whether the tool is practice-only or needs official tracking — **practice-only (Option A)**
- [x] Decide on sync strategy (none vs. explicit "Save to Dashboard") — **none; progress is private to the student's Puter cloud**
- [x] Keep the app's content editable independently of the main course materials — **generator consumes the same authored quiz banks + lesson bundles**
- [x] Share the app link through the existing course page, not as a separate system — **"Course Companion ↗" in the course-header footer**
- [x] Avoid duplicating enrolment/grading logic that already lives in Supabase — **app never calls Supabase**
