/**
 * Session 80.20 — Goal-based Strategy Center
 * Mapping: Ziel → bestehende Themen (keine neuen Detailseiten).
 */

export const goals = [
  {
    slug: 'vermoegen-aufbauen',
    icon: 'sprout',
    title: 'Vermögen aufbauen',
    lede: 'Kontinuierlich Kapital bilden — mit einem strukturierten Plan und langem Atem.',
    topics: [
      { category: 'schutz-steuerung', topic: 'vermoegensaufbau' },
      { category: 'anlagestile', topic: 'value-investing' },
      { category: 'anlagestile', topic: 'dividendenstrategien' },
    ],
    focusOptions: [
      { key: 'langfristig', label: 'Langfristige Orientierung', prioritize: ['vermoegensaufbau', 'value-investing'] },
      { key: 'ertraege', label: 'Regelmäßige Erträge verstehen', prioritize: ['dividendenstrategien'] },
      { key: 'risiken', label: 'Risiken besser einordnen', prioritize: ['value-investing', 'vermoegensaufbau'] },
    ],
  },
  {
    slug: 'vermoegen-schuetzen',
    icon: 'shield-check',
    title: 'Vermögen schützen',
    lede: 'Erreichtes bewahren, Kaufkraft erhalten und Portfolios krisenfest strukturieren.',
    topics: [
      { category: 'schutz-steuerung', topic: 'vermoegensschutz' },
      { category: 'schutz-steuerung', topic: 'inflationsschutz' },
    ],
    focusOptions: [
      { key: 'kaufkraft', label: 'Kaufkraft erhalten', prioritize: ['inflationsschutz'] },
      { key: 'stabilitaet', label: 'Stabilität stärker gewichten', prioritize: ['vermoegensschutz'] },
      { key: 'krisen', label: 'Krisenfeste Struktur', prioritize: ['vermoegensschutz', 'inflationsschutz'] },
    ],
  },
  {
    slug: 'ruhestand',
    icon: 'clock',
    title: 'Für den Ruhestand vorsorgen',
    lede: 'Die spätere Einkommenslücke rechtzeitig strukturieren — gesetzlich, privat, betrieblich.',
    topics: [
      { category: 'altersvorsorge', topic: 'altersvorsorge' },
      { category: 'altersvorsorge', topic: 'private-rentenvorsorge' },
      { category: 'altersvorsorge', topic: 'betriebliche-altersvorsorge' },
    ],
    focusOptions: [
      { key: 'ueberblick', label: 'Gesamtüberblick der drei Säulen', prioritize: ['altersvorsorge'] },
      { key: 'privat', label: 'Privat ergänzen', prioritize: ['private-rentenvorsorge'] },
      { key: 'arbeitgeber', label: 'Betriebliche Möglichkeiten', prioritize: ['betriebliche-altersvorsorge'] },
    ],
  },
  {
    slug: 'kinder-familie',
    icon: 'users',
    title: 'Für Kinder & Familie planen',
    lede: 'Vermögen über Generationen denken — aufbauen und geordnet übertragen.',
    topics: [
      { category: 'generationen', topic: 'vermoegensaufbau-fuer-kinder' },
      { category: 'generationen', topic: 'vermoegensuebertragung' },
    ],
    focusOptions: [
      { key: 'aufbau', label: 'Früh für Kinder aufbauen', prioritize: ['vermoegensaufbau-fuer-kinder'] },
      { key: 'uebertragen', label: 'Vermögen später übertragen', prioritize: ['vermoegensuebertragung'] },
      { key: 'generationen', label: 'Generationen berücksichtigen', prioritize: ['vermoegensuebertragung', 'vermoegensaufbau-fuer-kinder'] },
    ],
  },
  {
    slug: 'nachhaltig',
    icon: 'leaf',
    title: 'Nachhaltiger investieren',
    lede: 'Finanzielle Ziele mit einem klaren Wertekompass verbinden.',
    topics: [
      { category: 'nachhaltigkeit', topic: 'nachhaltige-investments-esg' },
      { category: 'nachhaltigkeit', topic: 'impact-investing' },
    ],
    focusOptions: [
      { key: 'esg', label: 'ESG-Kriterien berücksichtigen', prioritize: ['nachhaltige-investments-esg'] },
      { key: 'wirkung', label: 'Konkrete Wirkung erzielen', prioritize: ['impact-investing'] },
      { key: 'flexibel', label: 'Flexibel bleiben', prioritize: ['nachhaltige-investments-esg'] },
    ],
  },
  {
    slug: 'anlagestrategien-verstehen',
    icon: 'trending-up',
    title: 'Anlagestrategien verstehen',
    lede: 'Sich mit Anlagestilen und Wirkungsprinzipien vertraut machen.',
    topics: [
      { category: 'anlagestile', topic: 'value-investing' },
      { category: 'anlagestile', topic: 'dividendenstrategien' },
      { category: 'nachhaltigkeit', topic: 'nachhaltige-investments-esg' },
    ],
    focusOptions: [
      { key: 'value', label: 'Bewertungsorientiert denken', prioritize: ['value-investing'] },
      { key: 'ausschuettung', label: 'Ausschüttungen verstehen', prioritize: ['dividendenstrategien'] },
      { key: 'werte', label: 'Werte-orientiert investieren', prioritize: ['nachhaltige-investments-esg'] },
    ],
  },
];

export const findGoal = (slug) => goals.find((g) => g.slug === slug) || null;

/** Ergebnis-Sortierung: erst priorisierte, dann restliche Themen. */
export const resolveFinderResults = (goalSlug, focusKey) => {
  const g = findGoal(goalSlug);
  if (!g) return [];
  const focus = g.focusOptions.find((f) => f.key === focusKey);
  const priority = new Set(focus ? focus.prioritize : []);
  const withRank = g.topics.map((t) => ({
    ...t,
    rank: priority.has(t.topic) ? 0 : 1,
  }));
  return withRank.sort((a, b) => a.rank - b.rank).slice(0, 4);
};
