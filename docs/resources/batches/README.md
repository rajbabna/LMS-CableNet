# Cable&Net Courses — Student Batches

Batches group enrolled students into **cohorts** (one intake session/track at a
time) so progress, quizzes, and certificates can be compared per group without
mixing in internal test traffic.

> **Convention:** like the quizzes in `docs/resources/quizzes/`, this is an
> **authoring/roster resource**, not live app state. It is the human- and
> machine-readable source of truth for "who is in which batch". Wiring it into
> the admin dashboard is deliberately deferred — see "Deferred" below.

---

## Why batch students

- **A/B the same course content** across different intakes and compare completion rates.
- **Isolate test data** — QA accounts never pollute real analytics or certificate counts.
- **Stage rollouts** — enroll a pilot batch first, then the rest.
- **Rosters** — instructors see which class a student belongs to at a glance.

---

## The reserved **Test Users** batch

Every grouping scheme needs a guaranteed-empty-of-real-students bucket for
internal QA. This project reserves the batch id **`test-users`**.

| Batch id | Label | Purpose |
|---|---|---|
| `test-users` | Test Users (QA) | Internal + trial accounts used to verify the LMS; excluded from real reporting |

No real student should ever be placed here. When real analytics run, rows whose
batch is `test-users` are dropped first.

## Naming real batches

```
batch <year>-<NNN>      label for humans      starts
batch-2026-001          "2026 Intake 1"       (start date)
batch-2026-002          "2026 Intake 2"       02 Aug 2026
```

- **ID:** always lowercase, `batch-YYYY-NNN`, zero-padded, never reused.
- A batch is **sealed** once its intake window closes — membership is fixed so
  comparisons stay apples-to-apples.

## Membership rules

1. **One batch per student.** A student appears in exactly one batch.
2. **Express assignment, not inference.** A student is placed in a batch only by
   an explicit entry in `batches.json` (or the admin UI later) — never guessed
   from email domains.
3. **Test detection is explicit.** Because some test users use `@gmail.com`, the
   "is this a test account?" answer comes from the `test-users` roster, not a
   domain rule.
4. **Probes are dropped.** `__probe_*@example.com` cleanup rows never enter any
   batch (they are artifacts, see `sql/11-cleanup-users.sql`).

---

## Effective way to batch (the mechanism)

1. **Edit the roster** — `docs/resources/batches/batches.json` maps `batch → [student emails]`.
2. **Validate** — the roster must conform to the schema below (use the validator
   `tools/…/validate-batches.js` if one exists, or eyeball against the table).
3. **Consume** — a later admin-tool / DB seed imports the same file, so the
   resource you author is exactly what ends up grouped. **No app code changes
   are required today**; the file is the commitment point.

### Schema (batches.json)

```jsonc
{
  "schemaVersion": 1,
  "batches": [
    {
      "id": "batch-2026-001",
      "label": "2026 Intake 1",
      "startDate": "2026-07-01",
      "students": ["student-a@example.com"]
    },
    {
      "id": "test-users",
      "label": "Test Users (QA)",
      "startDate": null,
      "isTest": true,
      "students": ["rajbabna@gmail.com"]
    }
  ]
}
```

A batch id that appears in **more than one entry**, or a student email in **more
than one batch**, is a data error (both violate the "exactly one batch" rule).

---

## Deferred (later)

- ~~Admin Dashboard UI to **create/edit batches** and **drag students** between them.~~ ✅ Done — **Batches** tab (`sql/59`): create/archive/delete batches, add/remove students, per-batch progress monitor.
- ~~A `batch` column on the student profile / an `insert` trigger on enrollments.~~ ✅ Done via a **membership table** (`student_batch_members`) + `add_student_to_batch` enforcing "one batch per student" in SQL — no trigger needed.
- ~~Import script that turns `batches.json` into DB rows~~ ✅ `sql/59` section 6 seeds the roster; re-run to re-sync membership.

All three "Deferred (later)" items are now **built and live**. Grouping and per-batch progress monitoring both work in the admin dashboard **Batches** tab.

> Cross-references: `docs/resources/batches/batches.json` (roster),
> `docs/resources/batches/batch-test-users.md` (QA roster details),
> `docs/resources/quizzes/README.md` (sibling resource convention).