-- ============================================================================
-- Credit offers + bank detail content for public comparison
-- ============================================================================

create table if not exists public.credit_offers (
  id                        uuid primary key default gen_random_uuid(),
  bank_id                   uuid not null references public.banks(id) on delete cascade,
  purpose                   text not null default 'Freie Verwendung',
  min_amount_eur            numeric(14, 2) not null default 1000,
  max_amount_eur            numeric(14, 2) not null default 100000,
  min_term_months           integer not null default 12,
  max_term_months           integer not null default 120,
  default_term_months       integer not null default 84,
  effective_rate_from       numeric(8, 3) not null,
  nominal_rate_from         numeric(8, 3),
  monthly_rate_from         numeric(14, 2),
  payout_days_min           integer,
  payout_days_max           integer,
  rating_value              numeric(3, 2),
  rating_count              integer,
  note_small                text,
  features                  text[] not null default '{}'::text[],
  sort_priority             integer not null default 100,
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint credit_offers_terms_check check (min_term_months <= max_term_months),
  constraint credit_offers_amounts_check check (min_amount_eur <= max_amount_eur)
);

create index if not exists credit_offers_bank_id_idx on public.credit_offers(bank_id);
create index if not exists credit_offers_active_idx on public.credit_offers(is_active);
create index if not exists credit_offers_sort_idx on public.credit_offers(sort_priority, effective_rate_from);

create table if not exists public.credit_offer_product_information (
  id                        uuid primary key default gen_random_uuid(),
  credit_offer_id           uuid not null references public.credit_offers(id) on delete cascade,
  section                   text not null,
  item_label                text not null,
  item_description          text,
  is_positive               boolean not null default true,
  sort_order                integer not null default 0,
  created_at                timestamptz not null default now(),
  constraint credit_offer_product_information_section_check
    check (section in ('Sicherheit', 'Flexibilitaet', 'Kundenfreundlichkeit'))
);

create index if not exists credit_offer_product_information_offer_idx
  on public.credit_offer_product_information(credit_offer_id, section, sort_order);

create table if not exists public.credit_offer_acceptance_guidelines (
  id                        uuid primary key default gen_random_uuid(),
  credit_offer_id           uuid not null references public.credit_offers(id) on delete cascade,
  guideline_text            text not null,
  sort_order                integer not null default 0,
  created_at                timestamptz not null default now()
);

create index if not exists credit_offer_acceptance_guidelines_offer_idx
  on public.credit_offer_acceptance_guidelines(credit_offer_id, sort_order);

alter table public.credit_offers enable row level security;
alter table public.credit_offer_product_information enable row level security;
alter table public.credit_offer_acceptance_guidelines enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_offers'
      and policyname = 'credit_offers_public_read_active'
  ) then
    create policy credit_offers_public_read_active
      on public.credit_offers
      for select
      to anon, authenticated
      using (is_active = true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_offers'
      and policyname = 'credit_offers_admin_all'
  ) then
    create policy credit_offers_admin_all
      on public.credit_offers
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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_offer_product_information'
      and policyname = 'credit_offer_product_information_public_read_active_offer'
  ) then
    create policy credit_offer_product_information_public_read_active_offer
      on public.credit_offer_product_information
      for select
      to anon, authenticated
      using (
        exists (
          select 1 from public.credit_offers co
          where co.id = credit_offer_product_information.credit_offer_id
            and co.is_active = true
        )
      );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_offer_product_information'
      and policyname = 'credit_offer_product_information_admin_all'
  ) then
    create policy credit_offer_product_information_admin_all
      on public.credit_offer_product_information
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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_offer_acceptance_guidelines'
      and policyname = 'credit_offer_acceptance_guidelines_public_read_active_offer'
  ) then
    create policy credit_offer_acceptance_guidelines_public_read_active_offer
      on public.credit_offer_acceptance_guidelines
      for select
      to anon, authenticated
      using (
        exists (
          select 1 from public.credit_offers co
          where co.id = credit_offer_acceptance_guidelines.credit_offer_id
            and co.is_active = true
        )
      );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_offer_acceptance_guidelines'
      and policyname = 'credit_offer_acceptance_guidelines_admin_all'
  ) then
    create policy credit_offer_acceptance_guidelines_admin_all
      on public.credit_offer_acceptance_guidelines
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_credit_offers_updated_at on public.credit_offers;
create trigger trg_credit_offers_updated_at
  before update on public.credit_offers
  for each row execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'credit_offers'
  ) then
    execute 'alter publication supabase_realtime add table public.credit_offers';
  end if;
exception
  when undefined_object then
    null;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'credit_offer_product_information'
  ) then
    execute 'alter publication supabase_realtime add table public.credit_offer_product_information';
  end if;
exception
  when undefined_object then
    null;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'credit_offer_acceptance_guidelines'
  ) then
    execute 'alter publication supabase_realtime add table public.credit_offer_acceptance_guidelines';
  end if;
exception
  when undefined_object then
    null;
end$$;

-- Link credit lead to a specific offer/bank context when triggered from a card.
alter table public.credit_leads
  add column if not exists credit_offer_id uuid references public.credit_offers(id) on delete set null;
alter table public.credit_leads
  add column if not exists bank_id uuid references public.banks(id) on delete set null;

comment on table public.credit_offers
  is 'Admin-managed credit offers used in public kapitalmitte credit comparison.';
comment on table public.credit_offer_product_information
  is 'Per-offer product information rows shown in Produktinformationen tab.';
comment on table public.credit_offer_acceptance_guidelines
  is 'Per-offer acceptance guideline rows shown in Annahmerichtlinien tab.';
