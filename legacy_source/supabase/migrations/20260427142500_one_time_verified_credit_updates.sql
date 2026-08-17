-- ============================================================================
-- One-time verified updates from official bank pages (DKB, ING, Commerzbank via
-- comdirect referral). Other banks stay on editable starter defaults.
-- ============================================================================

-- DKB Privatkredit (official page: https://www.dkb.de/privatkunden/kredite/privatkredit)
with dkb_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Deutsche Kreditbank (DKB)'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 1000,
  max_amount_eur = 100000,
  min_term_months = 12,
  max_term_months = 120,
  default_term_months = 84,
  effective_rate_from = 6.590,
  nominal_rate_from = 6.400,
  payout_days_min = 0,
  payout_days_max = 2,
  rating_value = coalesce(co.rating_value, 4.5),
  note_small = 'Quelle: dkb.de Privatkredit (Stand 2026-04-27), bonitaetsabhaengige Konditionen.',
  features = array[
    'Privatkredit bis 100.000 EUR',
    'Sofortentscheidung mit digitalem Kontocheck moeglich',
    'Kostenlose Sondertilgungen laut Produktseite',
    'Ratenpause laut Produktbedingungen moeglich'
  ]::text[]
from dkb_offer
where co.id = dkb_offer.id;

with dkb_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Deutsche Kreditbank (DKB)'
  limit 1
)
delete from public.credit_offer_product_information pi
using dkb_offer d
where pi.credit_offer_id = d.id;

with dkb_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Deutsche Kreditbank (DKB)'
  limit 1
)
insert into public.credit_offer_product_information (
  credit_offer_id, section, item_label, item_description, is_positive, sort_order
)
select d.id, x.section, x.item_label, x.item_description, x.is_positive, x.sort_order
from dkb_offer d
cross join (
  values
    ('Sicherheit', 'Optionale Ratenschutzversicherung', 'Absicherung ist optional verfuegbar.', true, 10),
    ('Sicherheit', 'Gesetzliches Widerrufsrecht', 'Widerruf gemaess gesetzlicher Fristen.', true, 20),
    ('Flexibilitaet', 'Kostenlose Sondertilgung moeglich', 'Vorzeitige Teilrueckzahlungen laut Produktseite kostenfrei.', true, 10),
    ('Flexibilitaet', 'Ratenpause moeglich', 'Ratenpause nach den jeweils gueltigen DKB-Bedingungen.', true, 20),
    ('Flexibilitaet', 'Ablosung/Umschuldung moeglich', 'Bestehende Kredite koennen abgeloest werden.', true, 30),
    ('Kundenfreundlichkeit', 'Digitale Beantragung und Signatur', 'Antrag, Legitimation und Signatur online moeglich.', true, 10)
) as x(section, item_label, item_description, is_positive, sort_order);

with dkb_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Deutsche Kreditbank (DKB)'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag
using dkb_offer d
where ag.credit_offer_id = d.id;

with dkb_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Deutsche Kreditbank (DKB)'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select d.id, x.guideline_text, x.sort_order
from dkb_offer d
cross join (
  values
    ('Volljaehrigkeit und Wohnsitz in Deutschland erforderlich.', 10),
    ('Unbefristetes Arbeitsverhaeltnis oder unbefristete Rente erforderlich.', 20),
    ('Selbststaendige/Freiberufler sind beim DKB-Privatkredit i.d.R. ausgeschlossen.', 30),
    ('Digitale Legitimation und deutsche Mobilfunknummer fuer Signatur erforderlich.', 40),
    ('Bonitaetspruefung und bankinterne Kreditentscheidung erforderlich.', 50)
) as x(guideline_text, sort_order);

-- ING Ratenkredit (official page: https://www.ing.de/kredit/)
with ing_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ING-DiBa'
  limit 1
)
update public.credit_offers co
set
  max_amount_eur = 100000,
  max_term_months = 120,
  default_term_months = least(co.default_term_months, 120),
  note_small = 'Quelle: ing.de/kredit (Stand 2026-04-27), bonitaetsabhaengige Konditionen.',
  features = array[
    'Papierlose Beantragung mit schneller Zusage',
    'Unbegrenzte kostenlose Sondertilgungen',
    'Auszahltermin frei waehlbar',
    'Laufzeit bis 120 Monate'
  ]::text[]
from ing_offer
where co.id = ing_offer.id;

with ing_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ING-DiBa'
  limit 1
)
delete from public.credit_offer_product_information pi
using ing_offer i
where pi.credit_offer_id = i.id;

with ing_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ING-DiBa'
  limit 1
)
insert into public.credit_offer_product_information (
  credit_offer_id, section, item_label, item_description, is_positive, sort_order
)
select i.id, x.section, x.item_label, x.item_description, x.is_positive, x.sort_order
from ing_offer i
cross join (
  values
    ('Sicherheit', 'Gesetzliches Widerrufsrecht', 'Widerruf gemaess Vertragsunterlagen.', true, 10),
    ('Flexibilitaet', 'Unbegrenzte kostenlose Sondertilgung', 'Laut ING-Produktseite kostenlos moeglich.', true, 10),
    ('Flexibilitaet', 'Auszahltermin frei waehlbar', 'Der Auszahlungstermin kann im Prozess gewaehlt werden.', true, 20),
    ('Flexibilitaet', 'Kreditlaufzeit bis 120 Monate', 'Lange Laufzeiten fuer planbare Monatsraten.', true, 30),
    ('Kundenfreundlichkeit', 'Digitale Beantragung und Legitimation', 'Antrag online, Legitimation per Online-Ausweisfunktion oder Video.', true, 10)
) as x(section, item_label, item_description, is_positive, sort_order);

with ing_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ING-DiBa'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag
using ing_offer i
where ag.credit_offer_id = i.id;

with ing_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ING-DiBa'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select i.id, x.guideline_text, x.sort_order
from ing_offer i
cross join (
  values
    ('Volljaehrigkeit, gute Bonitaet und private Nutzung erforderlich.', 10),
    ('Stabiles monatliches Einkommen laut ING-Vorgaben erforderlich.', 20),
    ('Wohnsitz und Arbeitsplatz in Deutschland sowie Gehalts-Girokonto erforderlich.', 30),
    ('Bei gemeinsamer Beantragung: gleicher Wohnsitz erforderlich.', 40),
    ('Bonitaetspruefung und bankinterne Kreditentscheidung erforderlich.', 50)
) as x(guideline_text, sort_order);

-- comdirect: mediation to Commerzbank Ratenkredit
-- official references:
--   https://www.comdirect.de/kredit/kredit.html
--   https://www.commerzbank.de/privatkunden/kredite/ratenkredit/
with comdirect_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Comdirect Bank'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 1500,
  max_amount_eur = 100000,
  min_term_months = 6,
  max_term_months = 119,
  default_term_months = least(greatest(co.default_term_months, 6), 119),
  effective_rate_from = least(co.effective_rate_from, 2.990),
  nominal_rate_from = coalesce(co.nominal_rate_from, 2.950),
  note_small = 'Quelle: comdirect/commerzbank Ratenkredit (Stand 2026-04-27), Vermittlung und bonitaetsabhaengige Konditionen.',
  features = array[
    'Ratenkredit ueber Commerzbank-Antragstrecke',
    'Kreditsumme 1.500 EUR bis 100.000 EUR',
    'Laufzeit 6 bis 119 Monate',
    'Schnelle Online-Antragstellung'
  ]::text[]
from comdirect_offer
where co.id = comdirect_offer.id;

with comdirect_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Comdirect Bank'
  limit 1
)
delete from public.credit_offer_product_information pi
using comdirect_offer c
where pi.credit_offer_id = c.id;

with comdirect_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Comdirect Bank'
  limit 1
)
insert into public.credit_offer_product_information (
  credit_offer_id, section, item_label, item_description, is_positive, sort_order
)
select c.id, x.section, x.item_label, x.item_description, x.is_positive, x.sort_order
from comdirect_offer c
cross join (
  values
    ('Sicherheit', 'Gesetzliches Widerrufsrecht', 'Widerruf gemaess Vertragsunterlagen.', true, 10),
    ('Flexibilitaet', 'Vorzeitige Rueckzahlung moeglich', 'Bei vorzeitiger Rueckzahlung kann eine gesetzliche Vorfaelligkeitsentschaedigung anfallen.', false, 10),
    ('Flexibilitaet', 'Kreditsumme und Laufzeit frei waehlbar', 'Innerhalb der Produktgrenzen waehlbar.', true, 20),
    ('Kundenfreundlichkeit', 'Planbare Monatsraten', 'Feste Monatsraten ueber die Laufzeit.', true, 10),
    ('Kundenfreundlichkeit', 'Schnelle Konditionsvorschau', 'Unverbindliches Angebot mit schneller Vorpruefung.', true, 20)
) as x(section, item_label, item_description, is_positive, sort_order);

with comdirect_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Comdirect Bank'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag
using comdirect_offer c
where ag.credit_offer_id = c.id;

with comdirect_offer as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Comdirect Bank'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select c.id, x.guideline_text, x.sort_order
from comdirect_offer c
cross join (
  values
    ('Volljaehrige natuerliche Person mit Wohnsitz in Deutschland erforderlich.', 10),
    ('Kreditaufnahme nur fuer private Zwecke; keine Geschaeftsfinanzierung.', 20),
    ('Unbeschraenkte Steuerpflicht in Deutschland erforderlich.', 30),
    ('Bonitaetspruefung inkl. SCHUFA-Auskunft erforderlich.', 40),
    ('Ausreichende Unterlagen und rechtsverbindlich unterzeichneter Antrag erforderlich.', 50)
) as x(guideline_text, sort_order);

