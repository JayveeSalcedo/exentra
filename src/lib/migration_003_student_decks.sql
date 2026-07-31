-- ── STUDENT DECKS & FLASHCARDS ──────────────────────────────────────────────
-- Run this in your Supabase SQL Editor

create table public.student_decks (
  id          uuid default gen_random_uuid() primary key,
  student_id  uuid references public.profiles(id) on delete cascade not null,
  topic       text not null,
  title       text not null,
  description text,
  card_count  int not null default 0,
  created_at  timestamptz default now()
);

create table public.deck_cards (
  id         uuid default gen_random_uuid() primary key,
  deck_id    uuid references public.student_decks(id) on delete cascade not null,
  front      text not null,
  back       text not null,
  position   int  not null default 0
);

-- RLS
alter table public.student_decks enable row level security;
alter table public.deck_cards    enable row level security;

create policy "Students can manage own decks"
  on public.student_decks for all
  using  (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "Students can manage own deck cards"
  on public.deck_cards for all
  using  (
    exists (
      select 1 from public.student_decks d
      where d.id = deck_id and d.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.student_decks d
      where d.id = deck_id and d.student_id = auth.uid()
    )
  );
