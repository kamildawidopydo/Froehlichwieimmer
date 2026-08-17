-- ============================================================================
-- IPO catalog: real company logos (Clearbit for privates, FMP for tickered)
-- ============================================================================

-- Curated mega-caps / SEC-filed (domain from prospectus_url)
update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/openai.com'
where external_key = 'sec_filed:openai' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/anthropic.com'
where external_key = 'sec_filed:anthropic' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/discord.com'
where external_key = 'sec_filed:discord' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/kraken.com'
where external_key = 'sec_filed:kraken' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/databricks.com'
where external_key = 'manual:databricks' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/stripe.com'
where external_key = 'manual:stripe' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/canva.com'
where external_key = 'manual:canva' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/x.ai'
where external_key = 'manual:xai' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/waymo.com'
where external_key = 'manual:waymo' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/anduril.com'
where external_key = 'manual:anduril' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/revolut.com'
where external_key = 'manual:revolut' and coalesce(logo_url, '') = '';

update public.ipo_catalog set logo_url = 'https://logo.clearbit.com/figure.ai'
where external_key = 'manual:figure-ai' and coalesce(logo_url, '') = '';

-- Scraped IPOs with ticker → FMP logo CDN
update public.ipo_catalog
set logo_url = 'https://financialmodelingprep.com/image-stock/' ||
  upper(split_part(trim(ticker_proposed), '.', 1)) || '.png'
where ticker_proposed is not null
  and trim(ticker_proposed) <> ''
  and coalesce(logo_url, '') = '';

comment on column public.ipo_catalog.logo_url is
  'Company logo: Clearbit (private/pre-IPO) or FMP image CDN (ticker).';
