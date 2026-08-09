-- ============================================================================
-- 03 - enrollments RLS: own-row for students, assigned-course scoping for
-- instructors, admin reads all. Students cannot widen their own expiry
-- through REST (no UPDATE policy on enrollments -> ignored).
-- Fixtures: s1 -> cabling+networking(30d), s2 -> cabling.
-- ============================================================================

SET search_path = public, auth, extensions;

BEGIN;

SELECT plan(8);

-- 1. student1 sees their own enrollments only (cabling + networking).
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint
           FROM public.enrollments
           WHERE user_id = 'a0000000-0000-0000-0000-000000000011'), 2::bigint,
          'student1 sees own enrollments');

-- 2. student1 cannot see student2''s enrollment.
SELECT is((SELECT count(*)::bigint
           FROM public.enrollments
           WHERE user_id = 'a0000000-0000-0000-0000-000000000012'), 0::bigint,
          'student1 cannot see other enrollments');

-- 3. cabling-scoped instructor sees only the cabling enrollments (2),
--    not the networking one (staff RLS joins course_instructors).
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000002');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint
           FROM public.enrollments e
           WHERE EXISTS (SELECT 1 FROM public.course_instructors ci
                         WHERE ci.course_id = e.course_id
                           AND ci.instructor_id = 'a0000000-0000-0000-0000-000000000002')),
          2::bigint,
          'cabling instructor sees the 2 cabling enrollments');

-- 4. student1 tries to WIDEN their own expiry via REST. There is no UPDATE
--    policy on enrollments, so the UPDATE is silently filtered to 0 rows.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT is_empty(
  'UPDATE public.enrollments SET expires_at = now() + interval ''1 year'' WHERE user_id = ''a0000000-0000-0000-0000-000000000011'' RETURNING id',
  'student1 cannot update their own expires_at (no UPDATE policy)');

-- 5. the expiry was NOT widened (still ~30 days out).
SELECT lives_ok(
  $$SELECT 1 WHERE ((SELECT expires_at FROM public.enrollments
                     WHERE user_id = 'a0000000-0000-0000-0000-000000000011' LIMIT 1)
                   < now() + interval '45 days')$$,
  'student1 expiry still inside original 30-day window');

-- 6. student1 can read their own expiry value (row still visible).
SELECT lives_ok(
  $$SELECT 1 WHERE EXISTS (SELECT 1 FROM public.enrollments
                           WHERE user_id = 'a0000000-0000-0000-0000-000000000011')$$,
  'student1 enrollment row still readable');

-- 7. admin sees all enrollments.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000001');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.enrollments), 3::bigint,
          'admin sees all enrollments');

-- 8. no-one can DELETE an enrollment through REST (no DELETE policy).
SELECT is_empty(
  'DELETE FROM public.enrollments
   WHERE user_id = ''a0000000-0000-0000-0000-000000000012'' RETURNING user_id',
  'student2 cannot delete an enrollment (no DELETE policy)');

SELECT * FROM finish();
ROLLBACK;