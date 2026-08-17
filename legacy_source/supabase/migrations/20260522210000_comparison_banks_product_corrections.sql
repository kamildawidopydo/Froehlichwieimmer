-- Correct product types, bank names, and rates for comparison catalog (May 2026)
-- Sources: Raisin/Weltsparen, konto.org, biallo.de, tfbank.de, ikanobank.de

-- 1) Remove banks from comparison (deactivate)
update public.banks
set is_active = false
where slug in (
  'saxo-privatbank',
  's-pankki',
  'bank-norwegian',
  'sydbank',
  'argenta',
  'sbab-bank',
  'pop-pankki',
  'lunar-bank',
  'oma-saastopankki'
);

update public.savings_offers o
set is_active = false
from public.banks b
where o.bank_id = b.id
  and b.slug in (
    'saxo-privatbank',
    's-pankki',
    'bank-norwegian',
    'sydbank',
    'argenta',
    'sbab-bank',
    'pop-pankki',
    'lunar-bank',
    'oma-saastopankki'
  );

-- 2) LeasePlan Bank → Ayvens Bank (Festgeld, konto.org 22.05.2026)
update public.banks
set
  name = 'Ayvens Bank',
  slug = 'ayvens-bank',
  website_url = 'https://www.konto.org/festgeldkonto/festgeld-bank/leaseplan-bank-festgeld/',
  logo_url = coalesce(logo_url, '/assets/bank-logos/leaseplan-bank.png')
where slug = 'leaseplan-bank';

update public.savings_offers o
set
  interest_rate = 2.35,
  deposit_term = 12,
  min_deposit = 1000,
  investment_type = 'Festgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Ayvens Bank (ehem. LeasePlan Bank) bietet Festgeld mit 2,35% p.a. bei 12 Monaten Laufzeit (Stand: 22.05.2026, konto.org). Höchstzins 2,90% p.a. bei 60 Monaten. Niederländische Einlagensicherung (DGS).'
from public.banks b
where o.bank_id = b.id and b.slug = 'ayvens-bank';

-- 3) Citadele Banka → Festgeld (Raisin CBL Bank, 12 Mon.)
update public.savings_offers o
set
  interest_rate = 2.55,
  deposit_term = 12,
  min_deposit = 10000,
  investment_type = 'Festgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Citadele Banka (CBL Bank über Raisin) bietet Festgeld mit 2,55% p.a. bei 12 Monaten Laufzeit. Lettische Einlagensicherung (FKTK).'
from public.banks b
where o.bank_id = b.id and b.slug = 'citadele-banka';

-- 4) Šiaulių Bankas → Artea AB (Festgeld, Raisin)
update public.banks
set
  name = 'Artea AB',
  slug = 'artea-ab',
  website_url = 'https://www.raisin.com/de-de/bank/artea-ab/',
  logo_url = coalesce(logo_url, '/assets/bank-logos/siauliu-bankas.png')
where slug = 'siauliu-bankas';

update public.savings_offers o
set
  interest_rate = 2.01,
  deposit_term = 12,
  min_deposit = 10000,
  investment_type = 'Festgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Artea AB (ehem. Šiaulių Bankas) bietet Festgeld mit 2,01% p.a. bei 12 Monaten Laufzeit (Raisin, Stand: 20.05.2026). Litauische Einlagensicherung.'
from public.banks b
where o.bank_id = b.id and b.slug = 'artea-ab';

-- 5) BlueOrange Bank → BluOr Bank AS (Festgeld, Raisin)
update public.banks
set
  name = 'BluOr Bank AS',
  slug = 'bluor-bank-as',
  website_url = 'https://www.raisin.com/de-de/bank/blu-or-bank-as/',
  logo_url = coalesce(logo_url, '/assets/bank-logos/blueorange-bank.png')
where slug = 'blueorange-bank';

update public.savings_offers o
set
  interest_rate = 2.94,
  deposit_term = 12,
  min_deposit = 1,
  investment_type = 'Festgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'BluOr Bank AS (ehem. BlueOrange Bank) bietet Festgeld mit 2,94% p.a. bei 12 Monaten Laufzeit (Raisin). Lettische Einlagensicherung (FKTK).'
from public.banks b
where o.bank_id = b.id and b.slug = 'bluor-bank-as';

-- 6) Coop Bank → Coop Pank, Estland (Festgeld, Raisin)
update public.banks
set
  name = 'Coop Pank',
  slug = 'coop-pank',
  country = 'Estonia',
  website_url = 'https://www.raisin.com/de-de/bank/coop-pank/',
  deposit_protection = 'Estnische Einlagensicherung (Tagatisraha Fond)',
  regulator_name = 'Finantsinspektsioon'
where slug = 'coop-bank';

update public.savings_offers o
set
  interest_rate = 2.40,
  deposit_term = 12,
  min_deposit = 1000,
  deposit_protection_country = 'Estonia',
  deposit_protection_authority = 'Finantsinspektsioon',
  investment_type = 'Festgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Coop Pank (Estland) bietet Festgeld mit 2,40% p.a. bei 12 Monaten Laufzeit (Raisin). Estnische Einlagensicherung.'
from public.banks b
where o.bank_id = b.id and b.slug = 'coop-pank';

-- 7) NIBC Direct — Festgeld 12 Mon. (biallo.de, 22.05.2026)
update public.banks
set website_url = 'https://www.biallo.de/festgeld/test/nibc-direct/'
where slug = 'nibc-direct';

update public.savings_offers o
set
  interest_rate = 2.00,
  deposit_term = 12,
  min_deposit = 500,
  investment_type = 'Festgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'NIBC Direct bietet Festgeld mit 2,00% p.a. bei 12 Monaten Laufzeit (biallo.de, Stand: 22.05.2026). Niederländische Einlagensicherung (DGS).'
from public.banks b
where o.bank_id = b.id and b.slug = 'nibc-direct';

-- 8) TF Bank — Festgeld 12 Mon. (tfbank.de)
update public.banks
set website_url = 'https://tfbank.de/geldanlage/festgeld'
where slug = 'tf-bank';

update public.savings_offers o
set
  interest_rate = 2.52,
  deposit_term = 12,
  min_deposit = 1,
  investment_type = 'Festgeld',
  interest_frequency = 'Am Laufzeitende',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'TF Bank bietet Festgeld mit 2,52% p.a. garantiert bei 12 Monaten Laufzeit (tfbank.de). Schwedische staatliche Einlagensicherung.'
from public.banks b
where o.bank_id = b.id and b.slug = 'tf-bank';

-- 9) Ikano Bank — Tagesgeld (ikanobank.de)
update public.banks
set website_url = 'https://ikanobank.de/tagesgeld/fleks-horten-tagesgeld'
where slug = 'ikano-bank';

update public.savings_offers o
set
  interest_rate = 3.36,
  deposit_term = 0,
  min_deposit = 1,
  investment_type = 'Tagesgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Täglich verfügbar',
  bonus_amount = 0,
  description = 'Ikano Bank Fleks Horten Tagesgeld: 3,36% Guthabenzins garantiert für 3 Monate für Neukunden (Antrag ab 15.04.2026). Bestandskundenzins 1,51%. Schwedische Einlagensicherung.'
from public.banks b
where o.bank_id = b.id and b.slug = 'ikano-bank';

-- 10) Rate history snapshot for corrected offers
insert into public.savings_offer_rate_history (savings_offer_id, recorded_at, interest_rate)
select o.id, '2026-05-22'::date, o.interest_rate
from public.savings_offers o
join public.banks b on b.id = o.bank_id
where b.slug in (
  'ayvens-bank', 'citadele-banka', 'artea-ab', 'bluor-bank-as', 'coop-pank',
  'nibc-direct', 'tf-bank', 'ikano-bank'
)
  and o.is_active = true
on conflict (savings_offer_id, recorded_at) do update set interest_rate = excluded.interest_rate;
