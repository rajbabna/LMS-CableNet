-- ============================================================================
-- pgTAP bootstrap + fixtures — RUN ONCE on the dedicated TEST Supabase project
-- (NEVER production). Run after the full schema/migrations are applied.
--
-- Creates:
--   * the pgTAP extension (plain, no custom schema)
--   * a tests schema with auth-context helper functions
--   * a deterministic set of fixture accounts + rows referenced by 01-.. files
--
-- Safe to re-run: fixture rows are deleted and re-inserted each time.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgtap;

SET search_path = public, auth, extensions;

-- ---------------------------------------------------------
-- Auth-context helpers. `request.jwt.claims` is what auth.uid()
-- reads; driving it + SET ROLE authenticated in a test block
-- tells RLS "you are acting as this user".
-- ---------------------------------------------------------
DROP SCHEMA IF EXISTS tests CASCADE;
CREATE SCHEMA tests;

CREATE OR REPLACE FUNCTION tests.set_uid(p_uid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION tests.set_role_authenticated()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE 'SET ROLE authenticated';
END;
$$;

CREATE OR REPLACE FUNCTION tests.set_role_postgres()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE 'RESET ROLE';
END;
$$;

-- ---------------------------------------------------------
-- Fixture identities (fixed UUIDs so tests are repeatable)
-- Persona UUIDs are used as literal constants in the test files
-- (a0000000-... for accounts, f1000000-... for AI session rows).
-- ---------------------------------------------------------

SELECT 'pgtap fixtures';

-- Clear anything from a previous run (FK children first).
DELETE FROM public.student_batch_members WHERE student_id IN ('a0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000012');
DELETE FROM public.student_batches WHERE id = 'pgtap-test';
DELETE FROM public.quiz_scores       WHERE user_id IN ('a0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000012');
DELETE FROM public.module_completions WHERE user_id IN ('a0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000012');
DELETE FROM public.mentor_sessions   WHERE student_id IN ('a0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000012');
DELETE FROM public.mentor_ai_sessions WHERE student_id IN ('a0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000012');
DELETE FROM public.stalled_overrides WHERE student_id IN ('a0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000012');
DELETE FROM public.student_audit_log WHERE student_id IN ('a0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000012');
DELETE FROM public.enrollments       WHERE user_id   IN ('a0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000012');
DELETE FROM public.course_instructors WHERE instructor_id IN ('a0000000-0000-0000-0000-000000000002');
DELETE FROM public.profiles WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000011',
  'a0000000-0000-0000-0000-000000000012'
);

-- auth.users rows (required because profiles.id references auth.users)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap.admin@test.local', 'x', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap.instructor@test.local', 'x', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap.student1@test.local', 'x', now(), now(), now()),
  ('a0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap.student2@test.local', 'x', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- profiles (the roles that gate every RPC + staff policy).
-- Upsert (not DO NOTHING): the hardened handle_new_user trigger creates a
-- 'student' profile on the auth.users insert above; this fixture must
-- override it with the persona's real role + approval.
INSERT INTO public.profiles (id, email, full_name, role, approved)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'pgtap.admin@test.local',      'PgTAP Admin',      'admin',      true),
  ('a0000000-0000-0000-0000-000000000002', 'pgtap.instructor@test.local', 'PgTAP Instructor', 'instructor', true),
  ('a0000000-0000-0000-0000-000000000011', 'pgtap.student1@test.local',   'PgTAP Student One', 'student',   true),
  ('a0000000-0000-0000-0000-000000000012', 'pgtap.student2@test.local',   'PgTAP Student Two', 'student',   true)
ON CONFLICT (id) DO UPDATE SET
  email     = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role      = EXCLUDED.role,
  approved  = EXCLUDED.approved;

-- Instructor teaches ONLY the cabling course (so course-scoping is testable).
INSERT INTO public.course_instructors (course_id, instructor_id)
VALUES ('cabling', 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT (course_id, instructor_id) DO NOTHING;

-- Enrollments:
--   student1 -> cabling + networking (expires soon)
--   student2 -> cabling only
INSERT INTO public.enrollments (user_id, course_id, status, expires_at)
VALUES
  ('a0000000-0000-0000-0000-000000000011', 'cabling',    'active', now() + interval '30 days'),
  ('a0000000-0000-0000-0000-000000000011', 'networking', 'active', now() + interval '30 days'),
  ('a0000000-0000-0000-0000-000000000012', 'cabling',    'active', NULL);

-- Module completion: student1 completed networking module 27.
INSERT INTO public.module_completions (user_id, module_id, status)
VALUES ('a0000000-0000-0000-0000-000000000011', 27, 'completed');

-- quiz_scores tied to the networking quiz module (27)
INSERT INTO public.quiz_scores (user_id, module_id, attempts, best_score)
VALUES
  ('a0000000-0000-0000-0000-000000000011', 27, 3, 100),
  ('a0000000-0000-0000-0000-000000000012', 27, 1, 80);

-- stalled flag on student1's cabling enrollment.
INSERT INTO public.stalled_overrides (student_id, course_id, stalled)
VALUES ('a0000000-0000-0000-0000-000000000011', 'cabling', true);

-- auditor log entry for student1
INSERT INTO public.student_audit_log (student_id, course_id, action, changed_at)
VALUES ('a0000000-0000-0000-0000-000000000011', 'cabling', 'enrolled', now());

-- human mentor sessions (staff-only table): one for student1 on cabling by our instructor.
INSERT INTO public.mentor_sessions (student_id, instructor_id, course_id, topic, follow_up_status)
VALUES
  ('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000002', 'cabling', 'Cable termination review', 'open'),
  ('a0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'cabling', 'Intro coaching', 'open');

-- AI mentor shared sessions (opt-in): student1 on cabling + networking, student2 on cabling.
-- Fixed ids (f1000000-...) so the cross-user update tests can target a concrete row.
INSERT INTO public.mentor_ai_sessions (id, student_id, course_id, topic_summary, message_count)
VALUES
  ('f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000011', 'cabling',    'Question about T568B vs T568A', 3),
  ('f1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000011', 'networking', 'Asked about VLANs', 5),
  ('f1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000012', 'cabling',    'Asked about tester usage', 2)
ON CONFLICT (id) DO NOTHING;

-- batches: staff-read-only set
INSERT INTO public.student_batches (id, label, start_date) VALUES ('pgtap-test', 'PgTAP fixture batch', CURRENT_DATE);
INSERT INTO public.student_batch_members (batch_id, student_id) VALUES
  ('pgtap-test', 'a0000000-0000-0000-0000-000000000011'),
  ('pgtap-test', 'a0000000-0000-0000-0000-000000000012');

SELECT 'init complete';