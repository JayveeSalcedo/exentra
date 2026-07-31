-- ─────────────────────────────────────────────────────────────────────────────
-- EXENTRA MIGRATION: Support new question types + missing columns
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. FIX questions.question_type CHECK CONSTRAINT ──────────────────────────
-- Drop the old constraint and add a new one that includes identification + essay

alter table public.questions
  drop constraint if exists questions_question_type_check;

alter table public.questions
  add constraint questions_question_type_check
  check (question_type in (
    'multiple_choice',
    'true_false',
    'identification',
    'essay',
    'coding',
    'short_answer'
  ));

-- ── 2. ADD MISSING COLUMNS TO questions ──────────────────────────────────────

alter table public.questions
  add column if not exists explanation text,
  add column if not exists correct_choice_index integer; -- used by AI generator

-- ── 3. ADD MISSING COLUMNS TO assessments ────────────────────────────────────

alter table public.assessments
  add column if not exists difficulty    text check (difficulty in ('Easy', 'Medium', 'Hard', 'Mixed')),
  add column if not exists module_topic  text,
  add column if not exists total_questions integer,
  add column if not exists created_by   uuid references public.profiles(id) on delete set null;

-- Rename teacher_id → created_by safely if teacher_id exists and created_by does not yet
-- (skip this if you already ran the add column above and teacher_id is still separate)
-- If your assessments table uses teacher_id, keep it; created_by is the alias used in the app code.

-- ── 4. MAKE assessments.total_points nullable ─────────────────────────────────
-- The manual creator calculates total_points from question points sum,
-- so it might be 0 at insert time before questions are added.
-- Remove the NOT NULL default constraint so we can insert with 0.

alter table public.assessments
  alter column total_points set default 0;

-- ── 5. ALLOW submissions.percentage to be set directly ───────────────────────
-- The current schema has percentage as a GENERATED ALWAYS column.
-- TakeAssessment.tsx tries to save percentage directly which fails on generated columns.
-- Drop the generated column and replace it with a plain numeric with a trigger instead.

alter table public.submissions
  drop column if exists percentage;

alter table public.submissions
  add column if not exists percentage numeric;

-- Optional: auto-compute percentage on insert/update via trigger
create or replace function public.compute_submission_percentage()
returns trigger as $$
begin
  if new.total_points is not null and new.total_points > 0 then
    new.percentage := round((new.score / new.total_points) * 100, 2);
  else
    new.percentage := 0;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_compute_percentage on public.submissions;

create trigger trg_compute_percentage
  before insert or update on public.submissions
  for each row execute function public.compute_submission_percentage();

-- ── 6. ADD submitted_at alias (app uses submitted_at, schema has it already) ─
-- Nothing needed — submitted_at already exists in the schema.

-- ── DONE ─────────────────────────────────────────────────────────────────────
-- Summary of changes:
--   questions  → added: explanation, correct_choice_index; fixed: question_type CHECK
--   assessments → added: difficulty, module_topic, total_questions, created_by
--   submissions → percentage changed from GENERATED to plain numeric + trigger
