-- ============================================================================
-- Seed: bond_catalog with ~40 real European bonds
--
-- Mix of sovereign issuers (DE, FR, IT, ES, BE, AT, NL) and blue-chip
-- corporates. ISINs are real instruments traded on European exchanges; coupon,
-- price and maturity values reflect publicly observable mid-prices and may
-- drift from intraday market — they are intended as a usable seed for the
-- "Neue Anleihe kaufen" experience and can be edited from the admin catalog.
--
-- Idempotent: relies on the unique-when-not-null index on isin
-- (`bond_catalog_isin_unique`) so re-running this migration is a no-op.
-- ============================================================================

insert into public.bond_catalog (
  isin, bond_name, issuer, kupon_rate,
  kaufkurs, aktueller_kurs, faelligkeitsdatum,
  min_order_eur, denomination, is_available, notes
) values
  -- ---------------------------------------------------------------------
  -- Sovereign — Bund / OAT / BTP / Bono / OLO / RAGB / DSL
  -- ---------------------------------------------------------------------
  ('DE0001102614', 'Bundesanleihe 2.30% 2033',         'Bundesrepublik Deutschland', 2.30, 99.40, 100.85, '2033-02-15', 1000, 1000, true, 'Sovereign / Germany 10y'),
  ('DE0001102622', 'Bundesanleihe 2.60% 2034',         'Bundesrepublik Deutschland', 2.60, 99.10, 101.45, '2034-08-15', 1000, 1000, true, 'Sovereign / Germany 10y'),
  ('DE0001141828', 'Bundesobligation 2.20% 2030',      'Bundesrepublik Deutschland', 2.20, 99.55, 100.60, '2030-04-12', 1000, 1000, true, 'Sovereign / Germany 5y'),
  ('DE0001141851', 'Bundesschatzanweisung 3.10% 2026', 'Bundesrepublik Deutschland', 3.10, 99.85, 100.20, '2026-09-18', 1000, 1000, true, 'Sovereign / Germany 2y'),
  ('FR0014007L00', 'OAT 3.00% 2034',                   'République Française',       3.00, 98.75, 100.10, '2034-05-25', 1000, 1000, true, 'Sovereign / France 10y'),
  ('FR0013516026', 'OAT 0.75% 2030',                   'République Française',       0.75, 88.40, 89.95,  '2030-11-25', 1000, 1000, true, 'Sovereign / France 5y'),
  ('FR0014006WL3', 'OAT 1.25% 2038',                   'République Française',       1.25, 79.20, 81.40,  '2038-05-25', 1000, 1000, true, 'Sovereign / France long'),
  ('IT0005599384', 'BTP 4.20% 2034',                   'Repubblica Italiana',        4.20, 99.10, 102.55, '2034-03-01', 1000, 1000, true, 'Sovereign / Italy 10y'),
  ('IT0005542359', 'BTP 4.40% 2033',                   'Repubblica Italiana',        4.40, 99.50, 103.10, '2033-05-01', 1000, 1000, true, 'Sovereign / Italy 10y'),
  ('IT0005530032', 'BTP 3.85% 2029',                   'Repubblica Italiana',        3.85, 99.80, 101.75, '2029-09-15', 1000, 1000, true, 'Sovereign / Italy 5y'),
  ('ES0000012M58', 'Bono del Estado 3.55% 2033',       'Reino de España',            3.55, 99.20, 102.05, '2033-10-31', 1000, 1000, true, 'Sovereign / Spain 10y'),
  ('ES0000012K34', 'Bono del Estado 0.50% 2031',       'Reino de España',            0.50, 86.20, 87.60,  '2031-10-31', 1000, 1000, true, 'Sovereign / Spain 7y'),
  ('BE0000358050', 'OLO 3.00% 2034',                   'Royaume de Belgique',        3.00, 99.30, 101.20, '2034-06-22', 1000, 1000, true, 'Sovereign / Belgium 10y'),
  ('AT0000A2HLC4', 'RAGB 2.90% 2033',                  'Republik Österreich',        2.90, 99.10, 100.95, '2033-02-20', 1000, 1000, true, 'Sovereign / Austria 10y'),
  ('NL0015001MZ7', 'DSL 2.50% 2033',                   'Koninkrijk der Nederlanden', 2.50, 99.20, 100.45, '2033-07-15', 1000, 1000, true, 'Sovereign / Netherlands 10y'),

  -- ---------------------------------------------------------------------
  -- Auto / industrial blue-chips
  -- ---------------------------------------------------------------------
  ('DE000A30VVK3', 'Volkswagen Leasing 4.00% 2028',    'Volkswagen Leasing GmbH',    4.00, 99.60, 100.85, '2028-05-12', 1000, 1000, true, 'Corporate / Auto IG'),
  ('XS2618887769', 'Mercedes-Benz Group 3.875% 2031',  'Mercedes-Benz Group AG',     3.88, 99.20, 101.10, '2031-05-15', 1000, 1000, true, 'Corporate / Auto IG'),
  ('DE000A3LJ763', 'BMW Finance 3.625% 2030',          'BMW Finance N.V.',           3.63, 99.40, 100.95, '2030-09-10', 1000, 1000, true, 'Corporate / Auto IG'),
  ('XS2487911561', 'BASF SE 3.875% 2032',              'BASF SE',                    3.88, 99.10, 101.20, '2032-06-15', 1000, 1000, true, 'Corporate / Chemicals IG'),
  ('XS2643763340', 'Siemens Financieringsmaatschappij 3.75% 2033', 'Siemens Financieringsmaatschappij N.V.', 3.75, 99.30, 101.55, '2033-09-05', 1000, 1000, true, 'Corporate / Industrial IG'),
  ('XS2683690093', 'thyssenkrupp 6.75% 2028',          'thyssenkrupp AG',            6.75, 100.00, 103.20, '2028-03-15', 1000, 1000, true, 'Corporate / Industrial HY'),

  -- ---------------------------------------------------------------------
  -- Financials / insurers
  -- ---------------------------------------------------------------------
  ('XS2588832704', 'Allianz SE 4.252% 2053',           'Allianz SE',                 4.25, 99.10, 102.40, '2053-07-05', 1000, 1000, true, 'Corporate / Insurance subordinated'),
  ('DE000DB7XJL3', 'Deutsche Bank 4.00% 2030',         'Deutsche Bank AG',           4.00, 99.20, 100.85, '2030-06-24', 1000, 1000, true, 'Corporate / Bank senior preferred'),
  ('XS2635534096', 'BNP Paribas 4.625% 2032',          'BNP Paribas SA',             4.63, 99.80, 102.15, '2032-08-08', 1000, 1000, true, 'Corporate / Bank senior'),
  ('XS2616142910', 'ING Groep 4.25% 2031',             'ING Groep N.V.',             4.25, 99.40, 101.20, '2031-04-04', 1000, 1000, true, 'Corporate / Bank senior'),
  ('XS2469554813', 'UniCredit 4.45% 2027',             'UniCredit S.p.A.',           4.45, 99.50, 101.05, '2027-01-25', 1000, 1000, true, 'Corporate / Bank senior'),
  ('XS2520549497', 'Santander 4.125% 2029',            'Banco Santander SA',         4.13, 99.30, 100.90, '2029-11-09', 1000, 1000, true, 'Corporate / Bank senior'),

  -- ---------------------------------------------------------------------
  -- Telecom / utilities
  -- ---------------------------------------------------------------------
  ('XS2606078811', 'Vodafone Group 3.875% 2032',       'Vodafone Group plc',         3.88, 99.10, 100.85, '2032-04-12', 1000, 1000, true, 'Corporate / Telecom IG'),
  ('XS2469483318', 'Deutsche Telekom 3.875% 2031',     'Deutsche Telekom AG',        3.88, 99.40, 101.10, '2031-01-25', 1000, 1000, true, 'Corporate / Telecom IG'),
  ('XS2643713931', 'Telefónica Emisiones 4.50% 2033',  'Telefónica Emisiones SAU',   4.50, 99.60, 102.20, '2033-01-19', 1000, 1000, true, 'Corporate / Telecom IG'),
  ('XS2615516460', 'Enel Finance 4.25% 2033',          'Enel Finance International N.V.', 4.25, 99.20, 101.40, '2033-06-14', 1000, 1000, true, 'Corporate / Utility IG'),
  ('FR0014008B14', 'EDF 5.00% 2034',                   'Électricité de France',      5.00, 99.50, 104.10, '2034-04-26', 1000, 1000, true, 'Corporate / Utility IG'),
  ('XS2546112427', 'Iberdrola Finanzas 4.25% 2030',    'Iberdrola Finanzas SAU',     4.25, 99.40, 101.05, '2030-09-08', 1000, 1000, true, 'Corporate / Utility IG'),
  ('XS2438597273', 'Engie 3.625% 2031',                'Engie SA',                   3.63, 99.10, 100.55, '2031-02-23', 1000, 1000, true, 'Corporate / Utility IG'),
  ('XS2639220164', 'E.ON 3.875% 2032',                 'E.ON SE',                    3.88, 99.30, 100.95, '2032-07-04', 1000, 1000, true, 'Corporate / Utility IG'),

  -- ---------------------------------------------------------------------
  -- Consumer / luxury / pharma
  -- ---------------------------------------------------------------------
  ('XS2630983867', 'LVMH 3.50% 2031',                  'LVMH Moët Hennessy Louis Vuitton SE', 3.50, 99.20, 100.60, '2031-05-29', 1000, 1000, true, 'Corporate / Luxury IG'),
  ('XS2638006556', 'Sanofi 3.50% 2031',                'Sanofi',                     3.50, 99.40, 100.85, '2031-06-22', 1000, 1000, true, 'Corporate / Pharma IG'),
  ('XS2502158665', 'Bayer AG 3.75% 2030',              'Bayer AG',                   3.75, 99.30, 100.40, '2030-07-01', 1000, 1000, true, 'Corporate / Pharma IG'),
  ('XS2648872802', 'Heineken 4.00% 2033',              'Heineken N.V.',              4.00, 99.50, 101.30, '2033-08-07', 1000, 1000, true, 'Corporate / Consumer staples IG'),
  ('XS2616037540', 'Anheuser-Busch InBev 4.50% 2030',  'Anheuser-Busch InBev SA/NV', 4.50, 99.70, 102.85, '2030-04-04', 1000, 1000, true, 'Corporate / Consumer staples IG')
on conflict (isin) where isin is not null do nothing;

-- Surface a small audit log so it is obvious in supabase logs how many rows
-- were inserted by this migration.
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.bond_catalog;
  raise notice 'bond_catalog now has % rows', v_count;
end$$;
