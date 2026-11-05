/**
 * Evergreen-Ratgeberartikel für /wissen — eigenständig geschrieben, keine Fremdinhalte.
 * Format: reines Content-Objekt; UI-Rendering übernehmen /wissen und /wissen/:slug.
 */

export const WISSEN_CATEGORIES = {
  sparen: { label: 'Sparen & Liquidität', color: 'bank-primary' },
  aktien: { label: 'Aktien', color: 'bank-primary' },
  anleihen: { label: 'Anleihen', color: 'bank-primary' },
  planung: { label: 'Vermögensplanung', color: 'bank-primary' },
};

export const WISSEN_ARTICLES = [
  {
    slug: 'tagesgeld-vs-festgeld',
    category: 'sparen',
    title: 'Tagesgeld oder Festgeld — wo liegt der Unterschied?',
    lede: 'Beide Kontoformen dienen dem Sparen, unterscheiden sich aber in Verfügbarkeit, Zinsstruktur und Rolle innerhalb einer Vermögensplanung.',
    readingTime: '5 Min. Lesezeit',
    sections: [
      {
        heading: 'Kurz erklärt',
        paragraphs: [
          'Tagesgeld ist eine flexible Sparform mit variablem Zinssatz und täglicher Verfügbarkeit. Der Zins kann sich jederzeit ändern — nach oben wie nach unten.',
          'Festgeld hat eine fest vereinbarte Laufzeit und einen für diese Laufzeit garantierten Zinssatz. Das Guthaben ist während der Laufzeit in der Regel nicht verfügbar.',
        ],
      },
      {
        heading: 'Zentrale Unterschiede',
        rows: [
          ['Verfügbarkeit', 'täglich', 'nach Laufzeit'],
          ['Zinssatz', 'variabel', 'für die Laufzeit fix'],
          ['Planbarkeit', 'gering (Zinsanpassung möglich)', 'hoch (Zinssatz garantiert)'],
          ['Typische Rolle', 'kurzfristige Liquidität', 'mittel- bis langfristige Planbarkeit'],
        ],
        rowHeaders: ['Merkmal', 'Tagesgeld', 'Festgeld'],
      },
      {
        heading: 'Welche Form für welchen Zweck?',
        paragraphs: [
          'Tagesgeld kann sinnvoll sein, wenn Mittel kurzfristig verfügbar bleiben sollen — etwa als Reserve für ungeplante Ausgaben oder für Ausgaben, deren Zeitpunkt noch unklar ist.',
          'Festgeld eignet sich eher für Beträge, die für einen definierten Zeitraum nicht benötigt werden. Der Vorteil: Der Zinssatz steht bereits bei Vertragsabschluss fest.',
          'Innerhalb einer strukturierten Vermögensplanung ergänzen sich beide Formen häufig — nicht als „entweder / oder", sondern als aufeinander abgestimmte Bausteine.',
        ],
      },
      {
        heading: 'Was Sie beachten sollten',
        list: [
          'Die gesetzliche Einlagensicherung im EU-Wirtschaftsraum schützt Einlagen bis 100.000 € pro Kunde und Bank.',
          'Zinssätze sind nicht garantiert dauerhaft, sondern spiegeln immer das aktuelle Marktumfeld wider.',
          'Auch verzinste Sparformen können — abhängig von der Inflation — an Kaufkraft verlieren.',
        ],
      },
    ],
    related: ['diversifikation', 'anlagehorizont'],
  },
  {
    slug: 'diversifikation',
    category: 'planung',
    title: 'Was bedeutet Diversifikation?',
    lede: 'Diversifikation bedeutet, das Vermögen bewusst auf unterschiedliche Anlageklassen, Regionen oder Branchen zu verteilen — statt es von einer einzelnen Anlage abhängig zu machen.',
    readingTime: '4 Min. Lesezeit',
    sections: [
      {
        heading: 'Die Grundidee',
        paragraphs: [
          'Unterschiedliche Anlageklassen reagieren nicht identisch auf wirtschaftliche Entwicklungen. Wenn ein Bereich unter Druck steht, verhalten sich andere Bereiche oft anders.',
          'Eine diversifizierte Struktur kann deshalb dazu beitragen, dass einzelne Ereignisse nicht das gesamte Vermögen überproportional beeinflussen.',
        ],
      },
      {
        heading: 'Ebenen der Diversifikation',
        list: [
          'Anlageklassen — Liquidität, Sparkonten, Anleihen, Aktien und weitere geeignete Bausteine',
          'Regionen — nicht nur ein einzelner Wirtschaftsraum',
          'Branchen — nicht nur eine einzelne Industrie',
          'Zeitpunkte — Beiträge über mehrere Zeitpunkte verteilen, statt alles zu einem Termin',
        ],
      },
      {
        heading: 'Was Diversifikation nicht ist',
        paragraphs: [
          'Diversifikation ist keine Garantie gegen Verluste. Sie bedeutet nicht, dass Wertschwankungen ausgeschlossen sind — Kapitalmärkte bleiben Kapitalmärkte.',
          'Diversifikation ist auch keine Musterlösung. Die konkrete Zusammensetzung hängt immer von den individuellen Zielen, der Risikobereitschaft, dem Anlagehorizont und dem Liquiditätsbedarf ab.',
        ],
      },
      {
        heading: 'In der Praxis',
        paragraphs: [
          'Ob und in welcher Form Diversifikation sinnvoll ist, klärt sich im persönlichen Gespräch. Ein 25-jähriger Sparer mit langem Horizont hat andere Ausgangsbedingungen als jemand, der demnächst in den Ruhestand eintritt.',
        ],
      },
    ],
    related: ['anleihe-erklaert', 'anlagehorizont'],
  },
  {
    slug: 'anleihe-erklaert',
    category: 'anleihen',
    title: 'Was ist eine Anleihe?',
    lede: 'Eine Anleihe ist ein festverzinsliches Wertpapier. Der Käufer leiht einem Emittenten Geld und erhält dafür Zinsen sowie am Ende der Laufzeit die Rückzahlung.',
    readingTime: '5 Min. Lesezeit',
    sections: [
      {
        heading: 'Grundprinzip',
        paragraphs: [
          'Wer eine Anleihe kauft, wird nicht Miteigentümer wie bei einer Aktie, sondern Gläubiger. Der Emittent — beispielsweise ein Unternehmen oder ein Staat — verpflichtet sich, zu festgelegten Terminen Zinsen zu zahlen und den Nennbetrag am Ende der Laufzeit zurückzuzahlen.',
        ],
      },
      {
        heading: 'Zentrale Merkmale',
        rows: [
          ['Emittent', 'Unternehmen, Staaten, Institutionen'],
          ['Laufzeit', 'wenige Monate bis mehrere Jahrzehnte'],
          ['Zins (Kupon)', 'meist fest, gelegentlich variabel'],
          ['Bonität', 'Einschätzung der Rückzahlungsfähigkeit'],
          ['Handelbarkeit', 'an geeigneten Börsen möglich'],
        ],
        rowHeaders: ['Merkmal', 'Ausprägung'],
      },
      {
        heading: 'Chancen und Risiken',
        paragraphs: [
          'Anleihen können planbare Zinserträge bieten und werden — abhängig von Emittent und Laufzeit — häufig als vergleichsweise ruhigerer Baustein einer diversifizierten Struktur betrachtet.',
        ],
        list: [
          'Zinsänderungsrisiko — steigen die Marktzinsen, können sich Anleihekurse verändern.',
          'Bonitätsrisiko — die Rückzahlung hängt von der Zahlungsfähigkeit des Emittenten ab.',
          'Kursrisiko — vor Fälligkeit kann der Verkauf zu Kursen unter dem Nennwert erfolgen.',
          'Bei bestimmten Emittenten sind Zahlungsausfälle bis hin zum Totalverlust möglich.',
        ],
      },
      {
        heading: 'Wo Anleihen ihre Funktion entfalten',
        paragraphs: [
          'In einer strukturierten Vermögensplanung können Anleihen — je nach Bonität, Laufzeit und Zielsetzung — planbare Cashflows liefern oder als Gegengewicht zu volatileren Bausteinen wirken. Ob und in welcher Form das für Ihre Situation passt, gehört in ein persönliches Beratungsgespräch.',
        ],
      },
    ],
    related: ['diversifikation', 'anlagehorizont'],
  },
  {
    slug: 'anlagehorizont',
    category: 'planung',
    title: 'Warum ist der Anlagehorizont wichtig?',
    lede: 'Der Anlagehorizont — also der Zeitraum, in dem ein Vermögen nicht benötigt wird — ist einer der wichtigsten Ausgangspunkte für jede finanzielle Entscheidung.',
    readingTime: '4 Min. Lesezeit',
    sections: [
      {
        heading: 'Warum der Zeitraum den Unterschied macht',
        paragraphs: [
          'Kurzfristig verfügbare Mittel müssen anders gedacht werden als Kapital, das erst in vielen Jahren benötigt wird. Kurzfristige Bausteine sollten möglichst wenig Schwankungen aufweisen. Langfristige Bausteine können in aller Regel mehr Schwankungen tragen — weil Zeit dazu beitragen kann, kurzfristige Bewegungen auszugleichen.',
        ],
      },
      {
        heading: 'Drei typische Zeitfenster',
        rows: [
          ['Kurzfristig', 'bis ca. 2 Jahre', 'Reserve, geplante Ausgaben, Liquidität'],
          ['Mittelfristig', 'ca. 2 – 7 Jahre', 'planbare Ziele, konservative Bausteine'],
          ['Langfristig', 'über 7 Jahre', 'Vermögensaufbau, weiter gefasste Anlageklassen möglich'],
        ],
        rowHeaders: ['Horizont', 'Zeitraum', 'Mögliche Rolle'],
      },
      {
        heading: 'Was der Horizont beeinflusst',
        list: [
          'die Auswahl möglicher Anlageklassen',
          'die Verteilung zwischen liquiden und weniger liquiden Bausteinen',
          'die Betrachtung von Kursschwankungen',
          'die Häufigkeit, mit der eine Struktur überprüft werden sollte',
        ],
      },
      {
        heading: 'Ein wichtiger Zusatz',
        paragraphs: [
          'Der Anlagehorizont ist kein starrer Wert. Er kann sich verändern — durch Lebenssituation, familiäre Verantwortung oder unternehmerische Entwicklungen. Deshalb gehört eine regelmäßige Überprüfung der eigenen Struktur zu einer langfristig ausgerichteten Vermögensplanung.',
        ],
      },
    ],
    related: ['tagesgeld-vs-festgeld', 'diversifikation'],
  },
];

export function getArticle(slug) {
  return WISSEN_ARTICLES.find((a) => a.slug === slug);
}
