# pgTAP test suite — LMS Supabase RLS & security

Speeds you up on **roadmap item #10 (automated testing, second half)**.
These are SQL-level tests that prove the app's Row Level Security and
SECURITY DEFINER RPCs behave correctly for real personas.

## When to run

Only ever against a **dedicated TEST Supabase project** (or local pg with the
full schema applied). **Never run against the live/production project** —
the extension + fixture inserts would pollute real data. See
`docs/test/17-testing-strategy-playwright-pgtap.md`.

## Prerequisites on the test project

1. Enable the **pgTAP** extension in the Supabase dashboard:
   Database → Extensions → search `pgtap` (schema: `extensions`).
   It is created by `00-bootstrap-fixtures.sql` as a fallback too.
2. Apply the **entire SQL schema** in numbered order (`sql/01` … latest),
   because every test file references the live tables, RLS, and RPCs.
3. Make sure the fixture accounts' courses exist — the bootstrap inserts
   rows against `cabling` / `networking`, course id 27, and the
   `course_instructors` mapping. If a course id differs in your project,
   adjust `00-bootstrap-fixtures.sql` before running.

## How to run

In the Supabase SQL Editor the pattern is: paste the bootstrap **once**, then
run each numbered file inside a transaction that ROLLBACKs so the fixtures
never persist:

```sql
-- 1) once:
tests:  00-bootstrap-fixtures.sql   (Ctl directions: run as a plain script)

-- 2) each test file, wrapped so nothing is written:
BEGIN;
-- paste the entire 01-schema-integrity.sql
ROLLBACK;
```

Each test file already begins with `BEGIN;` and ends with `SELECT * FROM finish();` + `ROLLBACK;` so you can safely paste a whole file into the editor
(`finish()` prints the TAP summary, `ROLLBACK` discards fixture changes).

Alternatively with the Supabase CLI + a local DB:

```bash
supabase test db --pgpgtap ...   # docker-based, migrations applied (per-strategy)
```

## Files

| File | What it proves |
|------|----------------|
| `00-bootstrap-fixtures.sql` | pgTAP ext, `tests` helper schema (`set_uid`/`set_role_authenticated`), 4 personas + fixture rows. Runs once. |
| `01-schema-integrity.sql` | Tables exist + RLS enabled; critical policy names exist. |
| `02-ai-sessions-rls.sql` | `mentor_ai_sessions`: owner reads own; instructor course-scoped; admin all; no cross-user UPDATE. |
| `03-enrollments-rls.sql` | `enrollments`: own-row reads; no UPDATE/DELETE path via REST; expiry not self-widened. |
| `04-module-completions-rls.sql` | own INSERT/UPDATE only; cross-user insert/update denied; no REST delete. |
| `05-profile-role-guard.sql` | `set_profile_role` never demotes admin/instructor; students can''t self-elevate via REST or the RPC (sql/60 blocks it). |
| `06-rpc-authorization.sql` | SECURITY DEFINER RPCs respect role + course assignment (instructor scoping). |
| `07-batches-staff-read.sql` | batches staff SELECT only; admin-only mutation RPCs. |
| `08-delete-enrollment.sql` | `delete_enrollment` (sql/61): students blocked, instructor scoped to assigned course, course-scoped data wiped, other courses + account kept, audit trail written. |

## Personas (fixed UUIDs)

| Alias      | UUID suffix (`a0000000-0000-0000-0000-0000`) | Role       |
|------------|---------------------------------------------|------------|
| admin      | `…0001`                                     | admin      |
| instructor | `…0002`                                     | instructor (assigned to **cabling only**) |
| student1   | `…0011`                                     | student (enrolled cabling + networking) |
| student2   | `…0012`                                     | student (enrolled cabling only) |

Fixture rows: 3 AI sessions (s1 cabling+networking, s2 cabling), 2 human mentor
sessions, 1 quiz score each on module 27, 1 stalled override + audit row for
student1, and a `pgtap-test` batch containing both students.

## Adding a test

- Reuse the `tests.set_uid(...)` / `tests.set_role_authenticated()` helpers
  to push `request.jwt.claims` so `auth.uid()` resolves to the persona.
- Each file keeps the exact `SELECT plan(N);` prepended and
  `SELECT * FROM finish(); ROLLBACK;` at the end. If you add assertions,
  update the `plan(N)` count — `finish()` will yell if the numbers disagree.

## Verification tip

`finish()` prints a TAP summary: `not ok` lines mean either a policy is wrong
in the applied schema or an assumption in the test is stale. Grep the text
`description` strings to pinpoint which assertion failed.