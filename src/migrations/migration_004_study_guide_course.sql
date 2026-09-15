-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: Rebuild the course around the CC 104 study guides
-- (courses/CC-104-SG-1..7.pdf → 7 modules, 33 lessons)
--
-- Run this entire script in the Supabase SQL Editor.
--
-- What it does:
--   1. Creates the 7 study guide modules.
--   2. Moves materials, assessments and daily challenges that pointed at the old
--      8 modules onto the matching new module (e.g. old "Stacks" and "Queues"
--      both move to "Stacks and Queues").
--   3. Deletes the old modules and reseeds public.lessons with the 33 new lessons.
--   4. RESETS all lesson progress (student_progress). XP already earned is kept.
--
-- Safe to re-run: modules are matched by title and nothing is duplicated.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Step 1: The 7 study guide modules ────────────────────────────────────────
CREATE TEMP TABLE new_modules (
  order_index integer,
  title       text,
  description text,
  type        text,
  xp_reward   integer
) ON COMMIT DROP;

INSERT INTO new_modules (order_index, title, description, type, xp_reward) VALUES
  (1, 'Basic Concepts and Notation',       'Algorithms and their properties, the problem solving process, mathematical functions, and Big-Oh complexity.', 'Fundamentals', 120),
  (2, 'Arrays, Lists and Linked List',     'Declaring and accessing arrays, Java ArrayList operations, lists, and singly and doubly linked lists.', 'Linear', 120),
  (3, 'Stacks and Queues',                 'Stack and queue ADTs with array and linked-list implementations, infix to postfix, circular queues, and topological sorting.', 'Linear', 150),
  (4, 'Trees',                             'Tree definitions, binary trees and traversals, sequential representations, the equivalence problem, BSTs and AVL trees.', 'Non-Linear', 210),
  (5, 'Graphs',                            'Graph terminology, adjacency matrix and list representations, DFS and BFS, minimum cost spanning trees, and shortest paths.', 'Non-Linear', 150),
  (6, 'Sorting and Searching Algorithms',  'Merge sort and quick sort with their complexities, and the linear and binary search algorithms.', 'Algorithms', 120),
  (7, 'Hash Table and Hashing Techniques', 'Hashing concepts, the division and folding methods, collision resolution, and dynamic hashing.', 'Advanced', 120);

-- Create any study guide module that does not exist yet
INSERT INTO public.modules (order_index, title, description, type, xp_reward, is_locked)
SELECT n.order_index, n.title, n.description, n.type, n.xp_reward, n.order_index <> 1
FROM new_modules n
WHERE NOT EXISTS (SELECT 1 FROM public.modules m WHERE m.title = n.title);

-- Refresh details of modules whose title already matches ("Trees", "Graphs")
UPDATE public.modules m
SET order_index = n.order_index,
    description = n.description,
    type        = n.type,
    xp_reward   = n.xp_reward,
    is_locked   = n.order_index <> 1
FROM new_modules n
WHERE m.title = n.title;

-- ── Step 2: Map old modules onto the new ones ────────────────────────────────
CREATE TEMP TABLE module_map (old_id uuid, new_id uuid) ON COMMIT DROP;

INSERT INTO module_map (old_id, new_id)
SELECT o.id, n.id
FROM public.modules o
JOIN (VALUES
  ('Arrays & Array Lists', 'Arrays, Lists and Linked List'),
  ('Lists & Linked Lists', 'Arrays, Lists and Linked List'),
  ('Stacks',               'Stacks and Queues'),
  ('Queues',               'Stacks and Queues'),
  ('Sorting & Searching',  'Sorting and Searching Algorithms'),
  ('Hashing',              'Hash Table and Hashing Techniques')
) AS v(old_title, new_title) ON o.title = v.old_title
JOIN public.modules n ON n.title = v.new_title;

-- Move everything that references an old module
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['materials', 'assessments', 'daily_challenges'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'module_id'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I x SET module_id = mm.new_id FROM module_map mm WHERE x.module_id = mm.old_id',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ── Step 3: Reset lesson progress (lesson ids now point to different topics) ─
DELETE FROM public.student_progress;

-- ── Step 4: Remove the old modules and reseed lessons ────────────────────────
DELETE FROM public.lessons;
DELETE FROM public.modules WHERE id IN (SELECT old_id FROM module_map);

INSERT INTO public.lessons (id, module_id, order_index, title, duration_minutes, xp_reward)
SELECT v.lesson_id, m.id, v.ord, v.title, v.dur, 30
FROM (VALUES
  ('l1-1', 1, 1, 'Algorithm and Properties of Algorithm', 15),
  ('l1-2', 1, 2, 'Problem Solving Process', 20),
  ('l1-3', 1, 3, 'Mathematical Functions', 15),
  ('l1-4', 1, 4, 'Complexity of Algorithm', 35),
  ('l2-1', 2, 1, 'Basic Array Concepts', 25),
  ('l2-2', 2, 2, 'ArrayList in Java', 30),
  ('l2-3', 2, 3, 'Lists and Singly Linked List', 30),
  ('l2-4', 2, 4, 'Doubly Linked List and Applications', 25),
  ('l3-1', 3, 1, 'Stacks', 35),
  ('l3-2', 3, 2, 'Queues', 30),
  ('l3-3', 3, 3, 'Infix to Postfix', 30),
  ('l3-4', 3, 4, 'Circular Queue', 25),
  ('l3-5', 3, 5, 'Topological Sorting', 30),
  ('l4-1', 4, 1, 'Definitions and Related Concepts', 25),
  ('l4-2', 4, 2, 'Binary Trees', 25),
  ('l4-3', 4, 3, 'Binary Tree Traversals and Applications', 30),
  ('l4-4', 4, 4, 'Heaps, Sequential Representations and Forests', 40),
  ('l4-5', 4, 5, 'Trees and the Equivalence Problem', 35),
  ('l4-6', 4, 6, 'Binary Search Trees', 40),
  ('l4-7', 4, 7, 'Balanced BSTs and AVL Trees', 35),
  ('l5-1', 5, 1, 'Definition and Related Concepts', 20),
  ('l5-2', 5, 2, 'Graphs Representation', 20),
  ('l5-3', 5, 3, 'Graph Traversals', 25),
  ('l5-4', 5, 4, 'Minimum Cost Spanning Tree', 25),
  ('l5-5', 5, 5, 'Shortest Path Problems for Directed Graphs', 40),
  ('l6-1', 6, 1, 'Merge Sort', 35),
  ('l6-2', 6, 2, 'Quick Sort', 35),
  ('l6-3', 6, 3, 'Linear Search', 20),
  ('l6-4', 6, 4, 'Binary Search', 30),
  ('l7-1', 7, 1, 'Introduction to Hashing', 15),
  ('l7-2', 7, 2, 'Simple Hash Techniques', 25),
  ('l7-3', 7, 3, 'Collision Resolution Techniques', 35),
  ('l7-4', 7, 4, 'Dynamic Files and Hashing', 25)
) AS v(lesson_id, mod_order, ord, title, dur)
JOIN public.modules m ON m.order_index = v.mod_order
JOIN new_modules n ON n.title = m.title;

COMMIT;

-- ── Verify ───────────────────────────────────────────────────────────────────
SELECT m.order_index, m.title, count(l.id) AS lessons
FROM public.modules m
LEFT JOIN public.lessons l ON l.module_id = m.id
GROUP BY m.id, m.order_index, m.title
ORDER BY m.order_index;
