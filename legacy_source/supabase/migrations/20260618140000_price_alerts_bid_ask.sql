-- Bid/ask on price cache + user price alerts

alter table public.stock_prices_cache
  add column if not exists bid numeric,
  add column if not exists ask numeric,
  add column if not exists bid_size numeric,
  add column if not exists ask_size numeric;

comment on column public.stock_prices_cache.bid is 'Best bid from Yahoo regularMarketBid';
comment on column public.stock_prices_cache.ask is 'Best ask from Yahoo regularMarketAsk';

create table if not exists public.user_price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  direction text not null check (direction in ('above', 'below')),
  target_price numeric not null check (target_price > 0),
  is_active boolean not null default true,
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_price_alerts_user_id_idx on public.user_price_alerts(user_id);
create index if not exists user_price_alerts_symbol_idx on public.user_price_alerts(symbol);

alter table public.user_price_alerts enable row level security;

drop policy if exists user_price_alerts_select_own on public.user_price_alerts;
create policy user_price_alerts_select_own on public.user_price_alerts
  for select using (auth.uid() = user_id);

drop policy if exists user_price_alerts_insert_own on public.user_price_alerts;
create policy user_price_alerts_insert_own on public.user_price_alerts
  for insert with check (auth.uid() = user_id);

drop policy if exists user_price_alerts_delete_own on public.user_price_alerts;
create policy user_price_alerts_delete_own on public.user_price_alerts
  for delete using (auth.uid() = user_id);

drop policy if exists user_price_alerts_update_own on public.user_price_alerts;
create policy user_price_alerts_update_own on public.user_price_alerts
  for update using (auth.uid() = user_id);
