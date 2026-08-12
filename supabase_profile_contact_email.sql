-- Adds an optional "contact email" to profiles.
-- IMPORTANT: this is NOT the login credential. Login always uses
-- `${school_id}@psu.edu.ph` against Supabase Auth (see AuthContext.login()).
-- contact_email is only a place for teachers/students to leave a
-- reachable email for notifications; it has no effect on sign-in.

alter table public.profiles
  add column if not exists contact_email text;

comment on column public.profiles.contact_email is
  'Optional notification/recovery email. Not used for authentication - login is School ID + password only.';
