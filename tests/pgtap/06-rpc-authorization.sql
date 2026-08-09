-- ============================================================================
-- 06 - RPC authorization: SECURITY DEFINER functions must still respect the
-- caller's role and course assignments even though they bypass RLS.
--   * instructor (assigned cabling only) must see data only for cabling.
--   * admin sees everything.
--   * students get 'not_authorized' / no rows from staff RPCs.
-- ============================================================================

SET search_path = public, auth, extensions;

BEGIN;

SELECT plan(8);

-- ---------------------------------------------------------
-- log_mentor_session(): instructor-only write.
-- ---------------------------------------------------------
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT is(public.log_mentor_session(
  'a0000000-0000-0000-0000-000000000011', 'topic unauthorized', 'cabling', NULL, NULL, NULL, NULL),
  'not_authorized',
  'student cannot use log_mentor_session');

SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000002');
SELECT set_role_authenticated();
SELECT is(public.log_mentor_session(
  'a0000000-0000-0000-0000-000000000011', 'Week 3 check-in', 'cabling', NULL, 'All good', 'passing', 'retest T568B'),
  'ok',
  'instructor can log a mentor session for an enrolled student');

-- ------------------------------------------------------------
-- get_quiz_scores_for_course(): admin all, instructor assigned only,
--                               students nothing.
-- ------------------------------------------------------------
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.get_quiz_scores_for_course('networking')),
  0::bigint, 'student sees no quiz scores for any course');

SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000002');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.get_quiz_scores_for_course('networking')),
  0::bigint, 'cabling-only instructor sees no networking quiz scores');

SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000001');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.get_quiz_scores_for_course('networking')),
  2::bigint, 'admin sees quiz scores for networking (both students)');

-- ------------------------------------------------------------
-- get_ai_mentor_sessions_for_student(): course-scoped for instructors.
--   student1 has AI sessions on cabling + networking; instructor #002 owns
--   only cabling -> only the cabling chat appears.
-- ------------------------------------------------------------
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.get_ai_mentor_sessions_for_student(
  'a0000000-0000-0000-0000-000000000011')),
  0::bigint, 'student cannot read AI mentor sessions RPC');

SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000002');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.get_ai_mentor_sessions_for_student(
  'a0000000-0000-0000-0000-000000000011')),
  1::bigint, 'cabling instructor sees only cabling AI session');

SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000001');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.get_ai_mentor_sessions_for_student(
  'a0000000-0000-0000-0000-000000000011')),
  2::bigint, 'admin sees all of student1''s AI sessions');

SELECT * FROM finish();
ROLLBACK;