-- ============================================================================
-- Restore Euronext IPO visibility + StockAnalysis source + fix promote logic
-- ============================================================================

alter table public.ipo_catalog drop constraint if exists ipo_catalog_source_check;
alter table public.ipo_catalog
  add constraint ipo_catalog_source_check
  check (source in ('euronext', 'yahoo', 'nasdaq', 'stockanalysis', 'sec_filed', 'manual'));

-- Re-show scraped IPOs hidden by premature date-based promotion
update public.ipo_catalog
set is_visible = true, updated_at = now()
where status in ('upcoming', 'open', 'priced', 'filed')
  and source in ('euronext', 'yahoo', 'nasdaq', 'stockanalysis');

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
      and status = 'listed'
      and ticker_proposed is not null
      and trim(ticker_proposed) <> ''
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
    set is_visible = false, updated_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
