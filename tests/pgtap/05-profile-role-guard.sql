-- ============================================================================
-- 05 - profile role elevation/demotion guard.
-- sql/24 hardened set_profile_role so it can NEVER demote admin/instructor.
-- docs/test/17 additionally requires: a student cannot self-elevate their own
-- role field through the database.
--
-- Because RLS policies on profiles are configured in the dashboard (sql/10
-- only comments on them), these tests assert the INVARIANT (the caller's role
-- never changes) rather than the mechanism. A change can arrive via either
-- a REST UPDATE (direct policy) or the set_profile_role RPC.
-- ============================================================================

SET search_path = public, auth, extensions;

BEGIN;

SELECT plan(9);

-- 1. Admin cannot be demoted by set_profile_role('student').
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000001');
SELECT set_role_authenticated();
SELECT lives_ok('SELECT public.set_profile_role(''student'')',
  'admin may call set_profile_role without error');
SELECT is((SELECT role FROM public.profiles WHERE id = 'a0000000-0000-0000-0000-000000000001'), 'admin',
  'admin role is NOT demoted by set_profile_role(''student'')');

-- 2. Instructor cannot be demoted either.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000002');
SELECT set_role_authenticated();
SELECT lives_ok('SELECT public.set_profile_role(''student'')',
  'instructor can call set_profile_role without error');
SELECT is((SELECT role FROM public.profiles WHERE id = 'a0000000-0000-0000-0000-000000000002'), 'instructor',
  'instructor role is NOT demoted by set_profile_role(''student'')');

-- 3. A student attempts to raise their role to admin through a direct REST
--    UPDATE (the classic self-elevation attack). It must not stick.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT is_empty(
  'UPDATE public.profiles SET role = ''admin''
   WHERE id = ''a0000000-0000-0000-0000-000000000011'' RETURNING id',
  'student cannot UPDATE their own profiles.role (no UPDATE policy)');

SELECT is((SELECT role FROM public.profiles WHERE id = 'a0000000-0000-0000-0000-000000000011'), 'student',
  'student1 role is still student after the attempted self-update');

-- 4. Self-elevation through the set_profile_role RPC must also be blocked.
--    KNOWN GAP (marked as a pgTAP todo): sql/24 as written will happily
--    SET an existing student to 'instructor' (WHERE only guards demotion).
--    So the private_call+role checks below document the REQUIREMENT and are
--    expected to be flagged as failing todos until the function is tightened.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT todo_start('set_profile_role currently allows a student to self-elevate — needs tightening');
SELECT lives_ok('SELECT public.set_profile_role(''instructor'')',
  'student''s set_profile_role(''instructor'') call completes (gap: currently this elevates)');
SELECT is((SELECT role FROM public.profiles WHERE id = 'a0000000-0000-0000-0000-000000000011'), 'student',
  'student1 role still student AFTER set_profile_role(''instructor'') — self-elevation blocked');
SELECT todo_end();

-- 5. profiles: staff can read only their OWN row via RLS (no blanket staff read).
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000001');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.profiles), 1::bigint,
  'admin reads only its own profile row via RLS');

SELECT * FROM finish();
ROLLBACK;