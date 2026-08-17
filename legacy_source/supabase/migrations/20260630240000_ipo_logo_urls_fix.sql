-- Fix IPO catalog logo URLs (remove dead Clearbit / wrong wiki photos)

update public.ipo_catalog set logo_url = '/assets/ipo-logos/openai.svg' where external_key = 'sec_filed:openai';
update public.ipo_catalog set logo_url = '/assets/ipo-logos/anthropic.svg' where external_key = 'sec_filed:anthropic';
update public.ipo_catalog set logo_url = '/assets/ipo-logos/discord.svg' where external_key = 'sec_filed:discord';
update public.ipo_catalog set logo_url = '/assets/ipo-logos/kraken.png' where external_key = 'sec_filed:kraken';
update public.ipo_catalog set logo_url = '/assets/ipo-logos/stripe.svg' where external_key = 'manual:stripe';
update public.ipo_catalog set logo_url = '/assets/ipo-logos/canva.png' where external_key = 'manual:canva';
update public.ipo_catalog set logo_url = '/assets/ipo-logos/xai.svg' where external_key = 'manual:xai';
update public.ipo_catalog set logo_url = '/assets/ipo-logos/revolut.png' where external_key = 'manual:revolut';
update public.ipo_catalog set logo_url = '/assets/ipo-logos/anduril.png' where external_key = 'manual:anduril';
update public.ipo_catalog set logo_url = '/assets/ipo-logos/databricks.png' where external_key = 'manual:databricks';
update public.ipo_catalog set logo_url = '/assets/ipo-logos/figure-ai.png' where external_key = 'manual:figure-ai';
update public.ipo_catalog set logo_url = 'https://unavatar.io/waymo.com?fallback=false' where external_key = 'manual:waymo';

-- Scraped US tickers: FMP CDN
update public.ipo_catalog
set logo_url = 'https://financialmodelingprep.com/image-stock/' ||
  upper(split_part(trim(ticker_proposed), '.', 1)) || '.png'
where ticker_proposed is not null
  and trim(ticker_proposed) <> ''
  and coalesce(source, '') in ('stockanalysis', 'nasdaq', 'yahoo')
  and (logo_url is null or logo_url ilike '%clearbit.com%' or logo_url ilike '%stockanalysis.com/logos1%');

-- Euronext: exchange suffix on FMP
update public.ipo_catalog
set logo_url = 'https://financialmodelingprep.com/image-stock/' ||
  upper(split_part(trim(ticker_proposed), '.', 1)) || '.PA.png'
where ticker_proposed is not null
  and trim(ticker_proposed) <> ''
  and coalesce(source, '') = 'euronext'
  and (coalesce(exchange, '') ilike '%paris%' or coalesce(market, '') ilike '%euronext%')
  and (logo_url is null or logo_url ilike '%clearbit.com%');

-- Known company websites for high-profile scraped names
update public.ipo_catalog set prospectus_url = coalesce(prospectus_url, 'https://bendingspoons.com')
where company_name ilike '%Bending Spoons%';
update public.ipo_catalog set prospectus_url = coalesce(prospectus_url, 'https://www.li.me')
where company_name ilike '%Neutron Holdings%' or ticker_proposed ilike 'LIME';
update public.ipo_catalog set prospectus_url = coalesce(prospectus_url, 'https://www.aresacquisitioncorp.com')
where company_name ilike '%Ares Acquisition%' or ticker_proposed = 'AAC';
