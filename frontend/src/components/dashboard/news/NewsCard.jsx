import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryLabel } from '@/lib/news/euronewsFeeds';

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${dateFormatter.format(d)} Uhr`;
};

const NewsCard = ({ article }) => {
  const [imgError, setImgError] = useState(false);
  if (!article) return null;
  const showImage = Boolean(article.image_url) && !imgError;

  return (
    <Link
      to={`/dashboard/news/${article.slug}`}
      className="group relative block overflow-hidden border border-bank-border bg-white transition-all duration-300 hover:border-bank-gold/55 hover:shadow-editorial-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      {showImage && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-bank-bg/60">
          <img
            src={article.image_url}
            alt={article.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute left-3 top-3 border border-bank-border bg-white/95 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-bank-text shadow-sm backdrop-blur">
            {categoryLabel(article.category)}
          </span>
        </div>
      )}
      <div className="flex flex-col gap-2 p-4">
        {!showImage && (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-bank-gold">
            {categoryLabel(article.category)}
          </span>
        )}
        <h3
          className="dashboard-page-title line-clamp-2 text-[1.05rem] font-semibold leading-snug text-bank-text"
        >
          {article.title}
        </h3>
        {article.summary && (
          <p className="line-clamp-2 text-[12.5px] leading-snug text-bank-text-muted">
            {article.summary}
          </p>
        )}
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] tabular-nums text-bank-text-muted">
          {formatDate(article.published_at)}
        </p>
      </div>
    </Link>
  );
};

export default NewsCard;
