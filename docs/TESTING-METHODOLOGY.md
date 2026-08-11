# Test Methodology & Framework — Cable&Net Courses LMS

How correctness is proven on this project, what each layer covers, and how to
run/add tests. Supersedes the Step-17 strategy outline
(`docs/test/17-testing-strategy-playwright-pgtap.md`) with the working
implementation.

## Why two layers?

The app is a static HTML/JS frontend backed by Supabase. Correctness depends
on two independent things:

1. **What the UI actually shows** — buttons, redirects, rendered rows.
2. **What the database actually allows** — row-level security (RLS).

A UI that hides a button is *not* the same thing as a database that blocks the
underlying read. Each suite covers the layer the other cannot see:

| Layer | Tool | What it proves |
|-------|------|----------------|
| Browser/UI flows | Playwright | Clicks, redirects, role routing, what renders |
| Database security | pgTAP | RLS policies + SECURITY DEFINER RPCs, from inside Postgres |

## The two suites

### 1. pgTAP — database/security suite (`tests/pgtap/`)

SQL assertions that run **inside Postgres** against a **dedicated TEST Supabase
project** (never production). Proves personas can/cannot read or write exactly
the rows the policies intend, even if a malicious client calls the REST API
directly.

- Bootstrap + personas + fixture rows: `00-bootstrap-fixtures.sql`
- Reconstructed pre-schema for tables that exist in production but were never
  captured in `sql/`: `00-base-schema.sql`
- Test files `01`–`08`, each a transaction that ROLLBACKs (fixtures never persist)
- Runner: `run-pgtap.js` (reset → apply full `sql/` schema → grants sweep →
  bootstrap → per-statement TAP capture)

**Current state: 81 assertions across `01`–`08`, all passing** on the TEST
project (`2026-08-11`).

| File | Proves |
|------|--------|
| `01-schema-integrity` | Tables exist + RLS enabled; critical policy names |
| `02-ai-sessions-rls` | `mentor_ai_sessions`: owner/instructor-course/admin scoping |
| `03-enrollments-rls` | Own-row reads; no self UPDATE/DELETE via REST |
| `04-module-completions-rls` | Own INSERT/UPDATE only; no REST delete |
| `05-profile-role-guard` | Admin/instructor never demoted; students can't self-elevate |
| `06-rpc-authorization` | SECURITY DEFINER RPCs respect role + course assignment |
| `07-batches-staff-read` | Batches staff-SELECT; mutations admin-only RPCs |
| `08-delete-enrollment` | `delete_enrollment` authz + course-scoped cleanup scope |

How tests impersonate users: `tests.set_uid(...)` writes `request.jwt.claims`
so `auth.uid()` resolves to a persona; `set_role_authenticated()` +
`set_role_postgres()` switch the SQL role to toggle RLS on/off. Personas use
fixed UUIDs (`a0000000-…-0001` admin, `…0002` cabling-only instructor,
`…0011` student1, `…0012` student2) so assertions are repeatable.

### 2. Playwright — UI/e2e suite (`tests/specs/`)

Real-browser flows against the live site (local `python -m http.server 4173`
by default, or `LMS_BASE_URL`). Uses the actual Supabase client/key path.

| Spec | Proves |
|------|--------|
| `auth-role-redirect` | Correct per-role landing + rejected bad credentials |
| `cross-role-isolation` | Hand-navigated URLs bounce by role, not CSS-hidden |
| `stalled-report` | Stalled tab stat cards + Un-stall action |
| `remove-from-course` | Instructor Remove flow + **regression guard for sql/61/62** |
| `batches` | Partner batch behavior |

## Environment rules

- **pgTAP only against the TEST Supabase project** — it creates the pgtap
  extension and inserts fixture rows. Running it on production would pollute
  real data.
- **Credentials live only in `tests/.env`** (gitignored). The pgTAP DB URL is
  `LMS_PGTAP_DB_URL` there; the connection uses a Supabase **pooler** host with
  SSL `rejectUnauthorized: false`.
- **Playwright credentials** (`LMS_ADMIN_*`, `LMS_STUDENT_*`,
  `LMS_INSTRUCTOR_*`): admin is required; missing role creds skip (not fail)
  those specs so a fresh clone stays green.
- Schema scripts skip-list for a fresh TEST DB (data-hygiene/diagnostics) lives
  in `run-pgtap.js` as `SKIP_SCHEMA`.

## How to run

```sh
# pgTAP — full suite (reset, apply schema, run all test files)
cd tests
node pgtap\run-pgtap.js all        # or: schema | tests | base

# Playwright — headless against local server (auto-started)
cd tests
npx playwright test
```

## Adding a test

### pgTAP
1. Reuse `set_uid` / `set_role_authenticated` / `set_role_postgres` to set persona.
2. Keep `SELECT plan(N);` at top, `SELECT * FROM finish(); ROLLBACK;` at bottom.
   If you add assertions, bump `plan(N)` — `finish()` fails on mismatch.
3. Data-state checks that must see rows across all courses (e.g. fixtures in
   the *other* course) run as `set_role_postgres()` so RLS doesn't blind them.
4. Don't hardcode catalog module ids — sql/31 reseeds from the sequence. Point
   inserts at the stable fixture module (`id = 9001`) or query an existing row.

### Playwright
1. Add a spec under `tests/specs/`.
2. Add credentials to `tests/.env` only if the flow needs a real account.
3. Run `npx playwright test <spec>`; screenshots/video auto-capture on failure.

## Failure triage

- pgTAP `not ok` → either the applied schema's policy is wrong, or a test
  assumption is stale (stale plan count, hardcoded id, RLS-blind check).
- Playwright failure → first check the spec/flow, and remember the GitHub Pages
  cache is *not* an excuse — hard-refresh check before blaming cache.

## Related docs

- `tests/pgtap/README.md` — file-by-file walkthrough + personas
- `docs/test/17-testing-strategy-playwright-pgtap.md` — original strategy outline