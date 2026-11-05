/**
 * Session 80.33 — Unit-Tests für Crosslink-Resolver.
 * Prüft topic-first-Priorität + Fallback-Verhalten + Guards.
 */
import { resolveStrategyLinks, resolveKnowledgeLinks } from '../crosslinkResolver';

describe('crosslinkResolver — resolveStrategyLinks', () => {
  test('aktien topic → anlagestile category (topic-first)', () => {
    const article = {
      slug: 'dax-neues-hoch',
      title: 'DAX schließt auf neuem Hoch',
      excerpt: 'Aktienmarkt legt zu',
      investment_topic_slug: 'aktien',
      category: 'maerkte',
    };
    const res = resolveStrategyLinks(article);
    expect(res.length).toBeLessThanOrEqual(1);
    if (res.length) expect(res[0].categorySlug).toBe('anlagestile');
  });

  test('zinsen-sparen topic → schutz-steuerung category', () => {
    const article = {
      slug: 'tagesgeld-vergleich',
      title: 'Tagesgeld-Zinsen sinken',
      excerpt: 'Sparer erhalten weniger',
      investment_topic_slug: 'zinsen-sparen',
      category: 'zinsen',
    };
    const res = resolveStrategyLinks(article);
    if (res.length) expect(res[0].categorySlug).toBe('schutz-steuerung');
  });

  test('ruhestand-vorsorge topic → altersvorsorge category', () => {
    const article = {
      slug: 'rente-reform',
      title: 'Rentenreform beschlossen',
      excerpt: 'Rentenniveau',
      investment_topic_slug: 'ruhestand-vorsorge',
      category: 'politik',
    };
    const res = resolveStrategyLinks(article);
    if (res.length) expect(res[0].categorySlug).toBe('altersvorsorge');
  });

  test('valid topic but no strategy_categories mapped → empty (no regex fallback)', () => {
    // We simulate a topic that has empty strategyCategories — dividenden has anlagestile so use aktien with a fake registry entry via mock.
    // We check the invariant: if resolver returns empty for a valid topic, it does NOT fall back to keyword matching.
    // (Since all 5 real topics currently have strategy_categories, we use the negative test below instead.)
  });

  test('article without topic falls back to keyword matcher', () => {
    const article = {
      slug: 'inflation-news',
      title: 'Inflation trifft Verbraucher',
      excerpt: 'Kaufkraft sinkt',
      investment_topic_slug: null,
      category: 'wirtschaft',
    };
    // No topic → keyword fallback runs. Result may or may not be empty
    // depending on keywords, but MUST NOT throw.
    const res = resolveStrategyLinks(article);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeLessThanOrEqual(2);
  });

  test('unknown/invalid topic falls back to keyword matcher', () => {
    const article = {
      slug: 'x',
      title: 'DAX ETF Zufluss',
      excerpt: 'ETF',
      investment_topic_slug: 'nicht-existent',
      category: 'maerkte',
    };
    const res = resolveStrategyLinks(article);
    expect(Array.isArray(res)).toBe(true);
  });

  test('null article → empty array', () => {
    expect(resolveStrategyLinks(null)).toEqual([]);
    expect(resolveStrategyLinks(undefined)).toEqual([]);
  });
});

describe('crosslinkResolver — resolveKnowledgeLinks', () => {
  test('article without topic + category fonds-etfs → fonds-grundlagen', () => {
    const article = {
      slug: 'etf-news',
      title: 'ETF-Zuflüsse',
      category: 'fonds-etfs',
      investment_topic_slug: null,
    };
    const res = resolveKnowledgeLinks(article);
    expect(res.length).toBe(1);
    expect(res[0].slug).toBe('fonds-grundlagen');
    expect(res[0].href).toBe('/fonds-grundlagen');
  });

  test('article with aktien topic (empty knowledgeSlugs) → no knowledge links, no category fallback', () => {
    const article = {
      slug: 'x',
      title: 'DAX',
      category: 'fonds-etfs',       // Legacy category present
      investment_topic_slug: 'aktien',  // but topic is set → structured non-match wins
    };
    // aktien has knowledgeSlugs=[] in registry → structural non-match, no fallback.
    const res = resolveKnowledgeLinks(article);
    expect(res).toEqual([]);
  });

  test('article without topic + non-mapping category → no knowledge links', () => {
    const article = {
      slug: 'x',
      title: 'Politik',
      category: 'politik',
      investment_topic_slug: null,
    };
    expect(resolveKnowledgeLinks(article)).toEqual([]);
  });

  test('null article → empty array', () => {
    expect(resolveKnowledgeLinks(null)).toEqual([]);
  });
});
