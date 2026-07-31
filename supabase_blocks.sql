-- ============================================================
-- Exentra: Block / Section management
-- blocks & block_enrollments already existed with a narrower
-- schema — this adds the missing columns/constraints only.
-- Run this once in the Supabase SQL editor.
-- ============================================================

-- blocks: add missing columns
alter table public.blocks add column if not exists school_year text;
alter table public.blocks add column if not exists semester text;
alter table public.blocks add column if not exists is_archived boolean not null default false;
-- (blocks.description already exists — used as an optional free-text note)

-- block_enrollments: add missing columns
alter table public.block_enrollments add column if not exists status text not null default 'active';
alter table public.block_enrollments add column if not exists removed_at timestamptz;

alter table public.block_enrollments drop constraint if exists block_enrollments_status_check;
alter table public.block_enrollments add constraint block_enrollments_status_check
  check (status in ('active','dropped'));

-- A student may only have ONE active enrollment at a time
create unique index if not exists block_enrollments_one_active_per_student
  on public.block_enrollments (student_id)
  where status = 'active';

create index if not exists block_enrollments_block_id_idx
  on public.block_enrollments (block_id);

alter table public.blocks enable row level security;
alter table public.block_enrollments enable row level security;

-- Teachers fully manage blocks they own
drop policy if exists "teachers manage own blocks" on public.blocks;
create policy "teachers manage own blocks" on public.blocks
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- Students can read the block they are actively enrolled in (read-only display)
drop policy if exists "students view own block" on public.blocks;
create policy "students view own block" on public.blocks
  for select
  using (
    exists (
      select 1 from public.block_enrollments be
      where be.block_id = blocks.id
        and be.student_id = auth.uid()
        and be.status = 'active'
    )
  );

-- Teachers fully manage enrollments for blocks they own
drop policy if exists "teachers manage own block enrollments" on public.block_enrollments;
create policy "teachers manage own block enrollments" on public.block_enrollments
  for all
  using (
    exists (select 1 from public.blocks b where b.id = block_enrollments.block_id and b.teacher_id = auth.uid())
  )
  with check (
    exists (select 1 from public.blocks b where b.id = block_enrollments.block_id and b.teacher_id = auth.uid())
  );

-- Students can read their own enrollment row
drop policy if exists "students view own enrollment" on public.block_enrollments;
create policy "students view own enrollment" on public.block_enrollments
  for select
  using (student_id = auth.uid());
