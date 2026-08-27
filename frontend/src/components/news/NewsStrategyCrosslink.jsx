import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { resolveStrategyLinks } from '@/lib/news/crosslinkResolver';
import { trackInvestmentEvent } from '@/lib/investmentAnalytics';

/**
 * Session 80.33 — News → Strategy Crosslink, topic-first.
 *
 * Priorität (via `resolveStrategyLinks`):
 *   1. valider `investment_topic_slug`
 *        → `TOPIC_REGISTRY[slug].strategyCategories`
 *   2. bei Artikeln OHNE Topic: kontrollierter Keyword-Fallback wie bisher
 *   3. sonst: kein Modul.
 *
 * Wenn ein gültiger Topic-Slug aber KEINE Strategy-Kategorie hat, wird
 * bewusst KEIN Regex-Fallback nachgeschoben — der strukturelle Non-Match
 * ist stärker als ein unsicherer Keyword-Match.
 */
const NewsStrategyCrosslink = ({ article }) => {
  const topics = useMemo(() => resolveStrategyLinks(article), [article]);

  if (!article || topics.length === 0) return null;

  const handleClick = (topic) => {
    trackInvestmentEvent('news_strategy_crosslink_clicked', {
      article_slug: article.slug,
      topic_slug: topic.slug,
      source: 'news_detail',
      resolver: article.investment_topic_slug ? 'topic-first' : 'keyword-fallback',
    });
  };

  return (
    <section
      className="mx-auto mt-12 max-w-3xl border-t border-bank-border/60 pt-10"
      data-testid="news-strategy-crosslink"
      aria-label="Passendes Hintergrundwissen"
    >
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-bank-primary" strokeWidth={1.8} aria-hidden />
        <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">Passendes Hintergrundwissen</p>
      </div>
      <p className="mt-2 text-[13.5px] leading-relaxed text-bank-text-muted">
        Grundlagen und Zusammenhänge zum Thema verständlich erklärt.
      </p>
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {topics.map((t) => {
          const shortIntro = (t.intro || '').split('.').slice(0, 1).join('.') + '.';
          return (
            <li key={t.slug}>
              <Link
                to={`/strategie/${t.categorySlug}/${t.slug}`}
                onClick={() => handleClick(t)}
                data-testid={`news-crosslink-${t.slug}`}
                className="group block rounded-xl border border-bank-border bg-white p-5 transition-colors hover:border-bank-primary/40"
              >
                <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-primary">{t.categoryTitle}</p>
                <p className="mt-1 font-serif text-[16px] leading-snug text-bank-text">{t.title}</p>
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-bank-text-muted">{shortIntro}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-bank-primary underline-offset-4 group-hover:underline">
                  Thema verstehen
                  <ArrowRight className="h-3 w-3" strokeWidth={1.8} aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default NewsStrategyCrosslink;
