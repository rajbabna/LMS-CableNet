# Step 15 — AI Mentor Assistant Integration

## Business Logic & System Design

---

## Overview

The **AI Mentor Assistant** is a chat-based helper embedded in the learning app that answers student questions, explains concepts, and nudges students toward understanding — without replacing the human instructor or the official grading system.

**Goal:** Give students an always-available, low-stakes "study buddy" that can help them when the instructor isn't present (e.g. during offline lab work or self-study), while keeping actual mentoring, grading, and course judgment firmly with the human instructor.

**Where it fits:** This is a supplementary tool, similar in spirit to the Puter course tools and the offline study packs — it lives alongside the core Supabase system, not inside it. It does not replace the `mentor_sessions` table already designed for instructor-logged sessions.

---

## User Workflows

### Workflow 1: Student Asks the Mentor a Question During Study

```
1. Student is working through a study pack or course page
   ↓
2. Gets stuck on a concept (e.g. "why does T568B start with orange?")
   ↓
3. Opens the embedded "Ask the Mentor" chat widget
   ↓
4. Types the question
   ↓
5. Assistant responds — explains the concept, may ask a guiding
   question back rather than just giving the answer
   ↓
6. Student continues studying with the clarification in hand
```

### Workflow 2: Student Uses the Mentor While Offline (Study Pack Context)

```
1. Student is in a lab with no internet, using a downloaded study pack
   ↓
2. AI Mentor widget is present but shows as "unavailable offline"
   (the AI call requires an internet connection to reach the model)
   ↓
3. Student notes their question, or waits until back online
   ↓
4. Once online, opens the mentor widget and asks the saved question
```

*(Unlike quiz progress, mentor conversations have no offline mode — there is nothing meaningful to store locally if the assistant can't respond without connectivity.)*

### Workflow 3: Instructor Reviews Whether the Mentor Helped (Optional)

```
1. Instructor wants a sense of what students are struggling with
   ↓
2. If conversation logging is enabled (see Data Model below),
   instructor views a summary of common topics/questions raised
   ↓
3. Instructor uses this to adjust teaching focus for the next class
   ↓
4. Individual student conversations remain private unless the
   student explicitly shares or flags one
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  STUDENT'S BROWSER                        │
│                                                            │
│  Learning App (course page / study pack)                  │
│   └─ "Ask the Mentor" chat widget                          │
│         │                                                  │
│         │ requires student's own account/session           │
│         ▼                                                  │
│  ┌────────────────────────────────────────┐               │
│  │  AI Provider (e.g. Puter's keyless AI    │               │
│  │  layer, or another free-tier provider)    │               │
│  └────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
                        │
                        │ (optional) key moments logged
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE (Cloud)                          │
│  mentor_ai_conversations (optional, opt-in logging)         │
│  — separate from instructor-logged mentor_sessions           │
└─────────────────────────────────────────────────────────┘
```

**Key distinction:** The AI mentor and the human mentor (instructor) are two separate systems that happen to share a name. The instructor's `mentor_sessions` table (Step 14) stays the authoritative record of real mentoring relationships. The AI mentor is a self-service study aid — it should never be presented to students as equivalent to instructor attention.

---

## Feasibility: Free Integration Options

| Approach | Cost model | What it requires |
|---|---|---|
| **Puter's built-in AI layer** | Free — each student's own Puter account covers their usage, not the course's | Student signs into a (free) Puter account in-browser; ties the mentor feature to the Puter ecosystem already being explored for course tools |
| **Own backend + free-tier provider key** | Free at student-scale usage, developer manages one shared key | A Supabase Edge Function to hold the key server-side, so it's never exposed in the browser; more control over cost ceilings and moderation |

Both are viable "free agent" paths. The Puter route is faster to integrate given the course tools already planned there; the own-backend route gives more control over content moderation and doesn't depend on students holding a separate account.

---

## Data Model (Conceptual)

Two independent decisions, not required together:

**1. Does the assistant get course context?**
- *Without context:* generic tutoring — works anywhere, but answers aren't grounded in the specific curriculum or terminology used in class.
- *With context:* the student's current module's notes are included so answers stay aligned with what's actually being taught (recommended for consistency with course material).

**2. Are conversations logged anywhere?**
- *Not logged (default/simplest):* conversation exists only in the browser session; nothing persists, nothing for the instructor to review.
- *Logged, opt-in:* summarized topics (not necessarily full transcripts) saved to a dedicated table, separate from official progress or grading data, used only to help instructors see what students are struggling with in aggregate.

---

## Access & Visibility Rules

| Who | Can see |
|---|---|
| The student in the conversation | Full conversation, always |
| Instructor | Only if logging is enabled — and ideally aggregate/topic-level, not raw transcripts, to preserve students' willingness to ask "silly" questions freely |
| Other students | Never |

---

## Guardrails to Define Before Launch

- **Persona boundaries** — the assistant should explain and guide, not simply hand over answers to graded quiz questions.
- **Scope boundaries** — stays within academic mentoring for the course subject matter; declines off-topic or inappropriate requests, especially given some users are Grade 9 students.
- **No grading authority** — the AI mentor never assigns scores or determines pass/fail; that stays entirely with quiz results and instructor judgment.
- **Clear labeling** — students should always know they're talking to an AI assistant, not a human instructor, to avoid confusion with real mentor sessions.

---

## Checklist

- [x] Choose integration path → **Puter keyless AI (validated via `tools/puter-ai-test.html` — `puter.ai.chat()` works in-browser with streaming, system prompts, and testMode; first use requires a free Puter sign-in popup)**
- [x] Decide whether the assistant receives course/module context → **Yes, with course context (locked)**
- [x] Decide whether conversations are logged, and at what granularity → **Topic summary, opt-in (locked); no raw transcripts**
- [x] Write the mentor persona system prompt (guidance style, subject scope, tone, refusal boundaries) → **in `js/ai-mentor.js`**
- [x] Label the widget clearly as an AI assistant, distinct from instructor mentor sessions → **header label "AI assistant — not a human instructor"**
- [x] Confirm no offline mode is promised for this feature (requires connectivity) → **offline notice shown**

## Build Status

**BUILT (core): `js/ai-mentor.js`** — floating "Ask the Mentor" chat on both course pages
(course context from the live `modules` table, streaming themed-markdown replies, Puter
sign-in prompt, offline/error notices, session-only conversation). Widget labels itself as
an AI assistant.

**BUILT (logging, `sql/28` + `sql/28b` + client + dashboards):**
- **Capture is always on** (owner decision, final): every real AI mentor chat upserts a
  `mentor_ai_sessions` row with course, time, message count AND a one-sentence topic
  summary. There is no opt-out toggle; the widget tells students up front:
  "Chat topics are summarized for your instructor so they can improve the course.
  No raw messages are kept." (Summaries only — never raw messages.)
- Earlier iterations (opt-in toggle, then default-ON + end-of-chat prompt) were replaced
  by this always-on decision; `sql/28b` keeps `topic_summary` nullable purely as a safety
  net for older rows.
- Instructors see them: **AI Mentor Chats** timeline on `student-profile.html`
  (`get_ai_mentor_sessions_for_student`) + **AI Mentor Activity** panel on
  `instructor-dashboard.html` (`get_ai_mentor_topic_overview`, per-course counts + latest
  summary).
- Co-teaching scoping: admins see all; instructors see only chats for their assigned courses.
