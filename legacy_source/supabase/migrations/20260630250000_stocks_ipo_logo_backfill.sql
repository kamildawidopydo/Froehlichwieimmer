-- Backfill stocks.logo_url from ipo_catalog for IPO depot symbols

update public.stocks s
set logo_url = ic.logo_url
from public.ipo_catalog ic
where ic.logo_url is not null
  and trim(ic.logo_url) <> ''
  and (
    upper(trim(coalesce(ic.ticker_proposed, ''))) = s.symbol
    or s.symbol like 'IPO-%'
  )
  and (s.logo_url is null or s.logo_url ilike '%clearbit.com%' or s.logo_url = '');

update public.stocks s
set logo_url = ic.logo_url
from public.ipo_subscription_requests r
join public.ipo_catalog ic on ic.id = r.ipo_id
where r.status = 'approved'
  and ic.logo_url is not null
  and trim(ic.logo_url) <> ''
  and s.symbol = upper(
    trim(
      coalesce(
        nullif(trim(r.ticker), ''),
        nullif(trim(ic.ticker_proposed), ''),
        'IPO-' || left(upper(regexp_replace(coalesce(ic.company_name, 'IPO'), '[^A-Za-z0-9]', '', 'g')), 12)
      )
    )
  )
  and (s.logo_url is null or s.logo_url ilike '%clearbit.com%');
