-- =============================================================================
-- EXENTRA -- NOTIFICATIONS
-- Run this in Supabase SQL Editor.
-- After running, also enable Realtime on public.notifications:
--   Dashboard -> Database -> Publications -> add "notifications" to supabase_realtime
-- (Or just run: alter publication supabase_realtime add table public.notifications;)
-- This whole file is idempotent (create or replace / if not exists) so it is
-- safe to re-run top to bottom any time.
-- =============================================================================

-- -- 1. TABLE -------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  type        text not null check (type in (
                'assessment_posted', 'material_posted', 'grade_released', 'due_soon',
                'student_submitted'
              )),
  title       text not null,
  body        text,
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz default now()
);

create index if not exists idx_notifications_user_feed
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read);

-- The CREATE TABLE above only applies its check constraint on first creation.
-- Since the table already exists on this project, widen the live constraint
-- explicitly so 'student_submitted' (and any future type) is accepted.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'assessment_posted', 'material_posted', 'grade_released', 'due_soon',
    'student_submitted'
  ));

-- -- 2. RLS -----------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "select own notifications" on public.notifications;
create policy "select own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert policy for authenticated/anon on purpose -- all inserts happen
-- through the SECURITY DEFINER trigger functions below (which run as the
-- table owner and bypass RLS), so clients can never write notifications
-- for someone else.

-- -- 3. ASSESSMENT PUBLISHED --------------------------------------------------
-- Fires when an assessment is inserted already-published, or flipped from
-- draft -> published (covers both CreateAssessment's "Save & Publish" and
-- TeacherAssessments' publish toggle). Fans out to the target block's
-- enrolled students, or every student if block_id is null ("All Students").
-- Link points straight at the assessment (TakeAssessment handles both the
-- "take it" and "already done / review" states).
create or replace function public.notify_assessment_published()
returns trigger as $$
begin
  if new.is_published is not true then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.is_published is true then
    return new; -- already notified when it was first published
  end if;

  if new.block_id is null then
    insert into public.notifications (user_id, type, title, body, link)
    select p.id, 'assessment_posted',
           'New ' || new.type || ' posted',
           new.title || ' is now available.',
           '/student/assessments/' || new.id
    from public.profiles p
    where p.role = 'student';
  else
    insert into public.notifications (user_id, type, title, body, link)
    select be.student_id, 'assessment_posted',
           'New ' || new.type || ' posted',
           new.title || ' is now available.',
           '/student/assessments/' || new.id
    from public.block_enrollments be
    where be.block_id = new.block_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_assessment_published on public.assessments;
create trigger trg_notify_assessment_published
  after insert or update of is_published on public.assessments
  for each row execute function public.notify_assessment_published();

-- -- 4. MATERIAL POSTED ---------------------------------------------------------
-- Link carries the specific material's id as a query param so
-- LearningMaterials.tsx can auto-expand the right module/tab and highlight it.
create or replace function public.notify_material_posted()
returns trigger as $$
begin
  if new.block_id is null then
    insert into public.notifications (user_id, type, title, body, link)
    select p.id, 'material_posted',
           'New material posted',
           new.title || ' was just added to Learning Materials.',
           '/student/materials?open=' || new.id
    from public.profiles p
    where p.role = 'student';
  else
    insert into public.notifications (user_id, type, title, body, link)
    select be.student_id, 'material_posted',
           'New material posted',
           new.title || ' was just added to Learning Materials.',
           '/student/materials?open=' || new.id
    from public.block_enrollments be
    where be.block_id = new.block_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_material_posted on public.materials;
create trigger trg_notify_material_posted
  after insert on public.materials
  for each row execute function public.notify_material_posted();

-- -- 5. GRADE RELEASED ------------------------------------------------------------
-- Only meaningful for teacher-graded submissions (activity/assignment file
-- uploads) since quiz/exam scores are already shown the instant the student
-- submits. `graded_at` is set explicitly by TeacherAssessments' saveGrade().
alter table public.submissions add column if not exists graded_at timestamptz;

create or replace function public.notify_grade_released()
returns trigger as $$
begin
  if new.graded_at is not null and old.graded_at is null then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.student_id, 'grade_released',
      'Grade released',
      'Your submission has been graded.',
      '/student/assessments/' || new.assessment_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_grade_released on public.submissions;
create trigger trg_notify_grade_released
  after update of graded_at on public.submissions
  for each row execute function public.notify_grade_released();

-- -- 6. DUE-SOON REMINDER -----------------------------------------------------
-- Scheduled sweep (not a trigger, since nothing "happens" to fire one).
-- Notifies each enrolled/target student once per assessment when its due
-- date falls within the next 24 hours. Dedupes by checking for an existing
-- 'due_soon' notification with the same link+user.
create or replace function public.send_due_soon_reminders()
returns void as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select
    target.user_id,
    'due_soon',
    a.title || ' is due soon',
    'Due ' || to_char(a.due_date, 'Mon DD, HH12:MI AM') || '.',
    '/student/assessments/' || a.id
  from public.assessments a
  cross join lateral (
    select be.student_id as user_id
    from public.block_enrollments be
    where a.block_id is not null and be.block_id = a.block_id
    union
    select p.id as user_id
    from public.profiles p
    where a.block_id is null and p.role = 'student'
  ) target
  where a.is_published = true
    and a.due_date is not null
    and a.due_date between now() and now() + interval '24 hours'
    and not exists (
      select 1 from public.notifications n
      where n.type = 'due_soon'
        and n.user_id = target.user_id
        and n.link = '/student/assessments/' || a.id
    );
end;
$$ language plpgsql security definer;

-- Requires the pg_cron extension. On most Supabase projects this can be
-- enabled right here; if it errors with a permissions message, enable it
-- from Dashboard -> Database -> Extensions -> pg_cron, then re-run just the
-- block below.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'exentra-due-soon-reminders',
  '0 * * * *', -- hourly
  $$select public.send_due_soon_reminders();$$
);

-- -- 7. STUDENT SUBMITTED (teacher-facing) -------------------------------------
-- Fires when a submission flips to is_submitted = true (covers both the
-- auto-grade path for quiz/exam and the file-upload turn-in path for
-- activity/assignment). Notifies the assessment's teacher. Body text says
-- whether it needs manual grading or was already auto-scored. Link carries
-- the assessment id as a query param so TeacherAssessments.tsx can
-- auto-expand that exact card on the Students/Submissions tab.
--
-- IMPORTANT: assessments.teacher_id is NOT populated by the app today --
-- CreateAssessment.tsx only sets created_by. So this reads
-- coalesce(teacher_id, created_by) to actually find someone to notify.
create or replace function public.notify_student_submitted()
returns trigger as $$
declare
  v_teacher_id        uuid;
  v_assessment_title  text;
  v_assessment_type   text;
  v_student_name      text;
  v_needs_grading     boolean;
begin
  if new.is_submitted is not true then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.is_submitted is true then
    return new; -- already notified
  end if;

  select coalesce(teacher_id, created_by), title, type
    into v_teacher_id, v_assessment_title, v_assessment_type
  from public.assessments
  where id = new.assessment_id;

  if v_teacher_id is null then
    return new;
  end if;

  select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    into v_student_name
  from public.profiles
  where id = new.student_id;

  v_needs_grading := v_assessment_type in ('activity', 'assignment');

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_teacher_id,
    'student_submitted',
    coalesce(nullif(v_student_name, ''), 'A student') || ' submitted ' || coalesce(v_assessment_title, 'an assessment'),
    case
      when v_needs_grading then 'Needs grading.'
      else 'Auto-graded: ' || coalesce(round(new.percentage)::text, '0') || '%.'
    end,
    '/teacher/assessments?open=' || new.assessment_id
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_student_submitted on public.submissions;
create trigger trg_notify_student_submitted
  after insert or update of is_submitted on public.submissions
  for each row execute function public.notify_student_submitted();
