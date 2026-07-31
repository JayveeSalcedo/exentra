-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Fix lesson IDs so progress tracking works
-- Run this entire script in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Drop student_progress FK constraints ──────────────────────────────
ALTER TABLE public.student_progress
  DROP CONSTRAINT IF EXISTS student_progress_lesson_id_fkey;

ALTER TABLE public.student_progress
  DROP CONSTRAINT IF EXISTS student_progress_module_id_fkey;

ALTER TABLE public.student_progress
  ALTER COLUMN lesson_id TYPE text USING lesson_id::text;

ALTER TABLE public.student_progress
  ALTER COLUMN module_id TYPE text USING module_id::text;

ALTER TABLE public.student_progress
  DROP CONSTRAINT IF EXISTS student_progress_student_lesson_unique;

ALTER TABLE public.student_progress
  ADD CONSTRAINT student_progress_student_lesson_unique
  UNIQUE (student_id, lesson_id);

-- Clear any broken UUID-format rows
DELETE FROM public.student_progress
WHERE lesson_id NOT LIKE 'l%-%';

-- ── Step 2: Recreate lessons table with TEXT primary key ──────────────────────
DROP TABLE IF EXISTS public.lessons CASCADE;

CREATE TABLE public.lessons (
  id               text primary key,
  module_id        uuid references public.modules(id) on delete cascade,
  order_index      integer not null,
  title            text not null,
  duration_minutes integer not null default 15,
  xp_reward        integer not null default 30,
  created_at       timestamptz default now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_public_read" ON public.lessons FOR SELECT USING (true);

-- ── Step 3: Seed all 26 lessons ───────────────────────────────────────────────
INSERT INTO public.lessons (id, module_id, order_index, title, duration_minutes, xp_reward)
SELECT v.lesson_id, m.id, v.ord, v.title, v.dur, v.xp
FROM (VALUES
  ('l1-1', 1, 1, 'Introduction to Arrays',          15, 30),
  ('l1-2', 1, 2, 'Array Operations (CRUD)',           20, 30),
  ('l1-3', 1, 3, 'Multi-dimensional Arrays',          18, 30),
  ('l1-4', 1, 4, 'ArrayList & Dynamic Arrays',        22, 30),
  ('l2-1', 2, 1, 'Singly Linked Lists',               20, 30),
  ('l2-2', 2, 2, 'Doubly Linked Lists',               22, 30),
  ('l2-3', 2, 3, 'Circular Linked Lists',             18, 30),
  ('l2-4', 2, 4, 'List Operations & Complexity',      15, 30),
  ('l3-1', 3, 1, 'Stack Fundamentals',                15, 30),
  ('l3-2', 3, 2, 'Push, Pop, Peek Operations',        18, 30),
  ('l3-3', 3, 3, 'Stack Applications',                20, 30),
  ('l4-1', 4, 1, 'Queue Fundamentals',                15, 30),
  ('l4-2', 4, 2, 'Circular Queue',                    18, 30),
  ('l4-3', 4, 3, 'Priority Queue & Deque',            20, 30),
  ('l5-1', 5, 1, 'Tree Terminology',                  12, 30),
  ('l5-2', 5, 2, 'Binary Search Trees',               25, 30),
  ('l5-3', 5, 3, 'Tree Traversals (In/Pre/Post)',     22, 30),
  ('l5-4', 5, 4, 'AVL & Balanced Trees',              28, 30),
  ('l6-1', 6, 1, 'Graph Representations',             18, 30),
  ('l6-2', 6, 2, 'BFS & DFS',                         25, 30),
  ('l6-3', 6, 3, 'Shortest Path - Dijkstra',          28, 30),
  ('l7-1', 7, 1, 'Bubble & Selection Sort',           18, 30),
  ('l7-2', 7, 2, 'Merge Sort & Quick Sort',           25, 30),
  ('l7-3', 7, 3, 'Linear & Binary Search',            18, 30),
  ('l8-1', 8, 1, 'Hash Functions',                    18, 30),
  ('l8-2', 8, 2, 'Collision Resolution',              22, 30),
  ('l8-3', 8, 3, 'Hash Tables in Practice',           20, 30)
) AS v(lesson_id, mod_order, ord, title, dur, xp)
JOIN public.modules m ON m.order_index = v.mod_order;

-- ── Step 4: Verify (should return 26 rows) ────────────────────────────────────
SELECT l.id, l.title, m.title AS module, l.order_index
FROM public.lessons l
JOIN public.modules m ON m.id = l.module_id
ORDER BY m.order_index, l.order_index;
