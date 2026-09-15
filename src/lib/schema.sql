-- ─────────────────────────────────────────────────────────────────────────────
-- EXENTRA DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. PROFILES ──────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific fields
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  school_id     text unique not null,
  first_name    text not null,
  last_name     text not null,
  username      text unique not null,
  role          text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  year_level    text,
  course        text,
  avatar_url    text,
  xp            integer not null default 0,
  level         integer not null default 1,
  streak        integer not null default 0,
  best_streak   integer not null default 0,
  last_active   timestamptz,
  created_at    timestamptz default now()
);

-- ── 2. BLOCKS ────────────────────────────────────────────────────────────────
-- A block = a class section (e.g. BSIT 2-A)
create table public.blocks (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  description text,
  teacher_id  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- ── 3. BLOCK ENROLLMENTS ─────────────────────────────────────────────────────
-- Students enrolled in a block
create table public.block_enrollments (
  id         uuid default gen_random_uuid() primary key,
  block_id   uuid references public.blocks(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  enrolled_at timestamptz default now(),
  unique(block_id, student_id)
);

-- ── 4. MODULES ───────────────────────────────────────────────────────────────
-- DSA topics from the syllabus
create table public.modules (
  id          uuid default gen_random_uuid() primary key,
  order_index integer not null,
  title       text not null,
  description text,
  type        text not null, -- 'Fundamentals', 'Linear', 'Non-Linear', 'Algorithms', 'Advanced'
  xp_reward   integer not null default 0,
  is_locked   boolean default true,
  created_at  timestamptz default now()
);

-- ── 5. LESSONS ───────────────────────────────────────────────────────────────
-- Sub-topics within a module
create table public.lessons (
  id          uuid default gen_random_uuid() primary key,
  module_id   uuid references public.modules(id) on delete cascade,
  order_index integer not null,
  title       text not null,
  content     text,
  video_url   text,
  xp_reward   integer not null default 0,
  created_at  timestamptz default now()
);

-- ── 6. STUDENT PROGRESS ──────────────────────────────────────────────────────
-- Tracks which modules/lessons a student has completed
create table public.student_progress (
  id          uuid default gen_random_uuid() primary key,
  student_id  uuid references public.profiles(id) on delete cascade,
  module_id   uuid references public.modules(id) on delete cascade,
  lesson_id   uuid references public.lessons(id) on delete cascade,
  completed   boolean default false,
  completed_at timestamptz,
  unique(student_id, lesson_id)
);

-- ── 7. ASSESSMENTS ───────────────────────────────────────────────────────────
-- Quizzes, activities, assignments
create table public.assessments (
  id              uuid default gen_random_uuid() primary key,
  block_id        uuid references public.blocks(id) on delete cascade,
  module_id       uuid references public.modules(id) on delete set null,
  teacher_id      uuid references public.profiles(id) on delete set null,
  created_by      uuid references public.profiles(id) on delete set null,
  title           text not null,
  description     text,
  type            text not null check (type in ('quiz', 'activity', 'assignment', 'exam')),
  difficulty      text check (difficulty in ('Easy', 'Medium', 'Hard', 'Mixed')),
  module_topic    text,
  total_points    integer not null default 0,
  total_questions integer,
  xp_reward       integer not null default 50,
  time_limit      integer, -- in minutes, null = no limit
  due_date        timestamptz,
  opens_at        timestamptz,
  is_published    boolean default false,
  is_archived     boolean not null default false,
  created_at      timestamptz default now()
);

-- ── 8. QUESTIONS ─────────────────────────────────────────────────────────────
create table public.questions (
  id                   uuid default gen_random_uuid() primary key,
  assessment_id        uuid references public.assessments(id) on delete cascade,
  order_index          integer not null,
  question_text        text not null,
  question_type        text not null check (question_type in (
                         'multiple_choice', 'true_false', 'identification',
                         'essay', 'coding', 'short_answer'
                       )),
  points               integer not null default 1,
  explanation          text,
  correct_choice_index integer, -- used by AI generator
  created_at           timestamptz default now()
);

-- ── 9. CHOICES ───────────────────────────────────────────────────────────────
-- For multiple choice questions
create table public.choices (
  id           uuid default gen_random_uuid() primary key,
  question_id  uuid references public.questions(id) on delete cascade,
  choice_text  text not null,
  is_correct   boolean default false,
  order_index  integer not null
);

-- ── 10. SUBMISSIONS ──────────────────────────────────────────────────────────
create table public.submissions (
  id             uuid default gen_random_uuid() primary key,
  assessment_id  uuid references public.assessments(id) on delete cascade,
  student_id     uuid references public.profiles(id) on delete cascade,
  score          numeric,
  total_points   integer,
  percentage     numeric, -- computed by trigger trg_compute_percentage
  xp_earned      integer default 0,
  started_at     timestamptz default now(),
  submitted_at   timestamptz,
  is_submitted   boolean default false,
  unique(assessment_id, student_id)
);

-- Auto-compute percentage on insert/update
create or replace function public.compute_submission_percentage()
returns trigger as $
begin
  if new.total_points is not null and new.total_points > 0 then
    new.percentage := round((new.score / new.total_points) * 100, 2);
  else
    new.percentage := 0;
  end if;
  return new;
end;
$ language plpgsql;

create trigger trg_compute_percentage
  before insert or update on public.submissions
  for each row execute function public.compute_submission_percentage();

-- ── 11. ANSWERS ──────────────────────────────────────────────────────────────
create table public.answers (
  id            uuid default gen_random_uuid() primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  question_id   uuid references public.questions(id) on delete cascade,
  choice_id     uuid references public.choices(id) on delete set null,
  answer_text   text,
  is_correct    boolean,
  points_earned numeric default 0
);

-- ── 12. LEARNING MATERIALS ───────────────────────────────────────────────────
create table public.materials (
  id          uuid default gen_random_uuid() primary key,
  block_id    uuid references public.blocks(id) on delete cascade,
  module_id   uuid references public.modules(id) on delete set null,
  teacher_id  uuid references public.profiles(id) on delete set null,
  title       text not null,
  description text,
  file_url    text,
  file_type   text, -- 'pdf', 'docx', 'pptx', 'image'
  created_at  timestamptz default now()
);

-- ── 13. FILE SUBMISSIONS ─────────────────────────────────────────────────────
-- Student file uploads for assignments
create table public.file_submissions (
  id            uuid default gen_random_uuid() primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  student_id    uuid references public.profiles(id) on delete cascade,
  file_url      text not null,
  file_name     text not null,
  file_type     text,
  uploaded_at   timestamptz default now()
);

-- ── 14. DAILY CHALLENGES ─────────────────────────────────────────────────────
create table public.daily_challenges (
  id           uuid default gen_random_uuid() primary key,
  module_id    uuid references public.modules(id) on delete set null,
  question     text not null,
  difficulty   text check (difficulty in ('easy', 'medium', 'hard')),
  xp_reward    integer default 50,
  generated_at timestamptz default now(),
  expires_at   timestamptz
);

-- ── 15. CHALLENGE ATTEMPTS ───────────────────────────────────────────────────
create table public.challenge_attempts (
  id           uuid default gen_random_uuid() primary key,
  challenge_id uuid references public.daily_challenges(id) on delete cascade,
  student_id   uuid references public.profiles(id) on delete cascade,
  answer       text,
  is_correct   boolean,
  xp_earned    integer default 0,
  attempted_at timestamptz default now(),
  unique(challenge_id, student_id)
);

-- ── 16. LEADERBOARD VIEW ─────────────────────────────────────────────────────
create or replace view public.leaderboard as
  select
    p.id,
    p.first_name,
    p.last_name,
    p.username,
    p.avatar_url,
    p.xp,
    p.level,
    p.streak,
    rank() over (order by p.xp desc) as global_rank
  from public.profiles p
  where p.role = 'student';

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: The 7 CC 104 study guide modules (courses/CC-104-SG-1..7.pdf)
-- Lessons are seeded by src/migrations/migration_004_study_guide_course.sql
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.modules (order_index, title, description, type, xp_reward, is_locked) values
(1, 'Basic Concepts and Notation',       'Algorithms and their properties, the problem solving process, mathematical functions, and Big-Oh complexity.',                'Fundamentals', 120, false),
(2, 'Arrays, Lists and Linked List',     'Declaring and accessing arrays, Java ArrayList operations, lists, and singly and doubly linked lists.',                        'Linear',       120, true),
(3, 'Stacks and Queues',                 'Stack and queue ADTs with array and linked-list implementations, infix to postfix, circular queues, and topological sorting.', 'Linear',       150, true),
(4, 'Trees',                             'Tree definitions, binary trees and traversals, sequential representations, the equivalence problem, BSTs and AVL trees.',     'Non-Linear',   210, true),
(5, 'Graphs',                            'Graph terminology, adjacency matrix and list representations, DFS and BFS, minimum cost spanning trees, and shortest paths.', 'Non-Linear',   150, true),
(6, 'Sorting and Searching Algorithms',  'Merge sort and quick sort with their complexities, and the linear and binary search algorithms.',                              'Algorithms',   120, true),
(7, 'Hash Table and Hashing Techniques', 'Hashing concepts, the division and folding methods, collision resolution, and dynamic hashing.',                               'Advanced',     120, true);
