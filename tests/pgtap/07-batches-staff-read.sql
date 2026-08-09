-- ============================================================================
-- 07 - student_batches / student_batch_members: staff read-only at RLS level;
--       all mutations go through admin-only SECURITY DEFINER RPCs (assert_admin).
-- ============================================================================

SET search_path = public, auth, extensions;

BEGIN;

SELECT plan(6);

-- 1. a student cannot READ batches directly (staff policy only).
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.student_batches), 0::bigint,
  'student sees no partner batches');

-- 2. a student cannot INSERT into student_batches through REST (no policy,
--    so the INSERT must raise a policy violation).
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT throws_ok(
  'INSERT INTO public.student_batches (id, label) VALUES (''student-made'', ''nope'')',
  NULL,
  NULL,
  'student cannot insert batch rows via REST (no INSERT policy)');

-- 3. instructor CAN read the batch list (staff) via RLS.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000002');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.student_batches), 1::bigint,
  'instructor sees batches via staff SELECT policy');

-- 4. but the batch mutation RPCs are ADMIN-only: list_batches raises for them.
SELECT throws_ok(
  'SELECT public.list_batches()',
  NULL,
  'Not authorized: admin only',
  'instructor cannot list batches (admin-only RPC)');

-- 5. admin can read batches + call list_batches.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000001');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.student_batches), 1::bigint,
  'admin sees all batches');
SELECT is((SELECT count(*)::bigint FROM public.list_batches()), 1::bigint,
  'admin list_batches returns the fixture batch');

SELECT * FROM finish();
ROLLBACK;