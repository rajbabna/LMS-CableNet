# What Remains — LMS Cable&Net

*Source of truth: `docs/SESSION-HANDOFF.md` + `docs/CURRENT-STATUS.md`. Deployed at
commit `1363ff1`. The Step-17 testing checklist is fully closed
(pgTAP 93/93, Playwright suite green). The Course Companion apps are **deployed to
Puter and wired live** (item 1 below is closed — `js/config.js` has the share URLs),
and opened-from-disk copies run in local-preview mode (no `file://` banner, `1363ff1`).*

---

## Open items

| # | Item | Type | Notes |
|---|------|------|-------|
| 1 | **Beta onboarding** | Owner: **YOU** | Separate-account co-teaching checklist already passed (2026-08-02). **PREPPED 2026-08-12:** live roster verified (5 students), `batch-2026-002` (2026 Intake 2 — Beta) seeded in `batches.json`, invite messages ready (copy-paste) in `docs/content/beta-onboarding-roster.md`. ⏳ **YOUR TASK:** check/extend each student's access duration in the admin dashboard → create any new students → send the invites. |
| 2 | **Instructors cannot read feedback** | Deliberate | Keeps sql/29 Course-scoped RLS clean — intentional, not a bug. |

## Discarded for this phase (not planned)

- Student self-enrollment
- Payments
- Embedded simulators / branching scenarios
- Self-serve expiry / renewal UX

## Housekeeping to remember

- **Beta onboarding prepped 2026-08-12** — roster + invites in
  `docs/content/beta-onboarding-roster.md` (local-only); `batch-2026-002`
  (2026 Intake 2 — Beta) seeded in `docs/resources/batches/batches.json`;
  KrishB + RahnV moved from `test-users` to the beta cohort. Owner: extend access
  durations → create any new students → send invites.
- **Never run pgTAP / bootstrap against production** — the TEST project only
  (`tests/.env` → `LMS_PGTAP_DB_URL`).
- `sql/` is gitignored — migrations stay local-only, never shipped.
- Keep the three local copies in sync: `LMS - V2.0` (git source of truth),
  `Sites\WEB`, `Sites\GitHub Web\cable-net-courses`.
- Run `tools/bump-cache-version.ps1` before pushing if local JS/CSS changed.
- ✅ `sql/63-auto-issue-certificates.sql` applied to the production Supabase SQL
  Editor — certificate auto-issue is now live (was validated on TEST + pgTAP first).