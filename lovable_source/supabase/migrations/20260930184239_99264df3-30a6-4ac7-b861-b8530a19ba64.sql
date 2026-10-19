create type public.app_role as enum ('admin','moderator','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null, role public.app_role not null, created_at timestamptz not null default now(), unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Eigene Rollen lesen" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.profiles (
  id uuid primary key, email text not null, name text not null default '', first_name text, last_name text,
  phone text, country text, street text, house_number text, address_addition text, postal_code text, city text,
  avatar_url text, notification_prefs jsonb, email_digest_enabled boolean not null default true,
  onboarding_completed boolean not null default false, onboarding_completed_steps jsonb not null default '[]'::jsonb,
  must_change_password boolean not null default false, last_password_reset_at timestamptz, last_seen_at timestamptz,
  status text not null default 'active', verified boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Eigenes Profil lesen" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Eigenes Profil ändern" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Admins lesen Profile" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.banks (slug text primary key, doc jsonb not null, is_active boolean not null default true, updated_at timestamptz not null default now());
create table public.savings_offers (id text primary key, bank_slug text, doc jsonb not null, is_active boolean not null default true, updated_at timestamptz not null default now());
create index on public.savings_offers(bank_slug);
create table public.countries (code text primary key, doc jsonb not null);
grant select on public.banks, public.savings_offers, public.countries to anon, authenticated;
grant insert, update, delete on public.banks, public.savings_offers to authenticated;
grant all on public.banks, public.savings_offers, public.countries to service_role;
alter table public.banks enable row level security;
alter table public.savings_offers enable row level security;
alter table public.countries enable row level security;
create policy "Banken öffentlich" on public.banks for select to anon, authenticated using (true);
create policy "Angebote öffentlich" on public.savings_offers for select to anon, authenticated using (true);
create policy "Länder öffentlich" on public.countries for select to anon, authenticated using (true);
create policy "Admins verwalten Banken" on public.banks for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins verwalten Angebote" on public.savings_offers for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));