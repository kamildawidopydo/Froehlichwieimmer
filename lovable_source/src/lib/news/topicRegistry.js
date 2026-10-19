/**
 * Session 80.33 — Frontend-Mirror der Backend-`TOPIC_REGISTRY`.
 *
 * WICHTIG:
 *   Backend bleibt Single Source of Truth (`/app/backend/topic_mapper.py`).
 *   Diese Datei ist ausschließlich der Frontend-Zugriff auf die
 *   strukturierten Cross-Mapping-Daten der 5 kanonischen Topic-Slugs.
 *   Bei Änderungen an den Slugs MÜSSEN beide Dateien konsistent bleiben.
 *
 * Keine parallele Klassifikationslogik hier — nur Metadaten.
 */

export const VALID_TOPIC_SLUGS = new Set([
  'aktien',
  'anleihen',
  'dividenden',
  'zinsen-sparen',
  'ruhestand-vorsorge',
]);

/**
 * @typedef {Object} TopicMeta
 * @property {string} label
 * @property {string} accent
 * @property {string[]} knowledgeSlugs        — feste Wissensziele (max. 2)
 * @property {string[]} strategyCategories    — Strategy-Category-Slugs, unter denen passende Premium-Topics gesucht werden
 * @property {boolean}  sparangebote          — ist `/sparangebote`-CTA erlaubt?
 * @property {string[]} einordnungCategories  — für Einordnungs-Fallback-Zuordnung
 */

/** @type {Record<string, TopicMeta>} */
export const TOPIC_REGISTRY = {
  aktien: {
    label: 'Aktien & Kapitalmärkte',
    accent: 'primary',
    knowledgeSlugs: [],
    strategyCategories: ['anlagestile'],
    sparangebote: false,
    einordnungCategories: ['aktienmaerkte', 'maerkte'],
  },
  anleihen: {
    label: 'Anleihen & Zinsen',
    accent: 'petrol',
    knowledgeSlugs: [],
    strategyCategories: ['schutz-steuerung'],
    sparangebote: false,
    einordnungCategories: ['zinsen'],
  },
  dividenden: {
    label: 'Dividenden & Ausschüttungen',
    accent: 'amber',
    knowledgeSlugs: [],
    strategyCategories: ['anlagestile'],
    sparangebote: false,
    einordnungCategories: [],
  },
  'zinsen-sparen': {
    label: 'Zinsen & Sparen',
    accent: 'petrol',
    knowledgeSlugs: [],
    strategyCategories: ['schutz-steuerung'],
    sparangebote: true,
    einordnungCategories: ['zinsen'],
  },
  'ruhestand-vorsorge': {
    label: 'Ruhestand & Vorsorge',
    accent: 'amber',
    knowledgeSlugs: [],
    strategyCategories: ['altersvorsorge'],
    sparangebote: false,
    einordnungCategories: [],
  },
};

/** Gibt Registry-Metadaten für einen Slug zurück — oder `null`, wenn ungültig. */
export const getTopicMeta = (slug) => {
  if (!slug || !VALID_TOPIC_SLUGS.has(slug)) return null;
  return TOPIC_REGISTRY[slug];
};
