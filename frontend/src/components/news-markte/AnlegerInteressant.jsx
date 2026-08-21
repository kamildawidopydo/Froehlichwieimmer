import React from 'react';
import { ArrowUpRight, Shield } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { formatRelative } from '@/services/newsMarkteApi';

const CATEGORY_LABEL = {
  maerkte: 'Märkte',
  aktien: 'Aktien',
  wirtschaft: 'Wirtschaft',
  unternehmen: 'Unternehmen',
  zinsen: 'Zinsen',
  international: 'International',
};

const Card = ({ article }) => (
  <a
    href={article.source_url || '#'}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex flex-col border border-bank-border bg-white transition-shadow duration-300 hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.22)]"
    data-testid="anleger-card"
  >
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
      {article.image_url ? (
        <img
          src={article.image_url}
          alt={article.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : null}
    </div>
    <div className="flex flex-1 flex-col gap-3 px-5 py-5">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-bank-accent-strong">
        {CATEGORY_LABEL[article.category] || article.category}
      </p>
      <h3 className="font-serif text-lg leading-snug text-bank-text transition-colors group-hover:text-bank-accent-strong">
        {article.title}
      </h3>
      <p className="text-[13px] leading-relaxed text-bank-text-muted line-clamp-3">{article.excerpt}</p>
      <div className="mt-auto flex items-center justify-between border-t border-bank-border pt-3 text-[11.5px] text-bank-text-muted">
        <span className="uppercase tracking-[0.14em]">{article.source}</span>
        <span className="font-mono">{formatRelative(article.published_at)}</span>
      </div>
    </div>
  </a>
);

const AnlegerInteressant = ({ articles = [], loading }) => (
  <section
    className="border-t border-bank-border pt-14 sm:pt-16"
    data-testid="anleger-interessant"
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-3">
        <Eyebrow>Kuratiert</Eyebrow>
        <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">Für unsere Anleger interessant</h2>
        <p className="max-w-2xl text-[14px] leading-relaxed text-bank-text-muted">
          Themen rund um Zinsentwicklung, Aktienmärkte, Anleihen, Immobilien und langfristige Investmentthemen.
        </p>
      </div>
    </div>

    <div className="mt-8 flex items-start gap-3 border-l-2 border-bank-accent-strong bg-white/60 px-5 py-4 text-[12.5px] leading-relaxed text-bank-text-muted">
      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-bank-accent-strong" strokeWidth={1.4} />
      <p>
        <span className="font-medium text-bank-text">Hinweis.</span> Die hier verlinkten Beiträge stammen aus externen
        Quellen und stellen ausdrücklich keine Anlageempfehlung der Fröhlich Vermögensberatung dar.
      </p>
    </div>

    {loading ? (
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-[340px] animate-pulse bg-neutral-100" />
        ))}
      </div>
    ) : (
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <Card key={a.id} article={a} />
        ))}
      </div>
    )}
  </section>
);

export default AnlegerInteressant;
