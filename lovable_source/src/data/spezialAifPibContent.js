import siteImages from '@/data/siteImages';

/**
 * Produktinformationsblatt (PIB) — strukturierte Marketing-/Factsheet-Spiegelung.
 * Kein Ersatz für verbindliche KID/PRIIPs oder Fondsdokumente.
 */

export const spezialAifPibMeta = {
  documentTitle: 'Produktinformationsblatt',
  /** Hero H1: kontrollierter Umbruch (zusammen = documentTitle), kein mitten-im-Wort-Split. */
  documentTitleLines: ['Produktinformations', 'blatt'],
  productName: 'Fröhlich Vermögensberatung Spezial-AIF',
  /** Kurzzeile unter dem Dokumenttitel (Referenz: Goldakzent). */
  productSubtitle: 'Geschlossener Spezial-AIF',
  standLabel: 'Stand',
  /** Sollte mit spezialAifEditorialStand übereinstimmen — Seite importiert beides. */
  intro:
    'Diese Übersicht dient der schnellen Einordnung: Wesen des Produkts, Anlageansatz, typische Risiken und Kostenstruktur. Maßgeblich bleiben die ausgehändigten oder hinterlegten Fondsdokumente.',
};

/** §2 — Ziele & Anlagestrategie (Fließtext + Checkliste). */
export const spezialAifPibGoalsLead =
  'Langfristig strebt der Fonds eine attraktive, risikoadjustierte Rendite an — durch aktives Management und disziplinierte Streuung über Anlageklassen und Regionen.';

export const spezialAifPibStrategyChecks = [
  'Anleihen (Investment Grade und selektiv darüber hinaus)',
  'Aktien (direkt und indirekt, je nach Mandat)',
  'Sachwerte: Immobilien und Infrastruktur',
  'Liquidität und Reserven für Flexibilität',
  'Komplementäre Alternativ- und Sonderstrategien nach strenger Prüfung',
];

/** §2 — Editorial unter der Strategie-Checkliste (langfristige Ziele, warme Lifestyle-Fotografie). */
export const spezialAifPibGoalsImageUrl = siteImages.spezialAifPib.goals;
export const spezialAifPibGoalsImageAlt = siteImages.spezialAifPib.goalsAlt;

/** §3 — Anlegerzielgruppe. */
export const spezialAifPibTargetGroupLead =
  'Der Fonds richtet sich an semi-professionelle und professionelle Anlegerinnen und Anleger mit entsprechender Erfahrung und Risikotragfähigkeit.';

export const spezialAifPibTargetChecks = [
  'Anlagehorizont in der Regel mindestens 5 Jahre (empfohlen 5–7 Jahre)',
  'Bereitschaft, erhebliche Wertschwankungen und teilweisen oder vollständigen Verlust des eingesetzten Kapitals zu tragen',
  'Mindestbeteiligung gemäß Fondsdokumentation (siehe Kennzahlen)',
];

/** §4 — Laufzeit & Liquidität (Tabellenzeilen). */
export const spezialAifPibTermLiquidityRows = [
  { label: 'Empfohlener Anlagehorizont', value: '5–7 Jahre' },
  { label: 'Mindesthaltedauer / Mindestlaufzeit', value: '5 Jahre (soweit im Fondsvertrag vorgesehen)' },
  { label: 'Verlängerungsoptionen', value: 'Zwei einjährige Optionen (illustrativ — gemäß Vertrag)' },
  { label: 'Ausschüttungen', value: 'Jährlich geplant (abhängig von Ertrag und Fondsbeschluss)' },
  { label: 'Sekundärmarkt / Rückgabe', value: 'Geschlossener Fonds — keine tägliche Rückgabe; ggf. Sekundärtransaktionen nach Verfügbarkeit' },
];

/** §6 — Chancen (eher „Chancen“-Ton, blau/primary in UI). */
export const spezialAifPibOpportunities = [
  'Diversifikation über mehrere Anlageklassen',
  'Aktives Management und laufendes Monitoring',
  'Potenzielle Absicherung gegen Inflation über Realwerte',
];

/** §6 — Risiken (Akzentfarbe Gold in UI). */
export const spezialAifPibRisks = [
  'Markt- und Bewertungsrisiko',
  'Kredit- und Ausfallrisiko',
  'Liquiditäts- und Refinanzierungsrisiko',
  'Risiko eines teilweisen oder vollständigen Kapitalverlusts',
];

/** §7 — Kosten (illustrativ). */
export const spezialAifPibCostRows = [
  { label: 'Ausgabeaufschlag', value: 'bis zu 5 % (gemäß Platzierungsdokumentation)' },
  { label: 'Verwaltungsvergütung', value: 'bis zu 1,5 % p.a. des Fondsvermögens' },
  { label: 'Performance-Vergütung', value: 'bis zu 15 % über einer Hürde (gemäß Vertrag)' },
  { label: 'Depotbank-/Verwahrstellengebühr', value: 'bis zu 0,10 % p.a. (orientierend)' },
];

/** §8 — Zielrendite (Zahlenband, illustrativ). */
export const spezialAifPibReturnBand = {
  label: 'Zielrendite',
  from: '3,0',
  to: '6,0',
  unit: '% netto p.a.',
  footnote:
    'Zielgröße, keine Garantie. Die tatsächliche Rendite kann niedriger oder höher ausfallen oder ausbleiben; es besteht Verlustrisiko.',
};

/** Risikoindikator — Hinweistext unter der Skala (Referenz: 5–7 J. Halteperiode). */
export const spezialAifPibRiskFootnote =
  'Die Einordnung bezieht sich illustrativ auf eine Halteperiode von 5–7 Jahren. Es handelt sich nicht um einen verbindlichen synthetischen Risiko- und Ertragsindikator (SRRI) nach KID/PRIIPs.';

/** §9–12 — Kompaktspalten. */
export const spezialAifPibCompactSections = [
  {
    n: 9,
    title: 'Reporting',
    body:
      'Quartalsberichte, Jahresabschluss sowie Zugriff auf ein digitales Anlegerportal — jeweils gemäß den vertraglichen Vereinbarungen und der technischen Verfügbarkeit.',
  },
  {
    n: 10,
    title: 'Steuerhinweis',
    body:
      'Die steuerliche Behandlung hängt von der individuellen Situation der Anlegerin bzw. des Anlegers ab. Bitte konsultieren Sie Ihre Steuerberatung.',
  },
  {
    n: 11,
    title: 'Beschwerden',
    body:
      'Wenden Sie sich schriftlich oder per E-Mail an die im Impressum genannte Adresse. Wir bearbeiten Ihr Anliegen zügig im Rahmen unserer internen Prozesse.',
  },
  {
    n: 12,
    title: 'Weitere Informationen',
    body:
      'Vertrags- und Fondsdokumente in deutscher Sprache sowie die rechtlichen Pflichtpublikationen finden Sie über die verlinkten Rechtsseiten und auf Anfrage.',
  },
];

/** Zweite Fußspalte neben dem allgemeinen Rechtshinweis (Referenz: „Rechtshinweis“). */
export const spezialAifPibRechtsHinweis =
  'Diese Online-Darstellung ersetzt weder Prospekt, Verkaufsunterlagen noch Beratung. Aussagen zu Kosten, Risiken und Ausschlüssen sind verkürzt; es gelten die vollständigen Fondstexte. Änderungen am Produkt oder der Regulatorik können die Darstellung überholen.';
