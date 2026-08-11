-- ============================================================================
-- PRE-SCHEMA — reconstruct the base tables that were hand-built in the
-- production project and are referenced by tests/pgtap but never captured
-- in a sql/ file. Applied to the TEST project ONLY, before sql/01-62.
--
-- These tables exist in production (confirmed by docs/test + sql/* comments):
--   profiles, enrollments, module_completions, stalled_overrides,
--   student_audit_log, course_progress_view.
-- Definition recap (from sql/02 + frontend + RPCs):
--   * enrollments.user_id  (NOT student_id)
--   * stalled_overrides.stalled (NOT is_stalled), added reason/updated_at via
--     later scripts (kept here since sql/58/34 use IF NOT EXISTS anyway).
--   * course_progress_view has last_activity column.
-- Run as postgres (same privilege level Supabase dashboard uses).
-- ============================================================================

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text,
  full_name  text,
  role       text NOT NULL DEFAULT 'student',
  approved   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Production has profiles RLS dashboard-configured (sql/10 comments on it).
-- Reconstruct the invariant the suite asserts: RLS on, SELECT own-row only,
-- no UPDATE/INSERT/DELETE policies (writes happen through SECURITY DEFINER
-- RPCs/triggers, so students cannot self-elevate via REST).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ---------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.enrollments (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id    text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'active',
  enrolled_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at   timestamptz
);

-- ---------------------------------------------------------------
-- module_completions
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.module_completions (
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id             bigint NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'completed',
  completion_percentage numeric DEFAULT 100,
  completed_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

-- ---------------------------------------------------------------
-- stalled_overrides
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stalled_overrides (
  student_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id    text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  stalled      boolean NOT NULL DEFAULT false,
  reason       text,
  overridden_by uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);

-- ---------------------------------------------------------------
-- student_audit_log
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_audit_log (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id      text REFERENCES public.courses(id) ON DELETE CASCADE,
  action         text NOT NULL,
  previous_status text,
  new_status     text,
  changed_by     uuid,
  changed_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- course_progress_view (live shape incl. last_activity; security_invoker
-- is set by a later script, so we set it here too to match production).
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.course_progress_view AS
SELECT
  e.id                                AS enrollment_id,
  e.user_id                           AS user_id,
  e.course_id                         AS course_id,
  c.title                             AS course_title,
  c.port_number                       AS port_number,
  COUNT(DISTINCT m.id)                AS total_modules,
  COUNT(*) FILTER (WHERE mc.status = 'completed') AS completed_modules,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE mc.status = 'completed')
    / NULLIF(COUNT(DISTINCT m.id), 0)
  )                                   AS progress_percentage,
  e.status                            AS status,
  e.enrolled_at                       AS enrolled_at,
  e.completed_at                      AS completed_at,
  MAX(mc.completed_at)                AS last_activity
FROM enrollments e
JOIN courses c       ON c.id = e.course_id
JOIN modules m       ON m.course_id = e.course_id
LEFT JOIN module_completions mc
       ON mc.module_id = m.id AND mc.user_id = e.user_id AND mc.status = 'completed'
GROUP BY e.id, e.user_id, e.course_id, c.title, c.port_number,
         e.status, e.enrolled_at, e.completed_at;

ALTER VIEW public.course_progress_view SET (security_invoker = true);

-- Supabase default grants (mirror what the dashboard/table editor grants).
GRANT ALL ON TABLE public.profiles            TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.enrollments         TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.module_completions  TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stalled_overrides   TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.student_audit_log   TO anon, authenticated, service_role;

SELECT 'pre-schema base tables done';