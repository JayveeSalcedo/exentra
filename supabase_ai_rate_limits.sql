-- ============================================================
-- Exentra: AI feature rate limiting
-- Backs the /api/* serverless functions that proxy Groq requests
-- (chat, quiz/flashcard/problem generation, answer grading,
-- progress sentiment). Each function calls check_ai_rate_limit()
-- with its own feature key + limit before hitting Groq.
-- Run this once in the Supabase SQL editor.
-- ============================================================

create table if not exists public.ai_rate_limits (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  feature       text not null,
  window_start  timestamptz not null default now(),
  request_count int not null default 1,
  primary key (user_id, feature)
);

-- Row Level Security: nobody accesses this table directly — only through the
-- SECURITY DEFINER function below, called by the server with the caller's JWT.
alter table public.ai_rate_limits enable row level security;

-- Atomically checks and increments a fixed-window counter for (user_id, feature).
-- Returns true if the request is allowed, false if the limit was already hit.
create or replace function public.check_ai_rate_limit(
  p_user_id uuid,
  p_feature text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.ai_rate_limits;
begin
  select * into v_row
    from public.ai_rate_limits
    where user_id = p_user_id and feature = p_feature
    for update;

  if not found then
    insert into public.ai_rate_limits (user_id, feature, window_start, request_count)
    values (p_user_id, p_feature, v_now, 1);
    return true;
  end if;

  if v_now - v_row.window_start > make_interval(secs => p_window_seconds) then
    update public.ai_rate_limits
      set window_start = v_now, request_count = 1
      where user_id = p_user_id and feature = p_feature;
    return true;
  end if;

  if v_row.request_count >= p_limit then
    return false;
  end if;

  update public.ai_rate_limits
    set request_count = request_count + 1
    where user_id = p_user_id and feature = p_feature;
  return true;
end;
$$;

grant execute on function public.check_ai_rate_limit(uuid, text, int, int) to authenticated;
