-- ============================================================================
-- One-time refinement of starter content using generic patterns observed on
-- Check24 credit product detail presentation.
-- Note: bank-specific values are NOT imported; text is generic and editable.
-- ============================================================================

-- Replace seeded Produktinformationen for offers that still carry the starter marker.
with target_offers as (
  select co.id
  from public.credit_offers co
  where co.note_small = '2/3 aller angenommenen Kunden erhalten individuelle Konditionen gemaess Bonitaetspruefung.'
)
delete from public.credit_offer_product_information pi
using target_offers t
where pi.credit_offer_id = t.id;

with target_offers as (
  select co.id
  from public.credit_offers co
  where co.note_small = '2/3 aller angenommenen Kunden erhalten individuelle Konditionen gemaess Bonitaetspruefung.'
)
insert into public.credit_offer_product_information (
  credit_offer_id,
  section,
  item_label,
  item_description,
  is_positive,
  sort_order
)
select
  t.id,
  s.section,
  s.item_label,
  s.item_description,
  s.is_positive,
  s.sort_order
from target_offers t
cross join (
  values
    ('Sicherheit', 'Kreditabsicherung moeglich', 'Absicherung kann je nach Tarif optional vereinbart werden.', true, 10),
    ('Sicherheit', 'Widerruf bis 14 Tage nach Abschluss moeglich', 'Das gesetzliche Widerrufsrecht gilt gemaess Vertragsunterlagen.', true, 20),
    ('Flexibilitaet', 'Sondertilgungen moeglich', 'Sondertilgungen sind gemaess Tarifbedingungen moeglich.', true, 10),
    ('Flexibilitaet', 'Gesamttilgung moeglich', 'Eine vorzeitige vollstaendige Rueckzahlung ist je nach Tarif moeglich.', true, 20),
    ('Flexibilitaet', 'Ratenpause tarifabhaengig', 'Ratenpausen sind produktabhaengig und ggf. kostenpflichtig.', false, 30),
    ('Flexibilitaet', 'Umschuldung/Abloesung bestehender Kredite moeglich', 'Eine Ablosung vorhandener Verbindlichkeiten ist je nach Produkt moeglich.', true, 40),
    ('Kundenfreundlichkeit', 'Gleiche Konditionen fuer Bestands- und Neukunden', 'Konditionslogik richtet sich nach Produkt- und Bonitaetskriterien.', true, 10)
) as s(section, item_label, item_description, is_positive, sort_order);

-- Replace seeded Annahmerichtlinien for the same starter offers.
with target_offers as (
  select co.id
  from public.credit_offers co
  where co.note_small = '2/3 aller angenommenen Kunden erhalten individuelle Konditionen gemaess Bonitaetspruefung.'
)
delete from public.credit_offer_acceptance_guidelines ag
using target_offers t
where ag.credit_offer_id = t.id;

with target_offers as (
  select co.id
  from public.credit_offers co
  where co.note_small = '2/3 aller angenommenen Kunden erhalten individuelle Konditionen gemaess Bonitaetspruefung.'
)
insert into public.credit_offer_acceptance_guidelines (
  credit_offer_id,
  guideline_text,
  sort_order
)
select
  t.id,
  s.guideline_text,
  s.sort_order
from target_offers t
cross join (
  values
    ('Der/Die Kreditnehmer ist/sind volljaehrig.', 10),
    ('Der/Die Kreditnehmer handelt/handeln auf eigene Rechnung.', 20),
    ('Der/Die Kreditnehmer hat/haben eine deutsche Bankverbindung.', 30),
    ('Ein befristetes Anstellungsverhaeltnis darf nicht innerhalb der Kreditlaufzeit enden.', 40),
    ('Der/Die Kreditnehmer hat/haben keine negativen SCHUFA-Eintraege.', 50),
    ('Einzureichende Unterlagen: aktuelle Einkommensnachweise und Kontoauszuege gemaess Bankanforderung.', 60),
    ('Pfandbarer Anteil kuenftiger Einkuenfte kann gemaess Kreditvertrag abgetreten werden.', 70)
) as s(guideline_text, sort_order);

