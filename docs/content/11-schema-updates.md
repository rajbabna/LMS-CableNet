# Step 11 — Database Schema Updates

## Overview

This step consolidates all the new tables needed for interactive content (quizzes, simulators, scenarios) into one SQL migration script. Run this once in Supabase to set up the full system.

---

## What's Being Added

| Table | Purpose | Used by |
|---|---|---|
| `quiz_questions` | Store quiz questions | Quiz modules |
| `quiz_options` | Multiple choice answers | Quiz modules |
| `quiz_responses` | Individual student answers | Quiz modules (grading) |
| `quiz_scores` | Aggregated quiz results | Dashboard, analytics |
| `simulator_attempts` | Track simulator retries | Simulators (analytics) |
| `scenario_outcomes` | Store decision paths | Branching scenarios |

**Tables you already have:**
- `modules` — course structure
- `module_completions` — progress tracking
- `profiles`, `enrollments`, `courses` — core system

---

## Full Migration Script

Paste this entire script into Supabase → **SQL Editor → New query** and click **Run**:

```sql
-- =====================================================================
-- Interactive Content Schema
-- Run this once to set up quizzes, simulators, and scenarios
-- =====================================================================

-- Quiz Questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id TEXT PRIMARY KEY,
  module_id TEXT REFERENCES public.modules(id) ON DELETE CASCADE,
  question_number INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', 'matching'
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Multiple choice options
CREATE TABLE IF NOT EXISTS public.quiz_options (
  id TEXT PRIMARY KEY,
  question_id TEXT REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  option_order INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Individual quiz responses (for detailed grading/review)
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  student_answer TEXT,
  is_correct BOOLEAN,
  response_time_seconds INT,
  attempt_number INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Aggregated quiz scores (one row per student per module)
CREATE TABLE IF NOT EXISTS public.quiz_scores (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  attempts INT DEFAULT 1,
  best_score NUMERIC DEFAULT 0,
  best_attempt_number INT DEFAULT 1,
  last_attempt_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Simulator attempts (track retries for simulators)
CREATE TABLE IF NOT EXISTS public.simulator_attempts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  attempt_number INT DEFAULT 1,
  result TEXT, -- 'correct', 'incorrect', 'partial'
  time_spent_seconds INT,
  configuration JSONB, -- optional: store their final configuration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Branching scenario outcomes (store decision paths)
CREATE TABLE IF NOT EXISTS public.scenario_outcomes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  decision_path JSONB NOT NULL, -- array of choice IDs made
  final_score INT DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================================
-- Indexes (speed up queries)
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_quiz_questions_module_id 
  ON public.quiz_questions(module_id);

CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id 
  ON public.quiz_options(question_id);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_module 
  ON public.quiz_responses(user_id, module_id);

CREATE INDEX IF NOT EXISTS idx_quiz_scores_user_module 
  ON public.quiz_scores(user_id, module_id);

CREATE INDEX IF NOT EXISTS idx_simulator_attempts_user_module 
  ON public.simulator_attempts(user_id, module_id);

CREATE INDEX IF NOT EXISTS idx_scenario_outcomes_user_module 
  ON public.scenario_outcomes(user_id, module_id);

-- =====================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================

-- Quiz questions: students can read, but not create/edit
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read quiz questions"
  ON public.quiz_questions FOR SELECT
  USING (true); -- Public read

-- Quiz responses: students can only see their own
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own quiz responses"
  ON public.quiz_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own quiz responses"
  ON public.quiz_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Quiz scores: students can only see their own
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own quiz scores"
  ON public.quiz_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert/update own quiz scores"
  ON public.quiz_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own quiz scores"
  ON public.quiz_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Simulator attempts: students can only see their own
ALTER TABLE public.simulator_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own simulator attempts"
  ON public.simulator_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own simulator attempts"
  ON public.simulator_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Scenario outcomes: students can only see their own
ALTER TABLE public.scenario_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own scenario outcomes"
  ON public.scenario_outcomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own scenario outcomes"
  ON public.scenario_outcomes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- Done!
-- =====================================================================
-- All tables are now set up. 
-- Next: Create quiz data and integrate with modules.
```

---

## Running the Migration

1. Go to Supabase → **SQL Editor**
2. Click **New query**
3. **Paste the entire script above**
4. Click **Run**
5. Watch the output — should see:
   - `CREATE TABLE` messages for each table
   - `CREATE INDEX` messages
   - `ALTER TABLE ENABLE` messages
   - Any error messages in red (usually means table already exists, which is fine)

---

## Verifying It Worked

1. Go to **Table Editor** (left sidebar)
2. You should see these new tables:
   - `quiz_questions`
   - `quiz_options`
   - `quiz_responses`
   - `quiz_scores`
   - `simulator_attempts`
   - `scenario_outcomes`

3. Click into one and verify columns exist

---

## Updating `modules` Table (If Needed)

Depending on your existing `modules` table, you may need to add a `content_type` column to distinguish quiz modules from simulators:

```sql
ALTER TABLE public.modules 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'lesson';
-- Values: 'lesson', 'quiz', 'simulator', 'scenario'
```

---

## Seeding Test Data (Optional)

Want to test with sample quiz questions? Paste this:

```sql
-- Sample quiz for testing
INSERT INTO public.quiz_questions 
  (id, module_id, question_number, question_text, question_type, correct_answer, explanation)
VALUES
  (
    'q-cable-001',
    'cabling', -- assumes you have a course with id='cabling'
    1,
    'What is the first wire in T568B order?',
    'multiple_choice',
    'orange-white',
    'T568B starts with the first striped pair: Orange-White'
  ),
  (
    'q-cable-002',
    'cabling',
    2,
    'Which pair is blue in T568B?',
    'multiple_choice',
    'positions-4-5',
    'In T568B, the blue pair occupies positions 4 and 5'
  );

-- Options for question 1
INSERT INTO public.quiz_options 
  (id, question_id, option_text, option_order)
VALUES
  ('opt-1-a', 'q-cable-001', 'Orange-White', 1),
  ('opt-1-b', 'q-cable-001', 'Green-White', 2),
  ('opt-1-c', 'q-cable-001', 'Blue-White', 3);

-- Options for question 2
INSERT INTO public.quiz_options 
  (id, question_id, option_text, option_order)
VALUES
  ('opt-2-a', 'q-cable-002', 'Positions 1-2', 1),
  ('opt-2-b', 'q-cable-002', 'Positions 4-5', 2),
  ('opt-2-c', 'q-cable-002', 'Positions 7-8', 3);
```

This creates 2 sample quiz questions you can see in **Table Editor**.

---

## Data Relationships

```
Courses
  ├─ Modules
  │   ├─ Quiz Modules
  │   │   ├─ Quiz Questions
  │   │   │   └─ Quiz Options
  │   │   ├─ Quiz Responses (per student answer)
  │   │   └─ Quiz Scores (per student, aggregated)
  │   ├─ Simulator Modules
  │   │   └─ Simulator Attempts (per try)
  │   └─ Scenario Modules
  │       └─ Scenario Outcomes (per completion)
  ├─ Module Completions (progress tracking, all modules)
  └─ Enrollments (students in courses)

Profiles
  ├─ Quiz Responses (student's answers)
  ├─ Quiz Scores (student's scores)
  ├─ Simulator Attempts (student's tries)
  └─ Scenario Outcomes (student's decision paths)
```

---

## Next: Populating Data

Once the schema is in place:

1. **Quiz Modules:**
   - Add questions via `INSERT INTO quiz_questions`
   - Add options via `INSERT INTO quiz_options`
   - Or build an instructor tool to create questions via the UI

2. **Simulator Modules:**
   - Build HTML + JS for each simulator
   - Simulators auto-log to `simulator_attempts` when student completes

3. **Scenario Modules:**
   - Define scenario JSON (questions + branches)
   - ScenarioEngine logs decisions to `scenario_outcomes`

---

## Checklist

- [ ] Ran migration script successfully (no red errors)
- [ ] See all 6 new tables in Table Editor
- [ ] Understand data relationships (modules → questions → responses, etc.)
- [ ] Added sample quiz data (optional)
- [ ] Ready to build first quiz module (Step 8)

---

## Troubleshooting

| Error | Fix |
|---|---|
| `Relation already exists` | Table already exists (safe to ignore if running twice) |
| `Foreign key violation` | Make sure `modules` table exists and has an `id` column |
| `RLS policy not created` | Table already has different RLS policies; delete and re-run |

---

## Next Steps

- **Back to Step 7** — Build your first quiz module using the Quiz Engine
- **Then Step 9** — Build a simulator
- **Then Step 10** — Build a branching scenario

All three types now have database support + the engines to power them.
