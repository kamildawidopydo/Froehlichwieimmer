/**
 * Zeitlose redaktionelle Finanzartikel für den Home-Artikelbereich und /finanzwissen/:slug.
 * Bewusst KEINE tagesaktuellen Nachrichten — die Inhalte sind evergreen und produkt-neutral.
 * Struktur pro Artikel:
 *   slug, title, category, excerpt, image, publishedAt (ISO), readingTime (Min), featured, body[].
 *   body[] = { heading?: string, paragraphs?: string[], list?: string[] }
 */

export const FINANCIAL_CATEGORIES = [
  { key: 'all', label: 'Alle' },
  { key: 'aktien', label: 'Aktien' },
  { key: 'etfs-fonds', label: 'ETFs & Fonds' },
  { key: 'zinsen', label: 'Zinsen' },
  { key: 'sparen', label: 'Sparen' },
  { key: 'maerkte', label: 'Märkte' },
  { key: 'finanzwissen', label: 'Finanzwissen' },
];

export const FINANCIAL_CATEGORY_LABEL = FINANCIAL_CATEGORIES.reduce((acc, c) => {
  acc[c.key] = c.label;
  return acc;
}, {});

export const FINANCIAL_ARTICLES = [
  {
    slug: 'etfs-verstehen-worauf-anleger-achten-sollten',
    title: 'ETFs verstehen: Darauf sollten Anleger achten',
    category: 'etfs-fonds',
    excerpt:
      'Kostenquote, Replikationsmethode, Fondsvolumen und Steuerstatus prägen, wie ein ETF im Depot arbeitet. Ein Überblick über die wichtigsten Kriterien vor der Auswahl.',
    image:
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2026-01-14',
    readingTime: 6,
    featured: true,
    body: [
      {
        paragraphs: [
          'ETFs bilden einen Index passiv ab und bündeln damit den Wertverlauf vieler Einzelwerte in einem einzigen Papier. Vor dem Kauf lohnt der Blick hinter das Etikett: nicht jeder MSCI-World-ETF ist mit dem nächsten identisch.',
        ],
      },
      {
        heading: 'Vier Kennzahlen, die den Unterschied machen',
        list: [
          'Total Expense Ratio (TER): laufende Kosten pro Jahr; typisch 0,05–0,60 %.',
          'Replikationsmethode: physisch (voll oder Sampling) versus synthetisch (Swap).',
          'Fondsvolumen: unter 100 Mio. € steigt das Risiko einer späteren Schließung.',
          'Ertragsverwendung: thesaurierend versus ausschüttend — steuerlich und für die Wiederanlage relevant.',
        ],
      },
      {
        heading: 'Was ETFs nicht sind',
        paragraphs: [
          'ETFs sind kein Freibrief für Renditegarantien. Wer den globalen Aktienmarkt kauft, kauft auch dessen Schwankungen. Historische Renditen sagen wenig über die nächsten fünf oder zehn Jahre.',
          'Auch die Diversifikation kann trügen: Ein „All-World"-ETF gewichtet Einzelunternehmen mitunter hoch, weil die Marktkapitalisierung das Regelwerk bestimmt.',
        ],
      },
    ],
  },
  {
    slug: 'tagesgeld-oder-festgeld',
    title: 'Tagesgeld oder Festgeld — was passt zu welchem Ziel?',
    category: 'sparen',
    excerpt:
      'Verfügbarkeit gegen Planbarkeit: Wie beide Kontoformen sich ergänzen und wann welche sinnvoll ist.',
    image:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2026-01-08',
    readingTime: 4,
    featured: false,
    body: [
      {
        paragraphs: [
          'Tagesgeld ist täglich verfügbar, der Zinssatz aber variabel. Festgeld bindet das Kapital für eine feste Laufzeit — dafür ist der Zinssatz garantiert. Die Wahl folgt weniger dem Zinsvergleich als dem konkreten Verwendungszweck.',
        ],
      },
      {
        heading: 'Faustregel',
        list: [
          'Kurzfristige Reserve (0–12 Monate) → eher Tagesgeld.',
          'Mittelfristige Rücklage (1–5 Jahre) → Festgeld oder Kombination.',
          'Notfall-Liquidität → immer sofort verfügbar halten.',
        ],
      },
      {
        heading: 'Was der Zinssatz nicht zeigt',
        paragraphs: [
          'Die Einlagensicherung bis 100.000 € pro Kunde und Bank ist im EU-Wirtschaftsraum gesetzlich geregelt — für höhere Beträge macht Streuung über mehrere Institute Sinn. Auch verzinste Guthaben verlieren real an Kaufkraft, wenn die Inflation den Nominalzins übersteigt.',
        ],
      },
    ],
  },
  {
    slug: 'wie-zinsen-anleihen-beeinflussen',
    title: 'Wie Zinsen Anleihen beeinflussen',
    category: 'zinsen',
    excerpt:
      'Steigende Zinsen drücken Kurse bestehender Anleihen, fallende Zinsen heben sie. Das mechanische Warum — und was Anleger daraus ableiten können.',
    image:
      'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2025-12-19',
    readingTime: 5,
    featured: false,
    body: [
      {
        paragraphs: [
          'Anleihen sind Verträge mit festen Zahlungsströmen. Wenn am Markt neue Anleihen mit höheren Kupons erscheinen, sinkt automatisch der Kurs älterer Papiere — weil ihre festen Kupons in Relation weniger attraktiv werden.',
        ],
      },
      {
        heading: 'Duration als Empfindlichkeit',
        paragraphs: [
          'Die Kennzahl „Modified Duration" beschreibt, wie stark der Kurs einer Anleihe auf einen Zinsschritt reagiert. Eine Duration von 6 bedeutet: 1 % Zinsanstieg → rund 6 % Kursverlust; 1 % Zinsrückgang → rund 6 % Kursgewinn.',
        ],
      },
      {
        heading: 'Praktische Konsequenz',
        list: [
          'Langlaufende Anleihen bieten höhere Kupons — bei höherer Kursempfindlichkeit.',
          'Wer bis Endfälligkeit hält, erhält den ursprünglich vereinbarten Cashflow zurück.',
          'Zwischenzeitliche Kursbewegungen sind Buchwerte, keine realisierten Verluste.',
        ],
      },
    ],
  },
  {
    slug: 'diversifikation-warum-streuung-entscheidend-ist',
    title: 'Diversifikation: Warum Streuung entscheidend ist',
    category: 'finanzwissen',
    excerpt:
      'Streuung reduziert das unsystematische Risiko — nicht aber die Marktbewegungen selbst. Was Diversifikation kann und was nicht.',
    image:
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2025-12-12',
    readingTime: 5,
    featured: false,
    body: [
      {
        paragraphs: [
          'Diversifikation ist der einzige „free lunch" der Kapitalmärkte, wie es Harry Markowitz einmal formulierte. Wer sein Vermögen auf viele unkorrelierte Positionen verteilt, senkt das Verlustpotenzial ohne im Erwartungswert Rendite aufzugeben.',
        ],
      },
      {
        heading: 'Drei Ebenen der Streuung',
        list: [
          'Über Anlageklassen: Aktien, Anleihen, Liquidität, Immobilien.',
          'Innerhalb einer Klasse: Regionen, Sektoren, Einzelwerte.',
          'Zeitlich: gestaffelter Einstieg statt einmaliger Timing-Entscheidung.',
        ],
      },
      {
        heading: 'Grenzen',
        paragraphs: [
          'In Krisen steigen Korrelationen — dann fallen viele Anlageklassen gemeinsam. Diversifikation schützt nicht vor Marktrisiko, sondern gegen Einzelrisiken. Wer 200 Aktien hält, ist nicht doppelt so gut diversifiziert wie mit 100.',
        ],
      },
    ],
  },
  {
    slug: 'was-anleger-ueber-inflation-wissen-sollten',
    title: 'Was Anleger über Inflation wissen sollten',
    category: 'maerkte',
    excerpt:
      'Inflation verändert reale Renditen, drückt Kaufkraft und wirkt unterschiedlich auf Anlageklassen. Ein nüchterner Blick auf die Mechanik.',
    image:
      'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2025-12-04',
    readingTime: 5,
    featured: false,
    body: [
      {
        paragraphs: [
          'Nominal ist nicht real. Wer 3 % Zinsen erhält, aber 4 % Inflation trägt, verliert real Kaufkraft. Die realen Renditen zählen — nominal sind nur der Ausgangspunkt.',
        ],
      },
      {
        heading: 'Wie Anlageklassen typischerweise reagieren',
        list: [
          'Aktien: langfristig oft ein guter Inflationsschutz, kurzfristig aber sensibel für Zinsschritte.',
          'Anleihen mit fester Verzinsung: verlieren real, wenn Inflation über Kupon steigt.',
          'Inflations-indexierte Anleihen (Linker): Kupon und Nominal wandern mit der Preisentwicklung.',
          'Rohstoffe und Sachwerte: historisch oft mit positiver Inflationsbeta.',
        ],
      },
    ],
  },
  {
    slug: 'aktien-fuer-einsteiger',
    title: 'Aktien für Einsteiger: Die wichtigsten Grundlagen',
    category: 'aktien',
    excerpt:
      'Eine Aktie ist ein Anteil an einem Unternehmen — mit Chancen, Rechten und Risiken. Was Einsteiger vor dem ersten Kauf wissen sollten.',
    image:
      'https://images.unsplash.com/photo-1638913662180-afc4334cf422?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2025-11-27',
    readingTime: 6,
    featured: false,
    body: [
      {
        paragraphs: [
          'Wer eine Aktie kauft, wird Miteigentümerin oder Miteigentümer des Unternehmens. Der Kurs spiegelt Angebot und Nachfrage — und langfristig die operative Entwicklung des Unternehmens.',
        ],
      },
      {
        heading: 'Vier Begriffe, die man verstanden haben sollte',
        list: [
          'Kurs-Gewinn-Verhältnis (KGV): Bewertung im Verhältnis zum Gewinn je Aktie.',
          'Dividendenrendite: laufende Ausschüttung im Verhältnis zum Kurs.',
          'Volatilität: Schwankungsbreite eines Papiers über die Zeit.',
          'Marktkapitalisierung: Kurs × Anzahl der Aktien = Unternehmenswert am Markt.',
        ],
      },
      {
        heading: 'Was Einsteiger vermeiden sollten',
        paragraphs: [
          'Konzentration auf wenige Werte, Übergewichtung von Trend-Themen, Reaktion auf tägliche Kursbewegungen. Aktien sind ein Langfrist-Instrument — der emotionale Umgang mit dem eigenen Depot entscheidet häufig mehr als die konkrete Wertauswahl.',
        ],
      },
    ],
  },
  {
    slug: 'sparplan-oder-einmalanlage',
    title: 'Sparplan oder Einmalanlage?',
    category: 'finanzwissen',
    excerpt:
      'Cost-Average versus Time-in-Market: Wann ein Sparplan sinnvoll ist und wann eine Einmalanlage — und warum die Antwort weniger mathematisch als psychologisch ist.',
    image:
      'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2025-11-20',
    readingTime: 4,
    featured: false,
    body: [
      {
        paragraphs: [
          'Rein statistisch schlägt eine Einmalanlage den Sparplan über lange Zeiträume, weil das Kapital früher am Markt ist. Der Sparplan ist aber häufig die realistischere Wahl — weil er zur Sparfähigkeit passt und emotional besser durchzuhalten ist.',
        ],
      },
      {
        heading: 'Wann welche Form?',
        list: [
          'Einmalanlage: vorhandenes Kapital, definierter Horizont, hohe Risikotoleranz.',
          'Sparplan: laufendes Einkommen, langer Horizont, Wunsch nach Disziplin.',
          'Kombination: Grundstock einmalig, Aufbau per Sparplan.',
        ],
      },
    ],
  },
  {
    slug: 'wie-funktioniert-der-zinseszinseffekt',
    title: 'Wie funktioniert der Zinseszinseffekt?',
    category: 'finanzwissen',
    excerpt:
      'Zinsen auf Zinsen: Warum kleine Renditen über Jahrzehnte gewaltige Endkapitale erzeugen — und warum Zeit die wichtigste Zutat ist.',
    image:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2025-11-11',
    readingTime: 4,
    featured: false,
    body: [
      {
        paragraphs: [
          '1.000 € zu 5 % ergeben nach zehn Jahren rund 1.629 € — nicht 1.500 €. Der Unterschied sind die Zinsen auf bereits kapitalisierte Zinsen. Über 30 Jahre werden aus 1.000 € rund 4.322 €.',
        ],
      },
      {
        heading: 'Zwei Regeln, die den Effekt greifbar machen',
        list: [
          'Regel 72: Kapital verdoppelt sich in ungefähr 72/Zinssatz Jahren. Bei 6 % also nach 12 Jahren.',
          'Zeit schlägt Höhe: Wer früh anfängt, holt trotz geringerer Sparraten oft Endkapitale ein, die später kaum aufzuholen sind.',
        ],
      },
    ],
  },
  {
    slug: 'welche-rolle-spielt-die-ezb-fuer-sparer',
    title: 'Welche Rolle spielt die EZB für Sparer?',
    category: 'zinsen',
    excerpt:
      'Die EZB steuert die Leitzinsen im Euroraum und beeinflusst damit Tagesgeld, Festgeld, Anleihekupons und Kreditkonditionen — mit deutlichem Zeitversatz.',
    image:
      'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2025-11-04',
    readingTime: 5,
    featured: false,
    body: [
      {
        paragraphs: [
          'Die Europäische Zentralbank setzt drei Leitzinsen fest: den Einlagensatz, den Hauptrefinanzierungssatz und den Spitzenrefinanzierungssatz. Aus diesen Referenzen leiten Banken ihre Konditionen für Tages- und Festgeld sowie für Kredite ab.',
        ],
      },
      {
        heading: 'Warum die Wirkung zeitverzögert ist',
        paragraphs: [
          'Banken passen Konditionen nicht am Tag der Zinsentscheidung an, sondern über Wochen bis Monate — und asymmetrisch: Guthabenzinsen steigen langsamer als Kreditzinsen. Wer Konditionen vergleicht, sollte deshalb regelmäßig prüfen, nicht nur einmal.',
        ],
      },
    ],
  },
  {
    slug: 'risiko-und-rendite-richtig-einordnen',
    title: 'Risiko und Rendite richtig einordnen',
    category: 'aktien',
    excerpt:
      'Höhere Rendite ohne höheres Risiko gibt es nicht. Aber Risiko lässt sich strukturieren, messen und einer Anlagestrategie zuordnen.',
    image:
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2025-10-28',
    readingTime: 5,
    featured: false,
    body: [
      {
        paragraphs: [
          'Rendite ist die Belohnung, Risiko der Preis. Wer die höhere erwartete Rendite von Aktien möchte, muss die höhere Schwankung akzeptieren. Wer stabile Werte will, akzeptiert dafür eine geringere erwartete Rendite.',
        ],
      },
      {
        heading: 'Vier Risikoarten, die häufig vermischt werden',
        list: [
          'Marktrisiko: allgemeine Schwankung des Segments.',
          'Emittentenrisiko: das einzelne Unternehmen fällt aus.',
          'Liquiditätsrisiko: das Papier lässt sich nicht zeitnah verkaufen.',
          'Währungsrisiko: die Anlage ist in fremder Währung notiert.',
        ],
      },
    ],
  },
  {
    slug: 'anleihen-rendite-und-kurs',
    title: 'Anleihen: Wie Rendite und Kurs zusammenhängen',
    category: 'zinsen',
    excerpt:
      'Kupon, Kurs und Restlaufzeit ergeben die Rendite bis Endfälligkeit. Wie sich diese drei Größen gegenseitig bewegen.',
    image:
      'https://images.unsplash.com/photo-1607944024060-0450380ddd33?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2025-10-21',
    readingTime: 4,
    featured: false,
    body: [
      {
        paragraphs: [
          'Eine Anleihe mit 3 % Kupon, gekauft zu 100 %, liefert 3 % Rendite. Gekauft zu 95 %, liefert dieselbe Anleihe eine höhere Rendite, weil bei Endfälligkeit 100 % zurückgezahlt werden. Yield to Maturity fasst diesen Zusammenhang in einer Kennzahl zusammen.',
        ],
      },
      {
        heading: 'Warum das relevant ist',
        list: [
          'Der Marktkurs schwankt bis zur Endfälligkeit — die zugesicherte Rückzahlung nicht.',
          'Wer über Fonds oder ETFs Anleihen hält, bewegt sich mit den Marktkursen.',
          'Direkte Anleihen erlauben Buy-and-hold bis Endfälligkeit — mit klar planbarem Cashflow.',
        ],
      },
    ],
  },
  {
    slug: 'vermoegensaufbau-in-drei-bausteinen',
    title: 'Vermögensaufbau in drei Bausteinen',
    category: 'finanzwissen',
    excerpt:
      'Liquiditätsreserve, Renditekern, Sicherheitspuffer: Ein einfaches Gerüst, das den Ausgangspunkt einer strukturierten Anlage bildet.',
    image:
      'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&w=1600&q=70',
    publishedAt: '2025-10-14',
    readingTime: 5,
    featured: false,
    body: [
      {
        paragraphs: [
          'Vor der Auswahl einzelner Produkte kommt die Struktur. Drei einfache Bausteine reichen als Ausgangspunkt für die meisten Haushalte — die konkreten Instrumente ergeben sich später aus Ziel und Horizont.',
        ],
      },
      {
        heading: 'Die drei Bausteine',
        list: [
          'Liquiditätsreserve: 3–6 Monatsausgaben auf Tagesgeld für Unvorhergesehenes.',
          'Renditekern: langfristig investiertes Kapital, breit über Aktien und Anleihen gestreut.',
          'Sicherheitspuffer: geplante mittelfristige Ausgaben auf Festgeld / kurzlaufenden Anleihen.',
        ],
      },
      {
        heading: 'Erst die Struktur, dann das Produkt',
        paragraphs: [
          'Wer die Bausteine sauber getrennt hat, wählt Produkte gezielter aus und trifft weniger emotionale Entscheidungen bei Kursschwankungen. Die Struktur überdauert Marktphasen — die konkrete Produktwahl darf sich anpassen.',
        ],
      },
    ],
  },
];

export function getFinancialArticle(slug) {
  return FINANCIAL_ARTICLES.find((a) => a.slug === slug) || null;
}

export function getRelatedFinancialArticles(slug, limit = 3) {
  const current = getFinancialArticle(slug);
  if (!current) return [];
  const sameCategory = FINANCIAL_ARTICLES.filter(
    (a) => a.slug !== slug && a.category === current.category,
  );
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
  const fillers = FINANCIAL_ARTICLES.filter(
    (a) => a.slug !== slug && a.category !== current.category,
  );
  return [...sameCategory, ...fillers].slice(0, limit);
}
