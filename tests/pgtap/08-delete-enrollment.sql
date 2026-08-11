-- ============================================================================
-- 08 - delete_enrollment: authorization + cleanup scope.
--   * students get 'no_permission' (can't unenroll themselves or others).
--   * a cabling-only instructor cannot remove a networking enrollment.
--   * a cabling instructor CAN remove a cabling enrollment.
--   * removal deletes course-scoped data but keeps the account and OTHER
--     courses' data intact.
-- ============================================================================

SET search_path = public, auth, extensions;

BEGIN;

SELECT plan(12);

-- ------------------------------------------------------------
-- 1. student cannot remove an enrollment.
-- ------------------------------------------------------------
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000012');
SELECT set_role_authenticated();
SELECT is(public.delete_enrollment(
    'a0000000-0000-0000-0000-000000000012', 'cabling'),
  'no_permission',
  'student cannot remove an enrollment (no_permission)');

-- ------------------------------------------------------------
-- 2. cabling-only instructor cannot remove a networking enrollment.
-- ------------------------------------------------------------
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000002');
SELECT set_role_authenticated();
SELECT is(public.delete_enrollment(
    'a0000000-0000-0000-0000-000000000011', 'networking'),
  'no_permission',
  'cabling instructor cannot remove a networking enrollment');

-- ------------------------------------------------------------
-- 3. cabling instructor removes student1 from cabling.
-- ------------------------------------------------------------
SELECT is(public.delete_enrollment(
    'a0000000-0000-0000-0000-000000000011', 'cabling'),
  'ok',
  'cabling instructor removes student1 from cabling');

-- Run the remaining scope checks as postgres: the instructor's staff SELECT
-- policies are course-scoped (cabling only), so networking rows are invisible
-- to them even though they still exist. Data-state checks must bypass RLS to
-- assert what delete_enrollment actually did.
SELECT set_role_postgres();

-- 3a. the cabling enrollment row is gone.
SELECT is((SELECT count(*)::bigint
           FROM public.enrollments
           WHERE user_id = 'a0000000-0000-0000-0000-000000000011'
             AND course_id = 'cabling'),
  0::bigint, 'cabling enrollment deleted');

-- 3b. the OTHER course enrollment (networking) survives.
SELECT is((SELECT count(*)::bigint
           FROM public.enrollments
           WHERE user_id = 'a0000000-0000-0000-0000-000000000011'
             AND course_id = 'networking'),
  1::bigint, 'networking enrollment kept');

-- 3c. course-scoped stalled flag on cabling is removed.
SELECT is((SELECT count(*)::bigint
           FROM public.stalled_overrides
           WHERE student_id = 'a0000000-0000-0000-0000-000000000011'
             AND course_id  = 'cabling'),
  0::bigint, 'cabling stalled override deleted');

-- 3d. cabling AI mentor session is gone, networking one survives.
SELECT is((SELECT count(*)::bigint
           FROM public.mentor_ai_sessions
           WHERE student_id = 'a0000000-0000-0000-0000-000000000011'
             AND course_id  = 'cabling'),
  0::bigint, 'cabling AI mentor session deleted');
SELECT is((SELECT count(*)::bigint
           FROM public.mentor_ai_sessions
           WHERE student_id = 'a0000000-0000-0000-0000-000000000011'
             AND course_id  = 'networking'),
  1::bigint, 'networking AI mentor session kept');

-- 3e. networking-scoped data keeps its integrity: module 27 (networking quiz)
--     completion + score are untouched by a CABLING removal.
SELECT is((SELECT count(*)::bigint
           FROM public.module_completions
           WHERE user_id = 'a0000000-0000-0000-0000-000000000011'
             AND module_id = 27),
  1::bigint, 'networking module 27 completion kept');
SELECT is((SELECT count(*)::bigint
           FROM public.quiz_scores
           WHERE user_id = 'a0000000-0000-0000-0000-000000000011'
             AND module_id = 27),
  1::bigint, 'networking module 27 quiz score kept');

-- 3f. the removal is recorded in the audit trail with the acting instructor.
SELECT ok(EXISTS (
    SELECT 1 FROM public.student_audit_log
    WHERE student_id = 'a0000000-0000-0000-0000-000000000011'
      AND course_id  = 'cabling'
      AND action     = 'removed_from_course'
      AND changed_by = 'a0000000-0000-0000-0000-000000000002'
  ), 'removal recorded in student_audit_log with changed_by');

-- 3g. the student profile/account itself is kept.
SELECT ok(EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = 'a0000000-0000-0000-0000-000000000011'
  ), 'student profile/account kept after course removal');

SELECT * FROM finish();
ROLLBACK;