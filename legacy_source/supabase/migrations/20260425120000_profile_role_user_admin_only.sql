-- =========================================================================
-- Phase 5: Role hardening
--
-- The application only supports two app-level roles: `user` and `admin`.
-- This migration normalizes any legacy values (NULL, '', 'anonymous', ...)
-- to `user`, then enforces a CHECK constraint plus NOT NULL + default.
--
-- Idempotent: safe to re-run.
-- =========================================================================

-- 1) Normalize any non-conforming values to 'user'.
update public.profiles
set role = 'user'
where role is null
   or role not in ('user', 'admin');

-- 2) Set the column default and enforce NOT NULL.
alter table public.profiles
  alter column role set default 'user';

alter table public.profiles
  alter column role set not null;

-- 3) Drop any prior CHECK constraint with the same intent and (re)create.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_user_admin_only'
  ) then
    alter table public.profiles drop constraint profiles_role_user_admin_only;
  end if;
end$$;

alter table public.profiles
  add constraint profiles_role_user_admin_only
  check (role in ('user', 'admin'));

-- 4) Trigger that prevents handle_new_user / future inserts from using
--    arbitrary role values. We coerce on insert/update and never allow
--    'anonymous' (or any other value) to land in profiles.role.
create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is null or new.role not in ('user', 'admin') then
    new.role := 'user';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_profile_role on public.profiles;
create trigger trg_enforce_profile_role
  before insert or update of role on public.profiles
  for each row
  execute function public.enforce_profile_role();

-- 5) Helper view for admin auditability — shows distinct role values currently
--    in the system, so any future drift becomes immediately visible.
create or replace view public.v_profile_roles as
  select role, count(*) as user_count
  from public.profiles
  group by role
  order by role;

comment on constraint profiles_role_user_admin_only on public.profiles
  is 'Application-level role contract: only user or admin allowed (no anonymous).';
comment on function public.enforce_profile_role()
  is 'Defensive trigger that maps unsupported role values to user.';
