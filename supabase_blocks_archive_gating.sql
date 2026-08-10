-- ============================================================
-- Exentra: Archived-block gating for submissions
--
-- Behavior: archiving a block (blocks.is_archived) does NOT
-- revoke read access — students keep seeing their materials,
-- assessments, progress, and leaderboard history for that block
-- (public.is_enrolled_in_block is untouched, so all existing
-- SELECT policies keep working exactly as before).
--
-- What changes: students can no longer create or continue a
-- submission for an assessment that belongs to an archived block.
-- Submissions already made stay visible/gradable as-is.
--
-- Run this once in the Supabase SQL editor, after
-- supabase_blocks.sql, supabase_blocks_fix_rls.sql, and
-- supabase_assessments_submissions_rls.sql.
-- ============================================================

create or replace function public.assessment_is_open_for_submission(_assessment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.assessments a
    left join public.blocks b on b.id = a.block_id
    where a.id = _assessment_id
      and a.is_published = true
      and (
        a.block_id is null
        or (
          public.is_enrolled_in_block(a.block_id)
          and coalesce(b.is_archived, false) = false
        )
      )
  );
$$;

revoke all on function public.assessment_is_open_for_submission(uuid) from public;
grant execute on function public.assessment_is_open_for_submission(uuid) to authenticated;

-- Students create only their own submission rows, and only while
-- the assessment's block (if any) is enrolled + not archived.
drop policy if exists "students create own submissions" on public.submissions;
create policy "students create own submissions" on public.submissions
  for insert
  with check (
    student_id = auth.uid()
    and public.assessment_is_open_for_submission(assessment_id)
  );

-- Students update only their own submission (in-progress save, final
-- submit), same openness check — once archived, no further edits.
drop policy if exists "students update own submissions" on public.submissions;
create policy "students update own submissions" on public.submissions
  for update
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and public.assessment_is_open_for_submission(assessment_id)
  );
