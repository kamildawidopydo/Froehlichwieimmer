-- Batch 2: product types and official rates (May 2026)
-- Sources: bank websites, pickthebank.eu, Raisin partner pages

-- 1) Remove Hello bank and Pibank from comparison
update public.banks
set is_active = false
where slug in ('hello-bank', 'pibank');

update public.savings_offers o
set is_active = false
from public.banks b
where o.bank_id = b.id
  and b.slug in ('hello-bank', 'pibank');

-- 2) EBN Banco → Festgeld (ebnbanco.es, 12 Mon.)
update public.banks
set website_url = 'https://www.ebnbanco.es/particulares/ahorro-e-inversion/depositos'
where slug = 'ebn-banco';

update public.savings_offers o
set
  interest_rate = 2.50,
  deposit_term = 12,
  min_deposit = 1000,
  investment_type = 'Festgeld',
  interest_frequency = 'Am Laufzeitende',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'EBN Banco bietet Festgeld mit 2,50% TAE p.a. bei 12 Monaten Laufzeit (ebnbanco.es). Spanische Einlagensicherung (FGD).'
from public.banks b
where o.bank_id = b.id and b.slug = 'ebn-banco';

-- 3) J&T Direktbank → Festgeld (jtdirektbank.de)
update public.banks
set website_url = 'https://www.jtdirektbank.de/festgeld.html'
where slug = 'jt-direktbank';

update public.savings_offers o
set
  interest_rate = 3.00,
  deposit_term = 12,
  min_deposit = 1000,
  investment_type = 'Festgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'J&T Direktbank Festgeld: 3,00% p.a. bei 12 Monaten (Stand: 22.05.2026, jtdirektbank.de). Mindestanlage ab 1.000 € bis 31.05.2026, danach ab 5.000 €. Tschechische Einlagensicherung.'
from public.banks b
where o.bank_id = b.id and b.slug = 'jt-direktbank';

-- 4) Banco BPI → Festgeld (bancobpi.pt, ~367 Tage)
update public.banks
set website_url = 'https://www.bancobpi.pt/particulares/poupar-investir/depositos-a-prazo/fin-deposito-prazo-bpi-eur'
where slug = 'banco-bpi';

update public.savings_offers o
set
  interest_rate = 1.10,
  deposit_term = 12,
  min_deposit = 5000,
  investment_type = 'Festgeld',
  interest_frequency = 'Am Laufzeitende',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Banco BPI FIN Depósito a Prazo: 1,10% TAN p.a. bei ca. 12 Monaten (367 Tage, bancobpi.pt). Portugiesische Einlagensicherung (FGD).'
from public.banks b
where o.bank_id = b.id and b.slug = 'banco-bpi';

-- 5) Crelan → Festgeld / Termijnrekening (crelan.be, 24 Mon.)
update public.banks
set website_url = 'https://www.crelan.be/nl/particulieren/sparen-en-beleggen/sparen/product/termijnrekening'
where slug = 'crelan';

update public.savings_offers o
set
  interest_rate = 2.10,
  deposit_term = 24,
  min_deposit = 125,
  investment_type = 'Festgeld',
  interest_frequency = 'Am Laufzeitende',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Crelan Termijnrekening (Festgeld): 2,10% p.a. bei 24 Monaten Laufzeit (crelan.be). Belgische Einlagensicherung (GFD).'
from public.banks b
where o.bank_id = b.id and b.slug = 'crelan';

-- 6) Kommunalkredit Invest → Festgeld (kommunalkreditinvest.de)
update public.banks
set website_url = 'https://www.kommunalkreditinvest.de/festgeld-ertrag/'
where slug = 'kommunalkredit-invest';

update public.savings_offers o
set
  interest_rate = 2.40,
  deposit_term = 12,
  min_deposit = 10000,
  investment_type = 'Festgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Kommunalkredit Invest Festgeld: 2,40% p.a. bei 12 Monaten, ab 10.000 € (kommunalkreditinvest.de). Österreichische Einlagensicherung (ESA).'
from public.banks b
where o.bank_id = b.id and b.slug = 'kommunalkredit-invest';

-- 7) Openbank → Tagesgeld Neukunden (openbank.de)
update public.banks
set website_url = 'https://www.openbank.de/tagesgeldkonto'
where slug = 'openbank';

update public.savings_offers o
set
  interest_rate = 2.50,
  deposit_term = 0,
  min_deposit = 1,
  investment_type = 'Tagesgeld',
  interest_frequency = 'Monatlich',
  early_withdrawal = 'Täglich verfügbar',
  bonus_amount = 0,
  description = 'Openbank Tagesgeld mit Willkommenszinsen: 2,5% p.a. für Neukunden in den ersten 3 Monaten, danach bis 2,2% p.a. (openbank.de). Spanische Einlagensicherung (FGD).'
from public.banks b
where o.bank_id = b.id and b.slug = 'openbank';

-- 8) CA Auto Bank → Festgeld via Raisin (12 Mon.)
update public.banks
set website_url = 'https://sparen-raisin.ca-autobank.de/'
where slug = 'ca-auto-bank';

update public.savings_offers o
set
  interest_rate = 2.55,
  deposit_term = 12,
  min_deposit = 1,
  investment_type = 'Festgeld',
  interest_frequency = 'Am Laufzeitende',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'CA Auto Bank Festgeld über Raisin: 2,55% p.a. bei 12 Monaten Bindungsfrist (sparen-raisin.ca-autobank.de). Max. 100.000 €. Italienische Einlagensicherung (FITD).'
from public.banks b
where o.bank_id = b.id and b.slug = 'ca-auto-bank';

-- 9) Consorsbank → Festgeld (consorsbank.de)
update public.banks
set website_url = 'https://www.consorsbank.de/web/Sparen-Anlegen/Sparen/Festgeld'
where slug = 'consorsbank';

update public.savings_offers o
set
  interest_rate = 2.00,
  deposit_term = 12,
  min_deposit = 2500,
  investment_type = 'Festgeld',
  interest_frequency = 'Am Laufzeitende',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Consorsbank Festgeld: 2,00% p.a. bei 12 Monaten Laufzeit, Mindestanlage 2.500 € (consorsbank.de). Deutsche Einlagensicherung (EdB).'
from public.banks b
where o.bank_id = b.id and b.slug = 'consorsbank';

-- 10) easybank → Tagesgeld Neukunden (easybank.de)
update public.banks
set website_url = 'https://www.easybank.de/easybank-de/lp/easybank-de-tagesgeldkonto/'
where slug = 'easybank';

update public.savings_offers o
set
  interest_rate = 2.00,
  deposit_term = 0,
  min_deposit = 1,
  investment_type = 'Tagesgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Täglich verfügbar',
  bonus_amount = 0,
  description = 'easybank Tagesgeld: 2,0% p.a. garantiert für 9 Monate für Neukunden, bis 250.000 € (easybank.de). Österreichische und deutsche Einlagensicherung.'
from public.banks b
where o.bank_id = b.id and b.slug = 'easybank';

-- 11) Suresse Direkt Bank → Festgeld (suressedirektbank.de)
update public.banks
set website_url = 'https://www.suressedirektbank.de/de/sparen-anlegen/festgeld'
where slug = 'suresse-direkt-bank';

update public.savings_offers o
set
  interest_rate = 2.50,
  deposit_term = 12,
  min_deposit = 1000,
  investment_type = 'Festgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Suresse Direkt Bank Festgeld: 2,50% p.a. bei 1 Jahr Laufzeit (suressedirektbank.de). Spanische Einlagensicherung. Mindestanlage 1.000 €.'
from public.banks b
where o.bank_id = b.id and b.slug = 'suresse-direkt-bank';

-- 12) Bigbank → Festgeld (bigbank.de)
update public.banks
set website_url = 'https://www.bigbank.de/festgeld/'
where slug = 'bigbank';

update public.savings_offers o
set
  interest_rate = 2.85,
  deposit_term = 12,
  min_deposit = 1000,
  investment_type = 'Festgeld',
  interest_frequency = 'Am Laufzeitende',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Bigbank Festgeld: 2,85% p.a. bei 12–23 Monaten Laufzeit (bigbank.de). Estnische Einlagensicherung. Mindestanlage 1.000 €.'
from public.banks b
where o.bank_id = b.id and b.slug = 'bigbank';

-- 13) Anadi Bank → Festgeld (anadibank.com)
update public.banks
set website_url = 'https://anadibank.com/online-festgeld'
where slug = 'anadi-bank';

update public.savings_offers o
set
  interest_rate = 2.25,
  deposit_term = 12,
  min_deposit = 1000,
  investment_type = 'Festgeld',
  interest_frequency = 'Jährlich',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Anadi Bank Online-Festgeld: 2,25% p.a. bei 12 Monaten Laufzeit (anadibank.com). Österreichische Einlagensicherung (ESA).'
from public.banks b
where o.bank_id = b.id and b.slug = 'anadi-bank';

-- 14) Banco Invest → Festgeld (pickthebank.eu, 12 Mon.)
update public.banks
set website_url = 'https://pickthebank.eu/de/banken/portugal/banco-invest-sa-ivvsptpl/'
where slug = 'banco-invest';

update public.savings_offers o
set
  interest_rate = 1.60,
  deposit_term = 12,
  min_deposit = 2000,
  investment_type = 'Festgeld',
  interest_frequency = 'Am Laufzeitende',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Banco Invest Festgeld: 1,60% p.a. bei 12 Monaten, Mindestanlage 2.000 € (pickthebank.eu). Portugiesische Einlagensicherung (FGD).'
from public.banks b
where o.bank_id = b.id and b.slug = 'banco-invest';

-- 15) Swissquote → Festgeld EUR (swissquote.com, 12 Mon.)
update public.banks
set website_url = 'https://www.swissquote.com/de-ch/private/bank/products/fixed-term-deposit'
where slug = 'swissquote';

update public.savings_offers o
set
  interest_rate = 1.78,
  deposit_term = 12,
  min_deposit = 25000,
  investment_type = 'Festgeld',
  interest_frequency = 'Am Laufzeitende',
  early_withdrawal = 'Fest gebunden',
  bonus_amount = 0,
  description = 'Swissquote Festgeld EUR: 1,78% p.a. bei 12 Monaten Laufzeit, Mindestanlage 25.000 € (swissquote.com). Schweizer Einlagensicherung (esisuisse).'
from public.banks b
where o.bank_id = b.id and b.slug = 'swissquote';

-- 16) Rate history snapshot
insert into public.savings_offer_rate_history (savings_offer_id, recorded_at, interest_rate)
select o.id, '2026-05-22'::date, o.interest_rate
from public.savings_offers o
join public.banks b on b.id = o.bank_id
where b.slug in (
  'ebn-banco', 'jt-direktbank', 'banco-bpi', 'crelan', 'kommunalkredit-invest',
  'openbank', 'ca-auto-bank', 'consorsbank', 'easybank', 'suresse-direkt-bank',
  'bigbank', 'anadi-bank', 'banco-invest', 'swissquote'
)
on conflict do nothing;
