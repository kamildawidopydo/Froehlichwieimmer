import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryLabel } from '@/lib/news/euronewsFeeds';
import { formatNewsDate, formatReadTime } from '@/lib/news/formatNews';
import HighlightText from '@/components/news/HighlightText';
import SafeNewsImage from '@/components/news/SafeNewsImage';
import { cn } from '@/lib/utils';

const PublicNewsCard = ({ article, compact = false, highlightQuery = '' }) => {
  const [imgHidden, setImgHidden] = useState(false);
  if (!article) return null;
  const readTime = formatReadTime(article.read_time_minutes);
  const showImage = Boolean(article.image_url) && !imgHidden && !compact;

  return (
    <Link
      to={`/news/${article.slug}`}
      className={cn(
        'group flex h-full min-h-[8.5rem] flex-col rounded-xl border border-bank-border/70 bg-bank-surface shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-bank-gold/35 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 dark:bg-bank-ink/25',
        showImage ? 'overflow-hidden' : 'overflow-visible',
      )}
    >
      {showImage && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-bank-bg/50">
          <SafeNewsImage
            src={article.image_url}
            category={article.category}
            alt={article.title || ''}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            onFinalError={() => setImgHidden(true)}
          />
          <span className="absolute left-3 top-3 rounded-full border border-bank-border/60 bg-bank-surface/95 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-bank-text-muted backdrop-blur-sm">
            {categoryLabel(article.category)}
          </span>
        </div>
      )}
      <div
        className={cn(
          'flex flex-1 flex-col',
          compact ? 'gap-2 p-4' : 'gap-2.5 p-5',
        )}
      >
        {!showImage && (
          <span className="block shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-bank-gold">
            {categoryLabel(article.category)}
          </span>
        )}
        <h3
          className={cn(
            'font-display font-light text-bank-text transition-colors group-hover:text-bank-gold',
            compact
              ? 'line-clamp-4 text-[15px] leading-[1.45]'
              : 'line-clamp-2 text-[1.15rem] leading-snug',
          )}
        >
          <HighlightText text={article.title} query={highlightQuery} />
        </h3>
        {!compact && article.summary && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-bank-text-muted">
            <HighlightText text={article.summary} query={highlightQuery} />
          </p>
        )}
        <p
          className={cn(
            'mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1 text-[11px] font-medium uppercase tracking-[0.12em] tabular-nums text-bank-text-muted/80',
            compact && 'border-t border-bank-border/40 pt-2.5',
          )}
        >
          <span>{formatNewsDate(article.published_at)}</span>
          {readTime && (
            <>
              <span aria-hidden>·</span>
              <span>{readTime}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
};

export default PublicNewsCard;
