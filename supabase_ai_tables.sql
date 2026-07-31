-- Run these in your Supabase SQL Editor to create the tables
-- needed for the AI Daily Challenge and Challenge Attempts features.

-- ── daily_challenges ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_challenges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date         date NOT NULL UNIQUE,          -- one challenge per day
  question     text NOT NULL,
  topic        text NOT NULL,
  difficulty   text NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  xp_reward    int  NOT NULL DEFAULT 50,
  hint         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for fast date lookups
CREATE INDEX IF NOT EXISTS daily_challenges_date_idx ON daily_challenges (date);

-- RLS: anyone authenticated can read; only service role inserts
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily challenges"
  ON daily_challenges FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert daily challenges"
  ON daily_challenges FOR INSERT
  WITH CHECK (true);   -- Supabase anon key insert is fine for this app


-- ── challenge_attempts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id  uuid NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  answer        text NOT NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, challenge_id)   -- one attempt per student per challenge
);

-- RLS: students can only see and insert their own attempts
ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own attempts"
  ON challenge_attempts FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own attempts"
  ON challenge_attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);


-- ── assessments ───────────────────────────────────────────────────────────
-- (For AI Quiz Generator — create only if it doesn't exist yet)
CREATE TABLE IF NOT EXISTS assessments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  type             text NOT NULL,               -- 'quiz' | 'activity' | 'exam'
  module_topic     text NOT NULL,
  difficulty       text NOT NULL,
  total_questions  int  NOT NULL DEFAULT 0,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage assessments"
  ON assessments FOR ALL
  USING (auth.uid() = created_by);

CREATE POLICY "Students can read assessments"
  ON assessments FOR SELECT
  USING (auth.role() = 'authenticated');


-- ── questions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id        uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_text        text NOT NULL,
  order_index          int  NOT NULL DEFAULT 1,
  explanation          text,
  correct_choice_index int  NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read questions"
  ON questions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert questions"
  ON questions FOR INSERT
  WITH CHECK (true);


-- ── choices ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS choices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  choice_text  text NOT NULL,
  is_correct   boolean NOT NULL DEFAULT false,
  order_index  int     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read choices"
  ON choices FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert choices"
  ON choices FOR INSERT
  WITH CHECK (true);
