# Step 16 — AI Mentor Escalation & Instructor Visibility

## Business Logic & System Design

---

## Overview

This step connects the two mentor systems that have so far been kept deliberately separate:

- **Human mentor sessions** (Step 14) — instructor-logged, instructor-only notes, visible in the Session Timeline.
- **AI mentor conversations** (Step 15) — self-service chat, no instructor visibility by default.

**Goal:** Give the instructor a read-only window into AI mentor activity, and give the AI mentor a way to hand a struggling student off to a real session — without turning the AI mentor into a second grading system or making students afraid to ask it questions.

**Note on current scale:** With a single instructor currently, "who can see what" questions are simpler than they'll be later. This doc still defines the visibility rules properly now, so the system doesn't need rework when a second instructor joins — but the actual permission enforcement can be minimal for now (see Access & Visibility Rules).

---

## User Workflows

### Workflow 1: Student Gets Stuck, AI Mentor Suggests a Real Session

```
1. Student asks the AI mentor about the same topic multiple times,
   or explicitly says they're still confused after the explanation
   ↓
2. AI mentor recognises this pattern (repeated topic, or student
   signals continued difficulty)
   ↓
3. AI mentor suggests: "This might be worth going over with your
   instructor directly — want me to flag it?"
   ↓
4. If student agrees, a flag is created — linked to the student,
   the topic, and a short reason
   ↓
5. Flag appears on the instructor's dashboard as a suggested topic
   for the next mentor session (not an automatic booking)
```

### Workflow 2: Instructor Reviews AI Mentor Activity Before a Session

```
1. Instructor opens a student's Mentor Sessions page (same page as
   the existing Session Timeline)
   ↓
2. Sees a new "AI Mentor Activity" panel alongside the human session
   timeline
   ↓
3. Views topic-level summaries of recent AI conversations
   (not necessarily full transcripts — see Data Model)
   ↓
4. Uses this as prep context, same way they'd use past session notes
   ↓
5. Logs the upcoming session as normal (Step 14 flow), optionally
   referencing what the AI mentor summary showed
```

### Workflow 3: Instructor Clears or Actions a Flagged Topic

```
1. Instructor sees a flagged topic ("KrishB — struggled with T568B
   wiring order, flagged by AI mentor, 08/01/2026")
   ↓
2. Instructor either:
   a) Addresses it in the next logged session, then marks the flag
      resolved (mirrors the existing follow-up resolution pattern), or
   b) Dismisses it if it's already been covered
   ↓
3. Flag moves out of the "open" list, same visual treatment as a
   resolved follow-up in the current Session Timeline
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  STUDENT'S BROWSER                        │
│  AI Mentor chat widget                                    │
│   └─ detects repeated struggle → offers to flag            │
└───────────────────────┬───────────────────────────────────┘
                         │ (only if student agrees)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE (Cloud)                          │
│                                                             │
│  mentor_ai_conversations   ai_mentor_flags                 │
│  (topic-level summaries)   (open/resolved, links to        │
│                              student + topic)               │
│           │                        │                        │
│           └──────────┬─────────────┘                        │
│                       ▼                                     │
│              mentor_sessions page                            │
│         (existing instructor dashboard view)                 │
└─────────────────────────────────────────────────────────┘
```

**Key point:** the AI mentor never writes into `mentor_sessions` directly — that table stays exclusively for real, human-logged sessions (per Step 14). AI activity and flags live in their own tables and are displayed *alongside* the existing timeline, not merged into it.

---

## Data Model (Conceptual)

**AI Mentor Conversation Record**
- Student, topic/module, timestamp, and a **summary** of what was discussed (not the full verbatim transcript — see the trade-off from Step 15/last discussion)
- Whether it resulted in a flag

**Escalation Flag**
- Student, topic, reason (e.g. "asked about this 3 times"), status (open/resolved)
- Created only with the student's agreement — never silently generated behind their back
- Resolved by the instructor, same pattern as the existing follow-up-action resolution in mentor sessions

---

## Access & Visibility Rules

| Who | Can see | Can act on |
|---|---|---|
| The instructor (currently, the only one) | AI mentor topic summaries + open flags for their own students | Can resolve/dismiss flags |
| The student | Their own full AI mentor conversations (always, same as today) | Can agree/decline to flag a topic |
| A future second instructor | *To be decided when that happens* — likely mirrors whatever's chosen for human mentor-session visibility (the open question flagged when reviewing the current build) | — |

Since it's single-instructor for now, there's no access-control decision to force today — but keeping AI summaries and flags in their own tables (rather than baked directly into the instructor's session view) means adding a second instructor later is a permissions change, not a data-model change.

---

## Guardrails

- **Student consent for flagging** — the AI mentor should never silently report a student as "struggling" without the student choosing to flag it. This keeps the tool feeling safe to use.
- **Summary, not surveillance** — default to topic-level summaries rather than full transcripts in the instructor view, preserving the "ask anything" comfort from Step 15.
- **Flags are suggestions, not assignments** — a flag surfaces a topic worth covering; it doesn't book a session or require one. The instructor decides what to do with it.
- **No AI mentor authority in grading** — nothing from AI mentor activity feeds into quiz scores or official progress; it only feeds into what the instructor chooses to focus on.

---

## Checklist

- [ ] Decide default: topic-summary vs. full transcript in the instructor's AI Mentor Activity panel
- [ ] Confirm flagging always requires explicit student agreement, not automatic
- [ ] Add "AI Mentor Activity" panel to the existing Mentor Sessions page, kept visually distinct from the human Session Timeline
- [ ] Reuse the existing open/resolved follow-up pattern for flags, for UI consistency
- [ ] Leave multi-instructor visibility rules as a documented open decision, revisit when a second instructor joins
