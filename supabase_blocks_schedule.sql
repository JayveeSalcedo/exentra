-- ============================================================
-- Exentra: Add schedule to blocks
-- Free-text meeting schedule (e.g. "MWF 9:00-10:30 AM"), shown
-- on the block card and editable from the Create/Edit Block form.
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table public.blocks add column if not exists schedule text;
