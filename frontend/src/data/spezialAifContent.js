/** Static marketing / factsheet copy for Spezial-AIF page (KAGB framing, illustrative figures). */

import siteImages from '@/data/siteImages';

/** Anchor id for the full Kennzahlen table — hero KPI strip links here (no duplicate long list in hero). */
export const spezialAifKennzahlenAnchorId = 'fonds-kennzahlen';

/** Labels must match `spezialAifKeyFacts[].label` — three quick-scan rows for the hero only. */
export const spezialAifHeroKpiLabels = ['Fondsstruktur', 'Mindestbeteiligung', 'Anlagehorizont'];

export const spezialAifFundPhoto = {
  png: siteImages.spezialAif.hero,
  webp: null,
};

export const spezialAifStrategyPhoto = {
  png: siteImages.spezialAif.strategy,
  webp: null,
};

export const spezialAifFocusBackdrop = siteImages.spezialAif.focusBackdrop;

export const spezialAifKeyFacts = [
  { label: 'Produktname', value: 'Fröhlich Vermögensberatung Spezial-AIF' },
  { label: 'ISIN', value: 'Wird nach Auflage mitgeteilt' },
  { label: 'Fondsstruktur', value: 'Geschlossener Spezial-AIF gemäß KAGB' },
  { label: 'Rechtsform', value: 'InvAG § 17 Abs. 2 Nr. 2 KAGB' },
  { label: 'Initiator / KVG', value: 'Fröhlich Vermögensberatung GmbH, Frankfurt am Main' },
  { label: 'Verwahrstelle', value: 'BNP Paribas SA (oder gemäß Fondsvertrag benannte Depotbank)' },
  { label: 'Mindestbeteiligung', value: 'Ab 100.000 EUR' },
  { label: 'Anlagehorizont', value: 'Empfohlen 5–7 Jahre (Mindesthaltedauer gemäß Vertrag, z. B. 5 Jahre)' },
  {
    label: 'Renditeziel',
    value: '3,0 % – 6,0 % netto p.a. als illustrativer Zielkorridor — keine Garantie',
  },
  { label: 'Ausschüttungen', value: 'Jährlich geplant (abhängig von Ertrag und Beschluss)' },
  { label: 'Platzierung', value: 'Exklusiv über autorisierte Partner' },
  { label: 'Standort', value: 'Frankfurt am Main' },
];

/** Illustrative target allocation — not a binding prospectus. `pct` drives chart; `range` shown in legend like a factsheet. */
export const spezialAifAllocation = [
  { label: 'Sachwerte / Immobilien', pct: 40, range: '30–45%', color: 'rgb(var(--bank-primary))' },
  { label: 'Infrastruktur', pct: 25, range: '20–30%', color: 'rgb(var(--bank-gold))' },
  { label: 'Private Debt / Zinsstrategien', pct: 20, range: '15–25%', color: 'rgb(var(--bank-accent))' },
  { label: 'Liquidität & Sonstiges', pct: 15, range: '10–20%', color: 'rgb(var(--bank-secondary))' },
];

/** Einordnung Risikoskala SRRI-ähnlich 1–7 (illustrativ, kein verbindliches Rating). */
export const spezialAifRiskScaleLevel = 4;

/** Kurzer Screenreader-Zusatz zum Risikoblock (kein Ersatz für KID/PRIIPs). */
export const spezialAifRiskScaleSrHint =
  'Hinweis für Hilfsmittel: Die Stufen eins bis sieben sind eine illustrative Einordnung. Sie ist kein verbindlicher synthetischer Risiko- und Ertragsindikator nach KID oder PRIIPs und keine Prognose künftiger Verluste.';

/** Fünf Anlageklassen-Säulen — inhaltlich zum Mandat, nicht als verbindliche Allokation. */
export const spezialAifAssetClasses = [
  {
    key: 're',
    title: 'Immobilien & Sachwerte',
    body: 'Direkte und indirekte Beteiligungen an Bestand und Entwicklung mit Fokus auf Cashflow-Qualität.',
    image: siteImages.spezialAif.assetClasses.re,
  },
  {
    key: 'infra',
    title: 'Infrastruktur',
    body: 'Essenzielle Assets mit langen Laufzeiten und planbaren Ertragsströmen.',
    image: siteImages.spezialAif.assetClasses.infra,
  },
  {
    key: 'debt',
    title: 'Private Debt',
    body: 'Strukturierte Kredit- und Zinsstrategien zur Ergänzung des Renditeprofils.',
    image: siteImages.spezialAif.assetClasses.debt,
  },
  {
    key: 'liq',
    title: 'Liquidität & Reserven',
    body: 'Disziplinierte Liquiditätspuffer für Flexibilität und opportunistische Allokation.',
    image: siteImages.spezialAif.assetClasses.liq,
  },
  {
    key: 'other',
    title: 'Komplementäre Strategien',
    body: 'Selektive Ergänzungen innerhalb des Fondsmandats — nur nach strenger Prüfung.',
    image: siteImages.spezialAif.assetClasses.other,
  },
];

export const spezialAifHighlights = [
  {
    key: 'reg',
    title: 'Reguliert & nachvollziehbar',
    body: 'Strukturierung im Rahmen des KAGB — klare Rollen und Aufsicht.',
  },
  {
    key: 'horizon',
    title: 'Langfristig ausgerichtet',
    body: 'Empfohlener Anlagehorizont 5–7 Jahre; Mindesthaltedauer gemäß Vertrag (z. B. 5 Jahre).',
  },
  {
    key: 'return',
    title: 'Rendite im Blick',
    body: 'Illustrativer Zielkorridor 3–6 % netto p.a. — keine Garantie; abhängig von Markt und Portfolio.',
  },
  {
    key: 'audience',
    title: 'Für qualifizierte Anleger',
    body: 'Geschlossener Spezial-AIF — institutioneller und professioneller Rahmen.',
  },
];

export const spezialAifFocusItems = [
  {
    title: 'Sachwerte & Real Assets',
    body: 'Investitionen in Immobilien, Infrastruktur und andere greifbare Anlagen mit Wertsteigerungspotenzial.',
  },
  {
    title: 'Stabile Cashflows',
    body: 'Fokus auf wiederkehrende Erträge aus Mieten, Pachten und Zinsstrukturen.',
  },
  {
    title: 'Risikobewusste Diversifikation',
    body: 'Breite Streuung über Anlageklassen und Regionen zur Risikominimierung.',
  },
];

export const spezialAifStrategyChecks = [
  'Aktives Portfoliomanagement',
  'Strukturierte Auswahl und Due Diligence',
  'Laufendes Monitoring der Positionen',
  'Nachhaltige Entwicklung im Mandat berücksichtigt',
  'Transparentes Reporting gegenüber Anlegern',
];

export const spezialAifProcessSteps = [
  {
    title: 'Analyse & Auswahl',
    body: 'Sorgfältige Prüfung von Chancen und struktureller Passung.',
  },
  {
    title: 'Strukturierung',
    body: 'Professionelle Aufbereitung und Risikobeurteilung vor Investition.',
  },
  {
    title: 'Investition',
    body: 'Gezielter Einstieg in ausgewählte Vermögenswerte.',
  },
  {
    title: 'Management',
    body: 'Aktives Asset-Management und laufende Überwachung.',
  },
  {
    title: 'Wertentwicklung',
    body: 'Ausgerichtet auf Wertzuwachs und geplante Ausschüttungen.',
  },
];

export const spezialAifBenefits = [
  'Regulierte Fondsstruktur nach KAGB',
  'Erfahrenes Management-Team',
  'Exklusiver Zugang zu ausgewählten Chancen',
  'Klare Prozesse und Dokumentation',
  'Mindestbeteiligung ab 100.000 EUR und empfohlener Anlagehorizont 5–7 Jahre — wie in den Kennzahlen ausgewiesen',
  'Transparentes Reporting und definierte Governance',
  'Fokus auf Realwerte und institutionelle Ausführung',
];

/** Kurzer regulatorischer Hinweisblock (kein Prospekt). */
export const spezialAifLegalNotice =
  'Diese Darstellung dient ausschließlich der allgemeinen Information qualifizierter Anleger und stellt weder eine Anlageberatung noch ein Angebot oder eine Aufforderung zum Erwerb von Anteilen dar. Maßgeblich sind ausschließlich die jeweils gültigen Vertrags- und Fondsdokumente.';

/** Redaktioneller Stand — bei inhaltlichen Updates anpassen. */
export const spezialAifEditorialStand = 'Mai 2026';

/** Kurze Herkunftszeile (menschliche Einordnung, kein Ersatz für Pflichtpublikationen). */
export const spezialAifEditorialIssuerLine =
  'Inhaltlich aufbereitet und intern freigegeben durch Fröhlich Vermögensberatung GmbH, Frankfurt am Main.';

/** Ein Satz zur Einordnung der Online-Darstellung. */
export const spezialAifEditorialClosingLine =
  'Für rechtsverbindliche Angaben zu Kosten, Risiken und Ausschlüssen gelten ausschließlich die ausgehändigten oder hinterlegten Fondsdokumente sowie die jeweiligen Partnerinformationen.';
