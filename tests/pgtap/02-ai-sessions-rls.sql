-- ============================================================================
-- 02 - mentor_ai_sessions RLS: own-row + assigned-course scoping.
-- Personas: student1, student2, instructor (assigned to 'cabling' only), admin.
-- Fixture rows (from bootstrap): s1-cabling, s1-networking, s2-cabling.
-- ============================================================================

SET search_path = public, auth, extensions;

BEGIN;

SELECT plan(8);

SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();

-- 1. student1 sees exactly their own two sessions.
SELECT is((SELECT count(*)::bigint
           FROM public.mentor_ai_sessions
           WHERE student_id = 'a0000000-0000-0000-0000-000000000011'), 2::bigint,
          'student1 sees only their own AI mentor sessions');

-- 2. student1 cannot see student2''s session.
SELECT is((SELECT count(*)::bigint
         FROM public.mentor_ai_sessions
         WHERE student_id = 'a0000000-0000-0000-0000-000000000012'), 0::bigint,
        'student1 cannot see student2 sessions');

-- 3. switch to student2: sees only their own.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000012');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint
         FROM public.mentor_ai_sessions
         WHERE student_id = 'a0000000-0000-0000-0000-000000000012'), 1::bigint,
        'student2 sees only their own session');

-- 4. student2 cannot modify student1''s row (update affects 0 rows).
SELECT is_empty(
  'UPDATE public.mentor_ai_sessions SET message_count = 999
   WHERE id = ''f1000000-0000-0000-0000-000000000001'' RETURNING id',
  'student2 cannot update student1 session');

-- 5. instructor (assigned cabling) sees cabling sessions for both students.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000002');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint
         FROM public.mentor_ai_sessions s
         JOIN public.courses c ON c.id = s.course_id
         WHERE c.id = ''cabling''), 2::bigint,
        'cabling instructor sees her cabling sessions');

-- 6. same instructor cannot see networking sessions (not assigned).
SELECT is((SELECT count(*)::bigint
         FROM public.mentor_ai_sessions
         WHERE course_id = ''networking''), 0::bigint,
        'cabling instructor cannot see networking sessions');

-- 7. admin sees everything.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000001');
SELECT set_role_authenticated();
SELECT is((SELECT count(*)::bigint FROM public.mentor_ai_sessions), 3::bigint,
          'admin sees all AI mentor sessions');

-- 8. student1 can insert their own summary row.
SELECT set_role_postgres();
SELECT set_uid('a0000000-0000-0000-0000-000000000011');
SELECT set_role_authenticated();
SELECT lives_ok(
  'INSERT INTO public.mentor_ai_sessions (student_id, course_id, topic_summary, message_count)
   VALUES (''a0000000-0000-0000-0000-000000000011'', ''cabling'', ''new row'', 1)',
  'student1 can insert their own AI session');

SELECT * FROM finish();
ROLLBACK;