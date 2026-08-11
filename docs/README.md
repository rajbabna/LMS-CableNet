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

## Testing

| Doc | What it covers |
|-----|----------------|
| [TESTING-METHODOLOGY.md](./TESTING-METHODOLOGY.md) | **Current framework** — pgTAP (RLS/security) + Playwright (UI flows), env rules, how to run/add tests |
| `test/17-testing-strategy-playwright-pgtap.md` | Original Step-17 strategy outline (superseded by the methodology doc) |

## Future interactive-content plan (parked)

The `docs/content/` folder holds the step-by-step plan for interactive modules
(quizzes, simulators, branching scenarios) and the schema they need:

- `07-interactive-content-strategy.md`
- `08-quiz-game-modules.md`
- `09-simulator-modules.md`
- `10-branching-scenarios.md`
- `11-schema-updates.md`

Parts are built on top of live data — the quiz + question banks (modules 1–9 both
courses, the source for both the online quiz and the per-module **study packs**) are
shipped; simulators / branching scenarios are not. Business-logic docs 12–16 cover
study packs (built), the Puter course-app (not built), and the AI Mentor flow (built).

## SQL

Database schema, RPCs, triggers, and cleanup scripts live in `../sql/`
(`01-supabase-schema.sql` … `60-block-self-elevation.sql`). Run them in order
in the Supabase SQL Editor.
