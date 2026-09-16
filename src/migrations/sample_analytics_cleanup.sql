-- ─────────────────────────────────────────────────────────────────────────────
-- Removes everything created by sample_analytics_seed.sql
-- Run this entire script in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Rows owned by the sample students (explicit, in case a FK is not ON DELETE CASCADE)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['challenge_attempts', 'game_sessions', 'student_problems', 'student_decks',
                           'submissions', 'student_progress', 'block_enrollments'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format(
        'DELETE FROM public.%I WHERE student_id IN (SELECT id FROM public.profiles WHERE school_id LIKE %L)',
        t, 'SAMPLE-%');
    END IF;
  END LOOP;
END $$;

-- Sample assessments (and anything left under them), then the blocks
DELETE FROM public.submissions
WHERE assessment_id IN (SELECT a.id FROM public.assessments a
                        JOIN public.blocks b ON b.id = a.block_id
                        WHERE b.name LIKE '[Sample]%');
DELETE FROM public.assessments
WHERE block_id IN (SELECT id FROM public.blocks WHERE name LIKE '[Sample]%');
DELETE FROM public.block_enrollments
WHERE block_id IN (SELECT id FROM public.blocks WHERE name LIKE '[Sample]%');
DELETE FROM public.blocks WHERE name LIKE '[Sample]%';

DELETE FROM public.daily_challenges WHERE topic = '[Sample]';

-- The sample students
DELETE FROM public.profiles WHERE school_id LIKE 'SAMPLE-%';
DELETE FROM auth.users WHERE email LIKE '%@sample.exentra.test';

COMMIT;

SELECT
  (SELECT count(*) FROM public.profiles WHERE school_id LIKE 'SAMPLE-%') AS sample_students_left,
  (SELECT count(*) FROM public.blocks WHERE name LIKE '[Sample]%')       AS sample_blocks_left;
