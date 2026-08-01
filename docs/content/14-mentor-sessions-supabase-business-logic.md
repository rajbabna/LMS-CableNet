# Step 14 — Mentor Sessions Sync to Supabase

## Business Logic & System Design

---

## Overview

**Mentor Sessions** are one-on-one or small-group check-ins between an instructor (mentor) and a student — separate from formal quiz scores or module progress. This step defines how a mentor session gets logged and stored, so it becomes part of the student's tracked history alongside their course progress.

**Goal:** Give instructors a simple, consistent way to record what happened in a mentoring session (topic, notes, outcome, follow-up) and have it show up wherever student history is reviewed — without it being confused with graded coursework.

---

## User Workflows

### Workflow 1: Instructor Logs a Session Right After It Happens

```
1. Instructor finishes a mentoring conversation with a student
   (in person, over call, or during lab time)
   ↓
2. Instructor opens "Log Mentor Session" on the student's profile
   ↓
3. Fills in: student, date, topic discussed, notes, any follow-up action
   ↓
4. Clicks "Save Session"
   ↓
5. Session record is written to Supabase, tied to the student's user_id
   and the instructor's user_id
   ↓
6. Session appears in the student's history, visible on the
   instructor dashboard
```

### Workflow 2: Instructor Reviews Past Sessions Before a New One

```
1. Instructor opens student's profile before a scheduled session
   ↓
2. Sees a chronological list of past mentor sessions
   (topic, date, follow-up items still open)
   ↓
3. Uses this context to prepare for the upcoming conversation
   ↓
4. After the session, logs the new entry (Workflow 1),
   optionally marking a previous follow-up item as resolved
```

### Workflow 3: Tracking Follow-Up Items Across Sessions

```
1. Session logged with a follow-up action
   (e.g. "student to redo cabling practical by Friday")
   ↓
2. Follow-up shows as "open" on student's record
   ↓
3. At the next session, instructor checks whether it was completed
   ↓
4. Instructor marks it resolved or carries it forward to a new entry
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE (Cloud)                        │
│                                                           │
│  ┌────────────────────┐    ┌─────────────────────┐       │
│  │ mentor_sessions     │    │ profiles / students │       │
│  │ (one row per        │───▶│ (existing table)    │       │
│  │  logged session)    │    └─────────────────────┘       │
│  └────────────────────┘                                   │
│           ▲                                                │
│           │ instructor_id = instructor's auth.uid()        │
│           │ student_id = student's user_id                 │
└───────────┼──────────────────────────────────────────────┘
            │
            │ Instructor logs directly, always online
            ▼
┌─────────────────────────────────────────────────────────┐
│              INSTRUCTOR DASHBOARD (Browser)               │
│  "Log Mentor Session" form on student's profile page       │
└─────────────────────────────────────────────────────────┘
```

**Note:** Unlike the offline study packs, mentor sessions are always logged by the instructor while online (they're being entered from a dashboard, not by a student in an offline lab), so there's no offline/localStorage/sync-later path needed here — every session write goes straight to Supabase.

---

## Data Model (Conceptual)

A mentor session record needs to capture:

- **Who** — which student, which instructor
- **When** — date/time of the session
- **What was discussed** — topic or free-text notes
- **Outcome** — brief summary of how it went
- **Follow-up** — optional action item and its status (open/resolved)
- **Linkage (optional)** — which course/module the session relates to, if relevant

This mirrors the existing `instructor_enrollments` / `student_audit_log` pattern already in place: instructor-authored records tied to a specific student, readable by that instructor and visible in the student's overall history.

---

## Access & Visibility Rules

| Who | Can see | Can create/edit |
|---|---|---|
| The instructor who logged it | Yes | Yes |
| Other instructors (if course is co-taught) | Yes, read-only | No |
| The student themselves | No — instructor-only working notes (decision locked) | No |

**Open decision:** Should students see their own mentor session notes, or are these instructor-only working notes? This affects the RLS policy design — instructor-only notes need stricter row-level security than notes meant to be shared back with the student.

> **DECISION (locked):** Mentor session notes are **instructor-only working notes** — not visible to students. RLS restricts reads to the instructor who logged them (plus read-only co-instructors). A student-visible view can be added later if desired.

---

## How This Differs From Quiz/Progress Tracking

| | Quiz Scores / Module Progress | Mentor Sessions |
|---|---|---|
| Purpose | Measures graded performance | Records a conversation/interaction |
| Logged by | Student (via quiz completion) | Instructor (manually, after the fact) |
| Timing | Can happen offline, synced later | Always logged online, in real time |
| Structure | Numeric score + structured responses | Mostly free-text notes + optional follow-up |
| Shows on dashboard as | Score/percentage per module | Timeline of session entries per student |

Keeping these as separate tables (rather than merging mentor notes into the progress tables) keeps the dashboard's "graded progress" view clean, while still giving instructors a full picture of each student when they open the profile.

---

## Checklist

- [x] Decide whether mentor session notes are visible to the student or instructor-only → **Instructor-only (locked)**
- [x] Confirm whether co-teaching instructors need read access to each other's session notes → **Yes, read-only (locked)**
- [x] Keep mentor sessions in their own table, separate from quiz/progress data → **`mentor_sessions` (sql/27)**
- [x] Support an optional "follow-up" flag so open items are trackable across sessions → **`follow_up` + `follow_up_status` open/resolved (sql/27)**
- [x] Always write directly to Supabase (no offline/local-storage path needed for this workflow)

## Build Status

**BUILT (sql/27 + `student-profile.html` + `js/mentor-sessions.js` + dashboard "Mentor" link).** To go live: run `sql/27-mentor-sessions.sql` in the Supabase SQL Editor, then open the instructor dashboard → "Mentor" on any student row.
