-- ============================================================================
-- IPO catalog: US Nasdaq sources, filed status, valuation fields
-- ============================================================================

alter table public.ipo_catalog
  add column if not exists valuation_last_private numeric(18, 2),
  add column if not exists expected_ipo_window text,
  add column if not exists price_currency text not null default 'EUR';

-- Expand source domain
alter table public.ipo_catalog drop constraint if exists ipo_catalog_source_check;
alter table public.ipo_catalog
  add constraint ipo_catalog_source_check
  check (source in ('euronext', 'yahoo', 'nasdaq', 'sec_filed', 'manual'));

-- Expand status domain (confidential S-1 / filed with SEC, no price yet)
alter table public.ipo_catalog drop constraint if exists ipo_catalog_status_check;
alter table public.ipo_catalog
  add constraint ipo_catalog_status_check
  check (status in ('upcoming', 'open', 'priced', 'filed', 'listed', 'cancelled'));

-- ---------- Curated high-profile US filers (confidential S-1, no official IPO price) ----------

insert into public.ipo_catalog (
  external_key,
  source,
  company_name,
  ticker_proposed,
  exchange,
  market,
  sector,
  status,
  ipo_date,
  expected_ipo_window,
  valuation_last_private,
  price_currency,
  prospectus_url,
  description,
  is_visible,
  is_manual_override,
  display_order
)
values
  (
    'sec_filed:openai',
    'sec_filed',
    'OpenAI',
    null,
    'US',
    'NASDAQ / NYSE (erwartet)',
    'Artificial Intelligence',
    'filed',
    null,
    'Q4 2026 – 2027 (geschätzt, nicht bestätigt)',
    852000000000,
    'USD',
    'https://openai.com',
    'OpenAI hat im Juni 2026 vertraulich einen Entwurf der S-1 bei der SEC eingereicht. Es gibt noch keinen offiziellen IPO-Preis, keine Ticker-Symbol-Zuteilung und keinen bestätigten Börsengangstermin.',
    true,
    true,
    100
  ),
  (
    'sec_filed:anthropic',
    'sec_filed',
    'Anthropic',
    null,
    'US',
    'NASDAQ (erwartet)',
    'Artificial Intelligence',
    'filed',
    null,
    'Herbst 2026 (geschätzt, nicht bestätigt)',
    965000000000,
    'USD',
    'https://www.anthropic.com/news/confidential-draft-s1-sec',
    'Anthropic reichte am 1. Juni 2026 vertraulich einen S-1-Entwurf ein. Laut Unternehmen sind Anzahl der Aktien und Preis noch nicht festgelegt.',
    true,
    true,
    99
  )
on conflict (external_key) do update set
  company_name = excluded.company_name,
  status = excluded.status,
  expected_ipo_window = excluded.expected_ipo_window,
  valuation_last_private = excluded.valuation_last_private,
  description = excluded.description,
  prospectus_url = excluded.prospectus_url,
  is_visible = excluded.is_visible,
  is_manual_override = true,
  display_order = excluded.display_order,
  updated_at = now();
