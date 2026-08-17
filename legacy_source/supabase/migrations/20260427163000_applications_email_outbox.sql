-- ============================================================================
-- Applications + email outbox/log infrastructure
-- ============================================================================

create extension if not exists pgcrypto;

-- Main applications table used by /apply and /admin/applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  personal_data jsonb not null default '{}'::jsonb,
  investment_data jsonb not null default '{}'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  terms_accepted boolean not null default false,
  privacy_accepted boolean not null default false,
  status text not null default 'Neu',
  status_history jsonb not null default '[]'::jsonb,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_status_check
    check (status in ('Neu', 'In Bearbeitung', 'Weitergeleitet', 'Abgeschlossen'))
);

create index if not exists idx_applications_created_at on public.applications(created_at desc);
create index if not exists idx_applications_status on public.applications(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_applications_updated_at on public.applications;
create trigger trg_applications_updated_at
before update on public.applications
for each row execute procedure public.set_updated_at();

-- Outbox queue for resilient email delivery with retry/backoff.
create table if not exists public.application_email_outbox (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('customer', 'admin')),
  to_email text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts >= 1),
  next_retry_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  last_resend_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_email_outbox_unique_per_recipient
    unique (application_id, recipient_type)
);

create index if not exists idx_application_email_outbox_due
  on public.application_email_outbox(status, next_retry_at);
create index if not exists idx_application_email_outbox_application
  on public.application_email_outbox(application_id);

drop trigger if exists trg_application_email_outbox_updated_at on public.application_email_outbox;
create trigger trg_application_email_outbox_updated_at
before update on public.application_email_outbox
for each row execute procedure public.set_updated_at();

-- Detailed attempt logs (success and failure).
create table if not exists public.application_email_logs (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.application_email_outbox(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('customer', 'admin')),
  attempt_no integer not null check (attempt_no >= 1),
  success boolean not null,
  error_message text,
  resend_id text,
  response_body text,
  created_at timestamptz not null default now()
);

create index if not exists idx_application_email_logs_outbox on public.application_email_logs(outbox_id, created_at desc);

-- RLS ------------------------------------------------------------------------
alter table public.applications enable row level security;
alter table public.application_email_outbox enable row level security;
alter table public.application_email_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'applications' and policyname = 'applications_insert_public'
  ) then
    create policy applications_insert_public
      on public.applications
      for insert
      to anon, authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'applications' and policyname = 'applications_admin_read_update'
  ) then
    create policy applications_admin_read_update
      on public.applications
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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'application_email_outbox' and policyname = 'application_email_outbox_admin_all'
  ) then
    create policy application_email_outbox_admin_all
      on public.application_email_outbox
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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'application_email_logs' and policyname = 'application_email_logs_admin_all'
  ) then
    create policy application_email_logs_admin_all
      on public.application_email_logs
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

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'applications'
  ) then
    alter publication supabase_realtime add table public.applications;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'application_email_outbox'
  ) then
    alter publication supabase_realtime add table public.application_email_outbox;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'application_email_logs'
  ) then
    alter publication supabase_realtime add table public.application_email_logs;
  end if;
end
$$;
