-- ============================================================================
-- Insufficient buying power events — customer warning + admin inbox
-- ============================================================================

create table if not exists public.insufficient_buying_power_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  symbol           text not null,
  stock_name       text,
  required_amount  numeric(14, 2) not null,
  available_amount numeric(14, 2) not null,
  quantity         numeric(18, 6),
  order_type       text,
  currency         text not null default 'USD',
  status           text not null default 'new',
  handled_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint insufficient_buying_power_events_status_check
    check (status in ('new', 'handled'))
);

create index if not exists insufficient_buying_power_events_created_idx
  on public.insufficient_buying_power_events (created_at desc);

create index if not exists insufficient_buying_power_events_status_idx
  on public.insufficient_buying_power_events (status);

create index if not exists insufficient_buying_power_events_user_idx
  on public.insufficient_buying_power_events (user_id);

drop trigger if exists trg_insufficient_buying_power_events_updated_at
  on public.insufficient_buying_power_events;
create trigger trg_insufficient_buying_power_events_updated_at
  before update on public.insufficient_buying_power_events
  for each row execute function public.set_updated_at();

alter table public.insufficient_buying_power_events enable row level security;

-- Authenticated users can log their own insufficient-funds attempts.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'insufficient_buying_power_events'
      and policyname = 'insufficient_buying_power_events_user_insert'
  ) then
    create policy insufficient_buying_power_events_user_insert
      on public.insufficient_buying_power_events
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end$$;

-- Admin can read/write all events.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'insufficient_buying_power_events'
      and policyname = 'insufficient_buying_power_events_admin_all'
  ) then
    create policy insufficient_buying_power_events_admin_all
      on public.insufficient_buying_power_events
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
      and tablename = 'insufficient_buying_power_events'
  ) then
    execute 'alter publication supabase_realtime add table public.insufficient_buying_power_events';
  end if;
exception
  when undefined_object then
    null;
end$$;

comment on table public.insufficient_buying_power_events
  is 'Kunden, die einen Aktienkauf ohne ausreichende Kaufkraft versucht haben (Admin-Postfach).';
