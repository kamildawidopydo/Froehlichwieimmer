import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Clock } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getArticle, WISSEN_ARTICLES, WISSEN_CATEGORIES } from '@/data/wissenArticles';

function Section({ section }) {
  if (section.rows && section.rowHeaders) {
    return (
      <section className="mt-14 first:mt-0">
        <h2 className="font-display text-[1.5rem] font-light leading-tight tracking-[-0.015em] text-bank-text sm:text-[1.7rem]" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
          {section.heading}
        </h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[500px] border-collapse text-[14.5px]">
            <thead>
              <tr className="border-y border-bank-border">
                {section.rowHeaders.map((h) => (
                  <th key={h} className="py-3 pr-6 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, i) => (
                <tr key={i} className="border-b border-bank-border">
                  {row.map((cell, j) => (
                    <td key={j} className={cn('py-4 pr-6 leading-relaxed', j === 0 ? 'font-medium text-bank-text' : 'text-bank-text-muted')}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  return (
    <section className="mt-14 first:mt-0">
      <h2 className="font-display text-[1.5rem] font-light leading-tight tracking-[-0.015em] text-bank-text sm:text-[1.7rem]" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
        {section.heading}
      </h2>
      {section.paragraphs?.map((p, i) => (
        <p key={i} className="mt-5 max-w-prose text-[15.5px] leading-[1.85] text-bank-text-muted">{p}</p>
      ))}
      {section.list && (
        <ul className="mt-6 space-y-3 text-[15px] leading-relaxed text-bank-text-muted">
          {section.list.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-gold" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function WissenArtikel() {
  const { slug } = useParams();
  const article = getArticle(slug);
  if (!article) return <Navigate to="/wissen" replace />;
  const cat = WISSEN_CATEGORIES[article.category];
  const related = (article.related || []).map((s) => WISSEN_ARTICLES.find((a) => a.slug === s)).filter(Boolean);

  return (
    <div className="min-h-screen w-full bg-bank-bg text-bank-text">
      <PageMeta title={article.title} description={article.lede} path={`/wissen/${article.slug}`} />

      {/* HERO */}
      <header className="border-b border-bank-border bg-bank-surface/30">
        <div className="mx-auto max-w-[860px] px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
          <Link to="/wissen" className="inline-flex items-center gap-2 text-[12.5px] font-medium text-bank-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
            Zurück zu Wissen &amp; Perspektiven
          </Link>
          <div className="mt-8 flex items-center gap-3">
            <span className="rounded-full border border-bank-primary/30 bg-bank-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary">{cat.label}</span>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-bank-text-muted">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.4} aria-hidden />
              {article.readingTime}
            </span>
          </div>
          <h1 className="mt-6 max-w-3xl font-display text-[clamp(1.85rem,4vw+0.6rem,3rem)] font-light leading-[1.05] tracking-[-0.02em] text-bank-text" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            {article.title}
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-bank-text-muted sm:text-[17px]">{article.lede}</p>
        </div>
      </header>

      {/* CONTENT */}
      <article className="py-14 sm:py-20">
        <div className="mx-auto max-w-[720px] px-5 sm:px-8">
          {article.sections.map((s, i) => <Section key={i} section={s} />)}
        </div>
      </article>

      {/* CTA */}
      <section className="border-t border-bank-border bg-bank-surface/30 py-14">
        <div className="mx-auto max-w-[720px] px-5 sm:px-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Persönliches Gespräch</p>
          <h2 className="mt-4 font-display text-[1.5rem] font-light leading-tight tracking-[-0.015em] text-bank-text sm:text-[1.8rem]" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            Fragen zu Ihrer individuellen Situation?
          </h2>
          <p className="mt-4 text-[15px] leading-[1.8] text-bank-text-muted">Ein Ratgeberartikel ersetzt keine individuelle Beratung. Wir nehmen uns gern die Zeit, Ihre Situation persönlich zu besprechen.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/contact" data-testid="artikel-cta-contact" className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'inline-flex cursor-pointer')}>
              Kontakt aufnehmen
              <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="border-t border-bank-border py-14">
          <div className="mx-auto max-w-[1000px] px-5 sm:px-8">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">Verwandte Beiträge</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <Link key={r.slug} to={`/wissen/${r.slug}`} className="group rounded-xl border border-bank-border bg-bank-surface/40 p-5 transition-colors hover:border-bank-gold/40">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary">{WISSEN_CATEGORIES[r.category].label}</p>
                  <p className="mt-3 font-display text-[1.1rem] font-light leading-snug text-bank-text" style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}>{r.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
