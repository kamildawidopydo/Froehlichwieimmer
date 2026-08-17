-- ING Nederland, Rabobank, bunq Nederland & bunq Deutschland — Sparvergleich
-- bunq-bank → bunq-nederland (rename); bunq-deutschland (new)

-- 1) Rename existing bunq-bank to bunq Nederland
update public.banks
set
  name = 'bunq Nederland',
  slug = 'bunq-nederland',
  country = 'Netherlands',
  website_url = 'https://www.bunq.com/nl-nl/personal-account/savings',
  logo_url = '/assets/bank-logos/bunq-logo.svg',
  deposit_protection = 'Niederländische Einlagensicherung (DGS)',
  deposit_protection_amount = '100.000 €',
  founded_year = coalesce(founded_year, 2015),
  credit_rating = coalesce(credit_rating, 'BBB+'),
  regulator_name = coalesce(regulator_name, 'De Nederlandsche Bank (DNB)'),
  is_active = true
where slug = 'bunq-bank';

-- 2) ING Nederland
do $$
declare
  v_bank_id uuid;
begin
  select id into v_bank_id from public.banks where slug = 'ing-nederland' limit 1;

  if v_bank_id is null then
    insert into public.banks (
      name, slug, country, website_url, logo_url,
      deposit_protection, deposit_protection_amount,
      founded_year, credit_rating, regulator_name, is_active
    ) values (
      'ING Nederland', 'ing-nederland', 'Netherlands', 'https://www.ing.nl/particulier/sparen',
      '/assets/bank-logos/ing-logo.jpg',
      'Niederländische Einlagensicherung (DGS)', '100.000 €',
      1964, 'AA-', 'De Nederlandsche Bank (DNB)', true
    ) returning id into v_bank_id;
  else
    update public.banks set
      name = 'ING Nederland',
      country = 'Netherlands',
      website_url = 'https://www.ing.nl/particulier/sparen',
      logo_url = '/assets/bank-logos/ing-logo.jpg',
      deposit_protection = 'Niederländische Einlagensicherung (DGS)',
      deposit_protection_amount = '100.000 €',
      founded_year = coalesce(founded_year, 1964),
      credit_rating = coalesce(credit_rating, 'AA-'),
      regulator_name = coalesce(regulator_name, 'De Nederlandsche Bank (DNB)'),
      is_active = true
    where id = v_bank_id;
  end if;

  if not exists (
    select 1 from public.savings_offers o
    where o.bank_id = v_bank_id and o.investment_type = 'Tagesgeld'
  ) then
    insert into public.savings_offers (
      interest_rate, deposit_term, min_deposit, deposit_protection_country, deposit_protection_authority,
      description, investment_type, interest_frequency, currency, early_withdrawal, bonus_amount, is_active, bank_id, deposit_protection
    ) values (
      1.25, 0, 1, 'Netherlands', 'De Nederlandsche Bank (DNB)',
      'ING Oranje Spaarrekening: 1,25% p.a. variabel auf frei verfügbares Tagesgeld (ing.nl, Stand Juni 2026). Niederländische Einlagensicherung (DGS).',
      'Tagesgeld', 'Monatlich', 'EUR', 'Täglich verfügbar', 0, true, v_bank_id, '100.000 €'
    );
  end if;

  if not exists (
    select 1 from public.savings_offers o
    where o.bank_id = v_bank_id and o.investment_type = 'Festgeld' and o.deposit_term = 12
  ) then
    insert into public.savings_offers (
      interest_rate, deposit_term, min_deposit, deposit_protection_country, deposit_protection_authority,
      description, investment_type, interest_frequency, currency, early_withdrawal, bonus_amount, is_active, bank_id, deposit_protection
    ) values (
      1.85, 12, 500, 'Netherlands', 'De Nederlandsche Bank (DNB)',
      'ING Spaardeposito: ca. 1,85% p.a. bei 12 Monaten fester Laufzeit (ing.nl, Stand Juni 2026). Niederländische Einlagensicherung (DGS).',
      'Festgeld', 'Am Laufzeitende', 'EUR', 'Fest gebunden', 0, true, v_bank_id, '100.000 €'
    );
  end if;
end $$;

-- 3) Rabobank
do $$
declare
  v_bank_id uuid;
begin
  select id into v_bank_id from public.banks where slug = 'rabobank' limit 1;

  if v_bank_id is null then
    insert into public.banks (
      name, slug, country, website_url, logo_url,
      deposit_protection, deposit_protection_amount,
      founded_year, credit_rating, regulator_name, is_active
    ) values (
      'Rabobank', 'rabobank', 'Netherlands', 'https://www.rabobank.nl/particulieren/sparen',
      '/assets/bank-logos/rabobank-wordmark.svg',
      'Niederländische Einlagensicherung (DGS)', '100.000 €',
      1898, 'AA-', 'De Nederlandsche Bank (DNB)', true
    ) returning id into v_bank_id;
  else
    update public.banks set
      name = 'Rabobank',
      country = 'Netherlands',
      website_url = 'https://www.rabobank.nl/particulieren/sparen',
      logo_url = '/assets/bank-logos/rabobank-wordmark.svg',
      deposit_protection = 'Niederländische Einlagensicherung (DGS)',
      deposit_protection_amount = '100.000 €',
      founded_year = coalesce(founded_year, 1898),
      credit_rating = coalesce(credit_rating, 'AA-'),
      regulator_name = coalesce(regulator_name, 'De Nederlandsche Bank (DNB)'),
      is_active = true
    where id = v_bank_id;
  end if;

  if not exists (
    select 1 from public.savings_offers o
    where o.bank_id = v_bank_id and o.investment_type = 'Tagesgeld'
  ) then
    insert into public.savings_offers (
      interest_rate, deposit_term, min_deposit, deposit_protection_country, deposit_protection_authority,
      description, investment_type, interest_frequency, currency, early_withdrawal, bonus_amount, is_active, bank_id, deposit_protection
    ) values (
      1.40, 0, 1, 'Netherlands', 'De Nederlandsche Bank (DNB)',
      'RaboSpaarRekening: 1,40% p.a. auf frei verfügbares Tagesgeld (rabobank.nl, Stand Juni 2026). Niederländische Einlagensicherung (DGS).',
      'Tagesgeld', 'Monatlich', 'EUR', 'Täglich verfügbar', 0, true, v_bank_id, '100.000 €'
    );
  end if;

  if not exists (
    select 1 from public.savings_offers o
    where o.bank_id = v_bank_id and o.investment_type = 'Festgeld' and o.deposit_term = 12
  ) then
    insert into public.savings_offers (
      interest_rate, deposit_term, min_deposit, deposit_protection_country, deposit_protection_authority,
      description, investment_type, interest_frequency, currency, early_withdrawal, bonus_amount, is_active, bank_id, deposit_protection
    ) values (
      1.75, 12, 500, 'Netherlands', 'De Nederlandsche Bank (DNB)',
      'Rabobank Depositorekening: ca. 1,75% p.a. bei 12 Monaten fester Laufzeit (rabobank.nl, Stand Juni 2026). Niederländische Einlagensicherung (DGS).',
      'Festgeld', 'Am Laufzeitende', 'EUR', 'Fest gebunden', 0, true, v_bank_id, '100.000 €'
    );
  end if;
end $$;

-- 4) bunq Deutschland
do $$
declare
  v_bank_id uuid;
begin
  select id into v_bank_id from public.banks where slug = 'bunq-deutschland' limit 1;

  if v_bank_id is null then
    insert into public.banks (
      name, slug, country, website_url, logo_url,
      deposit_protection, deposit_protection_amount,
      founded_year, credit_rating, regulator_name, is_active
    ) values (
      'bunq Deutschland', 'bunq-deutschland', 'Germany', 'https://www.bunq.com/de-de/personal-account/savings',
      '/assets/bank-logos/bunq-logo.svg',
      'Niederländische Einlagensicherung (DGS)', '100.000 €',
      2015, 'BBB+', 'De Nederlandsche Bank (DNB)', true
    ) returning id into v_bank_id;
  else
    update public.banks set
      name = 'bunq Deutschland',
      country = 'Germany',
      website_url = 'https://www.bunq.com/de-de/personal-account/savings',
      logo_url = '/assets/bank-logos/bunq-logo.svg',
      deposit_protection = 'Niederländische Einlagensicherung (DGS)',
      deposit_protection_amount = '100.000 €',
      founded_year = coalesce(founded_year, 2015),
      credit_rating = coalesce(credit_rating, 'BBB+'),
      regulator_name = coalesce(regulator_name, 'De Nederlandsche Bank (DNB)'),
      is_active = true
    where id = v_bank_id;
  end if;

  if not exists (
    select 1 from public.savings_offers o
    where o.bank_id = v_bank_id and o.investment_type = 'Tagesgeld'
  ) then
    insert into public.savings_offers (
      interest_rate, deposit_term, min_deposit, deposit_protection_country, deposit_protection_authority,
      description, investment_type, interest_frequency, currency, early_withdrawal, bonus_amount, is_active, bank_id, deposit_protection
    ) values (
      2.46, 0, 1, 'Germany', 'De Nederlandsche Bank (DNB)',
      'bunq Tagesgeld für den deutschen Markt: attraktive Zinsen über die bunq-App (bunq.com/de-de, Stand Juni 2026). Einlagensicherung über bunq B.V. (NL-DGS). Easy-Money- oder Easy-Green-Abo erforderlich.',
      'Tagesgeld', 'Monatlich', 'EUR', 'Täglich verfügbar', 0, true, v_bank_id, '100.000 €'
    );
  end if;
end $$;

-- 5) Rate history snapshot for new offers
insert into public.savings_offer_rate_history (savings_offer_id, recorded_at, interest_rate)
select o.id, '2026-06-30'::date, o.interest_rate
from public.savings_offers o
join public.banks b on b.id = o.bank_id
where b.slug in ('ing-nederland', 'rabobank', 'bunq-deutschland')
  and o.is_active = true
on conflict do nothing;
