-- ============================================================================
-- Verified updates batch 4 from official sources
-- Banks: Erste Bank, Raiffeisen Bank International, Banca Mediolanum,
--        Bunq Bank, Raisin Bank
-- ============================================================================

-- Erste Bank (AT) via Erste Sparkasse Online-Kredit page
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Erste Bank'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 3000,
  max_amount_eur = 50000,
  min_term_months = 12,
  max_term_months = 120,
  default_term_months = 72,
  payout_days_min = 1,
  payout_days_max = 2,
  note_small = 'Quelle: sparkasse.at Online-Kredit (Stand 2026-04-27), Konditionen sparkassenabhaengig.',
  features = array[
    'Online-Kredit 3.000 EUR bis 50.000 EUR',
    'Laufzeit 12 bis 120 Monate',
    'Auszahlung binnen 24 Stunden bei positiver Bonitaetspruefung',
    'Vorzeitige Rueckzahlung laut Seite spesenfrei moeglich'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Erste Bank'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Erste Bank'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Bonitaetspruefung verpflichtend', 'Auszahlung innerhalb von 24 Stunden nur bei positiver Pruefung.', true, 10),
    ('Sicherheit', 'Optionaler Ablebensschutz', 's Kredit-Protect Plus optional zubuchbar.', true, 20),
    ('Flexibilitaet', 'Online oder Filiale', 'Kreditabschluss digital oder persoenlich in Oesterreich moeglich.', true, 10),
    ('Flexibilitaet', 'Spesenfreie vorzeitige Rueckzahlung', 'Laut Produktseite vorzeitige Rueckzahlung ohne Spesen.', true, 20)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Erste Bank'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Erste Bank'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Mindestalter 18 Jahre.', 10),
    ('George-Zugang erforderlich.', 20),
    ('Regelmaessiges Gehalt oder Pension erforderlich.', 30),
    ('Einkommensnachweis der letzten 3 Monate erforderlich.', 40)
) as v(guideline_text, sort_order);

-- Raiffeisen Bank International (AT consumer channel: raiffeisen.at)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Raiffeisen Bank International'
  limit 1
)
update public.credit_offers co
set
  note_small = 'Quelle: raiffeisen.at Konsumkredit (Stand 2026-04-27), Konditionen je regionaler Raiffeisenbank und Kundenprofil.',
  features = array[
    'Konsumkredit fuer verschiedene private Verwendungszwecke',
    'Fix- oder variabler Zinssatz (EURIBOR-orientiert) je Angebot',
    'Online-Antrag ueber Mein ELBA oder Beratung in der Filiale',
    'Kreditangebot nach individueller Bonitaetspruefung'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Raiffeisen Bank International'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Raiffeisen Bank International'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Vertragstransparenz', 'Effektivzins und Gesamtbelastung sind zentrale Vertragspunkte laut Seite.', true, 10),
    ('Sicherheit', 'Bonitaetspruefung erforderlich', 'Kreditzusage erfolgt nach erfolgreicher Bonitaetspruefung.', true, 20),
    ('Flexibilitaet', 'Individuelle Laufzeit und Raten', 'Konditionen werden individuell auf Vorhaben abgestimmt.', true, 10),
    ('Kundenfreundlichkeit', 'Online- und Beratungsstrecke', 'Beantragung online (Mein ELBA) oder in der Filiale moeglich.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Raiffeisen Bank International'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Raiffeisen Bank International'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Erforderliche Voraussetzungen variieren je regionaler Raiffeisenbank.', 10),
    ('Ueblich sind Einkommensnachweise (z.B. Gehaltszettel der letzten 3 Monate).', 20),
    ('Personen- und Haushaltsdaten sowie Verwendungszweck werden geprueft.', 30),
    ('Kreditzusage erst nach positiver Bonitaetspruefung.', 40)
) as v(guideline_text, sort_order);

-- Banca Mediolanum (IT) Prestito Mediolanum
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Banca Mediolanum'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 2000,
  max_amount_eur = 250000,
  min_term_months = 12,
  max_term_months = 120,
  default_term_months = 84,
  effective_rate_from = 4.160,
  nominal_rate_from = 4.079,
  note_small = 'Quelle: bancamediolanum.it Prestito Mediolanum (Stand 2026-04-27), variabler Zinssatz basierend auf 3M Euribor + Spread.',
  features = array[
    'Variabler Kreditzins (3M Euribor 360 + Spread)',
    'Kreditsumme 2.000 EUR bis 250.000 EUR',
    'Laufzeit 12 bis 120 Monate',
    'Null Gebuehren fuer Rateneinzug und periodische Mitteilungen laut Produktseite'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Banca Mediolanum'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Banca Mediolanum'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Kredit durch Investmentvermoegen unterlegt', 'Prestito wird durch beim Mediolanum-Konzern gehaltene Anlagen abgesichert.', true, 10),
    ('Sicherheit', 'Optionale Schutzversicherung', 'Polizza Protezione Prestito ist optional und nicht zwingend.', true, 20),
    ('Flexibilitaet', 'Breiter Betrags- und Laufzeitrahmen', '2.000-250.000 EUR bei 12-120 Monaten.', true, 10),
    ('Flexibilitaet', 'Variabler Zinssatz', 'Zinsstruktur auf Basis Euribor + vertraglichem Spread.', false, 20)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Banca Mediolanum'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Banca Mediolanum'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Nicht fuer unternehmerische oder gewerbliche Finanzierungen bestimmt.', 10),
    ('Mindestens 5.000 EUR in qualifizierten Mediolanum-Anlagen erforderlich.', 20),
    ('Kreditvergabe unterliegt Bankpruefung und Eignungsvoraussetzungen.', 30),
    ('Bei Verbraucherkrediten gelten europaeische Standardinformationen (SECCI/IEBCC).', 40)
) as v(guideline_text, sort_order);

-- Bunq Bank (no consumer loans/overdrafts according to official help page)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Bunq Bank'
  limit 1
)
update public.credit_offers co
set
  is_active = false,
  note_small = 'Quelle: help.bunq.com (Stand 2026-04-27): bunq bietet keine Kredite oder Dispokredite an.',
  features = array[
    'Keine klassischen Privatkredite laut bunq Help Center',
    'Keine Dispokredite laut bunq Help Center',
    'Hypothekenprodukt separat verfuegbar (Easy Mortgages)'
  ]::text[]
from o
where co.id = o.id;

-- Raisin Bank (BaaS/infrastructure focus, no direct consumer installment lending)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Raisin Bank'
  limit 1
)
update public.credit_offers co
set
  is_active = false,
  note_small = 'Quelle: raisin.bank (Stand 2026-04-27): Raisin Bank positioniert sich als BaaS/Banking-Infrastrukturanbieter.',
  features = array[
    'Fokus auf Banking-as-a-Service und Infrastruktur',
    'Keine direkte Verbraucher-Ratenkreditseite unter eigener Marke',
    'Raisin.com fokussiert auf Spar- und Anlageprodukte'
  ]::text[]
from o
where co.id = o.id;

