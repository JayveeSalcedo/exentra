-- ============================================================
-- Exentra: Block-target materials
-- Adds an optional block_id to materials. null = visible to
-- every student (an explicit "All Students" choice in the UI,
-- not a default/unset state); set = visible only to students
-- actively enrolled in that block.
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table public.materials
  add column if not exists block_id uuid references public.blocks(id) on delete set null;

create index if not exists materials_block_id_idx on public.materials (block_id);
