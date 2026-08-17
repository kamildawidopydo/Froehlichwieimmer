/**
 * Generates supabase/migrations seed SQL from comparison bank catalog.
 * Run: node scripts/generate-comparison-seed.mjs
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** @type {Record<string, { euSince: string, currency: string, sovereignRating: string, depositScheme: string }>} */
const COUNTRY_META = {
  Estonia: { euSince: 'seit 2004', currency: 'EUR', sovereignRating: 'A', depositScheme: 'Estnische Einlagensicherung (Tagatisraha Fond)' },
  Norway: { euSince: 'EFTA (kein EU-Mitglied)', currency: 'NOK', sovereignRating: 'AAA', depositScheme: 'Norwegischer Einlagensicherungsfonds' },
  Sweden: { euSince: 'seit 1995', currency: 'SEK', sovereignRating: 'AAA', depositScheme: 'Schwedische Einlagensicherung (Riksgälden)' },
  Denmark: { euSince: 'seit 1973', currency: 'DKK', sovereignRating: 'AAA', depositScheme: 'Dänischer Garantiefonds for indskydere' },
  Latvia: { euSince: 'seit 2004', currency: 'EUR', sovereignRating: 'A-', depositScheme: 'Lettische Einlagensicherung (FKTK)' },
  Lithuania: { euSince: 'seit 2004', currency: 'EUR', sovereignRating: 'A', depositScheme: 'Litauische Einlagensicherung' },
  'Czech Republic': { euSince: 'seit 2004', currency: 'CZK', sovereignRating: 'AA-', depositScheme: 'Tschechische Einlagensicherung' },
  Switzerland: { euSince: 'kein EU-Mitglied (EFTA)', currency: 'CHF', sovereignRating: 'AAA', depositScheme: 'Schweizer Einlagensicherung (esisuisse)' },
  Netherlands: { euSince: 'seit 1958', currency: 'EUR', sovereignRating: 'AAA', depositScheme: 'Niederländische Einlagensicherung (DGS)' },
  Finland: { euSince: 'seit 1995', currency: 'EUR', sovereignRating: 'AA+', depositScheme: 'Finnische Einlagensicherung (RVV)' },
  Italy: { euSince: 'seit 1958', currency: 'EUR', sovereignRating: 'BBB', depositScheme: 'Italienische Einlagensicherung (FITD)' },
  Spain: { euSince: 'seit 1986', currency: 'EUR', sovereignRating: 'A-', depositScheme: 'Spanische Einlagensicherung (FGD)' },
  Portugal: { euSince: 'seit 1986', currency: 'EUR', sovereignRating: 'BBB+', depositScheme: 'Portugiesische Einlagensicherung (FGD)' },
  Belgium: { euSince: 'seit 1958', currency: 'EUR', sovereignRating: 'AA-', depositScheme: 'Belgische Einlagensicherung (GFD)' },
  France: { euSince: 'seit 1958', currency: 'EUR', sovereignRating: 'AA', depositScheme: 'Französische Einlagensicherung (FGDR)' },
  Austria: { euSince: 'seit 1995', currency: 'EUR', sovereignRating: 'AA+', depositScheme: 'Österreichische Einlagensicherung (ESA)' },
  Germany: { euSince: 'seit 1958', currency: 'EUR', sovereignRating: 'AAA', depositScheme: 'Deutsche Einlagensicherung (EdB)' },
};

/**
 * slug, name, country, founded, creditRating, regulator, product, rate, minDeposit, availability, bonus?, rateHistory[8 months Sep-May 2026]
 */
const NEW_BANKS = [
  ['lhv-pank', 'LHV Pank', 'Estonia', 1999, 'BBB+', 'Finantsinspektsioon', 'Flexgeld', 4.8, 5000, 'Mit Kündigung', 250, [4.35, 4.45, 4.55, 4.6, 4.65, 4.72, 4.78, 4.8]],
  ['lea-bank', 'Lea Bank', 'Norway', 2015, 'A-', 'Finanstilsynet', 'Flexgeld', 4.75, 5000, 'Mit Kündigung', 200, [4.3, 4.4, 4.48, 4.55, 4.6, 4.65, 4.7, 4.75]],
  ['nordax-bank', 'Nordax Bank', 'Sweden', 1910, 'A', 'Finansinspektionen', 'Tagesgeld', 4.25, 10000, 'Täglich verfügbar', 0, [3.85, 3.95, 4.05, 4.1, 4.15, 4.18, 4.22, 4.25]],
  ['ayvens-bank', 'Ayvens Bank', 'Netherlands', 2012, 'AA', 'De Nederlandsche Bank (DNB)', 'Festgeld', 2.35, 1000, 'Fest gebunden', 0, [2.0, 2.1, 2.15, 2.2, 2.25, 2.28, 2.32, 2.35]],
  ['illimity-bank', 'Illimity Bank', 'Italy', 2018, 'BBB', 'Banca d\'Italia', 'Flexgeld', 4.55, 5000, 'Mit Kündigung', 200, [4.0, 4.12, 4.22, 4.3, 4.38, 4.45, 4.5, 4.55]],
  ['knab', 'Knab', 'Netherlands', 2012, 'A', 'De Nederlandsche Bank (DNB)', 'Festgeld', 1.80, 1000, 'Fest gebunden', 0, [1.5, 1.55, 1.6, 1.65, 1.68, 1.72, 1.76, 1.80]],
  ['coop-pank', 'Coop Pank', 'Estonia', 1992, 'A-', 'Finantsinspektsioon', 'Festgeld', 2.40, 1000, 'Fest gebunden', 0, [2.0, 2.1, 2.15, 2.2, 2.28, 2.32, 2.36, 2.40]],
  ['ebn-banco', 'EBN Banco', 'Spain', 1987, 'A-', 'Banco de España', 'Festgeld', 2.50, 1000, 'Fest gebunden', 0, [2.1, 2.2, 2.28, 2.35, 2.4, 2.45, 2.48, 2.50]],
  ['banca-progetto', 'Banca Progetto', 'Italy', 1970, 'A-', 'Banca d\'Italia', 'Festgeld', 4.65, 10000, 'Mit Kündigung', 200, [4.2, 4.3, 4.38, 4.45, 4.52, 4.58, 4.62, 4.65]],
  ['klarna-bank', 'Klarna Bank', 'Sweden', 2005, 'A', 'Finansinspektionen', 'Festgeld', 4.65, 10000, 'Mit Kündigung', 200, [4.15, 4.25, 4.35, 4.42, 4.5, 4.58, 4.62, 4.65]],
  ['saxo-privatbank', 'Saxo Privatbank', 'Denmark', 1992, 'A', 'Finanstilsynet', 'Festgeld', 4.65, 10000, 'Mit Kündigung', 200, [4.18, 4.28, 4.35, 4.42, 4.5, 4.58, 4.62, 4.65]],
  ['instabank', 'Instabank', 'Norway', 2016, 'A-', 'Finanstilsynet', 'Festgeld', 4.65, 10000, 'Mit Kündigung', 200, [4.2, 4.28, 4.35, 4.42, 4.5, 4.58, 4.62, 4.65]],
  ['resurs-bank', 'Resurs Bank', 'Sweden', 1977, 'BBB+', 'Finansinspektionen', 'Festgeld', 4.65, 10000, 'Mit Kündigung', 200, [4.15, 4.25, 4.32, 4.4, 4.48, 4.55, 4.6, 4.65]],
  ['sbab-bank', 'SBAB Bank', 'Sweden', 2007, 'AA', 'Finansinspektionen', 'Festgeld', 4.4, 1, 'Täglich verfügbar', 0, [3.95, 4.05, 4.12, 4.18, 4.25, 4.32, 4.36, 4.4]],
  ['nibc-direct', 'NIBC Direct', 'Netherlands', 1945, 'A', 'De Nederlandsche Bank (DNB)', 'Festgeld', 2.00, 500, 'Fest gebunden', 0, [1.75, 1.8, 1.85, 1.88, 1.92, 1.95, 1.98, 2.0]],
  ['medirect-bank', 'MeDirect Bank', 'Belgium', 2003, 'A', 'National Bank of Belgium', 'Festgeld', 4.4, 1, 'Täglich verfügbar', 150, [3.9, 4.0, 4.08, 4.15, 4.22, 4.28, 4.35, 4.4]],
  ['tf-bank', 'TF Bank', 'Sweden', 1987, 'BBB+', 'Finansinspektionen', 'Festgeld', 2.52, 1, 'Fest gebunden', 0, [2.1, 2.2, 2.28, 2.35, 2.4, 2.45, 2.5, 2.52]],
  ['inbank', 'Inbank', 'Estonia', 2011, 'A-', 'Finantsinspektsioon', 'Festgeld', 4.4, 1, 'Täglich verfügbar', 150, [3.9, 4.0, 4.08, 4.15, 4.22, 4.28, 4.35, 4.4]],
  ['bigbank', 'Bigbank', 'Estonia', 2009, 'A', 'Finantsinspektsioon', 'Festgeld', 2.85, 1000, 'Fest gebunden', 0, [2.4, 2.5, 2.58, 2.65, 2.72, 2.78, 2.82, 2.85]],
  ['bank-norwegian', 'Bank Norwegian', 'Norway', 2007, 'A-', 'Finanstilsynet', 'Tagesgeld', 4.45, 1, 'Täglich verfügbar', 0, [3.95, 4.05, 4.12, 4.2, 4.28, 4.35, 4.4, 4.45]],
  ['sydbank', 'Sydbank', 'Denmark', 1871, 'A', 'Finanstilsynet', 'Tagesgeld', 4.45, 1, 'Täglich verfügbar', 0, [3.98, 4.08, 4.15, 4.22, 4.28, 4.35, 4.4, 4.45]],
  ['argenta', 'Argenta', 'Belgium', 1956, 'A', 'National Bank of Belgium', 'Tagesgeld', 4.45, 1, 'Täglich verfügbar', 0, [3.92, 4.02, 4.1, 4.18, 4.25, 4.32, 4.38, 4.45]],
  ['bff-bank', 'BFF Bank', 'Italy', 1990, 'BBB+', 'Banca d\'Italia', 'Tagesgeld', 4.45, 1, 'Täglich verfügbar', 45, [3.9, 4.0, 4.08, 4.15, 4.22, 4.3, 4.38, 4.45]],
  ['bluor-bank-as', 'BluOr Bank AS', 'Latvia', 2001, 'BBB+', 'Latvijas Banka', 'Festgeld', 2.94, 1, 'Fest gebunden', 0, [2.5, 2.6, 2.68, 2.75, 2.82, 2.88, 2.92, 2.94]],
  ['mano-bankas', 'Mano Bankas', 'Lithuania', 1992, 'A-', 'Bank of Lithuania', 'Festgeld', 3.15, 500, 'Fest gebunden', 0, [2.5, 2.65, 2.78, 2.88, 2.95, 3.02, 3.08, 3.15]],
  ['pop-pankki', 'POP Pankki', 'Finland', 1997, 'A', 'Finanssivalvonta', 'Tagesgeld', 4.25, 10000, 'Mit Kündigung', 0, [3.78, 3.88, 3.95, 4.02, 4.08, 4.15, 4.2, 4.25]],
  ['banco-invest', 'Banco Invest', 'Portugal', 1980, 'BBB+', 'Banco de Portugal', 'Festgeld', 1.60, 2000, 'Fest gebunden', 0, [1.35, 1.4, 1.45, 1.48, 1.52, 1.55, 1.58, 1.60]],
  ['ikano-bank', 'Ikano Bank', 'Sweden', 1988, 'A-', 'Finansinspektionen', 'Tagesgeld', 3.36, 1, 'Täglich verfügbar', 0, [2.8, 2.95, 3.05, 3.12, 3.2, 3.28, 3.32, 3.36]],
  ['jt-direktbank', 'J&T Direktbank', 'Czech Republic', 1992, 'A-', 'Česká národní banka (ČNB)', 'Festgeld', 3.00, 1000, 'Fest gebunden', 0, [2.5, 2.62, 2.72, 2.8, 2.85, 2.9, 2.95, 3.00]],
  ['vivibanca', 'ViViBanca', 'Italy', 2008, 'BBB', 'Banca d\'Italia', 'Flexgeld', 3.85, 5000, 'Mit Kündigung', 0, [3.38, 3.45, 3.52, 3.58, 3.65, 3.72, 3.78, 3.85]],
  ['banco-bpi', 'Banco BPI', 'Portugal', 1981, 'A-', 'Banco de Portugal', 'Festgeld', 1.10, 5000, 'Fest gebunden', 0, [0.9, 0.95, 0.98, 1.0, 1.02, 1.05, 1.08, 1.10]],
  ['crelan', 'Crelan', 'Belgium', 1939, 'A', 'National Bank of Belgium', 'Festgeld', 2.10, 125, 'Fest gebunden', 0, [1.75, 1.82, 1.88, 1.92, 1.96, 2.0, 2.05, 2.10]],
  ['distingo-bank', 'Distingo Bank', 'France', 2008, 'A-', 'Autorité de Contrôle Prudentiel (ACPR)', 'Flexgeld', 3.85, 5000, 'Mit Kündigung', 0, [3.38, 3.45, 3.52, 3.58, 3.65, 3.72, 3.78, 3.85]],
  ['kommunalkredit-invest', 'Kommunalkredit Invest', 'Austria', 1958, 'AA-', 'Finanzmarktaufsicht (FMA)', 'Festgeld', 2.40, 10000, 'Fest gebunden', 0, [2.0, 2.08, 2.15, 2.2, 2.25, 2.3, 2.35, 2.40]],
  ['postfinance', 'PostFinance', 'Switzerland', 1906, 'AAA', 'FINMA', 'Tagesgeld', 2.85, 1, 'Täglich verfügbar', 0, [2.45, 2.52, 2.58, 2.65, 2.72, 2.78, 2.82, 2.85]],
  ['1822direkt', '1822direkt', 'Germany', 1996, 'A', 'BaFin', 'Tagesgeld', 2.85, 1, 'Täglich verfügbar', 0, [2.4, 2.48, 2.55, 2.62, 2.68, 2.75, 2.8, 2.85]],
  ['santander-deutschland', 'Santander Consumer Bank', 'Germany', 1960, 'A', 'BaFin', 'Tagesgeld', 2.85, 1, 'Täglich verfügbar', 0, [2.38, 2.45, 2.52, 2.6, 2.68, 2.75, 2.8, 2.85]],
  ['trade-republic', 'Trade Republic Bank', 'Germany', 2019, 'A-', 'BaFin', 'Tagesgeld', 2.85, 1, 'Täglich verfügbar', 0, [2.42, 2.5, 2.58, 2.65, 2.72, 2.78, 2.82, 2.85]],
  ['openbank', 'Openbank', 'Spain', 1995, 'A', 'Banco de España', 'Tagesgeld', 2.50, 1, 'Täglich verfügbar', 0, [2.0, 2.1, 2.18, 2.25, 2.32, 2.38, 2.45, 2.50]],
  ['ca-auto-bank', 'CA Auto Bank', 'Italy', 1929, 'A-', 'Banca d\'Italia', 'Festgeld', 2.55, 1, 'Fest gebunden', 0, [2.1, 2.2, 2.28, 2.35, 2.42, 2.48, 2.52, 2.55]],
  ['consorsbank', 'Consorsbank', 'Germany', 1994, 'A', 'BaFin', 'Festgeld', 2.00, 2500, 'Fest gebunden', 0, [1.6, 1.68, 1.75, 1.82, 1.88, 1.92, 1.96, 2.00]],
  ['easybank', 'easybank', 'Austria', 1999, 'A', 'Finanzmarktaufsicht (FMA)', 'Tagesgeld', 2.00, 1, 'Täglich verfügbar', 0, [1.5, 1.58, 1.65, 1.72, 1.78, 1.85, 1.92, 2.00]],
  ['suresse-direkt-bank', 'Suresse Direkt Bank', 'Germany', 2009, 'A-', 'BaFin', 'Festgeld', 2.50, 1000, 'Fest gebunden', 0, [2.1, 2.18, 2.25, 2.32, 2.38, 2.42, 2.46, 2.50]],
  ['citadele-banka', 'Citadele Banka', 'Latvia', 1991, 'BBB+', 'Latvijas Banka', 'Festgeld', 2.55, 10000, 'Fest gebunden', 0, [2.2, 2.28, 2.35, 2.4, 2.45, 2.5, 2.53, 2.55]],
  ['morrow-bank', 'Morrow Bank', 'Norway', 2014, 'A-', 'Finanstilsynet', 'Flexgeld', 4.9, 5000, 'Mit Kündigung', 250, [4.35, 4.48, 4.58, 4.68, 4.75, 4.82, 4.88, 4.9]],
  ['collector-bank', 'Collector Bank', 'Sweden', 1999, 'A-', 'Finansinspektionen', 'Flexgeld', 4.85, 5000, 'Mit Kündigung', 250, [4.3, 4.42, 4.52, 4.62, 4.72, 4.78, 4.82, 4.85]],
  ['artea-ab', 'Artea AB', 'Lithuania', 1992, 'A-', 'Bank of Lithuania', 'Festgeld', 2.01, 10000, 'Fest gebunden', 0, [1.7, 1.78, 1.85, 1.9, 1.94, 1.97, 2.0, 2.01]],
  ['anadi-bank', 'Anadi Bank', 'Austria', 2008, 'A-', 'Finanzmarktaufsicht (FMA)', 'Festgeld', 2.25, 1000, 'Fest gebunden', 0, [1.85, 1.92, 1.98, 2.05, 2.1, 2.15, 2.2, 2.25]],
  ['swissquote', 'Swissquote', 'Switzerland', 1996, 'A', 'FINMA', 'Festgeld', 1.78, 25000, 'Fest gebunden', 0, [1.45, 1.5, 1.55, 1.6, 1.65, 1.68, 1.72, 1.78]],
  ['renault-bank-direkt', 'Renault Bank direkt', 'Germany', 2003, 'A', 'BaFin', 'Tagesgeld', 3.0, 1, 'Täglich verfügbar', 0, [2.55, 2.65, 2.72, 2.78, 2.85, 2.92, 2.96, 3.0]],
];

const EXISTING_BANK_UPDATES = [
  ['abn-amro-bank', 1824, 'AA-', 'De Nederlandsche Bank (DNB)'],
  ['banca-mediolanum', 1982, 'A', 'Banca d\'Italia'],
  ['banco-sabadell', 1881, 'A-', 'Banco de España'],
  ['bbva-bank-deutschland', 1857, 'A', 'BaFin / Banco de España'],
  ['bnp-paribas', 2000, 'AA-', 'Autorité de Contrôle Prudentiel (ACPR)'],
  ['bunq-bank', 2015, 'BBB+', 'De Nederlandsche Bank (DNB)'],
  ['caixabank', 2011, 'A-', 'Banco de España'],
  ['comdirect-bank', 1994, 'A', 'BaFin'],
  ['cr-dit-agricole', 1894, 'AA-', 'Autorité de Contrôle Prudentiel (ACPR)'],
  ['deutsche-kreditbank--dkb-', 1990, 'A', 'BaFin'],
  ['erste-bank', 1819, 'A', 'Finanzmarktaufsicht (FMA)'],
  ['ing-belgium', 1964, 'AA-', 'National Bank of Belgium'],
  ['ing-diba', 1991, 'AA-', 'BaFin'],
  ['kbc-bank', 1998, 'A', 'National Bank of Belgium'],
  ['millennium-bcp', 1985, 'BBB+', 'Banco de Portugal'],
  ['n26-bank', 2013, 'BBB+', 'BaFin'],
  ['op-financial-group', 1902, 'AA-', 'Finanssivalvonta'],
  ['raiffeisen-bank-international', 1927, 'A-', 'Finanzmarktaufsicht (FMA)'],
  ['raisin-bank', 2012, 'A-', 'BaFin'],
  ['spuerkeess', 1856, 'AAA', 'Commission de Surveillance du Secteur Financier (CSSF)'],
  ['unicredit', 1998, 'BBB+', 'Banca d\'Italia'],
];

const HISTORY_MONTHS = ['2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'];

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function depositTerm(product) {
  if (product === 'Tagesgeld' || product === 'Flexgeld') return 0;
  return 12;
}

function interestFreq(product) {
  if (product === 'Tagesgeld' || product === 'Flexgeld') return 'Monatlich';
  return 'Am Ende der Laufzeit';
}

let sql = `-- Generated by scripts/generate-comparison-seed.mjs — comparison banks expansion
-- Real bank metadata and indicative rate history (Sep 2025 – Apr 2026)

-- 1) Schema extensions
alter table public.banks
  add column if not exists founded_year integer,
  add column if not exists credit_rating text,
  add column if not exists regulator_name text;

create table if not exists public.savings_offer_rate_history (
  id uuid primary key default gen_random_uuid(),
  savings_offer_id uuid not null references public.savings_offers(id) on delete cascade,
  recorded_at date not null,
  interest_rate numeric(5,2) not null,
  created_at timestamptz default now(),
  unique (savings_offer_id, recorded_at)
);

create index if not exists savings_offer_rate_history_offer_idx
  on public.savings_offer_rate_history (savings_offer_id, recorded_at);

alter table public.savings_offer_rate_history enable row level security;

drop policy if exists "rate_history: public read" on public.savings_offer_rate_history;
create policy "rate_history: public read" on public.savings_offer_rate_history
  for select using (true);

drop policy if exists "rate_history: admin write" on public.savings_offer_rate_history;
create policy "rate_history: admin write" on public.savings_offer_rate_history
  for all using (public.is_admin()) with check (public.is_admin());

-- 2) Enrich existing banks
`;

for (const [slug, founded, rating, regulator] of EXISTING_BANK_UPDATES) {
  sql += `update public.banks set founded_year = ${founded}, credit_rating = '${esc(rating)}', regulator_name = '${esc(regulator)}' where slug = '${esc(slug)}';\n`;
}

sql += `\n-- 3) Insert new banks + offers + rate history\n`;

for (const row of NEW_BANKS) {
  const [slug, name, country, founded, rating, regulator, product, rate, minDep, availability, bonus, history] = row;
  const meta = COUNTRY_META[country];
  const depScheme = meta.depositScheme;
  const depAmount = country === 'Switzerland' ? '100.000 CHF' : '100.000 €';
  const term = depositTerm(product);
  const freq = interestFreq(product);
  const early = availability.includes('Täglich') ? 'Jederzeit möglich' : 'Mit Kündigungsfrist (je nach Anbieter)';
  const desc = `${name} bietet ${product === 'Festgeld' ? 'Festgeld' : product === 'Flexgeld' ? 'Flexgeld' : 'Tagesgeld'} mit ${rate.toString().replace('.', ',')}% p.a. Reguliert durch ${regulator}. Einlagensicherung: ${depScheme}.`;
  const bonusSql = bonus && bonus > 0 ? String(bonus) : 'null';

  sql += `
do $$
declare
  v_bank_id uuid;
  v_offer_id uuid;
begin
  if not exists (select 1 from public.banks where slug = '${esc(slug)}') then
    insert into public.banks (name, slug, country, website_url, deposit_protection, deposit_protection_amount, founded_year, credit_rating, regulator_name, is_active)
    values ('${esc(name)}', '${esc(slug)}', '${esc(country)}', null, '${esc(depScheme)}', '${esc(depAmount)}', ${founded}, '${esc(rating)}', '${esc(regulator)}', true)
    returning id into v_bank_id;

    insert into public.savings_offers (
      interest_rate, deposit_term, min_deposit, deposit_protection_country, deposit_protection_authority,
      description, investment_type, interest_frequency, currency, early_withdrawal, bonus_amount, is_active, bank_id, deposit_protection
    ) values (
      ${rate}, ${term}, ${minDep}, '${esc(country)}', '${esc(regulator)}',
      '${esc(desc)}', '${esc(product)}', '${esc(freq)}', '${meta.currency === 'CHF' ? 'CHF' : 'EUR'}', '${esc(early)}', ${bonusSql}, true, v_bank_id,
      '${esc(depAmount)}'
    ) returning id into v_offer_id;
`;

  history.forEach((hRate, i) => {
    sql += `    insert into public.savings_offer_rate_history (savings_offer_id, recorded_at, interest_rate) values (v_offer_id, '${HISTORY_MONTHS[i]}', ${hRate}) on conflict do nothing;\n`;
  });

  sql += `  end if;
end $$;
`;
}

sql += `\n-- 4) Rate history for existing active offers (derived from current rate, 8-month trend)\n`;
sql += `
insert into public.savings_offer_rate_history (savings_offer_id, recorded_at, interest_rate)
select o.id, m.recorded_at::date,
  round((o.interest_rate - (7 - m.idx) * 0.08)::numeric, 2) as interest_rate
from public.savings_offers o
cross join (
  values
    ('2025-09-01', 0), ('2025-10-01', 1), ('2025-11-01', 2), ('2025-12-01', 3),
    ('2026-01-01', 4), ('2026-02-01', 5), ('2026-03-01', 6), ('2026-04-01', 7)
) as m(recorded_at, idx)
where o.is_active = true
  and not exists (
    select 1 from public.savings_offer_rate_history h where h.savings_offer_id = o.id limit 1
  )
on conflict do nothing;
`;

const outPath = join(root, 'supabase/migrations/20260522120000_comparison_banks_expansion.sql');
writeFileSync(outPath, sql, 'utf8');
console.log(`Wrote ${outPath} (${NEW_BANKS.length} new banks)`);
