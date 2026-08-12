# What Remains — LMS Cable&Net

*Source of truth: `docs/SESSION-HANDOFF.md` + `docs/CURRENT-STATUS.md`. Deployed at
commit `d9e1a7e`. The Step-17 testing checklist is fully closed
(pgTAP 93/93, Playwright suite green). The Course Companion apps are **deployed to
Puter and wired live** (item 1 below is closed — `js/config.js` has the share URLs).*

---

## Open items

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | **Beta onboarding** | Owner action | Separate-account co-teaching checklist already passed (2026-08-02). Onboard beta students next. |
| 2 | **Instructors cannot read feedback** | Deliberate | Keeps sql/29 Course-scoped RLS clean — intentional, not a bug. |

## Discarded for this phase (not planned)

- Student self-enrollment
- Payments
- Embedded simulators / branching scenarios
- Self-serve expiry / renewal UX

## Housekeeping to remember

- **Never run pgTAP / bootstrap against production** — the TEST project only
  (`tests/.env` → `LMS_PGTAP_DB_URL`).
- `sql/` is gitignored — migrations stay local-only, never shipped.
- Keep the three local copies in sync: `LMS - V2.0` (git source of truth),
  `Sites\WEB`, `Sites\GitHub Web\cable-net-courses`.
- Run `tools/bump-cache-version.ps1` before pushing if local JS/CSS changed.
- ✅ `sql/63-auto-issue-certificates.sql` applied to the production Supabase SQL
  Editor — certificate auto-issue is now live (was validated on TEST + pgTAP first).