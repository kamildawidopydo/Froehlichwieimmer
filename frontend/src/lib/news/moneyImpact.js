/**
 * Session 80.30 — „Was bedeutet das für mein Geld?"-Mapping.
 *
 * Reine Client-Logik. Ein Artikel bekommt nur dann einen Money-Impact-Block,
 * wenn er eindeutig einem der geschützten Themen zugeordnet werden kann.
 * Ist die Zuordnung schwach oder ambivalent, wird nichts angezeigt (kein
 * generischer Standardtext).
 *
 * KEINE individuelle Anlageberatung. KEINE Kauf-/Verkaufsempfehlung. Nur
 * neutrale, verständliche Auswirkungen auf typische Privatanleger-Bereiche.
 */

const CTA_LABEL = {
  savings: 'Aktuelle Sparangebote vergleichen',
  retirement: 'Ruhestandsstrategie verstehen',
  wealth: 'Grundlagen zum Vermögensaufbau',
  purchasing_power: 'Mehr über Kaufkraft &amp; Vermögensaufbau',
};

// Themen-Profile — jede Zeile ist selbsttragend: mind. eine starke
// Keyword-Gruppe muss matchen, sonst kein Block.
const PROFILES = [
  {
    id: 'ezb-zinsen',
    label: 'Zinsen & Sparen',
    color: 'petrol',
    strong: [/\bezb\b/i, /leitzins/i, /zinsentscheid/i, /zinsschritt/i, /notenbank/i],
    supports: [/tagesgeld/i, /festgeld/i, /sparzins/i, /baufinanzier/i, /kredit/i],
    categories: ['zinsen', 'sparen'],
    topicSlugs: ['zinsen', 'geldanlage'],
    points: [
      'Tages- und Festgeldzinsen können sich in den kommenden Wochen verändern.',
      'Kredit- und Baufinanzierungskosten können auf die Entscheidung reagieren.',
      'Bestehende Sparangebote sollten Sie im aktuellen Zinsumfeld neu bewerten.',
    ],
    cta: { label: CTA_LABEL.savings, href: '/sparangebote' },
  },
  {
    id: 'inflation',
    label: 'Inflation & Kaufkraft',
    color: 'amber',
    strong: [/inflation/i, /teuerungsrate/i, /verbraucherpreis/i, /kaufkraft/i],
    supports: [/lebenshaltungskosten/i, /warenkorb/i],
    categories: ['wirtschaft'],
    topicSlugs: [],
    points: [
      'Die reale Kaufkraft Ihres Ersparten kann sich verändern.',
      'Sparzinsen müssen im Verhältnis zur Inflation betrachtet werden.',
    ],
    cta: { label: CTA_LABEL.purchasing_power, href: '/inflation-und-vermoegensaufbau' },
  },
  {
    id: 'markt-korrektur',
    label: 'Börsen & Märkte',
    color: 'coral',
    strong: [/crash\b/i, /kursrutsch/i, /kursverlust/i, /talfahrt/i, /allzeithoch/i, /rekordhoch/i, /korrektur/i, /b[oö]rsenbeben/i],
    supports: [/dax/i, /s&p/i, /nasdaq/i, /aktienmarkt/i, /leitindex/i],
    categories: ['maerkte', 'boerse'],
    topicSlugs: ['aktien-etfs', 'aktien'],
    points: [
      'Kurzfristige Schwankungen sollten nicht mit einer langfristigen Anlagestrategie verwechselt werden.',
      'Diversifikation über Regionen und Anlageklassen gewinnt in solchen Phasen an Bedeutung.',
    ],
    cta: { label: CTA_LABEL.wealth, href: '/strategie/aufbauen' },
  },
  {
    id: 'rente-vorsorge',
    label: 'Altersvorsorge & Rente',
    color: 'amber',
    strong: [/rente\b/i, /altersvorsorge/i, /vorsorge/i, /pension/i, /rentenpaket/i, /rentenreform/i],
    supports: [/riester/i, /rürup/i, /betriebsrente/i, /basisrente/i, /rentenniveau/i],
    categories: ['vorsorge', 'altersvorsorge', 'rente'],
    topicSlugs: ['ruhestand', 'altersvorsorge'],
    points: [
      'Die Auswirkungen auf die gesetzliche und private Rente sollten Sie langfristig prüfen.',
      'Eine breit aufgestellte Altersvorsorge federt politische Reformen typischerweise besser ab.',
    ],
    cta: { label: CTA_LABEL.retirement, href: '/strategie/ruhestand' },
  },
];

const inArray = (arr, val) => Array.isArray(arr) && val && arr.includes(String(val).toLowerCase());

const matchesProfile = (article, profile) => {
  const text = `${article.title || ''} ${article.excerpt || article.summary || ''}`;
  const cat = (article.category || '').toLowerCase();
  const topic = (article.investment_topic_slug || '').toLowerCase();

  // Ein Profil qualifiziert sich, wenn:
  //   (a) mind. ein STRONG-Keyword matcht → sofort ausreichend
  //   (b) Kategorie ODER Topic-Slug direkt zum Profil gehört UND mind. ein
  //       SUPPORT-Keyword matcht → auch ausreichend, aber strenger.
  const hasStrong = profile.strong.some((rx) => rx.test(text));
  if (hasStrong) return true;

  const catMatch = inArray(profile.categories, cat);
  const topicMatch = inArray(profile.topicSlugs, topic);
  if ((catMatch || topicMatch) && profile.supports.some((rx) => rx.test(text))) return true;

  return false;
};

/**
 * Ermittelt den passenden Money-Impact-Block für einen Artikel.
 * Rückgabe: `{ label, color, points[], cta }` oder `null`.
 * Nie mehrere Profile mischen — nur das erste (spezifischste) Match zählt.
 */
export const getMoneyImpact = (article) => {
  if (!article) return null;
  for (const profile of PROFILES) {
    if (matchesProfile(article, profile)) {
      // Max. 3 Punkte, aber wir kürzen konservativ auf 2, wenn das Profil
      // im Artikel nur sehr schwach unterstützt wird.
      const text = `${article.title || ''} ${article.excerpt || article.summary || ''}`;
      const supportHits = profile.supports.filter((rx) => rx.test(text)).length;
      const points = supportHits >= 2 ? profile.points.slice(0, 3) : profile.points.slice(0, 2);
      return {
        id: profile.id,
        label: profile.label,
        color: profile.color,
        points,
        cta: profile.cta,
      };
    }
  }
  return null;
};
