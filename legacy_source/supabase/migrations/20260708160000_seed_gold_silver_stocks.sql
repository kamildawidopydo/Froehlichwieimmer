-- ============================================================================
-- Curated gold (20) + silver (20) equities/ETFs for Aktien depot
-- Yahoo Finance symbols; display_order 100–139 after US blue-chips (1–21)
-- ============================================================================

insert into public.stocks (symbol, name, exchange, currency, sector, is_active, display_order)
values
  -- Gold ETFs & trusts
  ('GLD', 'SPDR Gold Shares', 'NYSEARCA', 'USD', 'Precious Metals', true, 100),
  ('IAU', 'iShares Gold Trust', 'NYSEARCA', 'USD', 'Precious Metals', true, 101),
  ('GLDM', 'SPDR Gold MiniShares Trust', 'NYSEARCA', 'USD', 'Precious Metals', true, 102),
  ('SGOL', 'abrdn Physical Gold Shares ETF', 'NYSEARCA', 'USD', 'Precious Metals', true, 103),
  ('GDX', 'VanEck Gold Miners ETF', 'NYSEARCA', 'USD', 'Precious Metals', true, 104),
  ('GDXJ', 'VanEck Junior Gold Miners ETF', 'NYSEARCA', 'USD', 'Precious Metals', true, 105),
  ('RING', 'iShares MSCI Global Gold Miners ETF', 'NASDAQ', 'USD', 'Precious Metals', true, 106),
  -- Gold producers / streamers / royalties
  ('NEM', 'Newmont Corporation', 'NYSE', 'USD', 'Precious Metals', true, 107),
  ('B', 'Barrick Mining Corporation', 'NYSE', 'USD', 'Precious Metals', true, 108),
  ('AEM', 'Agnico Eagle Mines Limited', 'NYSE', 'USD', 'Precious Metals', true, 109),
  ('WPM', 'Wheaton Precious Metals Corp.', 'NYSE', 'USD', 'Precious Metals', true, 110),
  ('FNV', 'Franco-Nevada Corporation', 'NYSE', 'USD', 'Precious Metals', true, 111),
  ('KGC', 'Kinross Gold Corporation', 'NYSE', 'USD', 'Precious Metals', true, 112),
  ('AU', 'AngloGold Ashanti plc', 'NYSE', 'USD', 'Precious Metals', true, 113),
  ('GFI', 'Gold Fields Limited', 'NYSE', 'USD', 'Precious Metals', true, 114),
  ('RGLD', 'Royal Gold Inc.', 'NASDAQ', 'USD', 'Precious Metals', true, 115),
  ('AGI', 'Alamos Gold Inc.', 'NYSE', 'USD', 'Precious Metals', true, 116),
  ('BTG', 'B2Gold Corp.', 'NYSE', 'USD', 'Precious Metals', true, 117),
  ('HMY', 'Harmony Gold Mining Company Limited', 'NYSE', 'USD', 'Precious Metals', true, 118),
  ('OR', 'OR Royalties Inc.', 'NYSE', 'USD', 'Precious Metals', true, 119),

  -- Silver ETFs & trusts
  ('SLV', 'iShares Silver Trust', 'NYSEARCA', 'USD', 'Precious Metals', true, 120),
  ('SIVR', 'abrdn Physical Silver Shares ETF', 'NYSEARCA', 'USD', 'Precious Metals', true, 121),
  ('PSLV', 'Sprott Physical Silver Trust', 'NYSEARCA', 'USD', 'Precious Metals', true, 122),
  ('SIL', 'Global X Silver Miners ETF', 'NYSEARCA', 'USD', 'Precious Metals', true, 123),
  ('SILJ', 'Amplify Junior Silver Miners ETF', 'NYSEARCA', 'USD', 'Precious Metals', true, 124),
  ('SLVP', 'iShares MSCI Global Silver and Metals Miners ETF', 'NASDAQ', 'USD', 'Precious Metals', true, 125),
  -- Silver miners / precious-metals names with strong silver exposure
  ('AG', 'First Majestic Silver Corp.', 'NYSE', 'USD', 'Precious Metals', true, 126),
  ('PAAS', 'Pan American Silver Corp.', 'NYSE', 'USD', 'Precious Metals', true, 127),
  ('CDE', 'Coeur Mining Inc.', 'NYSE', 'USD', 'Precious Metals', true, 128),
  ('HL', 'Hecla Mining Company', 'NYSE', 'USD', 'Precious Metals', true, 129),
  ('EXK', 'Endeavour Silver Corp.', 'NYSE', 'USD', 'Precious Metals', true, 130),
  ('SVM', 'Silvercorp Metals Inc.', 'NYSE', 'USD', 'Precious Metals', true, 131),
  ('FSM', 'Fortuna Mining Corp.', 'NYSE', 'USD', 'Precious Metals', true, 132),
  ('SSRM', 'SSR Mining Inc.', 'NASDAQ', 'USD', 'Precious Metals', true, 133),
  ('NEWP', 'New Pacific Metals Corp.', 'NYSE', 'USD', 'Precious Metals', true, 134),
  ('VZLA', 'Vizsla Silver Corp.', 'NYSE', 'USD', 'Precious Metals', true, 135),
  ('MUX', 'McEwen Inc.', 'NYSE', 'USD', 'Precious Metals', true, 136),
  ('USAS', 'Americas Gold and Silver Corporation', 'NYSE', 'USD', 'Precious Metals', true, 137),
  ('BVN', 'Buenaventura Mining Company Inc.', 'NYSE', 'USD', 'Precious Metals', true, 138),
  ('ASM', 'Avino Silver & Gold Mines Ltd.', 'NYSE', 'USD', 'Precious Metals', true, 139)
on conflict (symbol) do update set
  name = excluded.name,
  exchange = excluded.exchange,
  currency = excluded.currency,
  sector = excluded.sector,
  is_active = true,
  display_order = excluded.display_order;
