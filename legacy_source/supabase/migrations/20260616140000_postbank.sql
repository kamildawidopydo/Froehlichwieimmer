-- Postbank: comparison + partner banks listing
-- Logo: /assets/bank-logos/postbank.svg

do $$
declare
  v_bank_id uuid;
  v_offer_id uuid;
begin
  select id into v_bank_id from public.banks where slug = 'postbank' limit 1;

  if v_bank_id is null then
    insert into public.banks (
      name, slug, country, website_url, logo_url,
      deposit_protection, deposit_protection_amount,
      founded_year, credit_rating, regulator_name, is_active
    ) values (
      'Postbank', 'postbank', 'Germany', 'https://www.postbank.de',
      '/assets/bank-logos/postbank.svg',
      'Deutsche Einlagensicherung', '100.000 €',
      1990, 'A', 'BaFin', true
    ) returning id into v_bank_id;
  else
    update public.banks set
      name = 'Postbank',
      country = 'Germany',
      website_url = 'https://www.postbank.de',
      logo_url = '/assets/bank-logos/postbank.svg',
      deposit_protection = 'Deutsche Einlagensicherung',
      deposit_protection_amount = '100.000 €',
      founded_year = coalesce(founded_year, 1990),
      credit_rating = coalesce(credit_rating, 'A'),
      regulator_name = coalesce(regulator_name, 'BaFin'),
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
      3.20, 0, 2500, 'Germany', 'BaFin',
      'Postbank Tagesgeld: 3,20 % p.a. für Neugeld (6 Monate Aktionszins, Stand postbank.de). Deutsche Einlagensicherung.',
      'Tagesgeld', 'Monatlich', 'EUR', 'Täglich verfügbar', 0, true, v_bank_id, '100.000 €'
  ) returning id into v_offer_id;
  end if;

  if not exists (
    select 1 from public.savings_offers o
    where o.bank_id = v_bank_id and o.investment_type = 'Festgeld' and o.deposit_term = 12
  ) then
    insert into public.savings_offers (
      interest_rate, deposit_term, min_deposit, deposit_protection_country, deposit_protection_authority,
      description, investment_type, interest_frequency, currency, early_withdrawal, bonus_amount, is_active, bank_id, deposit_protection
    ) values (
      2.70, 12, 2500, 'Germany', 'BaFin',
      'Postbank Zinssparen (Festgeld): 2,70 % p.a. fest für 12 Monate bei Neugeld (Stand postbank.de). Deutsche Einlagensicherung.',
      'Festgeld', 'Jährlich', 'EUR', 'Nicht vor Fälligkeit', 0, true, v_bank_id, '100.000 €'
    );
  end if;

  if not exists (
    select 1 from public.savings_offers o
    where o.bank_id = v_bank_id and o.investment_type = 'Flexgeld'
  ) then
    insert into public.savings_offers (
      interest_rate, deposit_term, min_deposit, deposit_protection_country, deposit_protection_authority,
      description, investment_type, interest_frequency, currency, early_withdrawal, bonus_amount, is_active, bank_id, deposit_protection
    ) values (
      2.60, 0, 2500, 'Germany', 'BaFin',
      'Postbank Flexgeld mit Kündigungsfrist und wettbewerbsfähigem Zinssatz. Deutsche Einlagensicherung.',
      'Flexgeld', 'Monatlich', 'EUR', 'Mit Kündigungsfrist', 0, true, v_bank_id, '100.000 €'
    );
  end if;
end $$;
