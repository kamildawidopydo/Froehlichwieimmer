-- ============================================================================
-- Optional Email OTP 2FA (new device/session)
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.user_trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null,
  label text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  constraint user_trusted_devices_user_device_unique unique (user_id, device_hash)
);

create index if not exists idx_user_trusted_devices_user on public.user_trusted_devices(user_id);
create index if not exists idx_user_trusted_devices_expires on public.user_trusted_devices(expires_at);

create table if not exists public.auth_email_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  device_hash text not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts >= 1),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_email_otp_challenges_user on public.auth_email_otp_challenges(user_id, created_at desc);
create index if not exists idx_auth_email_otp_challenges_expires on public.auth_email_otp_challenges(expires_at);

alter table public.user_trusted_devices enable row level security;
alter table public.auth_email_otp_challenges enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_trusted_devices'
      and policyname = 'user_trusted_devices_self_read'
  ) then
    create policy user_trusted_devices_self_read
      on public.user_trusted_devices
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_trusted_devices'
      and policyname = 'user_trusted_devices_admin_all'
  ) then
    create policy user_trusted_devices_admin_all
      on public.user_trusted_devices
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end
$$;

-- No direct client access to auth_email_otp_challenges; service role via edge functions only.
