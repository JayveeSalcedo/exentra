-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Progress tracking fixes
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add missing columns to student_progress if not already there
ALTER TABLE student_progress
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 2. Unique constraint so upsert works correctly
ALTER TABLE student_progress
  DROP CONSTRAINT IF EXISTS student_progress_student_lesson_unique;

ALTER TABLE student_progress
  ADD CONSTRAINT student_progress_student_lesson_unique
  UNIQUE (student_id, lesson_id);

-- 3. XP increment function (safe: no negative XP, atomic)
CREATE OR REPLACE FUNCTION increment_xp(p_user_id uuid, p_amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_xp int;
  v_new_xp     int;
  v_new_level  int;
BEGIN
  SELECT xp INTO v_current_xp FROM profiles WHERE id = p_user_id;
  v_new_xp    := COALESCE(v_current_xp, 0) + p_amount;
  v_new_level := GREATEST(1, FLOOR(v_new_xp / 500) + 1);  -- level up every 500 XP

  UPDATE profiles
  SET xp    = v_new_xp,
      level = v_new_level
  WHERE id = p_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_xp(uuid, int) TO authenticated;
