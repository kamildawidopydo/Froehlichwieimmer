-- Allow anonymous read of cached market prices for the public /news sidebar.

drop policy if exists "stock_cache_anon_select" on public.stock_prices_cache;
create policy "stock_cache_anon_select" on public.stock_prices_cache
  for select to anon using (true);

drop policy if exists "stocks_anon_select_active" on public.stocks;
create policy "stocks_anon_select_active" on public.stocks
  for select to anon using (is_active = true);
