-- ============================================================================
-- Curated US stocks for dashboard vitrine (Mag7 + SpaceX + blue-chip extension)
-- Yahoo Finance symbols; display_order 1–21 keeps US names above EU catalog (1000+)
-- ============================================================================

insert into public.stocks (symbol, name, exchange, currency, sector, is_active, display_order)
values
  ('AAPL', 'Apple Inc.', 'NASDAQ', 'USD', 'Technology', true, 1),
  ('MSFT', 'Microsoft Corporation', 'NASDAQ', 'USD', 'Technology', true, 2),
  ('NVDA', 'NVIDIA Corporation', 'NASDAQ', 'USD', 'Technology', true, 3),
  ('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'USD', 'Communication Services', true, 4),
  ('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'USD', 'Consumer Cyclical', true, 5),
  ('TSLA', 'Tesla Inc.', 'NASDAQ', 'USD', 'Consumer Cyclical', true, 6),
  ('META', 'Meta Platforms Inc.', 'NASDAQ', 'USD', 'Communication Services', true, 7),
  ('NFLX', 'Netflix Inc.', 'NASDAQ', 'USD', 'Communication Services', true, 8),
  ('SPCX', 'Space Exploration Technologies Corp.', 'NASDAQ', 'USD', 'Aerospace & Defense', true, 9),
  ('AMD', 'Advanced Micro Devices Inc.', 'NASDAQ', 'USD', 'Technology', true, 10),
  ('AVGO', 'Broadcom Inc.', 'NASDAQ', 'USD', 'Technology', true, 11),
  ('JPM', 'JPMorgan Chase & Co.', 'NYSE', 'USD', 'Financials', true, 12),
  ('V', 'Visa Inc.', 'NYSE', 'USD', 'Financials', true, 13),
  ('LLY', 'Eli Lilly and Company', 'NYSE', 'USD', 'Healthcare', true, 14),
  ('JNJ', 'Johnson & Johnson', 'NYSE', 'USD', 'Healthcare', true, 15),
  ('WMT', 'Walmart Inc.', 'NYSE', 'USD', 'Consumer Defensive', true, 16),
  ('KO', 'The Coca-Cola Company', 'NYSE', 'USD', 'Consumer Defensive', true, 17),
  ('XOM', 'Exxon Mobil Corporation', 'NYSE', 'USD', 'Energy', true, 18),
  ('CRM', 'Salesforce Inc.', 'NYSE', 'USD', 'Technology', true, 19),
  ('ORCL', 'Oracle Corporation', 'NYSE', 'USD', 'Technology', true, 20),
  ('BRK-B', 'Berkshire Hathaway Inc. Class B', 'NYSE', 'USD', 'Financials', true, 21)
on conflict (symbol) do update set
  name = excluded.name,
  exchange = excluded.exchange,
  currency = excluded.currency,
  sector = excluded.sector,
  is_active = true,
  display_order = excluded.display_order;
