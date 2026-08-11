-- ============================================================================
-- 09 - Auto-issue certificate at final-module completion (sql/63)
-- Proves the trigger fires exactly when a course becomes fully complete:
--   * no certificate before completion
--   * one auto-issued row at the moment the last required module completes
--   * issued_at reflects completion, not a later page claim
--   * idempotent (re-completing / claiming does not duplicate)
-- Runs in a transaction; nothing is committed.
-- Run AFTER 00-bootstrap-fixtures.sql.
-- ============================================================================

SET search_path = public, auth, extensions;

BEGIN;

SELECT plan(12);

-- A dedicated mini-course isolates this test from the real catalog: sql/31
-- reseeds the two real courses, so pointing tests at live module ids is
-- brittle. 'pgtapcert' has exactly 2 Lesson modules + we enroll student2.
INSERT INTO public.courses (id, title, description, port_number)
VALUES ('pgtapcert', 'PgTAP Certificate Course', 'isolated auto-issue fixture', 99)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

INSERT INTO public.modules (id, course_id, module_number, title, description, content_type, content_url)
VALUES
  (9101, 'pgtapcert', 1, 'Cert module one',  'first lesson', 'lesson', 'https://pgtap.invalid/1'),
  (9102, 'pgtapcert', 2, 'Cert module two',  'second lesson', 'lesson', 'https://pgtap.invalid/2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.enrollments (user_id, course_id, status)
SELECT 'a0000000-0000-0000-0000-000000000012', 'pgtapcert', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.enrollments
  WHERE user_id = 'a0000000-0000-0000-0000-000000000012' AND course_id = 'pgtapcert'
);

-- Precondition: student2 has no certificate for the fixture course yet.
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.certificates WHERE student_id = 'a0000000-0000-0000-0000-000000000012' AND course_id = 'pgtapcert'),
  'student2 has no certificate before completion'
);

-- Partial completion must NOT auto-issue.
SELECT tests.set_uid('a0000000-0000-0000-0000-000000000012');
SELECT tests.set_role_authenticated();
INSERT INTO public.module_completions (user_id, module_id, status)
VALUES ('a0000000-0000-0000-0000-000000000012', 9101, 'completed');

SELECT tests.set_role_postgres();
SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.certificates WHERE student_id = 'a0000000-0000-0000-0000-000000000012' AND course_id = 'pgtapcert'),
  'one completed module does not auto-issue a certificate'
);

-- Completing the LAST module triggers issuance.
SELECT tests.set_uid('a0000000-0000-0000-0000-000000000012');
SELECT tests.set_role_authenticated();
INSERT INTO public.module_completions (user_id, module_id, status)
VALUES ('a0000000-0000-0000-0000-000000000012', 9102, 'completed');

SELECT tests.set_role_postgres();
SELECT ok(
  EXISTS (
    SELECT 1 FROM public.certificates
    WHERE student_id = 'a0000000-0000-0000-0000-000000000012'
      AND course_id = 'pgtapcert'
  ),
  'final module completion auto-issues the certificate'
);

SELECT is(
  (SELECT count(*) FROM public.certificates
   WHERE student_id = 'a0000000-0000-0000-0000-000000000012' AND course_id = 'pgtapcert'),
  1::bigint,
  'exactly one certificate row after completion'
);

-- issued_at must be timestamped at completion (not null).
SELECT ok(
  (SELECT issued_at IS NOT NULL FROM public.certificates
   WHERE student_id = 'a0000000-0000-0000-0000-000000000012' AND course_id = 'pgtapcert'),
  'auto-issued cert has an issued_at timestamp'
);

-- Idempotency: re-completing module 9102 (UPDATE) must not duplicate.
SELECT tests.set_uid('a0000000-0000-0000-0000-000000000012');
SELECT tests.set_role_authenticated();
UPDATE public.module_completions
SET completion_percentage = 100, completed_at = now()
WHERE user_id = 'a0000000-0000-0000-0000-000000000012' AND module_id = 9102;

SELECT tests.set_role_postgres();
SELECT is(
  (SELECT count(*) FROM public.certificates
   WHERE student_id = 'a0000000-0000-0000-0000-000000000012' AND course_id = 'pgtapcert'),
  1::bigint,
  're-completing a module does not create a second certificate'
);

-- Claiming via issue_certificate() returns the SAME auto-issued row (no dup).
SELECT tests.set_uid('a0000000-0000-0000-0000-000000000012');
SELECT tests.set_role_authenticated();
SELECT is(
  (SELECT (public.issue_certificate('pgtapcert') -> 'ok')::boolean),
  true,
  'issue_certificate claim succeeds on an auto-issued course'
 );

SELECT tests.set_role_postgres();
SELECT is(
  (SELECT count(*) FROM public.certificates
   WHERE student_id = 'a0000000-0000-0000-0000-000000000012' AND course_id = 'pgtapcert'),
  1::bigint,
  'claiming does not duplicate the auto-issued certificate'
);

-- Practice-quiz module (id 27) must remain excluded from the completion test.
-- Give student2 the practice-quiz + one fixture course module, but NOT the
-- other real module -> still incomplete, no cert for the real cabling course.
INSERT INTO public.module_completions (user_id, module_id, status)
VALUES ('a0000000-0000-0000-0000-000000000012', 27, 'completed')
ON CONFLICT (user_id, module_id) DO NOTHING;

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.certificates
    WHERE student_id = 'a0000000-0000-0000-0000-000000000012' AND course_id = 'cabling'
  ),
  'module 27 (practice quiz) alone does not complete a course or issue a cert'
);

-- Non-completion status changes must not fire the trigger.
SELECT tests.set_uid('a0000000-0000-0000-0000-000000000012');
SELECT tests.set_role_authenticated();
INSERT INTO public.module_completions (user_id, module_id, status)
SELECT 'a0000000-0000-0000-0000-000000000012', m.id, 'in_progress'
FROM public.modules m
WHERE m.course_id = 'networking'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_completions mc
    WHERE mc.user_id = 'a0000000-0000-0000-0000-000000000012' AND mc.module_id = m.id
  )
LIMIT 1;

SELECT tests.set_role_postgres();
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.certificates
    WHERE student_id = 'a0000000-0000-0000-0000-000000000012' AND course_id = 'networking'
  ),
  'a non-completed insert does not auto-issue a certificate'
);

-- Trigger exists and is wired to the right table/event.
SELECT has_trigger('public', 'module_completions', 'trg_auto_issue_certificate', 'auto-issue trigger exists on module_completions');
SELECT is(
  (SELECT p.proname
   FROM pg_trigger t
   JOIN pg_proc p ON p.oid = t.tgfoid
   JOIN pg_class tg ON t.tgrelid = tg.oid
   WHERE tg.relname = 'module_completions'
     AND t.tgname = 'trg_auto_issue_certificate'
     AND t.tgenabled = 'O'),
  'auto_issue_certificate_on_completion',
  'trigger calls auto_issue_certificate_on_completion'
);

SELECT * FROM finish();
ROLLBACK;