import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Clock } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';
import {
  FINANCIAL_ARTICLES,
  FINANCIAL_CATEGORIES,
  FINANCIAL_CATEGORY_LABEL,
} from '@/data/financialArticles';

const EASE = [0.22, 1, 0.36, 1];

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const ArticleCard = ({ article, testId }) => (
  <Link
    to={`/finanzwissen/${article.slug}`}
    data-testid={testId}
    className="group flex h-full flex-col border-b border-l-0 border-r-0 border-t-0 border-bank-border bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30"
  >
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-bank-cream/40">
      <img
        src={article.image}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(e) => {
          const t = e.currentTarget;
          if (!t.dataset.fb) {
            t.dataset.fb = '1';
            // Local SVG fallback — deterministic Fröhlich-branded placeholder.
            const label = encodeURIComponent('Fröhlich Vermögensberatung');
            t.src = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450' preserveAspectRatio='xMidYMid slice'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%230f1d34'/%3E%3Cstop offset='1' stop-color='%231a2c4d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='450' fill='url(%23g)'/%3E%3Cline x1='60' y1='360' x2='740' y2='360' stroke='%23c9a961' stroke-opacity='0.35' stroke-width='1'/%3E%3Ctext x='60' y='345' fill='%23c9a961' font-family='Courier New, monospace' font-size='16' letter-spacing='4'%3EEDITORIAL%3C/text%3E%3Ctext x='60' y='410' fill='%23f4efe3' font-family='Georgia, serif' font-size='26' font-style='italic'%3E${label}%3C/text%3E%3C/svg%3E`;
            return;
          }
          t.style.display = 'none';
        }}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />
    </div>
    <div className="flex flex-1 flex-col gap-3 pb-6 pt-5">
      <p
        className="font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-bank-primary/80"
        data-testid="financial-article-card-category"
      >
        {FINANCIAL_CATEGORY_LABEL[article.category] || article.category}
      </p>
      <h3 className="font-display text-[1.15rem] font-light leading-snug tracking-tight text-bank-ink transition-colors group-hover:text-bank-primary sm:text-[1.2rem]">
        {article.title}
      </h3>
      <p className="line-clamp-3 text-[14px] leading-relaxed text-bank-text-muted">
        {article.excerpt}
      </p>
      <div className="mt-auto flex items-center justify-between pt-3 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={11} strokeWidth={LUCIDE_STROKE} aria-hidden />
          {article.readingTime} Min.
        </span>
        <span>{formatDate(article.publishedAt)}</span>
      </div>
    </div>
  </Link>
);

const FeaturedCard = ({ article }) => (
  <Link
    to={`/finanzwissen/${article.slug}`}
    data-testid="home-financial-articles-featured"
    className="group flex h-full flex-col border border-bank-border bg-white shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_36px_100px_-56px_rgb(9_33_66/0.16)] transition-shadow hover:shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_44px_120px_-56px_rgb(9_33_66/0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30"
  >
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-bank-cream/40 lg:aspect-[4/3]">
      <img
        src={article.image}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bank-ink/25 via-transparent to-transparent"
      />
      <div className="absolute left-5 top-5 inline-flex items-center gap-2 bg-white/95 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-bank-primary shadow-sm">
        Featured · {FINANCIAL_CATEGORY_LABEL[article.category] || article.category}
      </div>
    </div>
    <div className="flex flex-1 flex-col gap-4 p-6 sm:p-8 lg:p-9">
      <h3 className="font-display text-[1.65rem] font-light leading-[1.2] tracking-tight text-bank-ink sm:text-[1.9rem] lg:text-[2.1rem]">
        {article.title}
      </h3>
      <p className="text-[15px] leading-relaxed text-bank-text-muted sm:text-[15.5px]">
        {article.excerpt}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-bank-border pt-5 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
        <span className="inline-flex items-center gap-2">
          <Clock size={12} strokeWidth={LUCIDE_STROKE} aria-hidden />
          {article.readingTime} Min. Lesezeit
        </span>
        <span>{formatDate(article.publishedAt)}</span>
      </div>
      <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-bank-primary transition-colors group-hover:text-bank-primary/80">
        Artikel lesen
        <ArrowUpRight size={14} strokeWidth={LUCIDE_STROKE} aria-hidden />
      </span>
    </div>
  </Link>
);

const HomeFinancialArticles = () => {
  const prefersReduced = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState('all');

  const featured = useMemo(
    () => FINANCIAL_ARTICLES.find((a) => a.featured) || FINANCIAL_ARTICLES[0],
    [],
  );

  const rest = useMemo(() => FINANCIAL_ARTICLES.filter((a) => a.slug !== featured.slug), [featured]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return rest;
    // Für spezifische Filter: featured explizit mit einschließen, damit z. B.
    // die ETFs-&-Fonds-Kategorie nicht leer wirkt, obwohl ein passender Artikel
    // im Featured-Slot sichtbar ist.
    return FINANCIAL_ARTICLES.filter((a) => a.category === activeCategory);
  }, [rest, activeCategory]);

  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-72px' },
    transition: { duration: prefersReduced ? 0 : 0.6, ease: EASE, delay: prefersReduced ? 0 : 0.03 * i },
  });

  return (
    <section
      id="home-financial-articles"
      className="relative border-t border-bank-border bg-[linear-gradient(180deg,#ffffff_0%,#fafaf7_60%,#f4f4f0_100%)] py-16 sm:py-20 lg:py-28"
      data-testid="home-financial-articles"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          {...reveal(0)}
          className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end"
        >
          <div>
            <Eyebrow>Aktuelles &amp; Finanzwissen</Eyebrow>
            <h2 className="mt-4 font-display text-[2rem] font-light leading-[1.05] tracking-tight text-bank-ink sm:text-[2.6rem] lg:text-[3rem]">
              Wichtige Themen.
              <br />
              Klar eingeordnet.
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-bank-text-muted sm:text-[15.5px]">
            Aktuelle Entwicklungen, Hintergründe und Wissen rund um Geldanlage, Märkte und
            Vermögensaufbau — redaktionell aufbereitet, produkt-neutral und ohne Renditeversprechen.
          </p>
        </motion.div>

        {/* Featured layout */}
        <motion.div
          {...reveal(1)}
          className="mt-12 grid grid-cols-1 gap-8 lg:mt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
        >
          <FeaturedCard article={featured} />

          {/* Preview stack: first 3 non-featured articles as prominent secondary teasers */}
          <div className="flex flex-col divide-y divide-bank-border">
            {rest.slice(0, 3).map((article, idx) => (
              <Link
                key={article.slug}
                to={`/finanzwissen/${article.slug}`}
                data-testid={`home-financial-articles-secondary-${idx}`}
                className="group flex gap-4 py-6 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30 sm:gap-5"
              >
                <div className="relative h-24 w-32 shrink-0 overflow-hidden bg-bank-cream/40 sm:h-28 sm:w-40">
                  <img
                    src={article.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                  <div>
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-primary/80">
                      {FINANCIAL_CATEGORY_LABEL[article.category] || article.category}
                    </p>
                    <h3 className="mt-1.5 font-display text-[1.05rem] font-light leading-snug tracking-tight text-bank-ink transition-colors group-hover:text-bank-primary sm:text-[1.1rem]">
                      {article.title}
                    </h3>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                    {article.readingTime} Min. · {formatDate(article.publishedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Filter chips */}
        <div
          className="mt-16 flex flex-wrap items-center gap-2 border-b border-bank-border pb-5 sm:mt-20 sm:gap-2.5"
          data-testid="home-financial-articles-filters"
        >
          <p className="mr-3 hidden font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted sm:inline-flex">
            Filter
          </p>
          {FINANCIAL_CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                data-testid={`home-financial-articles-filter-${cat.key}`}
                data-active={active ? 'true' : 'false'}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'rounded-full border px-4 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] transition-all duration-200',
                  active
                    ? 'border-bank-ink bg-bank-ink text-white shadow-sm'
                    : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40 hover:text-bank-ink',
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div
          className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-14"
          data-testid="home-financial-articles-grid"
        >
          {filtered.length === 0 ? (
            <p
              className="col-span-full py-10 text-center text-[14px] italic text-bank-text-muted"
              data-testid="home-financial-articles-empty"
            >
              Für diesen Filter sind aktuell keine Beiträge vorhanden.
            </p>
          ) : (
            filtered.map((article, i) => (
              <motion.div key={article.slug} {...reveal(i + 2)}>
                <ArticleCard article={article} testId={`home-financial-article-${article.slug}`} />
              </motion.div>
            ))
          )}
        </div>

        {/* Bottom CTA */}
        <motion.div
          {...reveal(2)}
          className="mt-16 flex flex-col items-start gap-6 border-t border-bank-border pt-10 sm:mt-20 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-xl">
            <h3 className="font-display text-[1.4rem] font-light leading-tight tracking-tight text-bank-ink sm:text-[1.65rem]">
              Mehr Finanzwissen entdecken
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">
              Vertiefen Sie einzelne Themen im Wissensbereich — mit Beiträgen zu Aktien, Anleihen,
              Fonds, Zinsen und Vermögensplanung.
            </p>
          </div>
          <Link
            to="/wissen"
            data-testid="home-financial-articles-cta"
            className="inline-flex items-center gap-2 border border-bank-ink bg-bank-ink px-6 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-bank-ink/85"
          >
            Zum Wissensbereich
            <ArrowRight size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default HomeFinancialArticles;
