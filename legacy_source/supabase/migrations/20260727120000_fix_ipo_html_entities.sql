-- Fix scraped IPO catalog text that stored raw HTML entities (e.g. &amp;).

update public.ipo_catalog
set
  company_name = replace(company_name, '&amp;', '&'),
  description = case
    when description is null then null
    else replace(description, '&amp;', '&')
  end,
  exchange = case
    when exchange is null then null
    else replace(exchange, '&amp;', '&')
  end,
  market = case
    when market is null then null
    else replace(market, '&amp;', '&')
  end,
  sector = case
    when sector is null then null
    else replace(sector, '&amp;', '&')
  end,
  expected_ipo_window = case
    when expected_ipo_window is null then null
    else replace(expected_ipo_window, '&amp;', '&')
  end
where company_name like '%&amp;%'
   or coalesce(description, '') like '%&amp;%'
   or coalesce(exchange, '') like '%&amp;%'
   or coalesce(market, '') like '%&amp;%'
   or coalesce(sector, '') like '%&amp;%'
   or coalesce(expected_ipo_window, '') like '%&amp;%';

update public.ipo_subscription_requests
set company_name = replace(company_name, '&amp;', '&')
where company_name like '%&amp;%';
