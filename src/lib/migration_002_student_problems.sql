-- ── STUDENT PROBLEMS ────────────────────────────────────────────────────────
-- Run this in your Supabase SQL Editor

create table public.student_problems (
  id           uuid default gen_random_uuid() primary key,
  student_id   uuid references public.profiles(id) on delete cascade not null,
  topic        text not null,
  type         text not null check (type in ('coding', 'multiple_choice')),
  difficulty   text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  title        text not null,
  description  text not null,
  hint         text,
  solution     text not null,
  choices      jsonb,
  last_attempt text,
  is_solved    boolean not null default false,
  created_at   timestamptz default now()
);

alter table public.student_problems enable row level security;

create policy "Students can manage own problems"
  on public.student_problems
  for all
  using  (student_id = auth.uid())
  with check (student_id = auth.uid());
