-- ============================================================================
-- 01 - Schema integrity + RLS enabled + critical policies exist
-- Runs in a transaction; nothing is committed.
-- Run AFTER 00-bootstrap-fixtures.sql.
-- ============================================================================

SET search_path = public, auth, extensions;

BEGIN;

SELECT plan(24);

-- ---------------------------------------------------------
-- Every table holding student data must exist AND have RLS on.
-- ---------------------------------------------------------
SELECT has_table('public', 'profiles',               'profiles table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass), 'profiles has RLS enabled');

SELECT has_table('public', 'enrollments',            'enrollments table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.enrollments'::regclass), 'enrollments has RLS enabled');

SELECT has_table('public', 'module_completions',     'module_completions table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.module_completions'::regclass), 'module_completions has RLS enabled');

SELECT has_table('public', 'stalled_overrides',      'stalled_overrides table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.stalled_overrides'::regclass), 'stalled_overrides has RLS enabled');

SELECT has_table('public', 'student_audit_log',      'student_audit_log table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.student_audit_log'::regclass), 'student_audit_log has RLS enabled');

SELECT has_table('public', 'mentor_sessions',        'mentor_sessions table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.mentor_sessions'::regclass), 'mentor_sessions has RLS enabled');

SELECT has_table('public', 'mentor_ai_sessions',     'mentor_ai_sessions table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.mentor_ai_sessions'::regclass), 'mentor_ai_sessions has RLS enabled');

SELECT has_table('public', 'quiz_scores',            'quiz_scores table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.quiz_scores'::regclass), 'quiz_scores has RLS enabled');

SELECT has_table('public', 'student_batches',        'student_batches table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.student_batches'::regclass), 'student_batches has RLS enabled');

SELECT has_table('public', 'student_batch_members',  'student_batch_members table exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.student_batch_members'::regclass), 'student_batch_members has RLS enabled');

-- ---------------------------------------------------------
-- The critical policies that the behavioural tests depend on.
-- ---------------------------------------------------------
SELECT policy_cmd_is('public', 'enrollments', 'enrollments_select_own',   'SELECT', 'students can select own enrollment');
SELECT policy_cmd_is('public', 'module_completions', 'module_completions_insert_own', 'INSERT', 'students insert their own completions only');
SELECT policy_cmd_is('public', 'mentor_ai_sessions', 'ai_sessions_select_owner_staff', 'SELECT', 'AI sessions visible to owner + staff');
SELECT policy_cmd_is('public', 'mentor_sessions', 'mentor_sessions_select_staff', 'SELECT', 'mentor sessions staff-only');

SELECT * FROM finish();
ROLLBACK;