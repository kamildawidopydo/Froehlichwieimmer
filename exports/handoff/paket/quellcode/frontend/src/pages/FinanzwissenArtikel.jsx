import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Clock } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import Eyebrow from '@/components/editorial/Eyebrow';
import {
  FINANCIAL_ARTICLES,
  FINANCIAL_CATEGORY_LABEL,
  getFinancialArticle,
  getRelatedFinancialArticles,
} from '@/data/financialArticles';

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

const BodyBlock = ({ block }) => (
  <section className="mt-12 first:mt-0" data-testid="finanzwissen-article-block">
    {block.heading && (
      <h2 className="font-display text-[1.45rem] font-light leading-tight tracking-tight text-bank-ink sm:text-[1.65rem]">
        {block.heading}
      </h2>
    )}
    {block.paragraphs?.map((p, i) => (
      <p
        key={`p-${i}`}
        className="mt-5 max-w-prose text-[15.5px] leading-[1.85] text-bank-text-muted"
      >
        {p}
      </p>
    ))}
    {block.list && (
      <ul className="mt-6 space-y-3 text-[15px] leading-relaxed text-bank-text-muted">
        {block.list.map((item, i) => (
          <li key={`l-${i}`} className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-primary/70"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const FinanzwissenArtikel = () => {
  const { slug } = useParams();
  const article = getFinancialArticle(slug);

  if (!article) {
    return <Navigate to="/" replace />;
  }

  const related = getRelatedFinancialArticles(slug, 3);

  return (
    <div
      className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fafaf7_100%)]"
      data-testid="finanzwissen-article-page"
    >
      <PageMeta
        title={`${article.title} · Fröhlich Finanzwissen`}
        description={article.excerpt}
        path={`/finanzwissen/${slug}`}
      />

      {/* Hero */}
      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-[900px] px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:px-12">
          <Link
            to="/"
            data-testid="finanzwissen-article-back"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted transition-colors hover:text-bank-primary"
          >
            <ArrowLeft size={12} strokeWidth={LUCIDE_STROKE} aria-hidden />
            Zurück zur Startseite
          </Link>
          <div className="mt-8">
            <Eyebrow>
              {FINANCIAL_CATEGORY_LABEL[article.category] || article.category}
            </Eyebrow>
            <h1
              data-testid="finanzwissen-article-title"
              className="mt-4 font-display text-[2rem] font-light leading-[1.08] tracking-tight text-bank-ink sm:text-[2.6rem] lg:text-[3rem]"
            >
              {article.title}
            </h1>
            <p className="mt-6 max-w-[38rem] text-[16.5px] leading-relaxed text-bank-text-muted sm:text-[17px]">
              {article.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-bank-border pt-5 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} strokeWidth={LUCIDE_STROKE} aria-hidden />
                {article.readingTime} Min. Lesezeit
              </span>
              <span aria-hidden>·</span>
              <span>{formatDate(article.publishedAt)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Hero image */}
      <div className="mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12">
        <figure className="relative -mt-6 aspect-[16/9] w-full overflow-hidden border border-bank-border bg-bank-cream/30 shadow-[0_36px_100px_-56px_rgb(9_33_66/0.22)] sm:-mt-10">
          <img
            src={article.image}
            alt=""
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </figure>
      </div>

      {/* Body */}
      <article className="mx-auto max-w-[720px] px-5 pb-20 pt-14 sm:px-8 sm:pb-24 sm:pt-16 lg:px-12">
        {article.body.map((block, i) => (
          <BodyBlock key={i} block={block} />
        ))}
        <p className="mt-16 border-t border-bank-border pt-6 text-[12.5px] leading-relaxed text-bank-text-muted">
          Dieser Beitrag ist redaktionell aufbereitet und dient der allgemeinen Information. Er
          ersetzt keine individuelle Anlageberatung und stellt keine Empfehlung zum Kauf oder
          Verkauf konkreter Produkte dar.
        </p>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section
          className="border-t border-bank-border bg-white py-14 sm:py-16"
          data-testid="finanzwissen-article-related"
        >
          <div className="mx-auto max-w-[1100px] px-5 sm:px-8 lg:px-12">
            <div className="flex items-end justify-between gap-4 border-b border-bank-border pb-4">
              <Eyebrow>Weiterlesen</Eyebrow>
              <Link
                to="/wissen"
                className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary transition-colors hover:text-bank-primary/80 sm:inline-flex"
              >
                Alle Artikel →
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/finanzwissen/${r.slug}`}
                  data-testid={`finanzwissen-related-${r.slug}`}
                  className="group flex flex-col border-b border-bank-border pb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-bank-cream/40">
                    <img
                      src={r.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-primary/80">
                      {FINANCIAL_CATEGORY_LABEL[r.category] || r.category}
                    </p>
                    <h3 className="font-display text-[1.05rem] font-light leading-snug tracking-tight text-bank-ink transition-colors group-hover:text-bank-primary">
                      {r.title}
                    </h3>
                    <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                      Artikel lesen
                      <ArrowUpRight size={12} strokeWidth={LUCIDE_STROKE} aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export const financialArticleSlugs = FINANCIAL_ARTICLES.map((a) => a.slug);

export default FinanzwissenArtikel;
