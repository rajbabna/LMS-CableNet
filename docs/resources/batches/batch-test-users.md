# Batch `test-users` — Test Users (QA)

> **Batch:** Test Users (QA) · **id:** `test-users`
> **Purpose:** Internal + trial accounts used to verify the Cable&Net LMS.
> **Roster source:** `docs/resources/batches/batches.json` (authoritative)

---

## Why it must stay isolated

These accounts log in, complete modules, and take quizzes the same way real
students do — which makes them ideal for testing the **reset / undo / progress /
donut** flows we keep changing. That also means their progress is **not real
student data** and must never surface in completion-rate analytics or
certificate counts.

## Membership

This is the **allowed list**. A QA account belongs here by explicit entry only.

| Email | Note |
|---|---|
| `rajbabna.backup@gmail.com` | Auxiliary QA/login test account |
| `rajbabna.ml@gmail.com` | Secondary QA account (referenced in admin-creation scripts) |

> **Moved out 2026-08-12:** `rajbabna@gmail.com` (KrishB) and `rahnluv@gmail.com`
> (RahnV) left this QA batch to join **`batch-2026-002`** (2026 Intake 2 — Beta) as
> real cohort students. They keep their progress history; QA-only reporting drops them.

**Explicitly excluded** (they are artifacts, not cohorts): `__probe_*@example.com`
and any `*@probe.example.com` row created by probing.

## Ground rules

1. Add here **only** accounts used by you/QA to test the product.
2. Never move a real student into this batch to "hide" their progress.
3. When real reporting is introduced, drop rows with `batch == "test-users"`
   before computing class statistics.

## How a new test account joins

1. Create the account (e.g. `sql/06-create-admin.sql` pattern or dashboard).
2. Add its email to **both** this file and the `test-users` entry in `batches.json`.
3. Keep the two in agreement — `README.md` calls this the "exactly one batch" rule.

> Cross-references: `batches.json` (roster), `docs/resources/batches/README.md` (scheme).