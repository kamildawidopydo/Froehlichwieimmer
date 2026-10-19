/**
 * Session 80.22b — Zentrales Topic ↔ Content-Mapping.
 *
 * DRY-Quelle für beide Richtungen:
 *   Strategy → News   (via keywords)
 *   News → Strategy   (Reverse-Lookup über dieselben keywords)
 *
 * Basiert auf `premiumMeta[slug].newsKeywords` — keine parallele Mapping-Tabelle.
 */

import { strategieCategories } from './strategieContent';
import { premiumMeta } from './strategiePremiumMeta';

/** Aufgebauter Topic-Index: slug → { title, categorySlug, categoryTitle, keywords, intro }. */
const topicIndex = (() => {
  const idx = {};
  strategieCategories.forEach((cat) => {
    cat.topics.forEach((t) => {
      const meta = premiumMeta[t.slug];
      if (!meta) return; // Nur premium-fähige Topics.
      idx[t.slug] = {
        slug: t.slug,
        title: t.title,
        categorySlug: cat.slug,
        categoryTitle: cat.title,
        intro: t.intro,
        keywords: meta.newsKeywords || [],
      };
    });
  });
  return idx;
})();

export const listPremiumTopics = () => Object.values(topicIndex);

export const getTopicIndex = (slug) => topicIndex[slug] || null;

/**
 * Scoring: matched articles gegen topic-keywords.
 * Title-Match: 3, Category-Match: 2, Excerpt-Match: 1.
 * Zusatz: Recency-Bonus (0.5) für Artikel < 30 Tage.
 */
export const scoreArticleForTopic = (article, keywords) => {
  if (!keywords || !keywords.length) return 0;
  const title = (article.title || '').toLowerCase();
  const category = (article.category || '').toLowerCase();
  const excerpt = (article.excerpt || '').toLowerCase();
  const slug = (article.slug || '').toLowerCase();
  let score = 0;
  keywords.forEach((k) => {
    const kl = k.toLowerCase();
    if (title.includes(kl)) score += 3;
    if (category.includes(kl) || slug.includes(kl)) score += 2;
    if (excerpt.includes(kl)) score += 1;
  });
  // Recency bonus
  if (article.published_at) {
    const days = (Date.now() - new Date(article.published_at).getTime()) / 86400000;
    if (Number.isFinite(days) && days < 30) score += 0.5;
  }
  return score;
};

/**
 * Reverse-Lookup: Findet die 1–2 passendsten Strategy-Topics für einen News-Artikel.
 * Nur echte Treffer (min. Score 3, d.h. mind. ein Titel- oder starker Category-Match).
 */
export const findRelatedStrategyTopicsForNews = (article, { limit = 2, minScore = 3 } = {}) => {
  const results = Object.values(topicIndex)
    .map((t) => ({ topic: t, score: scoreArticleForTopic(article, t.keywords) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.topic);
  return results;
};

/**
 * Rangliste passender News für ein Strategy-Topic.
 */
export const rankNewsForTopic = (articles, keywords, { limit = 3, minScore = 3 } = {}) => {
  if (!Array.isArray(articles)) return [];
  return articles
    .map((a) => ({ article: a, score: scoreArticleForTopic(a, keywords) }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.article);
};
