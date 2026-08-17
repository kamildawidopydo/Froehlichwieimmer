-- ============================================================================
-- Verified updates batch 2 from official bank product pages
-- Banks: ABN AMRO, Banco Sabadell, CaixaBank, Crédit Agricole, ING Belgium,
--        KBC Bank, Spuerkeess
-- ============================================================================

-- ABN AMRO (official: https://www.abnamro.nl/en/personal/loans/index.html)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ABN AMRO Bank'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 5000,
  max_amount_eur = 75000,
  min_term_months = 12,
  max_term_months = 144,
  default_term_months = 84,
  effective_rate_from = 7.500,
  nominal_rate_from = 7.500,
  note_small = 'Quelle: abnamro.nl Loans (Stand 2026-04-27), Zinssatz laut Seite ab 7,5%.',
  features = array[
    'Persoenlicher Kredit zwischen 5.000 EUR und 75.000 EUR',
    'Laufzeit zwischen 12 und 144 Monaten',
    'Zusaetzliche Rueckzahlungen jederzeit ohne Gebuehr laut Produktseite'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ABN AMRO Bank'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ABN AMRO Bank'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Fester Zinssatz', 'Fester Zinssatz ueber die gesamte Laufzeit laut Produktseite.', true, 10),
    ('Sicherheit', 'Kreditpruefung vor Abschluss', 'Bonitaetspruefung vor Auszahlung.', true, 20),
    ('Flexibilitaet', 'Kostenlose Sondertilgung', 'Zusaetzliche Rueckzahlungen jederzeit ohne Gebuehr laut ABN AMRO.', true, 10),
    ('Flexibilitaet', 'Feste Monatsrate', 'Monatliche Rate bleibt bei festem Zinssatz planbar.', true, 20),
    ('Kundenfreundlichkeit', 'Digitale Antragsstrecke', 'Antrag und Nachweise online moeglich.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ABN AMRO Bank'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ABN AMRO Bank'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Alter zwischen 21 und 69 Jahren erforderlich.', 10),
    ('Wohnsitz in den Niederlanden erforderlich.', 20),
    ('Ausreichendes regelmaessiges Einkommen erforderlich.', 30),
    ('Bonitaetspruefung und Unterlagenpruefung erforderlich.', 40)
) as v(guideline_text, sort_order);

-- Banco Sabadell (official: https://www.bancsabadell.com/bsnacional/en/personal/loans-and-credits/)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Banco Sabadell'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 3000,
  max_amount_eur = 60000,
  min_term_months = 12,
  max_term_months = 96,
  default_term_months = 72,
  note_small = 'Quelle: bancsabadell.com Loans and Credits (Stand 2026-04-27), Zinssaetze kundenspezifisch.',
  features = array[
    'Persoenlicher Kredit zwischen 3.000 EUR und 60.000 EUR',
    'Laufzeit zwischen 12 und 96 Monaten',
    'Vorzeitige Rueckzahlung mit gesetzlich ausgewiesener Gebuehr'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Banco Sabadell'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Banco Sabadell'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Fester Zinssatz je Angebot', 'Zinssatz ist laut Produktseite kundenspezifisch.', true, 10),
    ('Sicherheit', '14 Tage Widerruf', 'Ruecktritt innerhalb von 14 Tagen gemaess ESIS/Vertrag.', true, 20),
    ('Flexibilitaet', 'Vorzeitige Rueckzahlung moeglich', 'Gebuehr 1,00% (>12 Monate Restlaufzeit) bzw. 0,50% (<=12 Monate).', false, 10),
    ('Kundenfreundlichkeit', 'Keine Pflichtversicherung', 'Darlehensvergabe nicht an Zusatzversicherung gebunden.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Banco Sabadell'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Banco Sabadell'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Volljaehrigkeit erforderlich.', 10),
    ('Wohnsitz in Spanien erforderlich.', 20),
    ('Kunde seit mehr als 6 Monaten erforderlich (laut Produktseite).', 30),
    ('Zugang zum Remote-Banking erforderlich.', 40),
    ('Bonitaets- und Risikopruefung erforderlich.', 50)
) as v(guideline_text, sort_order);

-- CaixaBank (official: https://www.caixabank.es/particular/prestamos-personales/prestamo-personal.html)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'CaixaBank'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 3000,
  max_amount_eur = 30000,
  min_term_months = 1,
  max_term_months = 72,
  default_term_months = 72,
  effective_rate_from = 12.570,
  nominal_rate_from = 11.900,
  note_small = 'Quelle: caixabank.es Prestamo Proyectos Personales (Stand 2026-04-27), repraesentatives Beispiel 8.000 EUR/72 Monate.',
  features = array[
    '100% online beantragbar',
    'Kreditsumme zwischen 3.000 EUR und 30.000 EUR',
    'Laufzeit bis 72 Monate',
    'Keine Eroeffnungskommission laut Produktseite'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'CaixaBank'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'CaixaBank'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Risiko- und Solvenzpruefung', 'Vergabe nur nach Solvenz- und Rueckzahlungsfaehigkeitspruefung.', true, 10),
    ('Sicherheit', 'Kein Eroeffnungsentgelt', 'Laut Produktseite keine Eroeffnungskommission.', true, 20),
    ('Flexibilitaet', 'Laufzeit bis 72 Monate', 'Rueckzahlungszeitraum 1 bis 72 Monate.', true, 10),
    ('Kundenfreundlichkeit', 'Antwort innerhalb von 24 Stunden', 'Statusmeldung laut Produktseite in unter 24h.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'CaixaBank'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'CaixaBank'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Volljaehrigkeit erforderlich.', 10),
    ('Stabile Einkuenfte und ausreichende Rueckzahlungsfaehigkeit erforderlich.', 20),
    ('Bonitaetspruefung inkl. externer Registerabfragen moeglich.', 30),
    ('Einkommens- und steuerliche Nachweise koennen angefordert werden.', 40)
) as v(guideline_text, sort_order);

-- Credit Agricole (official: pret personnel page)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Crédit Agricole'
  limit 1
)
update public.credit_offers co
set
  max_amount_eur = 75000,
  note_small = 'Quelle: credit-agricole.fr Pret Perso (Stand 2026-04-27), Zinssaetze regional und kundenspezifisch.',
  features = array[
    'Fixer Zinssatz laut Produktseite',
    'Modulation der Monatsraten moeglich',
    'Monatspause einmal pro Jahr ab 13. Rate moeglich',
    'Teil- oder Gesamtrueckzahlung auf Antrag moeglich'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Crédit Agricole'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Crédit Agricole'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Fixer Zinssatz', 'Prêt Personnel mit festem Zinssatz laut Produktseite.', true, 10),
    ('Sicherheit', '14 Tage Widerruf', 'Gesetzliche Ruecktrittsfrist von 14 Kalendertagen.', true, 20),
    ('Flexibilitaet', 'Rate anpassbar', 'Monatsrate kann im vertraglichen Rahmen erhoeht oder gesenkt werden.', true, 10),
    ('Flexibilitaet', 'Monatspause moeglich', 'Einmal pro Jahr ab der 13. Monatsrate moeglich.', true, 20),
    ('Kundenfreundlichkeit', 'Online oder Filiale', 'Abschluss sowohl online als auch in der Filiale moeglich.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Crédit Agricole'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Crédit Agricole'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Angebot fuer volljaehrige Privatkunden, vorbehaltlich Pruefung und finaler Zusage.', 10),
    ('Bonitaets- und Verschuldungspruefung erforderlich.', 20),
    ('Nachweise und Unterlagen sind im Prozess hochzuladen.', 30),
    ('Vertragsunterzeichnung elektronisch moeglich.', 40)
) as v(guideline_text, sort_order);

-- ING Belgium (official: https://www.ing.be/en/individuals/borrowing/personal-loan)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ING Belgium'
  limit 1
)
update public.credit_offers co
set
  max_amount_eur = 50000,
  effective_rate_from = 7.740,
  nominal_rate_from = 7.740,
  payout_days_min = 2,
  payout_days_max = 3,
  note_small = 'Quelle: ing.be Personal Loan (Stand 2026-04-27), repraesentatives Beispiel 6.500 EUR / 36 Monate.',
  features = array[
    'Gleichbleibende Monatsraten',
    'Unter 50.000 EUR i.d.R. ohne Belegnachweis laut Produktseite',
    '100% Online-Prozess',
    'Auszahlung im Durchschnitt nach 2 Tagen'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ING Belgium'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ING Belgium'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Verbraucherkreditrecht', 'Persoenlicher Kredit unterliegt dem belgischen Verbraucherkreditrecht.', true, 10),
    ('Flexibilitaet', 'Konstante Monatsrate', 'Monatsrate bleibt ueber die Laufzeit konstant.', true, 10),
    ('Flexibilitaet', 'Online-Abschluss', 'Angebot, Signatur und Auszahlung digital moeglich.', true, 20),
    ('Kundenfreundlichkeit', 'Schnelle Auszahlung', 'Nach finaler Pruefung durchschnittlich in ca. 2 Tagen.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ING Belgium'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'ING Belgium'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Antrag mit Bestaetigung persoenlicher Daten, Einkommen und Ausgaben erforderlich.', 10),
    ('Bonitaetspruefung und Validierung durch die Bank erforderlich.', 20),
    ('Online-Unterzeichnung des Angebots erforderlich.', 30),
    ('Angebot laut Produktseite 20 Tage gueltig.', 40)
) as v(guideline_text, sort_order);

-- KBC Bank (official: FAQ lening op afbetaling)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'KBC Bank'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 500,
  max_amount_eur = 50000,
  min_term_months = 6,
  max_term_months = 120,
  default_term_months = 60,
  note_small = 'Quelle: kbc.be FAQ Lening op afbetaling (Stand 2026-04-27), Zinssaetze zweck- und kundenspezifisch.',
  features = array[
    'Kreditsumme 500 EUR bis 50.000 EUR (je nach Kanal)',
    'Laufzeit bis 120 Monate (produktabhaengig)',
    'Keine Administrations- oder Dossierkosten laut FAQ',
    'Vorzeitige Rueckzahlung moeglich (mit Reinvestitionsentschaedigung)'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'KBC Bank'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'KBC Bank'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Kreditvergabe vorbehaltlich Genehmigung', 'Kreditentscheidung erfolgt nach Pruefung durch KBC.', true, 10),
    ('Flexibilitaet', 'Verschiedene Rueckzahlungsplaene', 'Je nach Abschlusskanal unterschiedliche Tilgungsmodelle moeglich.', true, 10),
    ('Flexibilitaet', 'Vorzeitige Rueckzahlung moeglich', 'Teil- und Vollrueckzahlung moeglich, mit Reinvestitionsentschaedigung.', false, 20),
    ('Kundenfreundlichkeit', 'Keine Dossierkosten', 'Laut FAQ keine Administrations- und Dossierkosten.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'KBC Bank'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'KBC Bank'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Antrag auch ohne bestehendes KBC-Konto moeglich.', 10),
    ('Kreditzweck beeinflusst Konditionen und Tarifierung.', 20),
    ('Bonitaetspruefung und bankinterne Genehmigung erforderlich.', 30),
    ('Online-Beantragung ueber Website/Touch/Mobile moeglich.', 40)
) as v(guideline_text, sort_order);

-- Spuerkeess (official: personal loan page)
with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Spuerkeess'
  limit 1
)
update public.credit_offers co
set
  min_amount_eur = 5000,
  max_amount_eur = 100000,
  min_term_months = 12,
  max_term_months = 60,
  default_term_months = 60,
  effective_rate_from = 6.0698,
  nominal_rate_from = 6.0698,
  note_small = 'Quelle: spuerkeess.lu Personal Loan (Stand 2026-04-27), Beispielsimulation 25.000 EUR.',
  features = array[
    'Persoenlicher Kredit zwischen 5.000 EUR und 100.000 EUR',
    'Laufzeit 12 bis 60 Monate',
    'Fester Zinssatz mit konstanten Monatsraten',
    'Vorzeitige Rueckzahlung moeglich; Gebuehr 250 EUR bei Restsaldo > 10.000 EUR'
  ]::text[]
from o
where co.id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Spuerkeess'
  limit 1
)
delete from public.credit_offer_product_information pi using o where pi.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Spuerkeess'
  limit 1
)
insert into public.credit_offer_product_information (credit_offer_id, section, item_label, item_description, is_positive, sort_order)
select o.id, v.section, v.item_label, v.item_description, v.is_positive, v.sort_order
from o
cross join (
  values
    ('Sicherheit', 'Fester Zinssatz', 'Konstante Monatsraten durch festen Zinssatz laut Produktseite.', true, 10),
    ('Sicherheit', 'Ausfallversicherung optional', 'Restschuldversicherung empfohlen, aber nicht zwingend.', true, 20),
    ('Flexibilitaet', 'Online-Antrag via S-Net/S-Net Mobile', 'Digitale Antragsstrecke verfuegbar.', true, 10),
    ('Flexibilitaet', 'Vorzeitige Rueckzahlung moeglich', 'Gebuehr 250 EUR bei Restsaldo ueber 10.000 EUR.', false, 20),
    ('Kundenfreundlichkeit', 'Sonderkonditionen fuer bestimmte Kundengruppen', 'Vorteilsbedingungen z.B. fuer Zebra Premium laut Produktseite.', true, 10)
) as v(section, item_label, item_description, is_positive, sort_order);

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Spuerkeess'
  limit 1
)
delete from public.credit_offer_acceptance_guidelines ag using o where ag.credit_offer_id = o.id;

with o as (
  select co.id
  from public.credit_offers co
  join public.banks b on b.id = co.bank_id
  where b.name = 'Spuerkeess'
  limit 1
)
insert into public.credit_offer_acceptance_guidelines (credit_offer_id, guideline_text, sort_order)
select o.id, v.guideline_text, v.sort_order
from o
cross join (
  values
    ('Antrag vorbehaltlich Annahme durch die Bank.', 10),
    ('Bonitaetspruefung und bankinterne Kreditentscheidung erforderlich.', 20),
    ('Bei unzureichender Absicherung kann eine Restschuldversicherung verlangt werden.', 30),
    ('Digitale Antragstellung ueber S-Net/S-Net Mobile moeglich.', 40)
) as v(guideline_text, sort_order);

