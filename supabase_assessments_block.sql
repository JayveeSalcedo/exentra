-- ============================================================
-- Exentra: Block-target assessments
-- Adds an optional block_id to assessments. null = visible to
-- every student (preserves existing behavior for old rows);
-- set = visible only to students actively enrolled in that block.
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table public.assessments
  add column if not exists block_id uuid references public.blocks(id) on delete set null;

create index if not exists assessments_block_id_idx on public.assessments (block_id);
