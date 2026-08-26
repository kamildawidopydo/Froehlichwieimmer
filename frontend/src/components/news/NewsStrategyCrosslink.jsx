import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { findRelatedStrategyTopicsForNews } from '@/data/strategyNewsMap';
import { trackInvestmentEvent } from '@/lib/investmentAnalytics';

/**
 * Session 80.22b — News → Strategy Crosslink.
 * Zeigt max. 2 passende Strategie-Themen unter einem News-Artikel.
 * DRY-Mapping: nutzt `findRelatedStrategyTopicsForNews` (dieselbe Quelle wie
 * Strategy → News).
 * Kein Modul bei unsicheren Matches.
 */
const NewsStrategyCrosslink = ({ article }) => {
  const topics = useMemo(
    () => (article ? findRelatedStrategyTopicsForNews(article, { limit: 2, minScore: 3 }) : []),
    [article],
  );

  if (!article || topics.length === 0) return null;

  const handleClick = (topic) => {
    trackInvestmentEvent('news_strategy_crosslink_clicked', {
      article_slug: article.slug,
      topic_slug: topic.slug,
      source: 'news_detail',
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
