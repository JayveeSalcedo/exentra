-- -----------------------------------------------------------------------------
-- SAMPLE DATA for testing Teacher -> Analytics (NOT a migration)
--
-- Run this entire script in the Supabase SQL Editor.
-- Remove everything it creates with sample_analytics_cleanup.sql.
--
-- Creates, all clearly marked as sample data:
--   * 12 students (school IDs SAMPLE-01..12, emails @sample.exentra.test).
--     They are auth users with no password, so nobody can sign in as them.
--   * 2 blocks owned by your teacher: "[Sample] BSIT 2-A" and "[Sample] BSIT 2-B"
--     (11 students enrolled, 1 left without a block)
--   * 7 past-due, published assessments per block (Modules 1-5), with graded
--     submissions. Only students in the sample blocks can see them.
--   * Lesson progress, game sessions, daily challenge attempts, Problem Bank
--     problems and flashcard decks for each student
--
-- If you have more than one teacher account, set v_teacher_school_id below.
-- -----------------------------------------------------------------------------

BEGIN;

DO $$
DECLARE
  v_teacher_school_id text := NULL;   -- e.g. '21-UR-0001'; NULL = the first teacher account

  v_teacher   uuid;
  v_blocks    uuid[] := '{}';
  v_block     uuid;
  v_student   uuid;
  v_assess    uuid;
  v_challenges uuid[] := '{}';
  v_pct       numeric;
  v_h         integer;
  v_count     integer;
  v_order     integer;
  i           integer;

  lesson_ids text[] := ARRAY[
    'l1-1','l1-2','l1-3','l1-4',
    'l2-1','l2-2','l2-3','l2-4',
    'l3-1','l3-2','l3-3','l3-4','l3-5',
    'l4-1','l4-2','l4-3','l4-4','l4-5','l4-6','l4-7',
    'l5-1','l5-2','l5-3','l5-4','l5-5',
    'l6-1','l6-2','l6-3','l6-4',
    'l7-1','l7-2','l7-3','l7-4'];
  topics text[] := ARRAY['Basic Concepts','Arrays & Linked Lists','Stacks & Queues','Trees','Graphs','Sorting & Searching','Hashing'];
  games  text[] := ARRAY['array_blitz','node_connect','stack_tower'];
  diffs  text[] := ARRAY['easy','medium','hard'];

  s record;
  a record;
BEGIN
  SELECT id INTO v_teacher
  FROM public.profiles
  WHERE role = 'teacher' AND (v_teacher_school_id IS NULL OR school_id = v_teacher_school_id)
  ORDER BY created_at
  LIMIT 1;
  IF v_teacher IS NULL THEN
    RAISE EXCEPTION 'No teacher account found. Set v_teacher_school_id at the top of the script.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE school_id LIKE 'SAMPLE-%') THEN
    RAISE EXCEPTION 'Sample data already exists. Run sample_analytics_cleanup.sql first.';
  END IF;

  -- -- Blocks ----------------------------------------------------------------
  INSERT INTO public.blocks (name, description, teacher_id)
  VALUES ('[Sample] BSIT 2-A', 'Sample data for testing analytics', v_teacher)
  RETURNING id INTO v_block;
  v_blocks := v_blocks || v_block;
  INSERT INTO public.blocks (name, description, teacher_id)
  VALUES ('[Sample] BSIT 2-B', 'Sample data for testing analytics', v_teacher)
  RETURNING id INTO v_block;
  v_blocks := v_blocks || v_block;

  -- -- Assessments: 7 per block, Modules 1-5, all past due ------------------
  CREATE TEMP TABLE sample_assessments (id uuid, block_no int, seq int, module_no int, days_ago int, title text) ON COMMIT DROP;

  FOR i IN 1..2 LOOP
    FOR a IN
      SELECT * FROM (VALUES
        (1, 1, 'quiz',     'Quiz 1: Algorithms and Big-Oh',        56),
        (2, 2, 'quiz',     'Quiz 2: Arrays and ArrayList',         49),
        (3, 2, 'activity', 'Activity: Linked List Operations',     42),
        (4, 3, 'quiz',     'Quiz 3: Stacks and Queues',            35),
        (5, 3, 'exam',     'Midterm Exam: Modules 1-3',            28),
        (6, 4, 'quiz',     'Quiz 4: Binary Trees and BST',         21),
        (7, 5, 'quiz',     'Quiz 5: Graph Traversals',             10)
      ) AS t(seq, module_no, kind, title, days_ago)
    LOOP
      INSERT INTO public.assessments (
        block_id, created_by, title, description, type, difficulty, module_topic,
        total_points, total_questions, xp_reward, opens_at, due_date, is_published, created_at
      ) VALUES (
        v_blocks[i], v_teacher, a.title, 'Sample assessment for testing analytics',
        a.kind, 'Mixed', topics[a.module_no], 50, 25, 100,
        now() - make_interval(days => a.days_ago + 2),
        now() - make_interval(days => a.days_ago - 5),
        true,
        now() - make_interval(days => a.days_ago + 3)
      ) RETURNING id INTO v_assess;
      INSERT INTO sample_assessments VALUES (v_assess, i, a.seq, a.module_no, a.days_ago, a.title);
    END LOOP;
  END LOOP;

  -- -- Daily challenges (dated 2020 so they never collide with real ones) ----
  BEGIN
    FOR i IN 1..8 LOOP
      INSERT INTO public.daily_challenges (date, question, topic, difficulty, xp_reward, hint, model_answer)
      VALUES (DATE '2020-01-01' + i, 'Sample challenge ' || i, '[Sample]', diffs[1 + i % 3], 50,
              'Sample hint', 'Sample answer')
      RETURNING id INTO v_assess;
      v_challenges := v_challenges || v_assess;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    v_challenges := '{}';
    RAISE NOTICE 'Skipped daily challenges: %', SQLERRM;
  END;

  -- -- Students --------------------------------------------------------------
  -- skill = base score, trend = points gained from first to last assessment,
  -- block = 1 / 2 / 0 (no block), lessons = lessons completed in order
  FOR s IN
    SELECT * FROM (VALUES
      ( 1, 'Andrea',  'Santos',     1, 90,   4, 33),
      ( 2, 'Miguel',  'Reyes',      1, 80,  10, 27),
      ( 3, 'Bea',     'Cruz',       1, 72,  16, 22),
      ( 4, 'Paolo',   'Garcia',     1, 66, -14, 17),
      ( 5, 'Kyla',    'Mendoza',    1, 52,  22, 13),
      ( 6, 'Joshua',  'Ramos',      1, 44,   6,  8),
      ( 7, 'Nicole',  'Bautista',   2, 87,   2, 30),
      ( 8, 'Carlo',   'Villanueva', 2, 70,  12, 20),
      ( 9, 'Trisha',  'Aquino',     2, 58,  -6, 12),
      (10, 'Renz',    'Navarro',    2, 62,  18, 18),
      (11, 'Janelle', 'Flores',     2, 40,  10,  5),
      (12, 'Mark',    'Dela Cruz',  0, 60,   0,  3)
    ) AS t(n, first_name, last_name, block_no, skill, trend, lessons)
  LOOP
    v_student := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_student, 'authenticated', 'authenticated',
      format('sample.student%s@sample.exentra.test', lpad(s.n::text, 2, '0')), '', now(),
      '{"provider":"email","providers":["email"]}', '{}', now() - interval '70 days', now(),
      '', '', '', ''
    );

    INSERT INTO public.profiles (
      id, school_id, first_name, last_name, username, role, year_level, course, student_type,
      created_at, last_active
    ) VALUES (
      v_student, 'SAMPLE-' || lpad(s.n::text, 2, '0'), s.first_name, s.last_name,
      'sample_student' || lpad(s.n::text, 2, '0'), 'student', '2nd Year', 'BSIT', 'regular',
      now() - interval '70 days' + make_interval(days => s.n),
      now() - make_interval(days => s.n % 6, hours => s.n * 3)
    )
    ON CONFLICT (id) DO UPDATE SET
      school_id = EXCLUDED.school_id, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
      username = EXCLUDED.username, role = 'student', created_at = EXCLUDED.created_at,
      last_active = EXCLUDED.last_active;

    IF s.block_no > 0 THEN
      INSERT INTO public.block_enrollments (block_id, student_id, status, enrolled_at)
      VALUES (v_blocks[s.block_no], v_student, 'active', now() - interval '65 days');
    END IF;

    -- Lesson progress, completed in course order
    FOR i IN 1..s.lessons LOOP
      INSERT INTO public.student_progress (student_id, lesson_id, module_id, completed, completed_at)
      VALUES (v_student, lesson_ids[i], split_part(substr(lesson_ids[i], 2), '-', 1), true,
              now() - make_interval(days => 62 - (i * 55 / 33), hours => (s.n * i) % 20));
    END LOOP;

    -- Graded submissions. Trees and Graphs are harder, so they show as weak areas.
    FOR a IN SELECT * FROM sample_assessments WHERE block_no = s.block_no ORDER BY seq LOOP
      v_h := (hashtext(v_student::text || a.title) & 2147483647);
      CONTINUE WHEN v_h % 100 < 10;                         -- ~10% missed
      CONTINUE WHEN a.module_no = 5 AND s.lessons < 10;     -- far behind: skipped Quiz 5

      v_pct := s.skill
             + (CASE a.module_no WHEN 1 THEN 6 WHEN 2 THEN 1 WHEN 3 THEN -3 WHEN 4 THEN -15 ELSE -9 END)
             + s.trend * (a.seq - 1) / 6.0
             + (v_h % 17) - 8;
      v_pct := LEAST(100, GREATEST(10, v_pct));

      INSERT INTO public.submissions (assessment_id, student_id, score, total_points, percentage,
                                      started_at, submitted_at, is_submitted)
      VALUES (a.id, v_student, round(v_pct / 2), 50, round(v_pct / 2) * 2,
              now() - make_interval(days => a.days_ago, hours => 1 + v_h % 30),
              now() - make_interval(days => a.days_ago, hours => v_h % 30),
              true);
    END LOOP;

    -- Games
    BEGIN
      v_count := 2 + s.lessons / 3;
      FOR i IN 1..v_count LOOP
        v_h := (hashtext(v_student::text || 'game' || i) & 2147483647);
        v_order := LEAST(10, GREATEST(1, round(s.skill / 10.0) + (v_h % 5) - 2));
        INSERT INTO public.game_sessions (student_id, game_id, mode, difficulty, score, correct,
                                          total_rounds, xp_earned, played_at)
        VALUES (v_student, games[1 + i % 3], 'solo', diffs[1 + (v_h % 3)],
                v_order * 120 + v_h % 90, v_order, 10, v_order * 15,
                now() - make_interval(days => (v_h % 55), hours => i));
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped game sessions for %: %', s.first_name, SQLERRM;
    END;

    -- Daily challenge attempts
    IF array_length(v_challenges, 1) > 0 THEN
      BEGIN
        FOR i IN 1..array_length(v_challenges, 1) LOOP
          v_h := (hashtext(v_student::text || 'challenge' || i) & 2147483647);
          CONTINUE WHEN v_h % 100 >= 25 + s.skill / 2;
          INSERT INTO public.challenge_attempts (challenge_id, student_id, answer, is_correct, xp_earned)
          VALUES (v_challenges[i], v_student, 'Sample answer', (v_h / 7) % 100 < s.skill, 25);
        END LOOP;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipped challenge attempts for %: %', s.first_name, SQLERRM;
      END;
    END IF;

    -- Problem Bank problems and flashcard decks
    BEGIN
      FOR i IN 1..(s.lessons / 5) LOOP
        v_h := (hashtext(v_student::text || 'problem' || i) & 2147483647);
        INSERT INTO public.student_problems (student_id, topic, type, difficulty, title, description,
                                             solution, is_solved, created_at)
        VALUES (v_student, topics[1 + i % 5], CASE WHEN i % 2 = 0 THEN 'coding' ELSE 'multiple_choice' END,
                (ARRAY['Easy','Medium','Hard'])[1 + v_h % 3], 'Sample problem ' || i,
                'Sample problem for testing analytics', 'Sample solution',
                v_h % 100 < s.skill, now() - make_interval(days => v_h % 50));
      END LOOP;
      FOR i IN 1..(s.lessons / 10) LOOP
        INSERT INTO public.student_decks (student_id, topic, title, description, card_count)
        VALUES (v_student, topics[i], 'Sample deck ' || i, 'Sample deck for testing analytics', 8);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped problems/decks for %: %', s.first_name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Sample analytics data created for teacher %', v_teacher;
END $$;

COMMIT;

-- Quick check
SELECT
  (SELECT count(*) FROM public.profiles WHERE school_id LIKE 'SAMPLE-%')            AS sample_students,
  (SELECT count(*) FROM public.blocks WHERE name LIKE '[Sample]%')                  AS sample_blocks,
  (SELECT count(*) FROM public.assessments a JOIN public.blocks b ON b.id = a.block_id
     WHERE b.name LIKE '[Sample]%')                                                  AS sample_assessments,
  (SELECT count(*) FROM public.submissions su JOIN public.profiles p ON p.id = su.student_id
     WHERE p.school_id LIKE 'SAMPLE-%')                                              AS sample_submissions;
