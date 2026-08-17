-- ============================================================================
-- Verified updates batch 3 from official bank product pages
-- Banks: UniCredit, OP Financial Group, Millennium BCP, N26 Bank, BNP Paribas
-- ============================================================================

-- UniCredit (official: unicredit.it prestito personale)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'UniCredit'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 3001,
  max_amount_eur = 75000,
  min_term_months = 36,
  max_term_months = 120,
  default_term_months = 84,
  note_small = 'Quelle: unicredit.it Prestito UniCredit (Stand 2026-04-27), Konditionen je Zweck und Profil.',
  features = array[
    'Persoenlicher Kredit 3.001 EUR bis 75.000 EUR',
    'Laufzeit 36 bis 84 Monate (bis 120 Monate bei bestimmten Zwecken)',
    'Flexible Optionen: Salto Rata, Cambio Rata, Ricarica Prestito (mit Bedingungen)',
    'Optionale CPI-Restschuldversicherung verfuegbar'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'UniCredit'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'UniCredit'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Kreditvergabe nach Bonitaetspruefung', 'Angebot und flexible Optionen unterliegen Kreditwuerdigkeitspruefung.', true, 10),
    ('Sicherheit', 'Optionale Absicherung', 'CPI-Versicherung ist optional und nicht zwingend fuer die Auszahlung.', true, 20),
    ('Flexibilitaet', 'Ratenpause moeglich', 'Salto Rata: einmal pro Jahr nach Mindestanzahl gezahlter Raten.', true, 10),
    ('Flexibilitaet', 'Ratenaenderung moeglich', 'Cambio Rata mit vertraglichen Grenzen und Gebuehr je Anfrage.', true, 20),
    ('Flexibilitaet', 'Aufstockung moeglich', 'Ricarica Prestito nach definierten Voraussetzungen moeglich.', true, 30)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'UniCredit'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'UniCredit'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Mindestalter 18 Jahre erforderlich.', 10),
    ('Maximalalter bei Laufzeitende gemaess Produktangaben begrenzt (bis 80 Jahre).', 20),
    ('Antrag in App/Online/Filiale je nach Kundentyp und Verwendungszweck.', 30),
    ('Bonitaets- und Unterlagenpruefung erforderlich.', 40)
) as v(guideline_text, sort_order);

-- OP Financial Group (official: op.fi consumer credit)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'OP Financial Group'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 2000,
  max_amount_eur = 30000,
  note_small = 'Quelle: op.fi Consumer credit (Stand 2026-04-27), Zinssatz als Margin + Euribor.',
  features = array[
    'Unbesicherter Konsumentenkredit 2.000 EUR bis 30.000 EUR (OP-Kunden)',
    'Personalisierte Zinsmarge 3,5% bis 10,95% + 3M Euribor',
    'Entscheidung fuer unbesicherten Kredit i.d.R. binnen 2 Banktagen',
    'Besicherter Bankkredit als Alternative verfuegbar'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'OP Financial Group'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'OP Financial Group'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Zinsstruktur transparent', 'Preis basiert auf Marge plus Euribor-Referenzzins.', true, 10),
    ('Flexibilitaet', 'Unbesichert oder besichert', 'Produktwahl zwischen unbesichertem Konsumentenkredit und besichertem Bankdarlehen.', true, 10),
    ('Flexibilitaet', 'Tilgungsplan aenderbar', 'Aenderung des Rueckzahlungsplans ueber OP-Kanaele moeglich.', true, 20),
    ('Kundenfreundlichkeit', 'Schnelle Erstentscheidung', 'Bei unbesicherten Krediten i.d.R. binnen 2 Banktagen.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'OP Financial Group'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'OP Financial Group'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Unbesicherter OP-Kredit nur fuer OP-Kunden.', 10),
    ('Regelmaessiges Einkommen und ausreichende Rueckzahlungsfaehigkeit erforderlich.', 20),
    ('Keine Zahlungsausfaelle in Registern vorausgesetzt.', 30),
    ('Besicherter Kredit erfordert geeignete Sicherheiten.', 40)
) as v(guideline_text, sort_order);

-- Millennium BCP (official: millenniumbcp.pt online personal loan)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Millennium BCP'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 1000,
  max_amount_eur = 25000,
  min_term_months = 18,
  max_term_months = 84,
  default_term_months = 60,
  effective_rate_from = 10.100,
  nominal_rate_from = 8.700,
  note_small = 'Quelle: millenniumbcp.pt Online Personal Loan (Stand 2026-04-27), TAEG/TAN je Kundensegment.',
  features = array[
    'Online-Personalkredit 1.000 EUR bis 25.000 EUR',
    'Laufzeit 18 bis 84 Monate',
    'Repraesentative Konditionen u.a. 10,1% TAEG / 8,7% TAN',
    'Kreditvergabe vorbehaltlich Risikoanalyse und regulatorischer Vorgaben'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Millennium BCP'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Millennium BCP'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Risikopruefung verpflichtend', 'Kredit nur nach Bonitaets- und Risikoanalyse.', true, 10),
    ('Sicherheit', 'Regulatorische Auflagen', 'Vergabe unterliegt makroprudenziellen Regeln der Banco de Portugal.', true, 20),
    ('Flexibilitaet', 'Digitale Abschlussstrecke', 'Simulation, Antrag und Vertrag online moeglich.', true, 10),
    ('Kundenfreundlichkeit', 'Schnelle Prozessschritte', 'Ablauf in drei Schritten: simulieren, bestaetigen, auszahlen.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Millennium BCP'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Millennium BCP'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Mindestalter 18 Jahre.', 10),
    ('Einkommensnachweise erforderlich (z.B. letzte Gehaltsnachweise).', 20),
    ('Ausweisdokumente aller beteiligten Parteien erforderlich.', 30),
    ('Kreditvergabe vorbehaltlich Annahme und Vertragsunterzeichnung.', 40)
) as v(guideline_text, sort_order);

-- N26 Bank (official: n26.com/en-de/credit)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'N26 Bank'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 1000,
  max_amount_eur = 25000,
  min_term_months = 12,
  max_term_months = 60,
  default_term_months = 48,
  effective_rate_from = 4.060,
  nominal_rate_from = 3.990,
  payout_days_min = 0,
  payout_days_max = 1,
  note_small = 'Quelle: n26.com/de Credit (Stand 2026-04-27), Konditionen profil- und SCHUFA-abhaengig.',
  features = array[
    'Kredit 1.000 EUR bis 25.000 EUR direkt in der App',
    'Laufzeit 12 bis 60 Monate',
    'Effektiver Zinssatz laut Seite ab 4,06% p.a.',
    'Digitale Signatur, Auszahlung in der Regel unmittelbar nach Zusage'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'N26 Bank'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'N26 Bank'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Konditionen nach Bonitaet', 'Persoenliches Angebot basiert auf Profil und Bonitaet.', true, 10),
    ('Sicherheit', 'SCHUFA-Pruefung erforderlich', 'Kreditangebot setzt SCHUFA-Information voraus.', true, 20),
    ('Flexibilitaet', 'Voll digital', 'Angebot, Vertrag und Auszahlung komplett digital.', true, 10),
    ('Kundenfreundlichkeit', 'Schnelle Angebotsbereitstellung', 'Unverbindliches Angebot in kurzer Zeit in der App.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'N26 Bank'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'N26 Bank'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('N26 Konto seit mindestens 90 Tagen erforderlich.', 10),
    ('SCHUFA-Pruefung erforderlich.', 20),
    ('Kreditbetrag und Zins werden individuell nach Bonitaet festgelegt.', 30),
    ('Elektronische Vertragsunterzeichnung erforderlich.', 40)
) as v(guideline_text, sort_order);

-- BNP Paribas (Germany channel via Consors Finanz online credit)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'BNP Paribas'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 1500,
  max_amount_eur = 80000,
  min_term_months = 12,
  max_term_months = 120,
  default_term_months = 72,
  effective_rate_from = 3.490,
  note_small = 'Quelle: consorsfinanz.de Online-Kredit (BNP Paribas S.A. Niederlassung Deutschland), Stand 2026-04-27.',
  features = array[
    'Online-Ratenkredit 1.500 EUR bis 80.000 EUR',
    'Laufzeit bis 120 Monate',
    'Effektivzins laut Produktseite ab 3,49% p.a.',
    'Sondertilgung oder Aufstockung laut Produktseite moeglich'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'BNP Paribas'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'BNP Paribas'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Fester Sollzins im Vertrag', 'Repraesentatives Beispiel mit festem Sollzins fuer gesamte Laufzeit.', true, 10),
    ('Sicherheit', 'Bonitaetsabhaengige Zusage', 'Kreditangebot vorbehaltlich Bonitaet und Pruefung.', true, 20),
    ('Flexibilitaet', 'Sondertilgung und Aufstockung', 'Laut Produktseite jederzeit moeglich.', true, 10),
    ('Kundenfreundlichkeit', 'Volldigitaler Antrag', 'Online-Abschluss in wenigen Schritten.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'BNP Paribas'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'BNP Paribas'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Antrag vorbehaltlich Bonitaetspruefung.', 10),
    ('Legitimations- und Einkommenspruefung je nach Antrag erforderlich.', 20),
    ('Digitale Vertragsstrecke und Referenzkonto erforderlich.', 30),
    ('Effektivzins ist bonitaetsabhaengig.', 40)
) as v(guideline_text, sort_order);

