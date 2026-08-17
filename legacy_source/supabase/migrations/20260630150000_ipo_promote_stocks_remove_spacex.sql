-- ============================================================================
-- Remove SpaceX from IPO catalog (already listed) + promote listed IPOs to stocks
-- ============================================================================

delete from public.ipo_catalog
where external_key = 'sec_filed:spacex';

-- SQL fallback for cron (edge function also promotes with Yahoo symbol suffix logic)
create or replace function public.promote_listed_ipos_to_stocks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
  v_symbol text;
  v_currency text;
begin
  for r in
    select *
    from public.ipo_catalog
    where is_visible = true
      and ticker_proposed is not null
      and trim(ticker_proposed) <> ''
      and status not in ('cancelled', 'filed')
      and (
        status = 'listed'
        or (ipo_date is not null and ipo_date <= current_date)
      )
  loop
    v_symbol := upper(trim(r.ticker_proposed));
    v_currency := coalesce(
      nullif(trim(r.price_currency), ''),
      case
        when coalesce(r.exchange, '') ilike '%US%'
          or coalesce(r.market, '') ilike '%NASDAQ%'
          or coalesce(r.market, '') ilike '%NYSE%' then 'USD'
        when coalesce(r.exchange, '') ilike '%London%'
          or coalesce(r.market, '') ilike '%LSE%' then 'GBP'
        else 'EUR'
      end
    );

    insert into public.stocks (symbol, name, exchange, currency, sector, logo_url, is_active, display_order)
    values (
      v_symbol,
      r.company_name,
      coalesce(r.exchange, r.market),
      v_currency,
      r.sector,
      r.logo_url,
      true,
      greatest(50, coalesce(r.display_order, 0))
    )
    on conflict (symbol) do update set
      name = excluded.name,
      exchange = excluded.exchange,
      currency = excluded.currency,
      sector = coalesce(excluded.sector, public.stocks.sector),
      logo_url = coalesce(excluded.logo_url, public.stocks.logo_url),
      is_active = true;

    update public.ipo_catalog
    set status = 'listed', is_visible = false, updated_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.promote_listed_ipos_to_stocks() is
  'Moves IPOs with passed listing date (or listed status) into public.stocks and hides them from IPO list.';

-- Run once for existing rows
select public.promote_listed_ipos_to_stocks();

-- Daily after market open (UTC)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'promote_listed_ipos_daily') then
    perform cron.unschedule('promote_listed_ipos_daily');
  end if;
end$$;

select cron.schedule(
  'promote_listed_ipos_daily',
  '15 7 * * *',
  $$ select public.promote_listed_ipos_to_stocks(); $$
);
