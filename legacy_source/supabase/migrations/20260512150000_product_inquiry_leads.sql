-- ============================================================================
-- Landing page product inquiry leads (Aktien / Anleihen / Spargeld wizard)
-- ============================================================================

create table if not exists public.product_inquiry_leads (
  id                 uuid primary key default gen_random_uuid(),
  product            text not null,
  answers            jsonb not null default '{}'::jsonb,
  first_name         text not null,
  last_name          text not null,
  email              text not null,
  phone              text not null,
  customer_number    text,
  consent_privacy    boolean not null default false,
  consent_terms      boolean not null default false,
  consent_marketing  boolean not null default false,
  user_id            uuid references public.profiles (id) on delete set null,
  status             text not null default 'new',
  handled_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint product_inquiry_leads_product_check
    check (product in ('aktien', 'anleihen', 'spargeld')),
  constraint product_inquiry_leads_status_check
    check (status in ('new', 'contacted', 'closed'))
);

comment on table public.product_inquiry_leads is
  'Startseiten-Produktfragebogen: Antworten (jsonb) und Kontaktdaten; ersetzt keine WpHG-Eignungsprüfung.';

create index if not exists product_inquiry_leads_created_idx
  on public.product_inquiry_leads (created_at desc);

create index if not exists product_inquiry_leads_status_idx
  on public.product_inquiry_leads (status);

create index if not exists product_inquiry_leads_product_idx
  on public.product_inquiry_leads (product);

drop trigger if exists trg_product_inquiry_leads_updated_at on public.product_inquiry_leads;
create trigger trg_product_inquiry_leads_updated_at
  before update on public.product_inquiry_leads
  for each row execute function public.set_updated_at();

alter table public.product_inquiry_leads enable row level security;

-- Public: insert with mandatory consents and no foreign user_id hijacking.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_inquiry_leads'
      and policyname = 'product_inquiry_leads_public_insert'
  ) then
    create policy product_inquiry_leads_public_insert
      on public.product_inquiry_leads
      for insert
      to anon, authenticated
      with check (
        consent_privacy = true
        and consent_terms = true
        and (user_id is null or user_id = auth.uid())
      );
  end if;
end$$;

-- Admin full access.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_inquiry_leads'
      and policyname = 'product_inquiry_leads_admin_all'
  ) then
    create policy product_inquiry_leads_admin_all
      on public.product_inquiry_leads
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

-- Realtime for admin badges.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'product_inquiry_leads'
  ) then
    execute 'alter publication supabase_realtime add table public.product_inquiry_leads';
  end if;
exception
  when undefined_object then
    null;
end$$;
