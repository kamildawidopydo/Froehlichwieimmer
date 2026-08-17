-- ============================================================================
-- Seed starter credit offers + default detail rows for existing banks
-- ============================================================================

-- 1) Create one default "Freie Verwendung" offer per bank if missing.
insert into public.credit_offers (
  bank_id,
  purpose,
  min_amount_eur,
  max_amount_eur,
  min_term_months,
  max_term_months,
  default_term_months,
  effective_rate_from,
  nominal_rate_from,
  monthly_rate_from,
  payout_days_min,
  payout_days_max,
  rating_value,
  rating_count,
  note_small,
  features,
  sort_priority,
  is_active
)
select
  b.id as bank_id,
  'Freie Verwendung' as purpose,
  1000 as min_amount_eur,
  100000 as max_amount_eur,
  12 as min_term_months,
  120 as max_term_months,
  84 as default_term_months,
  6.990 as effective_rate_from,
  6.740 as nominal_rate_from,
  299.90 as monthly_rate_from,
  1 as payout_days_min,
  3 as payout_days_max,
  4.5 as rating_value,
  0 as rating_count,
  '2/3 aller angenommenen Kunden erhalten individuelle Konditionen gemaess Bonitaetspruefung.' as note_small,
  array[
    'Sondertilgung gemaess Tarif moeglich',
    'Vorzeitige Gesamttilgung gemaess Tarif moeglich',
    'Auszahlung in 1 bis 3 Tagen'
  ]::text[] as features,
  100 as sort_priority,
  true as is_active
from public.banks b
where not exists (
  select 1
  from public.credit_offers co
  where co.bank_id = b.id
    and co.purpose = 'Freie Verwendung'
);

-- 2) Seed default Produktinformationen rows where an offer has no rows yet.
insert into public.credit_offer_product_information (
  credit_offer_id,
  section,
  item_label,
  item_description,
  is_positive,
  sort_order
)
select
  co.id,
  seed.section,
  seed.item_label,
  seed.item_description,
  seed.is_positive,
  seed.sort_order
from public.credit_offers co
cross join (
  values
    ('Sicherheit', 'Kreditabsicherung moeglich', 'Absicherung ist je nach Tarif optional verfuegbar.', true, 10),
    ('Sicherheit', 'Gesetzliches Widerrufsrecht', 'Widerruf gemaess gesetzlicher Fristen und Vertragsunterlagen.', true, 20),
    ('Flexibilitaet', 'Sondertilgung moeglich', 'Sondertilgungen sind gemaess Tarifbedingungen moeglich.', true, 10),
    ('Flexibilitaet', 'Gesamttilgung moeglich', 'Vorzeitige Gesamttilgung gemaess Tarif moeglich.', true, 20),
    ('Flexibilitaet', 'Ratenpause tarifabhaengig', 'Option auf Ratenpause haengt vom konkreten Tarif ab.', false, 30),
    ('Kundenfreundlichkeit', 'Transparente Kostenaufstellung', 'Effektivzins, Rate und Gesamtbetrag werden vor Abschluss ausgewiesen.', true, 10)
) as seed(section, item_label, item_description, is_positive, sort_order)
where not exists (
  select 1
  from public.credit_offer_product_information pi
  where pi.credit_offer_id = co.id
);

-- 3) Seed default Annahmerichtlinien rows where an offer has no rows yet.
insert into public.credit_offer_acceptance_guidelines (
  credit_offer_id,
  guideline_text,
  sort_order
)
select
  co.id,
  seed.guideline_text,
  seed.sort_order
from public.credit_offers co
cross join (
  values
    ('Der/Die Kreditnehmer ist/sind volljaehrig.', 10),
    ('Der/Die Kreditnehmer hat/haben eine gueltige Bankverbindung.', 20),
    ('Regelmaessiges Einkommen ist erforderlich.', 30),
    ('Eine positive Bonitaetspruefung ist erforderlich.', 40),
    ('Erforderliche Unterlagen werden gemaess Bankrichtlinie angefordert.', 50)
) as seed(guideline_text, sort_order)
where not exists (
  select 1
  from public.credit_offer_acceptance_guidelines ag
  where ag.credit_offer_id = co.id
);

