-- Flexgeld offers from Raisin NOTICE products (2026-05-22)
-- Source: https://www.raisin.com/de-de/flexgeld/ via Weltsparen API
-- One Flexgeld offer per bank; daily rate sync via savings-rates-sync (NOTICE)


-- Lea Bank AB (lea-bank-ab)
insert into public.banks (name, slug, country, website_url, logo_url, deposit_protection, deposit_protection_amount, is_active)
select 'Lea Bank AB', 'lea-bank', 'Schweden', 'https://www.raisin.com/de-de/bank/lea-bank-ab/', '/assets/bank-logos/lea-bank.png', 'Riksgälden Insättningsgarantin', '100.000 €', true
where not exists (select 1 from public.banks where slug = 'lea-bank');

update public.banks
set
  website_url = coalesce(website_url, 'https://www.raisin.com/de-de/bank/lea-bank-ab/'),
  logo_url = coalesce(logo_url, '/assets/bank-logos/lea-bank.png')
where slug = 'lea-bank';

insert into public.savings_offers (
  interest_rate, deposit_term, min_deposit, investment_type, interest_frequency,
  currency, early_withdrawal, bonus_amount, is_active, bank_id, bank_link,
  deposit_protection, description
)
select
  1.9, 0, 500, 'Flexgeld', 'Monatlich', 'EUR',
  'Mit Kündigungsfrist (je nach Anbieter)', 0, true, bk.id,
  'https://www.raisin.com/de-de/bank/lea-bank-ab/', '100.000 €',
  'Lea Bank AB Flexgeld über Raisin: 1.9% p.a. (Lea Bank AB: Tagesgeldkonto). Stand: Raisin/Weltsparen API.'
from public.banks bk
where bk.slug = 'lea-bank'
  and not exists (
    select 1 from public.savings_offers o
    where o.bank_id = bk.id and o.investment_type = 'Flexgeld' and o.is_active = true
  );

update public.savings_offers o
set
  interest_rate = 1.9,
  min_deposit = 500,
  deposit_term = 0,
  investment_type = 'Flexgeld',
  bank_link = 'https://www.raisin.com/de-de/bank/lea-bank-ab/',
  description = 'Lea Bank AB Flexgeld über Raisin: 1.9% p.a. (Lea Bank AB: Tagesgeldkonto). Stand: Raisin/Weltsparen API.'
from public.banks bk
where o.bank_id = bk.id and bk.slug = 'lea-bank' and o.investment_type = 'Flexgeld';

-- imprebanca (imprebanca)
insert into public.banks (name, slug, country, website_url, logo_url, deposit_protection, deposit_protection_amount, is_active)
select 'imprebanca', 'imprebanca', 'Italien', 'https://www.raisin.com/de-de/bank/imprebanca/', '/assets/bank-logos/imprebanca.png', 'Das gesetzliche Einlagensicherungssystem FITD - Fondo Interbancario di Tutela dei Deposit', '100.000 €', true
where not exists (select 1 from public.banks where slug = 'imprebanca');

update public.banks
set
  website_url = coalesce(website_url, 'https://www.raisin.com/de-de/bank/imprebanca/'),
  logo_url = coalesce(logo_url, '/assets/bank-logos/imprebanca.png')
where slug = 'imprebanca';

insert into public.savings_offers (
  interest_rate, deposit_term, min_deposit, investment_type, interest_frequency,
  currency, early_withdrawal, bonus_amount, is_active, bank_id, bank_link,
  deposit_protection, description
)
select
  1.9, 0, 500, 'Flexgeld', 'Monatlich', 'EUR',
  'Mit Kündigungsfrist (je nach Anbieter)', 0, true, bk.id,
  'https://www.raisin.com/de-de/bank/imprebanca/', '100.000 €',
  'imprebanca Flexgeld über Raisin: 1.9% p.a. (imprebanca: Tagesgeldkonto). Stand: Raisin/Weltsparen API.'
from public.banks bk
where bk.slug = 'imprebanca'
  and not exists (
    select 1 from public.savings_offers o
    where o.bank_id = bk.id and o.investment_type = 'Flexgeld' and o.is_active = true
  );

update public.savings_offers o
set
  interest_rate = 1.9,
  min_deposit = 500,
  deposit_term = 0,
  investment_type = 'Flexgeld',
  bank_link = 'https://www.raisin.com/de-de/bank/imprebanca/',
  description = 'imprebanca Flexgeld über Raisin: 1.9% p.a. (imprebanca: Tagesgeldkonto). Stand: Raisin/Weltsparen API.'
from public.banks bk
where o.bank_id = bk.id and bk.slug = 'imprebanca' and o.investment_type = 'Flexgeld';

-- CiviBank (civi-bank)
insert into public.banks (name, slug, country, website_url, logo_url, deposit_protection, deposit_protection_amount, is_active)
select 'CiviBank', 'civi-bank', 'Italien', 'https://www.raisin.com/de-de/bank/civi-bank/', '/assets/bank-logos/civi-bank.png', 'Das gesetzliche Einlagensicherungssystem FITD - Fondo Interbancario di Tutela dei Deposit', '100.000 €', true
where not exists (select 1 from public.banks where slug = 'civi-bank');

update public.banks
set
  website_url = coalesce(website_url, 'https://www.raisin.com/de-de/bank/civi-bank/'),
  logo_url = coalesce(logo_url, '/assets/bank-logos/civi-bank.png')
where slug = 'civi-bank';

insert into public.savings_offers (
  interest_rate, deposit_term, min_deposit, investment_type, interest_frequency,
  currency, early_withdrawal, bonus_amount, is_active, bank_id, bank_link,
  deposit_protection, description
)
select
  1.5, 0, 500, 'Flexgeld', 'Monatlich', 'EUR',
  'Mit Kündigungsfrist (je nach Anbieter)', 0, true, bk.id,
  'https://www.raisin.com/de-de/bank/civi-bank/', '100.000 €',
  'CiviBank Flexgeld über Raisin: 1.5% p.a. (CiviBank: 31 Tage Kündigungsgeldkonto). Stand: Raisin/Weltsparen API.'
from public.banks bk
where bk.slug = 'civi-bank'
  and not exists (
    select 1 from public.savings_offers o
    where o.bank_id = bk.id and o.investment_type = 'Flexgeld' and o.is_active = true
  );

update public.savings_offers o
set
  interest_rate = 1.5,
  min_deposit = 500,
  deposit_term = 0,
  investment_type = 'Flexgeld',
  bank_link = 'https://www.raisin.com/de-de/bank/civi-bank/',
  description = 'CiviBank Flexgeld über Raisin: 1.5% p.a. (CiviBank: 31 Tage Kündigungsgeldkonto). Stand: Raisin/Weltsparen API.'
from public.banks bk
where o.bank_id = bk.id and bk.slug = 'civi-bank' and o.investment_type = 'Flexgeld';

-- Banca Progetto (banca-progetto)
insert into public.banks (name, slug, country, website_url, logo_url, deposit_protection, deposit_protection_amount, is_active)
select 'Banca Progetto', 'banca-progetto', 'Italien', 'https://www.raisin.com/de-de/bank/banca-progetto/', '/assets/bank-logos/banca-progetto.png', 'Das gesetzliche Einlagensicherungssystem FITD - Fondo Interbancario di Tutela dei Deposit', '100.000 €', true
where not exists (select 1 from public.banks where slug = 'banca-progetto');

update public.banks
set
  website_url = coalesce(website_url, 'https://www.raisin.com/de-de/bank/banca-progetto/'),
  logo_url = coalesce(logo_url, '/assets/bank-logos/banca-progetto.png')
where slug = 'banca-progetto';

insert into public.savings_offers (
  interest_rate, deposit_term, min_deposit, investment_type, interest_frequency,
  currency, early_withdrawal, bonus_amount, is_active, bank_id, bank_link,
  deposit_protection, description
)
select
  2, 0, 500, 'Flexgeld', 'Monatlich', 'EUR',
  'Mit Kündigungsfrist (je nach Anbieter)', 0, true, bk.id,
  'https://www.raisin.com/de-de/bank/banca-progetto/', '100.000 €',
  'Banca Progetto Flexgeld über Raisin: 2% p.a. (Banca Progetto: Tagesgeldkonto). Stand: Raisin/Weltsparen API.'
from public.banks bk
where bk.slug = 'banca-progetto'
  and not exists (
    select 1 from public.savings_offers o
    where o.bank_id = bk.id and o.investment_type = 'Flexgeld' and o.is_active = true
  );

update public.savings_offers o
set
  interest_rate = 2,
  min_deposit = 500,
  deposit_term = 0,
  investment_type = 'Flexgeld',
  bank_link = 'https://www.raisin.com/de-de/bank/banca-progetto/',
  description = 'Banca Progetto Flexgeld über Raisin: 2% p.a. (Banca Progetto: Tagesgeldkonto). Stand: Raisin/Weltsparen API.'
from public.banks bk
where o.bank_id = bk.id and bk.slug = 'banca-progetto' and o.investment_type = 'Flexgeld';

-- BluOr Bank AS (blu-or-bank-as)
insert into public.banks (name, slug, country, website_url, logo_url, deposit_protection, deposit_protection_amount, is_active)
select 'BluOr Bank AS', 'bluor-bank-as', 'Lettland', 'https://www.raisin.com/de-de/bank/blu-or-bank-as/', '/assets/bank-logos/bluor-bank-as.png', 'Der lettische Einlagensicherungsfonds', '100.000 €', true
where not exists (select 1 from public.banks where slug = 'bluor-bank-as');

update public.banks
set
  website_url = coalesce(website_url, 'https://www.raisin.com/de-de/bank/blu-or-bank-as/'),
  logo_url = coalesce(logo_url, '/assets/bank-logos/bluor-bank-as.png')
where slug = 'bluor-bank-as';

insert into public.savings_offers (
  interest_rate, deposit_term, min_deposit, investment_type, interest_frequency,
  currency, early_withdrawal, bonus_amount, is_active, bank_id, bank_link,
  deposit_protection, description
)
select
  1.8, 0, 500, 'Flexgeld', 'Monatlich', 'EUR',
  'Mit Kündigungsfrist (je nach Anbieter)', 0, true, bk.id,
  'https://www.raisin.com/de-de/bank/blu-or-bank-as/', '100.000 €',
  'BluOr Bank AS Flexgeld über Raisin: 1.8% p.a. (BluOr Bank AS: 31 Tage Kündigungsgeldkonto). Stand: Raisin/Weltsparen API.'
from public.banks bk
where bk.slug = 'bluor-bank-as'
  and not exists (
    select 1 from public.savings_offers o
    where o.bank_id = bk.id and o.investment_type = 'Flexgeld' and o.is_active = true
  );

update public.savings_offers o
set
  interest_rate = 1.8,
  min_deposit = 500,
  deposit_term = 0,
  investment_type = 'Flexgeld',
  bank_link = 'https://www.raisin.com/de-de/bank/blu-or-bank-as/',
  description = 'BluOr Bank AS Flexgeld über Raisin: 1.8% p.a. (BluOr Bank AS: 31 Tage Kündigungsgeldkonto). Stand: Raisin/Weltsparen API.'
from public.banks bk
where o.bank_id = bk.id and bk.slug = 'bluor-bank-as' and o.investment_type = 'Flexgeld';

insert into public.savings_offer_rate_history (savings_offer_id, recorded_at, interest_rate)
select o.id, current_date, o.interest_rate
from public.savings_offers o
join public.banks b on b.id = o.bank_id
where b.slug in ('lea-bank', 'imprebanca', 'civi-bank', 'banca-progetto', 'bluor-bank-as')
  and o.investment_type = 'Flexgeld'
on conflict do nothing;
