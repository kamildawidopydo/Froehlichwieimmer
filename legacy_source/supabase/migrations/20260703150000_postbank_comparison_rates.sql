-- Postbank: correct per-product Zinssätze on /comparison (were all 3.20 %).
-- Sources (Stand Juli 2026, postbank.de):
--   Tagesgeld: 3,20 % p.a. Neugeld-Aktion (6 Mon.), Basiszins 0,75 %
--   Festgeld: 2,70 % p.a. Zinssparen Neugeld 12 Monate
--   Flexgeld: Partnerprodukt (wie BBVA Flexgeld), neutrale Vergleichsbeschreibung

update public.savings_offers o
set
  interest_rate = 3.20,
  min_deposit = 2500,
  bonus_amount = 0,
  description = 'Postbank Tagesgeld: 3,20 % p.a. für Neugeld (6 Monate Aktionszins, Stand postbank.de). Danach variabel 0,75 % p.a. Deutsche Einlagensicherung.'
from public.banks b
where o.bank_id = b.id
  and b.slug = 'postbank'
  and o.investment_type = 'Tagesgeld';

update public.savings_offers o
set
  interest_rate = 2.70,
  deposit_term = 12,
  min_deposit = 2500,
  bonus_amount = 0,
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Nicht vor Fälligkeit',
  description = 'Postbank Zinssparen (Festgeld): 2,70 % p.a. fest für 12 Monate bei Neugeld (Stand postbank.de, 02.07.2026). Deutsche Einlagensicherung.'
from public.banks b
where o.bank_id = b.id
  and b.slug = 'postbank'
  and o.investment_type = 'Festgeld'
  and o.deposit_term = 12;

update public.savings_offers o
set
  interest_rate = 2.60,
  deposit_term = 0,
  min_deposit = 2500,
  bonus_amount = 0,
  interest_frequency = 'Monatlich',
  early_withdrawal = 'Mit Kündigungsfrist',
  description = 'Postbank Flexgeld mit Kündigungsfrist und wettbewerbsfähigem Zinssatz. Deutsche Einlagensicherung.'
from public.banks b
where o.bank_id = b.id
  and b.slug = 'postbank'
  and o.investment_type = 'Flexgeld';

-- Rate history snapshot (current offers only)
insert into public.savings_offer_rate_history (savings_offer_id, recorded_at, interest_rate)
select o.id, current_date, o.interest_rate
from public.savings_offers o
join public.banks b on b.id = o.bank_id
where b.slug = 'postbank'
  and o.investment_type in ('Tagesgeld', 'Festgeld', 'Flexgeld')
on conflict do nothing;
