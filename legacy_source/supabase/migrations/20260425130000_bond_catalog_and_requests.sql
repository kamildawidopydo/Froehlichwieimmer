-- ============================================================================
-- Bond catalog (admin curated) + customer purchase requests
--
-- Two tables that power the new admin pages:
--   * /admin/anleihen-katalog       -> public.bond_catalog
--   * /admin/anleihen-anfragen      -> public.bond_purchase_requests
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ---------- bond_catalog -----------------------------------------------------

create table if not exists public.bond_catalog (
  id                uuid primary key default gen_random_uuid(),
  isin              text,
  bond_name         text,
  issuer            text,
  kupon_rate        numeric(8, 4),
  kaufkurs          numeric(10, 4),
  aktueller_kurs    numeric(10, 4),
  faelligkeitsdatum date,
  min_order_eur     numeric(14, 2),
  denomination      numeric(14, 2),
  is_available      boolean not null default true,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Unique on ISIN when present (allows multiple null ISINs for drafts).
create unique index if not exists bond_catalog_isin_unique
  on public.bond_catalog (isin)
  where isin is not null;

create index if not exists bond_catalog_available_idx
  on public.bond_catalog (is_available);

-- ---------- bond_purchase_requests ------------------------------------------

create table if not exists public.bond_purchase_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  isin        text,
  bond_name   text,
  kupon_rate  numeric(8, 4),
  amount_eur  numeric(14, 2),
  status      text not null default 'pending',
  notes       text,
  created_at  timestamptz not null default now(),
  handled_at  timestamptz,
  handled_by  uuid references public.profiles(id) on delete set null,
  constraint bond_purchase_requests_status_check
    check (status in ('pending', 'handled', 'cancelled'))
);

create index if not exists bond_purchase_requests_status_idx
  on public.bond_purchase_requests (status);

create index if not exists bond_purchase_requests_user_idx
  on public.bond_purchase_requests (user_id);

create index if not exists bond_purchase_requests_created_idx
  on public.bond_purchase_requests (created_at desc);

-- ---------- updated_at trigger ----------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_bond_catalog_updated_at on public.bond_catalog;
create trigger trg_bond_catalog_updated_at
  before update on public.bond_catalog
  for each row execute function public.set_updated_at();

-- ---------- RLS --------------------------------------------------------------

alter table public.bond_catalog        enable row level security;
alter table public.bond_purchase_requests enable row level security;

-- bond_catalog policies
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'bond_catalog'
      and policyname = 'bond_catalog_authenticated_read'
  ) then
    create policy bond_catalog_authenticated_read
      on public.bond_catalog
      for select
      to authenticated
      using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'bond_catalog'
      and policyname = 'bond_catalog_admin_write'
  ) then
    create policy bond_catalog_admin_write
      on public.bond_catalog
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

-- bond_purchase_requests policies
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'bond_purchase_requests'
      and policyname = 'bond_requests_user_insert_own'
  ) then
    create policy bond_requests_user_insert_own
      on public.bond_purchase_requests
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'bond_purchase_requests'
      and policyname = 'bond_requests_user_select_own'
  ) then
    create policy bond_requests_user_select_own
      on public.bond_purchase_requests
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'bond_purchase_requests'
      and policyname = 'bond_requests_admin_all'
  ) then
    create policy bond_requests_admin_all
      on public.bond_purchase_requests
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

-- ---------- Realtime --------------------------------------------------------
-- Allow the admin layout badge to subscribe via supabase realtime.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bond_purchase_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.bond_purchase_requests';
  end if;
exception
  when undefined_object then
    -- supabase_realtime publication not present (e.g. local-only setup); ignore.
    null;
end$$;

comment on table public.bond_catalog
  is 'Admin-curated universe of bonds shown to users in "Neue Anleihe kaufen".';
comment on table public.bond_purchase_requests
  is 'Customer-initiated bond purchase requests; admins close them out.';
