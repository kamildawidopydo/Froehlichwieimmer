import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { formatRelative } from '@/services/newsMarkteApi';
import SafeNewsImage from '@/components/news/SafeNewsImage';

const CategoryTag = ({ label }) => (
  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.28em] text-bank-accent-strong">
    <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-accent-strong" />
    {label}
  </span>
);

const CATEGORY_LABEL = {
  maerkte: 'Märkte',
  aktien: 'Aktien',
  wirtschaft: 'Wirtschaft',
  unternehmen: 'Unternehmen',
  zinsen: 'Zinsen',
  international: 'International',
};

const CardImage = ({ src, alt, category }) => {
  const [hidden, setHidden] = useState(false);
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
      {src && !hidden ? (
        <SafeNewsImage
          src={src}
          category={category}
          alt={alt || ''}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          onFinalError={() => setHidden(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-100 to-white" />
      )}
      <div className="pointer-events-none absolute inset-0 border-b border-bank-border" />
    </div>
  );
};

const FeaturedCard = ({ article }) => (
  <a
    href={article.source_url || '#'}
    target="_blank"
    rel="noopener noreferrer"
    className="group block bg-white border border-bank-border transition-shadow duration-300 hover:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]"
    data-testid="hero-featured-card"
  >
    <CardImage src={article.image_url} alt={article.title} category={article.category} />
    <div className="flex flex-col gap-4 px-6 py-7 sm:px-8 sm:py-8">
      <CategoryTag label={CATEGORY_LABEL[article.category] || article.category} />
      <h3 className="font-serif text-2xl leading-tight text-bank-text sm:text-[28px] lg:text-[32px]">
        {article.title}
      </h3>
      <p className="max-w-2xl text-[15px] leading-relaxed text-bank-text-muted">{article.excerpt}</p>
      <div className="mt-2 flex items-center justify-between border-t border-bank-border pt-4 text-[12.5px] text-bank-text-muted">
        <span className="uppercase tracking-[0.16em]">{article.source}</span>
        <span className="flex items-center gap-2 font-mono text-[12px] text-bank-accent-strong">
          {formatRelative(article.published_at)}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.4} />
        </span>
      </div>
    </div>
  </a>
);

const SecondaryCard = ({ article }) => (
  <a
    href={article.source_url || '#'}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex flex-col bg-white border border-bank-border transition-shadow duration-300 hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.22)]"
    data-testid="hero-secondary-card"
  >
    <CardImage src={article.image_url} alt={article.title} category={article.category} />
    <div className="flex flex-1 flex-col gap-3 px-5 py-6">
      <CategoryTag label={CATEGORY_LABEL[article.category] || article.category} />
      <h3 className="font-serif text-lg leading-snug text-bank-text sm:text-xl">{article.title}</h3>
      <p className="text-[13.5px] leading-relaxed text-bank-text-muted line-clamp-3">{article.excerpt}</p>
      <div className="mt-auto flex items-center justify-between border-t border-bank-border pt-3 text-[11.5px] text-bank-text-muted">
        <span className="uppercase tracking-[0.14em]">{article.source}</span>
        <span className="font-mono text-[11px] text-bank-accent-strong">{formatRelative(article.published_at)}</span>
      </div>
    </div>
  </a>
);

const HeroTopNews = ({ articles, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-[420px] animate-pulse bg-neutral-100 ${i === 0 ? 'lg:col-span-2' : ''}`} />
        ))}
      </div>
    );
  }
  if (!articles?.length) return null;
  const [primary, ...rest] = articles;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" data-testid="hero-top-news">
      <div className="lg:col-span-2">
        <FeaturedCard article={primary} />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
        {rest.slice(0, 2).map((a) => (
          <SecondaryCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
};

export default HeroTopNews;
