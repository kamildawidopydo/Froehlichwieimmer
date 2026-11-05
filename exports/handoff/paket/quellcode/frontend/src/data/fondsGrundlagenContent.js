/** «Fonds-Grundlagen» — erweiterte Infografik (Orientierung, keine rechtsverbindliche Darstellung). */

import siteImages from '@/data/siteImages';

/** Editorial-Fotos — lokale Rebrand-Assets (kein Unsplash). */
export const fgEditorialPhotos = {
  bandInstitutional: {
    alt: siteImages.fondsGrundlagen.bandInstitutional.alt,
    png: siteImages.fondsGrundlagen.bandInstitutional.png,
    webp: null,
  },
  riskCalmOffice: {
    alt: siteImages.fondsGrundlagen.riskCalmOffice.alt,
    png: siteImages.fondsGrundlagen.riskCalmOffice.png,
    webp: null,
  },
  afterInvestTeam: {
    alt: siteImages.fondsGrundlagen.afterInvestTeam.alt,
    png: siteImages.fondsGrundlagen.afterInvestTeam.png,
    webp: null,
  },
  sparkontoPlanning: {
    alt: siteImages.fondsGrundlagen.sparkontoPlanning.alt,
    png: siteImages.fondsGrundlagen.sparkontoPlanning.png,
    webp: null,
  },
  philosophieTogether: {
    alt: siteImages.fondsGrundlagen.philosophieTogether.alt,
    png: siteImages.fondsGrundlagen.philosophieTogether.png,
    webp: null,
  },
};

export const fgHero = {
  brandLine: 'Fröhlich Vermögensberatung Spezial-AIF',
  title: 'Ihr Kapital. Unsere Expertise.',
  /** Zweite Zeile im Hero — Gold, wie Print-Referenz */
  tagline: 'Gemeinsam Werte schaffen.',
  subtitle: 'Strukturiert investieren — mit institutioneller Disziplin.',
  intro:
    'Der Fröhlich Vermögensberatung Spezial-AIF bündelt qualifiziertes Kapital in einem geschlossenen Alternativinvestmentfonds. Klare Prozesse, breite Diversifikation und professionelles Management bilden das Fundament für Ihre langfristige Kapitalanlage.',
};

export const fgProcess7Eyebrow = 'So funktioniert der Fonds — in 7 Schritten';

export const fgProcess7Steps = [
  {
    key: 's1',
    title: 'Sie investieren',
    body: 'Sie zeichnen Anteile des Fröhlich Vermögensberatung Spezial-AIF und werden Miteigentümer des Fonds.',
    tag: 'Einstieg',
  },
  {
    key: 's2',
    title: 'Kapital wird gebündelt',
    body: 'Das Kapital vieler Anleger wird im Fonds gesammelt, um größere Investitionen und Diversifikation zu ermöglichen.',
    tag: 'Pooling',
  },
  {
    key: 's3',
    title: 'Breit diversifiziert investiert',
    body: 'Der Fonds investiert in verschiedene Anlageklassen weltweit nach einer klaren Strategie.',
    tag: 'Strategie',
  },
  {
    key: 's4',
    title: 'Professionelles Management',
    body: 'Erfahrene Experten überwachen kontinuierlich die Märkte, steuern das Portfolio aktiv und managen Risiken.',
    tag: 'Management',
  },
  {
    key: 's5',
    title: 'Erträge entstehen',
    body: 'Zinsen, Dividenden, Mieten und Wertsteigerungen erzeugen laufende und realisierte Erträge.',
    tag: 'Erträge',
  },
  {
    key: 's6',
    title: 'Transparenz & Reporting',
    body: 'Sie erhalten regelmäßige Berichte über die Entwicklung Ihres Investments – klar, verständlich und transparent.',
    tag: 'Reporting',
  },
  {
    key: 's7',
    title: 'Ausschüttung & Rückzahlung',
    body: 'Erträge werden ausgeschüttet oder reinvestiert. Am Ende der Laufzeit erhalten Sie Ihr Kapital zurück.',
    tag: 'Ausgang',
  },
];

export const fgAllocationEyebrow = 'Wo investiert der Fonds?';

export const fgAllocation6 = [
  {
    pct: 30,
    label: 'Staats- & Unternehmensanleihen',
    sub: 'Stabile Zinsen und planbare Erträge',
    color: 'rgb(var(--bank-primary))',
  },
  {
    pct: 25,
    label: 'Globale Aktien',
    sub: 'Wachstum durch Beteiligung an starken Unternehmen',
    color: 'rgb(var(--bank-gold))',
  },
  {
    pct: 15,
    label: 'Sachwerte / Immobilien / Infrastruktur',
    sub: 'Inflationsschutz und reale Werte',
    color: '#64748b',
  },
  {
    pct: 15,
    label: 'Liquidität & Geldmarkt',
    sub: 'Stabilität und Flexibilität',
    color: '#94a3b8',
  },
  {
    pct: 10,
    label: 'Alternative Investments',
    sub: 'Zusätzliche Diversifikation',
    color: '#78716c',
  },
  {
    pct: 5,
    label: 'Weitere Strategien',
    sub: 'Chancenorientierte Beimischungen',
    color: '#d6d3d1',
  },
];

export const fgAllocation6Note =
  'Illustrative Zielallokation — tatsächliche Gewichtungen können je nach Marktlage und Fondsbeschluss abweichen. Maßgeblich sind die Fondsdokumente.';

export const fgAllocation6Callout =
  'Die Allokation wird aktiv gesteuert und kann je nach Marktlage angepasst werden.';

export const fgRiskSteering = {
  eyebrow: 'Wie wird Risiko gesteuert?',
  items: [
    { key: 'g', icon: 'globe', title: 'Streuung über Märkte', body: 'Regionale und währungsbezogene Diversifikation der Portfoliobestandteile.' },
    { key: 'd', icon: 'droplet', title: 'Liquiditätspuffer', body: 'Geplante Reserven zur Bewältigung von Marktphasen und für Flexibilität.' },
    { key: 'r', icon: 'check', title: 'Aktives Risikomanagement', body: 'Anpassung der Allokation an veränderte Marktbedingungen im Rahmen des Mandats.' },
    { key: 's', icon: 'search', title: 'Due Diligence', body: 'Strukturierte Prüfung vor jeder wesentlichen Investitionsentscheidung.' },
    { key: 'u', icon: 'users', title: 'Governance', body: 'Klare Verantwortlichkeiten zwischen KVG, Verwahrstelle und Kontrollinstanzen.' },
  ],
};

export const fgAfterInvest = {
  eyebrow: 'Was passiert nach Ihrer Investition?',
  steps: [
    { key: 'a1', title: 'Buchung Ihrer Anteile', body: 'Eintragung im Anteilhregister gemäß Vertragsdokumentation.' },
    { key: 'a2', title: 'Zuordnung zum Fondsvermögen', body: 'Ihr Kapital wird dem gemeinschaftlichen Anlagepool zugeführt.' },
    { key: 'a3', title: 'Deployment', body: 'Schrittweise Investition gemäß Strategie und Marktchancen.' },
    { key: 'a4', title: 'Laufendes Monitoring', body: 'Überwachung von Risiken, Bonität und regulatorischen Vorgaben.' },
    { key: 'a5', title: 'Bewertung & Reporting', body: 'Periodische Bewertungen und Berichte an die Anlegergemeinschaft.' },
    { key: 'a6', title: 'Ausschüttungen', body: 'Ertragsausschüttungen nach Fondsbeschluss, soweit vorgesehen.' },
    { key: 'a7', title: 'Laufzeitende', body: 'Abwicklung oder Verlängerung gemäß Fondsvertrag und Beschlussfassung.' },
    { key: 'a8', title: 'Rückzahlung', body: 'Auskehrung des verbleibenden Vermögens nach Abzug von Kosten und Verbindlichkeiten.' },
  ],
};

export const fgRenditeFormula = {
  eyebrow: 'Wie entsteht die Rendite?',
  lead: 'Rendite setzt sich aus mehreren Bausteinen zusammen — kein Einzelfaktor, sondern ein Zusammenspiel.',
  /** Kurztitel + Fließtext je Säule (Referenz-Infografik). */
  parts: [
    {
      key: 'p',
      icon: 'percent',
      title: 'Zinsen',
      body: 'Laufende Erträge aus Anleihen und Geldmarktinstrumenten.',
    },
    {
      key: 'g',
      icon: 'gift',
      title: 'Dividenden',
      body: 'Ausschüttungen beteiligter Unternehmen.',
    },
    {
      key: 'c',
      icon: 'chart',
      title: 'Wertsteigerungen',
      body: 'Gewinne aus dem Verkauf von Anlagen über dem Kaufpreis.',
    },
    {
      key: 'h',
      icon: 'home',
      title: 'Mieteinnahmen',
      body: 'Erträge aus Immobilien und Infrastruktur-Investments.',
    },
    {
      key: 'u',
      icon: 'userCheck',
      title: 'Aktives Management',
      body: 'Nutzung von Chancen durch gezielte Umschichtungen und Strategien.',
    },
  ],
  goalKicker: 'ZIEL:',
  goalMain: 'Attraktive, risikoadjustierte Renditen für unsere Anleger',
  goalNote: 'Kein Garantieversprechen; tatsächliche Ergebnisse können abweichen.',
};

/**
 * Abschnitt 6 — Icons aus Lucide React (ISC), Banking/Fintech-Line-Stil: https://lucide.dev
 * `lucide`: Komponenten-Schlüssel; `accent`: navy | gold (Referenz-Druck).
 */
export const fgAusschuettung = {
  eyebrow: 'Ausschüttung & Rückzahlung',
  /** Zweite Zeile im Kopf (Referenz-Infografik) */
  eyebrowTagline: '– Wie funktioniert das?',
  rowReturns: [
    { key: 'r1', lucide: 'coins', accent: 'navy', lines: ['Investition'] },
    { key: 'r2', lucide: 'chartUp', accent: 'gold', lines: ['Erwirtschaftete Erträge'] },
    { key: 'r3', lucide: 'handCoins', accent: 'navy', lines: ['Ausschüttung', '(geplant jährlich)'] },
  ],
  rowExit: [
    { key: 'e1', lucide: 'history', accent: 'navy', lines: ['Laufzeitende /', 'Verwertung der Anlagen'] },
    { key: 'e2', lucide: 'euroCycle', accent: 'navy', lines: ['Rückzahlung des', 'investierten Kapitals'] },
  ],
};

export const fgGeeignet = {
  eyebrow: 'Für wen ist der Fonds geeignet?',
  geeignetTitle: 'Geeignet für …',
  geeignet: [
    'Professionelle und semi-professionelle Anlegerinnen und Anleger',
    'Langfristiger Anlagehorizont (typisch 5 Jahre und mehr)',
    'Bereitschaft, Marktrisiken und Wertschwankungen zu tragen',
    'Mindestbeteiligung gemäß Platzierungsunterlagen',
  ],
  nichtTitle: 'Nicht geeignet für …',
  nicht: [
    'Kurzfristige Spekulation oder Tagesgeldniveau',
    'Vollständige Kapitalgarantie oder feste Rückzahlungszusage',
    'Tägliche Verfügbarkeit des Kapitals wie bei Sparbuch oder Tagesgeld',
    'Anleger ohne Risikotoleranz oder ohne Kenntnis geschlossener Fonds',
  ],
};

export const fgVergleich = {
  eyebrow: 'Vergleich',
  colClassic: 'Klassischer geschlossener Fonds',
  colBr: 'Fröhlich Vermögensberatung Spezial-AIF',
  rows: [
    {
      k: 'r1',
      label: 'Struktur',
      classic: 'Oft starre Struktur, begrenzte Transparenz',
      br: 'Klarer institutioneller Rahmen, dokumentierte Prozesse',
    },
    {
      k: 'r2',
      label: 'Allokation',
      classic: 'Fokus häufig auf einzelne Assetklassen',
      br: 'Breite Diversifikation über mehrere Anlageklassen',
    },
    {
      k: 'r3',
      label: 'Reporting',
      classic: 'Reporting je nach Initiator unterschiedlich',
      br: 'Regelmäßiges Reporting und definierte Governance',
    },
    {
      k: 'r4',
      label: 'Zugang',
      classic: 'Zugang oft über wenige Kanäle',
      br: 'Strukturierter Zugang über qualifizierte Partner',
    },
    {
      k: 'r5',
      label: 'Laufzeit',
      classic: 'Oft undurchsichtige Laufzeit- und Verlängerungsregeln',
      br: 'Vertraglich fixierter Rahmen mit klarer Kommunikation',
    },
    {
      k: 'r6',
      label: 'Ausschüttungen',
      classic: 'Unregelmäßig oder schwer nachvollziehbar',
      br: 'Geplante Ertragslogik gemäß Fondsvertrag und Beschlüssen',
    },
    {
      k: 'r7',
      label: 'Flexibilität',
      classic: 'Begrenzte Anpassung an Marktphasen',
      br: 'Aktives Management innerhalb des definierten Mandats',
    },
  ],
};

export const fgPortal = {
  eyebrow: 'Anlegerportal',
  lead: 'Digitale Übersicht über Ihre Beteiligung — soweit im jeweiligen Ausbau verfügbar.',
  features: [
    { key: 'f1', icon: 'layout', title: 'Dashboard', body: 'Kernkennzahlen und Status Ihrer Beteiligung.' },
    { key: 'f2', icon: 'file', title: 'Dokumente', body: 'Berichte und relevante Unterlagen zum Download.' },
    { key: 'f3', icon: 'message', title: 'Kommunikation', body: 'Anfragen und strukturierter Schriftverkehr.' },
    { key: 'f4', icon: 'bell', title: 'Hinweise', body: 'Wesentliche Mitteilungen und Fristen.' },
  ],
};

export const fgSparkonto = {
  eyebrow: 'Warum nicht nur Sparkonto?',
  cols: [
    {
      key: 'c1',
      visual: 'inflation',
      titleUpper: 'INFLATION',
      body: 'Realkaufkraft kann bei rein nominal sicheren Anlagen sinken, wenn Inflation die Verzinsung übersteigt.',
    },
    {
      key: 'c2',
      visual: 'bank',
      titleUpper: 'NIEDRIGZINS',
      body: 'Tages- und Festgeld bieten oft begrenzte Renditeperspektive — wenig Spielraum über Inflation hinaus.',
    },
    {
      key: 'c3',
      visual: 'capMarket',
      titleUpper: 'KAPITALMARKT',
      body: 'Strukturierte Fonds können zusätzliche Renditequellen erschließen — verbunden mit Marktrisiko.',
    },
  ],
  /** CTA unter den Säulen — Markenname hervorgehoben (Gold). */
  ctaSegments: [
    { text: 'Der ' },
    { text: 'Fröhlich Vermögensberatung', accent: true },
    { text: ' Spezial-AIF bietet eine professionelle Lösung, um Ihr Vermögen zu diversifizieren und langfristig zu vermehren.' },
  ],
};

export const fgInvProcess5 = {
  eyebrow: 'Unser Investmentprozess',
  /** `visual` → Lucide in `FondsGrundlagenInfographic` (`FG_INV_VISUAL_ICONS`). */
  steps: [
    {
      key: 'i1',
      visual: 'invAnalyse',
      title: 'Analyse',
      body: 'Wir analysieren Märkte, Trends und Chancen.',
    },
    {
      key: 'i2',
      visual: 'invSelektion',
      title: 'Selektion',
      body: 'Die besten Investments werden ausgewählt.',
    },
    {
      key: 'i3',
      visual: 'invPruefung',
      title: 'Prüfung',
      body: 'Risikoprüfung und Bewertung durch Experten.',
    },
    {
      key: 'i4',
      visual: 'invEntscheidung',
      title: 'Entscheidung',
      body: 'Investmentkomitee trifft die finale Entscheidung.',
    },
    {
      key: 'i5',
      visual: 'invUeberwachung',
      title: 'Überwachung',
      body: 'Laufende Kontrolle und Anpassung des Portfolios.',
    },
  ],
};

export const fgPhilosophie = {
  eyebrow: 'Unsere Investmentphilosophie',
  items: [
    { key: 'ph1', icon: 'clock', title: 'Langfristig', body: 'Zyklusdenken statt kurzfristiger Prognosen.' },
    { key: 'ph2', icon: 'shield', title: 'Risikobewusst', body: 'Kontrollierte Risikopositionen im Mandat.' },
    { key: 'ph3', icon: 'layers', title: 'Diversifiziert', body: 'Streuung über Anlagen, Regionen und Sektoren.' },
    { key: 'ph4', icon: 'eye', title: 'Transparent', body: 'Nachvollziehbare Entscheidungs- und Berichtsprozesse.' },
    { key: 'ph5', icon: 'leaf', title: 'Verantwortungsvoll', body: 'Nachhaltige Rahmenbedingungen im jeweils gültigen Mandat.' },
  ],
};

export const fgLegal = {
  eyebrow: 'Wichtige Hinweise',
  body:
    'Diese Darstellung dient der allgemeinen Information und ersetzt weder Prospekt, Verkaufsunterlagen noch eine individuelle Anlageberatung. Wertentwicklungen in der Vergangenheit sind kein verlässlicher Indikator für künftige Ergebnisse. Es besteht das Risiko des teilweisen oder vollständigen Verlusts des eingesetzten Kapitals. Maßgeblich sind die jeweils gültigen Fondsdokumente und die Informationen autorisierter Partner.',
  linkLabel: 'Zum Spezial-AIF-Dossier & rechtlichen Unterlagen',
  linkTo: '/spezial-aif',
};

export const fgFooterValues = [
  { key: 'fv1', icon: 'briefcase', title: 'Professionelles Management', body: 'Erfahrene Strukturen und klare Zuständigkeiten.' },
  { key: 'fv2', icon: 'scale', title: 'Stabile Renditeperspektive', body: 'Orientierung an langfristigen, risikoadjustierten Zielen.' },
  { key: 'fv3', icon: 'shield', title: 'Transparenz & Vertrauen', body: 'Regulatorischer Rahmen und dokumentierte Abläufe.' },
  { key: 'fv4', icon: 'heart', title: 'Nähe zu Anlegerinnen & Anlegern', body: 'Erreichbarkeit über definierte Kanäle und Partner.' },
];
