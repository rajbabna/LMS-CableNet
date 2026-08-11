# 📚 Docs Index — Cable&Net Courses LMS

> **New here?** Read the root [README.md](../README.md), then go straight to
> [SESSION-HANDOFF.md](./SESSION-HANDOFF.md) (current state) and
> [CURRENT-STATUS.md](./CURRENT-STATUS.md) (single source of truth).

This folder documents the live Cable&Net Courses learning management system.

## Status & current state

| Doc | What it covers |
|-----|----------------|
| [SESSION-HANDOFF.md](./SESSION-HANDOFF.md) | **Read first** — where work left off, creds, deploy pattern, what's next |
| [CURRENT-STATUS.md](./CURRENT-STATUS.md) | Single source of truth for built features, applied SQL, and the live site |

## Testing

| Doc | What it covers |
|-----|----------------|
| [TESTING-METHODOLOGY.md](./TESTING-METHODOLOGY.md) | **Current framework** — pgTAP (RLS/security) on the TEST project + Playwright (UI flows), env rules, how to run/add tests |
| `test/17-testing-strategy-playwright-pgtap.md` | Original Step-17 strategy outline (superseded by the methodology doc, checklist kept) |

## Build inputs (content source)

These folders are read by `tools/build-*.js` to generate the shipped HTML/SQL —
do not delete:

- `cablenet-courses-bundle/*.md` — lesson notes source (via `build-lessons.js`, `build-study-packs.js`)
- `resources/*` — quiz banks, resource bundles, batches (via `build-quizquestions.js`, `build-resources.js`, `build-study-packs.js`, `validate-batches.js`)

## Business logic & roadmap

The `docs/content/` folder holds the interactive-module plan (07–11, partly built),
business-logic docs for study packs (12, built), the Puter course-app (13, built),
and the AI Mentor flow (14–16, built):

- `content/not-built-roadmap.md` — what's built / pending / discarded
- `content/cablenet-lms-issues-to-flag.md` — known issues worth flagging

## SQL

Database schema, RPCs, triggers, and cleanup scripts live in `../sql/`
(`01-supabase-schema.sql` … `62-…`). Run them in order in the Supabase SQL Editor
(production) or via `tests/pgtap/run-pgtap.js` (TEST project only).