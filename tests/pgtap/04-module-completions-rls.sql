-- ============================================================================
-- 04 - module_completions RLS: own-row INSERT / UPDATE only.
-- The student dashboard "Mark Complete" button upserts directly through REST.
-- Fixtures: student1 completed module 27. No DELETE policy exists -> a REST
-- delete silently affects 0 rows (documented, intentional).
-- ============================================================================

SET search_path = public, auth, extensions;

BEGIN;

SELECT plan(8);

-- 1. student1 reads their own completion row.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint
           FROM public.module_completions
           WHERE user_id = 'a0000000-0000-0000-0000-000000000011'), 1::bigint,
          'student1 sees their own completion');

-- 2. student1 cannot read student''s other rows (student2 has none -> 0 visible).
SELECT is((SELECT count(*)::bigint
           FROM public.module_completions
           WHERE user_id = 'a0000000-0000-0000-0000-000000000012'), 0::bigint,
          'student1 cannot see student2''s completions');

-- 3. student1 CAN insert their own completion for a fresh module (module 1).
SELECT lives_ok(
  'INSERT INTO public.module_completions (user_id, module_id, status, completion_percentage, completed_at)
   VALUES (''a0000000-0000-0000-0000-000000000011'', 1, ''completed'', 100, now())',
  'student1 can insert own completion');

-- 4. student1 CANNOT insert a completion for student2 (WITH CHECK violation).
SELECT throws_ok(
  'INSERT INTO public.module_completions (user_id, module_id, status, completion_percentage, completed_at)
   VALUES (''a0000000-0000-0000-0000-000000000012'', 1, ''completed'', 100, now())',
  '42501',
  NULL,
  'student1 cannot insert a completion for student2');

-- 5. student1 CAN update their own row (bump completed_at) -> affects 1 row.
SELECT lives_ok(
  'UPDATE public.module_completions
   SET completed_at = now()
   WHERE user_id = ''a0000000-0000-0000-0000-000000000011'' AND module_id = 27',
  'student1 can update their own completion');

-- 6. student2 cannot update student1''s row (0 rows affect).
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000012');
SELECT set_role_authenticated();
SELECT is_empty(
  'UPDATE public.module_completions
   SET completed_at = now()
   WHERE user_id = ''a0000000-0000-0000-0000-000000000011'' RETURNING user_id',
  'student2 cannot update student1 completion');

-- 7. no DELETE policy exists -> a REST delete silently affects 0 rows.
SELECT is_empty(
  'DELETE FROM public.module_completions
   WHERE user_id = ''a0000000-0000-0000-0000-000000000011'' RETURNING user_id',
  'student cannot DELETE completions via REST (no delete policy)');

-- 8. confirm the delete really did not happen (row still readable by owner).
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint
           FROM public.module_completions
           WHERE user_id = 'a0000000-0000-0000-0000-000000000011'
             AND module_id = 27), 1::bigint,
          'student1 completion for module 27 survived the delete attempt');

SELECT * FROM finish();
ROLLBACK;