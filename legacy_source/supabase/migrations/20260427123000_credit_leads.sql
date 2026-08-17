-- ============================================================================
-- Credit leads for public kredit form + admin inbox
-- ============================================================================

create table if not exists public.credit_leads (
  id                    uuid primary key default gen_random_uuid(),
  requested_amount      numeric(14, 2) not null,
  requested_term_months integer not null,
  purpose               text not null,
  full_name             text,
  email                 text,
  phone                 text,
  status                text not null default 'new',
  handled_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint credit_leads_status_check
    check (status in ('new', 'contacted', 'closed')),
  constraint credit_leads_contact_required
    check (
      nullif(trim(coalesce(email, '')), '') is not null
      or nullif(trim(coalesce(phone, '')), '') is not null
    )
);

create index if not exists credit_leads_created_idx
  on public.credit_leads (created_at desc);

create index if not exists credit_leads_status_idx
  on public.credit_leads (status);

-- Reuse helper from previous migrations if present.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_credit_leads_updated_at on public.credit_leads;
create trigger trg_credit_leads_updated_at
  before update on public.credit_leads
  for each row execute function public.set_updated_at();

alter table public.credit_leads enable row level security;

-- Public/anonymous users can submit a lead.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_leads'
      and policyname = 'credit_leads_public_insert'
  ) then
    create policy credit_leads_public_insert
      on public.credit_leads
      for insert
      to anon, authenticated
      with check (true);
  end if;
end$$;

-- Admin can read/write all leads.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_leads'
      and policyname = 'credit_leads_admin_all'
  ) then
    create policy credit_leads_admin_all
      on public.credit_leads
      for all
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end$$;

-- Realtime for admin badge/toast subscriptions.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'credit_leads'
  ) then
    execute 'alter publication supabase_realtime add table public.credit_leads';
  end if;
exception
  when undefined_object then
    null;
end$$;

comment on table public.credit_leads
  is 'Leads aus dem öffentlichen Kreditformular (E-Mail/Telefon).';
