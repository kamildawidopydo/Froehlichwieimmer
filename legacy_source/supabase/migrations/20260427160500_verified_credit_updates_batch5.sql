-- ============================================================================
-- Verified updates batch 5 from official sources
-- Bank: BBVA Bank Deutschland
-- ============================================================================

-- BBVA Bank Deutschland (official: bbva.de Sofortkredit)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'BBVA Bank Deutschland'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 3000,
  max_amount_eur = 10000,
  min_term_months = 12,
  max_term_months = 96,
  default_term_months = 60,
  effective_rate_from = 5.110,
  nominal_rate_from = 4.990,
  payout_days_min = 0,
  payout_days_max = 1,
  note_small = 'Quelle: bbva.de Sofortkredit (Stand 2026-04-27), Zinssatz bonitatsabhaengig 4,99% bis 8,99% Sollzins p.a.',
  features = array[
    'Sofortkredit fuer qualifizierte Kunden ab 3 Monaten nach Kontoeroeffnung',
    'Kreditsumme 3.000 EUR bis 10.000 EUR',
    'Laufzeit 12 bis 96 Monate',
    'Keine Stornierungskosten laut Produktseite',
    'Zinsvorteil von 1 Prozentpunkt bei Gehaltseingang >= 800 EUR und Lastschrifteinzug'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'BBVA Bank Deutschland'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'BBVA Bank Deutschland'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Bonitaetsabhaengige Kreditentscheidung', 'Kreditvergabe erfolgt nach individueller Bonitaetspruefung.', true, 10),
    ('Sicherheit', 'Fester Sollzins je Vertrag', 'Repraesentatives Beispiel nach PAngV mit festem Sollzins.', true, 20),
    ('Flexibilitaet', 'Komplett digitale Beantragung', 'Antrag, Auswahl von Betrag/Laufzeit und Signatur in App/Online-Banking.', true, 10),
    ('Kundenfreundlichkeit', 'Keine Stornierungskosten', 'Laut Produktseite fallen keine Stornierungskosten an.', true, 10),
    ('Kundenfreundlichkeit', 'Zinsvorteil bei Kontonutzung', '1%-Punkt Sollzinsreduktion bei Gehaltseingang und Lastschriftbedingung.', true, 20)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'BBVA Bank Deutschland'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'BBVA Bank Deutschland'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Sofortkredit nur fuer qualifizierte Kundinnen/Kunden ab 3 Monaten nach Kontoeroeffnung.', 10),
    ('Kreditrahmen und Zinssatz haengen von individueller Bonitaet ab.', 20),
    ('Fuer Zinsvorteil ist monatlicher Gehaltseingang ab 800 EUR auf BBVA Konto erforderlich.', 30),
    ('Darlehensraten muessen fuer den Zinsvorteil per Lastschrift vom BBVA Konto eingezogen werden.', 40),
    ('Europaeische Standardinformationen fuer Verbraucherkredite vor Vertragsabschluss verfuegbar.', 50)
) as v(guideline_text, sort_order);

