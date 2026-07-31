-- ============================================================
-- Exentra: Enable RLS on assessments & submissions
--
-- Both tables currently have RLS OFF entirely — fully open to any
-- authenticated request, not just across blocks. This turns it on
-- with policies matched exactly to how the app already queries
-- these tables (verified against every .from('assessments') /
-- .from('submissions') call in the codebase), so existing features
-- keep working. It also closes the direct-URL gap: a student can
-- no longer load an assessment.tsx by id unless it's published,
-- unassigned or in their own block, or they already have a
-- submission for it (so past/reassigned assessments still show
-- correctly in "My Submissions" / progress history).
--
-- Reuses public.is_enrolled_in_block(uuid) from the earlier
-- blocks RLS fix. Run this once in the Supabase SQL editor.
-- ============================================================

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('teacher', 'admin')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

alter table public.assessments enable row level security;
alter table public.submissions enable row level security;

-- ── ASSESSMENTS ──────────────────────────────────────────────

-- Teachers/admins can read every assessment (matches TeacherAssessments.tsx,
-- TeacherProgress.tsx, TeacherStudents.tsx, which read across all students
-- with no ownership filter today).
drop policy if exists "staff read all assessments" on public.assessments;
create policy "staff read all assessments" on public.assessments
  for select
  using (public.is_staff());

-- Students can read an assessment if it's published and (unassigned OR
-- in their own block), OR if they already have a submission for it
-- (keeps MySubmissions / StudentProgress / "already done" review working
-- even if the assessment is later unpublished or reassigned).
drop policy if exists "students read visible assessments" on public.assessments;
create policy "students read visible assessments" on public.assessments
  for select
  using (
    (is_published = true and (block_id is null or public.is_enrolled_in_block(block_id)))
    or exists (
      select 1 from public.submissions s
      where s.assessment_id = assessments.id and s.student_id = auth.uid()
    )
  );

-- Teachers create assessments as themselves (CreateAssessment.tsx, GenerateQuiz.tsx)
drop policy if exists "staff create assessments" on public.assessments;
create policy "staff create assessments" on public.assessments
  for insert
  with check (public.is_staff() and created_by = auth.uid());

-- Teachers update only their own assessments (publish toggle in TeacherAssessments.tsx)
drop policy if exists "staff update own assessments" on public.assessments;
create policy "staff update own assessments" on public.assessments
  for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Teachers delete only their own assessments
drop policy if exists "staff delete own assessments" on public.assessments;
create policy "staff delete own assessments" on public.assessments
  for delete
  using (created_by = auth.uid());

-- ── SUBMISSIONS ──────────────────────────────────────────────

-- Students read only their own submissions
drop policy if exists "students read own submissions" on public.submissions;
create policy "students read own submissions" on public.submissions
  for select
  using (student_id = auth.uid());

-- Teachers/admins read every submission (grading + class analytics pages
-- read across all students with no filter today)
drop policy if exists "staff read all submissions" on public.submissions;
create policy "staff read all submissions" on public.submissions
  for select
  using (public.is_staff());

-- Students create only their own submission rows
drop policy if exists "students create own submissions" on public.submissions;
create policy "students create own submissions" on public.submissions
  for insert
  with check (student_id = auth.uid());

-- Students update only their own submission (in-progress save, final submit)
drop policy if exists "students update own submissions" on public.submissions;
create policy "students update own submissions" on public.submissions
  for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Teachers/admins grade any submission (TeacherAssessments.tsx saveGrade)
drop policy if exists "staff grade submissions" on public.submissions;
create policy "staff grade submissions" on public.submissions
  for update
  using (public.is_staff())
  with check (public.is_staff());
