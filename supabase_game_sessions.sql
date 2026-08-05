-- ============================================================
-- Exentra: Game session persistence
-- Stores one row per completed game run (Array Blitz, Node Connect,
-- Stack Tower, and future reworked games). Score = XP earned in that
-- game's own economy (the game already labels its point deltas as
-- XP in the UI, e.g. "+250 XP", "Hint −30 XP"), so xp_earned is a
-- direct passthrough of final score, floored at 0.
-- Run this once in the Supabase SQL editor.
-- ============================================================

create table if not exists public.game_sessions (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  game_id       text not null check (game_id in ('array_blitz', 'node_connect', 'stack_tower')),
  mode          text not null default 'solo' check (mode in ('solo', 'multiplayer')),
  difficulty    text not null,
  score         int  not null default 0,
  correct       int  not null default 0,
  total_rounds  int  not null default 0,
  best_combo    int  not null default 0,
  rank_letter   text,
  badges        text[] not null default '{}',
  meta          jsonb not null default '{}',  -- game-specific extras (avg_efficiency, accuracy, opponents, etc.)
  xp_earned     int  not null default 0,
  played_at     timestamptz not null default now()
);

create index if not exists game_sessions_student_id_idx on public.game_sessions (student_id);
create index if not exists game_sessions_game_id_idx    on public.game_sessions (game_id);
create index if not exists game_sessions_played_at_idx  on public.game_sessions (played_at desc);

alter table public.game_sessions enable row level security;

-- Students can insert and read only their own sessions.
create policy "students insert own game sessions"
  on public.game_sessions for insert
  with check (auth.uid() = student_id);

create policy "students read own game sessions"
  on public.game_sessions for select
  using (auth.uid() = student_id);

-- Teachers can read sessions for students enrolled in blocks they teach.
-- Relies on the existing is_teacher_of_block() SECURITY DEFINER helper
-- (see supabase_blocks_fix_rls.sql) to avoid recursive RLS.
create policy "teachers read block student game sessions"
  on public.game_sessions for select
  using (
    exists (
      select 1 from public.block_enrollments be
      where be.student_id = game_sessions.student_id
        and public.is_teacher_of_block(be.block_id)
    )
  );
