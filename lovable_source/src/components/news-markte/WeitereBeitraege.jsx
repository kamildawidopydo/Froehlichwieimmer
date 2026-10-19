import React from 'react';
import { ArrowUpRight } from 'lucide-react';
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

const Row = ({ article }) => (
  <a
    href={article.source_url || '#'}
    target="_blank"
    rel="noopener noreferrer"
    className="group grid grid-cols-[96px_1fr] items-start gap-4 py-6 sm:grid-cols-[160px_1fr] sm:gap-8"
    data-testid="weitere-row"
  >
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100 sm:aspect-[3/2]">
      {article.image_url ? (
        <img
          src={article.image_url}
          alt={article.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 to-white" />
      )}
    </div>
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-bank-accent-strong">
        {CATEGORY_LABEL[article.category] || article.category}
      </p>
      <h3 className="font-serif text-lg leading-snug text-bank-text transition-colors group-hover:text-bank-accent-strong sm:text-xl">
        {article.title}
      </h3>
      <p className="hidden text-[13.5px] leading-relaxed text-bank-text-muted line-clamp-2 sm:block">
        {article.excerpt}
      </p>
      <div className="mt-1 flex items-center gap-3 text-[11.5px] uppercase tracking-[0.16em] text-bank-text-muted">
        <span>{article.source}</span>
        <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-bank-border" />
        <span className="font-mono">{formatRelative(article.published_at)}</span>
        <ArrowUpRight
          className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          strokeWidth={1.4}
        />
      </div>
    </div>
  </a>
);

const WeitereBeitraege = ({ articles = [], loading }) => (
  <section
    className="border-t border-bank-border pt-14 sm:pt-16"
    data-testid="weitere-beitraege"
  >
    <div className="flex flex-col gap-3">
      <Eyebrow>Weiterlesen</Eyebrow>
      <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">Weitere interessante Beiträge</h2>
    </div>
    {loading ? (
      <div className="mt-6 divide-y divide-bank-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex animate-pulse items-start gap-8 py-6">
            <div className="h-24 w-40 bg-neutral-100" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-20 bg-neutral-100" />
              <div className="h-5 w-3/4 bg-neutral-100" />
              <div className="h-3 w-full bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="mt-4 divide-y divide-bank-border">
        {articles.map((a) => (
          <Row key={a.id} article={a} />
        ))}
      </div>
    )}
  </section>
);

export default WeitereBeitraege;
