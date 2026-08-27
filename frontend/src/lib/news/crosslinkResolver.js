/**
 * Session 80.33 — Zentraler Crosslink-Resolver.
 *
 * Ersetzt die verstreute „Regex-first"-Logik in NewsStrategyCrosslink und
 * dem KnowledgeCrossLinkBox-Aufruf durch eine einheitliche Hierarchie:
 *
 *   1. valider `investment_topic_slug`
 *        → Registry-Mapping (strategy_categories / knowledge_slugs)
 *   2. bestehende strukturierte News-Kategorie (nur fachlich eindeutige)
 *   3. kontrollierter Keyword-Fallback
 *        (nur bei Artikeln OHNE gültigen Topic-Slug)
 *   4. kein Crosslink
 *
 * WICHTIG:
 *   Wenn ein valider Topic-Slug vorhanden ist, aber dessen Registry KEINE
 *   Strategy-Kategorien definiert, wird KEIN Regex-Fallback nachgeschoben —
 *   der strukturierte Non-Match ist stärker als ein unsicherer Keyword-Match.
 */

import { getTopicMeta, VALID_TOPIC_SLUGS } from './topicRegistry';
import { listPremiumTopics, findRelatedStrategyTopicsForNews } from '@/data/strategyNewsMap';

const hasValidTopic = (article) =>
  !!article?.investment_topic_slug && VALID_TOPIC_SLUGS.has(article.investment_topic_slug);

/**
 * Ranking aller Premium-Strategy-Topics innerhalb der in `strategyCategories`
 * gelisteten Category-Slugs — sortiert nach vorhandener Keyword-Übereinstimmung
 * zum Artikel (nutzt bestehende Scoring-Funktion, aber gefiltert auf Registry).
 *
 * Wenn keine Kategorien konfiguriert sind → leeres Array (kein Fallback).
 */
const rankStrategyTopicsInCategories = (article, categorySlugs) => {
  if (!Array.isArray(categorySlugs) || categorySlugs.length === 0) return [];
  const inCats = listPremiumTopics().filter((t) => categorySlugs.includes(t.categorySlug));
  if (inCats.length === 0) return [];
  // Score jedes Topics innerhalb der Kategorie gegen den Artikel. Wir nutzen
  // dieselbe Scoring-Funktion wie der Regex-Fallback, aber innerhalb der
  // vorgegebenen Kategorien — so bleiben Topic-Grenzen respektiert.
  const scored = inCats.map((t) => {
    // reimplement local scoring identisch zu `scoreArticleForTopic` — jedoch
    // ohne Recency-Bonus, da wir topic-first bereits einen strukturellen
    // Match haben und nur noch DAS BESTE Premium-Topic in der Kategorie
    // auswählen.
    const kws = t.keywords || [];
    const title = (article.title || '').toLowerCase();
    const cat = (article.category || '').toLowerCase();
    const excerpt = (article.excerpt || '').toLowerCase();
    let s = 0;
    kws.forEach((k) => {
      const kl = k.toLowerCase();
      if (title.includes(kl)) s += 3;
      if (cat.includes(kl)) s += 2;
      if (excerpt.includes(kl)) s += 1;
    });
    // Basisbonus, weil dieses Topic in einer Registry-vorgesehenen Kategorie
    // liegt — damit „irgendein" passendes Premium-Topic auch dann kommt,
    // wenn keine Keywords matchen (der strukturelle Match ist bereits gegeben).
    s += 1;
    return { topic: t, score: s };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 1)             // Max. 1 Strategy pro Artikel — bewusst konservativ.
    .map((r) => r.topic);
};

/**
 * PUBLIC: Strategy-Crosslinks für einen News-Artikel.
 *
 * Rückgabe: Array von Topic-Objekten (max. 2). Kann leer sein.
 * Fallback nur, wenn KEIN gültiger Topic-Slug vorhanden ist.
 */
export const resolveStrategyLinks = (article) => {
  if (!article) return [];

  if (hasValidTopic(article)) {
    const meta = getTopicMeta(article.investment_topic_slug);
    const inCats = rankStrategyTopicsInCategories(article, meta.strategyCategories);
    // Topic ist definiert — wir vertrauen dem strukturellen Match.
    // Auch ein leeres Ergebnis bleibt leer; KEIN Regex-Fallback (per DoD).
    return inCats;
  }

  // Kein gültiger Topic-Slug → kontrollierter Keyword-Fallback wie bisher.
  // Threshold minScore=3 (unverändert), max. 2 Topics.
  return findRelatedStrategyTopicsForNews(article, { limit: 2, minScore: 3 });
};

// ---------------------------------------------------------------------------
// Knowledge-Crosslinks
// ---------------------------------------------------------------------------

/**
 * Katalog kanonischer Wissens-Ziele. Nur diese Slugs dürfen als
 * Knowledge-Crosslink erscheinen — verhindert erfundene Ziele.
 */
const KNOWLEDGE_CATALOG = {
  'fonds-grundlagen': {
    href: '/fonds-grundlagen',
    title: 'Fonds-Grundlagen verständlich erklärt',
    description: 'Wie funktionieren Fonds, welche Kosten können entstehen und worin unterscheiden sich Fonds, ETFs und Einzelanlagen?',
    cta: 'Fonds-Grundlagen ansehen',
  },
};

const KNOWLEDGE_LEGACY_CATEGORY_MAP = {
  // Legacy-Fallback nur für Artikel OHNE Topic — wird schrittweise durch
  // strukturierte Topics ersetzt.
  'fonds-etfs': 'fonds-grundlagen',
  fonds: 'fonds-grundlagen',
  etf: 'fonds-grundlagen',
};

/**
 * PUBLIC: Knowledge-Crosslinks für einen News-Artikel (max. 2).
 *
 * Priorität:
 *   1. Registry `knowledgeSlugs` bei gültigem Topic-Slug
 *   2. Legacy-Kategorie-Fallback (`fonds-etfs`) NUR wenn kein Topic vorhanden
 *   3. keine Links
 */
export const resolveKnowledgeLinks = (article) => {
  if (!article) return [];
  const out = [];

  if (hasValidTopic(article)) {
    const meta = getTopicMeta(article.investment_topic_slug);
    for (const slug of meta.knowledgeSlugs || []) {
      const entry = KNOWLEDGE_CATALOG[slug];
      if (entry) out.push({ slug, ...entry });
      if (out.length >= 2) break;
    }
    // Topic-first: kein Category-Fallback zusätzlich schieben.
    return out;
  }

  // Kein Topic → gestatteter Category-Fallback (max. 1).
  const cat = (article.category || '').toLowerCase();
  const legacy = KNOWLEDGE_LEGACY_CATEGORY_MAP[cat];
  if (legacy && KNOWLEDGE_CATALOG[legacy]) {
    out.push({ slug: legacy, ...KNOWLEDGE_CATALOG[legacy] });
  }
  return out;
};
