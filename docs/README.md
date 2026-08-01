# 📚 Docs Index — Cable&Net Courses LMS

> **New here?** Start with the root [README.md](../README.md), then [RESUME.md](./RESUME.md) for the current state.

This folder documents the live Cable&Net Courses learning management system.

## Status & orientation

| Doc | What it covers |
|-----|----------------|
| [RESUME.md](./RESUME.md) | **Current project state** — roles, accounts, what's built, gotchas, parked work |
| [START-HERE.md](./START-HERE.md) | Full documentation index + current status |
| [README-DYNAMIC-SETUP.md](./README-DYNAMIC-SETUP.md) | Quick start / deployment overview |
| [SYSTEM-SUMMARY.md](./SYSTEM-SUMMARY.md) | System overview & file list |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data flows, security model |

## Content / database guides

| Doc | What it covers |
|-----|----------------|
| [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) | Setting up courses |
| [MODULES-IMPLEMENTATION-GUIDE.md](./MODULES-IMPLEMENTATION-GUIDE.md) | Setting up modules |
| [MODULES-QUICK-REFERENCE.md](./MODULES-QUICK-REFERENCE.md) | Day-to-day content tasks |
| [SUPABASE-CLIENT-ERROR.md](./SUPABASE-CLIENT-ERROR.md) | Known client/setup issues |

## Future interactive-content plan (parked)

The `docs/content/` folder holds the step-by-step plan for interactive modules
(quizzes, simulators, branching scenarios) and the schema they need:

- `07-interactive-content-strategy.md`
- `08-quiz-game-modules.md`
- `09-simulator-modules.md`
- `10-branching-scenarios.md`
- `11-schema-updates.md`

This is a **separate project** — build the real course materials here before wiring
them into the `modules` table.

## SQL

Database schema, RPCs, triggers, and cleanup scripts live in `../sql/`
(`01-supabase-schema.sql` … `24-restamp-admin-and-guard-role.sql`). Run them in order
in the Supabase SQL Editor.
