-- User fund / ETF positions for dashboard Wertpapiere breakdown

create table if not exists public.user_fund_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text not null,
  fund_type text not null default 'etf' check (fund_type in ('etf', 'fonds')),
  quantity numeric not null default 0 check (quantity >= 0),
  avg_cost numeric,
  current_price numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create index if not exists user_fund_positions_user_idx on public.user_fund_positions (user_id, is_active);

alter table public.user_fund_positions enable row level security;

drop policy if exists "fund_positions: owner read" on public.user_fund_positions;
create policy "fund_positions: owner read" on public.user_fund_positions
  for select using (auth.uid() = user_id);

drop policy if exists "fund_positions: owner write" on public.user_fund_positions;
create policy "fund_positions: owner write" on public.user_fund_positions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fund_positions: admin all" on public.user_fund_positions;
create policy "fund_positions: admin all" on public.user_fund_positions
  for all using (public.is_admin()) with check (public.is_admin());
