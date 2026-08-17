-- ============================================================================
-- Admin user provisioning and first-login password reset
-- ============================================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists provisioned_at timestamptz,
  add column if not exists last_password_reset_at timestamptz,
  add column if not exists invited_by uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_invited_by_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_invited_by_fkey
      foreign key (invited_by) references public.profiles(id)
      on delete set null;
  end if;
end
$$;
