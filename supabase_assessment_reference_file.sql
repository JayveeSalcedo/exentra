-- ============================================================
-- Exentra: Assessment reference file
-- Lets a teacher attach one reference/instruction file to an
-- assessment (quiz, activity, assignment, or exam). Students can
-- view or download it from the assessment lobby / submission page.
-- Uses the existing public "materials" storage bucket — no new
-- bucket or storage policies needed.
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table public.assessments
  add column if not exists reference_file_url  text,
  add column if not exists reference_file_name  text,
  add column if not exists reference_file_type  text,
  add column if not exists reference_file_size  bigint;
