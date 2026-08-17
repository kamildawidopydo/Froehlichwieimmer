-- Knab, Mano Bankas, Ikano Bank product/rate corrections (May 2026)
-- Sources: knab.nl Deposito Sparen, mano.bank deposits, ikanobank.de Tagesgeld

-- 1) Knab → Festgeld / Deposito Sparen (12 Mon.)
update public.banks
set website_url = 'https://www.knab.nl/particulier/sparen/deposito-sparen'
where slug = 'knab';

update public.savings_offers o
set
  interest_rate = 1.80,
  deposit_term = 12,
  min_deposit = 1000,
  investment_type = 'Festgeld',
  interest_frequency = 'Am Laufzeitende',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Knab Deposito Sparen (Festgeld): 1,80% p.a. bei 12 Monaten Laufzeit (knab.nl, Stand: 18.02.2026). Mindestanlage 1.000 €. Österreichisches Depositogarantiestelsel.'
from public.banks b
where o.bank_id = b.id and b.slug = 'knab';

-- 2) Mano Bankas → Festgeld (12 Mon.)
update public.banks
set website_url = 'https://www.mano.bank/en/personal/deposits/'
where slug = 'mano-bankas';

update public.savings_offers o
set
  interest_rate = 3.15,
  deposit_term = 12,
  min_deposit = 500,
  investment_type = 'Festgeld',
  interest_frequency = 'Monatlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Mano Bankas Term Deposit (Festgeld): 3,15% p.a. bei 12 Monaten Laufzeit (mano.bank). Mindestanlage 500 €. Litauische Einlagensicherung (IID).'
from public.banks b
where o.bank_id = b.id and b.slug = 'mano-bankas';

-- 3) Ikano Bank → Tagesgeld (bestätigt, ikanobank.de)
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

-- 4) Rate history snapshot
insert into public.savings_offer_rate_history (savings_offer_id, recorded_at, interest_rate)
select o.id, '2026-05-22'::date, o.interest_rate
from public.savings_offers o
join public.banks b on b.id = o.bank_id
where b.slug in ('knab', 'mano-bankas', 'ikano-bank')
on conflict do nothing;
