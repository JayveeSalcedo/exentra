-- =============================================================================
-- EXENTRA -- FIX: teacher can't delete assessments
--
-- Root cause: supabase_ai_tables.sql turned RLS on for `questions` and
-- `choices` (and `submissions` was enabled separately in
-- supabase_assessments_submissions_rls.sql) but none of the three ever got
-- a DELETE policy. Deleting an assessment cascades into questions, which
-- cascades into choices, and separately cascades into submissions. RLS
-- silently blocks those cascade deletes (no permissive policy = deny),
-- so the whole DELETE transaction rolls back -- the assessment doesn't
-- disappear and the only trace is an error in the browser console.
--
-- This adds the missing DELETE policies. Run once in Supabase SQL Editor.
-- Safe to re-run (drop-if-exists first).
-- =============================================================================

-- questions: staff can delete questions belonging to any assessment
-- (matches the existing "Authenticated users can read questions" /
-- "Anyone can insert questions" policies already being broad)
drop policy if exists "staff delete questions" on public.questions;
create policy "staff delete questions" on public.questions
  for delete
  using (public.is_staff());

-- choices: same reasoning, cascades from questions
drop policy if exists "staff delete choices" on public.choices;
create policy "staff delete choices" on public.choices
  for delete
  using (public.is_staff());

-- submissions: staff can delete submissions (needed for the cascade when
-- an assessment with existing student submissions is deleted)
drop policy if exists "staff delete submissions" on public.submissions;
create policy "staff delete submissions" on public.submissions
  for delete
  using (public.is_staff());

-- Bonus cleanup: supabase_ai_tables.sql also left a stray duplicate
-- "Teachers can manage assessments" / "Students can read assessments"
-- policy pair on public.assessments from when it (redundantly) tried to
-- create the assessments table. It's permissive-only (OR'd with the real
-- policies from supabase_assessments_submissions_rls.sql) so it wasn't
-- blocking anything, but "Students can read assessments" is wider than
-- intended (any authenticated student could read ANY assessment, including
-- other blocks' drafts). Tightening it here so only the intended policies
-- remain in effect.
drop policy if exists "Teachers can manage assessments" on public.assessments;
drop policy if exists "Students can read assessments" on public.assessments;
