-- ============================================================
-- Exentra: Fix infinite recursion in blocks / block_enrollments RLS
-- The previous policies cross-referenced each other via correlated
-- subqueries, which Postgres tries to expand recursively -> 500 error.
-- Fix: wrap the cross-table checks in SECURITY DEFINER functions,
-- which run with the function owner's privileges and bypass RLS
-- internally, breaking the recursive expansion.
-- Run this once in the Supabase SQL editor.
-- ============================================================

create or replace function public.is_teacher_of_block(_block_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocks b
    where b.id = _block_id and b.teacher_id = auth.uid()
  );
$$;

create or replace function public.is_enrolled_in_block(_block_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.block_enrollments be
    where be.block_id = _block_id
      and be.student_id = auth.uid()
      and be.status = 'active'
  );
$$;

revoke all on function public.is_teacher_of_block(uuid) from public;
revoke all on function public.is_enrolled_in_block(uuid) from public;
grant execute on function public.is_teacher_of_block(uuid) to authenticated;
grant execute on function public.is_enrolled_in_block(uuid) to authenticated;

-- Replace policies to use the helper functions instead of
-- correlated subqueries directly against the other table.

drop policy if exists "students view own block" on public.blocks;
create policy "students view own block" on public.blocks
  for select
  using (public.is_enrolled_in_block(id));

drop policy if exists "teachers manage own block enrollments" on public.block_enrollments;
create policy "teachers manage own block enrollments" on public.block_enrollments
  for all
  using (public.is_teacher_of_block(block_id))
  with check (public.is_teacher_of_block(block_id));

-- "teachers manage own blocks" and "students view own enrollment"
-- were already single-table checks (teacher_id = auth.uid() /
-- student_id = auth.uid()) and are not part of the cycle, so they
-- stay as-is.
