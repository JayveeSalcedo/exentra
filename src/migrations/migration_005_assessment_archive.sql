-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: Archive published assessments
-- Run this in the Supabase SQL Editor.
--
-- Published assessments can no longer be unpublished or deleted by teachers;
-- instead they are archived. Archived assessments are hidden from students,
-- while questions, submissions and grades are kept.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS assessments_is_archived_idx
  ON public.assessments (is_archived);
