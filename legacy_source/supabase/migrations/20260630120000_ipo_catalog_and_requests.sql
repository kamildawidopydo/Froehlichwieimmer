-- ============================================================================
-- IPO catalog (scraped + admin curated) + interest notifications + subscriptions
--
-- Powers:
--   * /dashboard/ipo              -> public.ipo_catalog (read)
--   * /admin/ipo-catalog          -> public.ipo_catalog (admin write)
--   * /admin/ipo-interests        -> public.ipo_interest_notifications
--   * /admin/ipo-requests         -> public.ipo_subscription_requests
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------- ipo_catalog -----------------------------------------------------

create table if not exists public.ipo_catalog (
  id                   uuid primary key default gen_random_uuid(),
  external_key         text not null,
  source               text not null default 'manual',
  company_name         text not null,
  ticker_proposed      text,
  isin                 text,
  exchange             text,
  market               text,
  sector               text,
  logo_url             text,
  status               text not null default 'upcoming',
  ipo_date             date,
  subscription_start   date,
  subscription_end     date,
  price_range_low      numeric(14, 4),
  price_range_high     numeric(14, 4),
  min_investment_eur   numeric(14, 2),
  lot_size             integer not null default 1,
  prospectus_url       text,
  description          text,
  is_visible           boolean not null default true,
  is_manual_override   boolean not null default false,
  display_order        integer not null default 0,
  last_synced_at       timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint ipo_catalog_source_check
    check (source in ('euronext', 'yahoo', 'manual')),
  constraint ipo_catalog_status_check
    check (status in ('upcoming', 'open', 'priced', 'listed', 'cancelled'))
);

create unique index if not exists ipo_catalog_external_key_unique
  on public.ipo_catalog (external_key);

create index if not exists ipo_catalog_status_idx
  on public.ipo_catalog (status);

create index if not exists ipo_catalog_visible_idx
  on public.ipo_catalog (is_visible);

create index if not exists ipo_catalog_ipo_date_idx
  on public.ipo_catalog (ipo_date desc nulls last);

-- ---------- ipo_interest_notifications --------------------------------------

create table if not exists public.ipo_interest_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  ipo_id     uuid not null references public.ipo_catalog(id) on delete cascade,
  message    text,
  created_at timestamptz not null default now(),
  constraint ipo_interest_user_ipo_unique unique (user_id, ipo_id)
);

create index if not exists ipo_interest_user_idx
  on public.ipo_interest_notifications (user_id);

create index if not exists ipo_interest_ipo_idx
  on public.ipo_interest_notifications (ipo_id);

-- ---------- ipo_subscription_requests ---------------------------------------

create table if not exists public.ipo_subscription_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  ipo_id            uuid not null references public.ipo_catalog(id) on delete restrict,
  company_name      text,
  ticker            text,
  amount_eur        numeric(14, 2) not null,
  shares_requested  integer not null default 1,
  status            text not null default 'pending',
  notes             text,
  decision_note     text,
  approved_at       timestamptz,
  rejected_at       timestamptz,
  handled_at        timestamptz,
  handled_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint ipo_subscription_requests_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists ipo_subscription_requests_status_idx
  on public.ipo_subscription_requests (status);

create index if not exists ipo_subscription_requests_user_idx
  on public.ipo_subscription_requests (user_id);

create index if not exists ipo_subscription_requests_created_idx
  on public.ipo_subscription_requests (created_at desc);

-- ---------- ipo_sync_log ----------------------------------------------------

create table if not exists public.ipo_sync_log (
  id             uuid primary key default gen_random_uuid(),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  source         text,
  rows_upserted  integer not null default 0,
  rows_skipped   integer not null default 0,
  error_message  text
);

-- ---------- updated_at trigger ----------------------------------------------

drop trigger if exists trg_ipo_catalog_updated_at on public.ipo_catalog;
create trigger trg_ipo_catalog_updated_at
  before update on public.ipo_catalog
  for each row execute function public.set_updated_at();

-- ---------- RLS --------------------------------------------------------------

alter table public.ipo_catalog enable row level security;
alter table public.ipo_interest_notifications enable row level security;
alter table public.ipo_subscription_requests enable row level security;
alter table public.ipo_sync_log enable row level security;

-- ipo_catalog
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ipo_catalog'
      and policyname = 'ipo_catalog_authenticated_read'
  ) then
    create policy ipo_catalog_authenticated_read
      on public.ipo_catalog for select to authenticated using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ipo_catalog'
      and policyname = 'ipo_catalog_admin_write'
  ) then
    create policy ipo_catalog_admin_write
      on public.ipo_catalog for all to authenticated
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;
end$$;

-- ipo_interest_notifications
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ipo_interest_notifications'
      and policyname = 'ipo_interest_user_insert_own'
  ) then
    create policy ipo_interest_user_insert_own
      on public.ipo_interest_notifications for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ipo_interest_notifications'
      and policyname = 'ipo_interest_user_select_own'
  ) then
    create policy ipo_interest_user_select_own
      on public.ipo_interest_notifications for select to authenticated
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ipo_interest_notifications'
      and policyname = 'ipo_interest_admin_all'
  ) then
    create policy ipo_interest_admin_all
      on public.ipo_interest_notifications for all to authenticated
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;
end$$;

-- ipo_subscription_requests
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ipo_subscription_requests'
      and policyname = 'ipo_requests_user_insert_own'
  ) then
    create policy ipo_requests_user_insert_own
      on public.ipo_subscription_requests for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ipo_subscription_requests'
      and policyname = 'ipo_requests_user_select_own'
  ) then
    create policy ipo_requests_user_select_own
      on public.ipo_subscription_requests for select to authenticated
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ipo_subscription_requests'
      and policyname = 'ipo_requests_admin_all'
  ) then
    create policy ipo_requests_admin_all
      on public.ipo_subscription_requests for all to authenticated
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;
end$$;

-- ipo_sync_log: admin read only (writes via service role in edge function)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ipo_sync_log'
      and policyname = 'ipo_sync_log_admin_read'
  ) then
    create policy ipo_sync_log_admin_read
      on public.ipo_sync_log for select to authenticated
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;
end$$;

-- ---------- Realtime --------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ipo_subscription_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.ipo_subscription_requests';
  end if;
exception
  when undefined_object then null;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ipo_interest_notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.ipo_interest_notifications';
  end if;
exception
  when undefined_object then null;
end$$;

-- ---------- Approve / reject RPCs -------------------------------------------

create or replace function public.approve_ipo_subscription_request(
  p_request_id uuid,
  p_decision_note text default null
)
returns public.ipo_subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.ipo_subscription_requests%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_actor_id and p.role = 'admin'
  ) then
    raise exception 'Admin only';
  end if;

  update public.ipo_subscription_requests
  set status = 'approved',
      approved_at = now(),
      rejected_at = null,
      handled_at = now(),
      handled_by = v_actor_id,
      decision_note = coalesce(p_decision_note, decision_note)
  where id = p_request_id
    and status = 'pending'
  returning * into v_request;

  if v_request.id is null then
    raise exception 'Request not found or already processed';
  end if;

  return v_request;
end;
$$;

create or replace function public.reject_ipo_subscription_request(
  p_request_id uuid,
  p_decision_note text default null
)
returns public.ipo_subscription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_request public.ipo_subscription_requests%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_actor_id and p.role = 'admin'
  ) then
    raise exception 'Admin only';
  end if;

  update public.ipo_subscription_requests
  set status = 'rejected',
      rejected_at = now(),
      approved_at = null,
      handled_at = now(),
      handled_by = v_actor_id,
      decision_note = coalesce(p_decision_note, decision_note)
  where id = p_request_id
    and status = 'pending'
  returning * into v_request;

  if v_request.id is null then
    raise exception 'Request not found or already processed';
  end if;

  return v_request;
end;
$$;

revoke all on function public.approve_ipo_subscription_request(uuid, text) from public;
grant execute on function public.approve_ipo_subscription_request(uuid, text) to authenticated;

revoke all on function public.reject_ipo_subscription_request(uuid, text) from public;
grant execute on function public.reject_ipo_subscription_request(uuid, text) to authenticated;

comment on table public.ipo_catalog
  is 'IPO universe: scraped from Euronext/Yahoo and admin-curated entries.';
comment on table public.ipo_interest_notifications
  is 'User interest notifications for upcoming IPOs.';
comment on table public.ipo_subscription_requests
  is 'User subscription requests for open IPOs; admin approves/rejects.';
