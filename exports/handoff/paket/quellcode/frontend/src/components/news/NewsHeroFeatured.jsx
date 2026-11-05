import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { categoryLabel } from '@/lib/news/euronewsFeeds';
import { formatNewsDate, formatReadTime } from '@/lib/news/formatNews';
import SafeNewsImage from '@/components/news/SafeNewsImage';

const NewsHeroFeatured = ({ article }) => {
  const [imgHidden, setImgHidden] = useState(false);
  if (!article) return null;
  const readTime = formatReadTime(article.read_time_minutes);
  const showImage = Boolean(article.image_url) && !imgHidden;

  return (
    <Link
      to={`/news/${article.slug}`}
      className="group mb-10 block overflow-hidden rounded-2xl border border-bank-border/60 bg-bank-surface shadow-sm transition-all duration-300 hover:border-bank-gold/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 dark:bg-bank-ink/20 lg:mb-12"
    >
      <div className={showImage ? 'grid lg:grid-cols-2' : ''}>
        {showImage && (
          <div className="relative aspect-[16/9] overflow-hidden bg-bank-bg/50 lg:aspect-auto lg:min-h-[22rem]">
            <SafeNewsImage
              src={article.image_url}
              category={article.category}
              alt={article.title || ''}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
              onFinalError={() => setImgHidden(true)}
            />
          </div>
        )}
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-bank-gold">
              {categoryLabel(article.category)}
            </span>
            <span aria-hidden className="h-1 w-1 rounded-full bg-bank-border" />
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-bank-text-muted">
              {formatNewsDate(article.published_at)}
            </span>
            {readTime && (
              <>
                <span aria-hidden className="h-1 w-1 rounded-full bg-bank-border" />
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-bank-text-muted">
                  {readTime}
                </span>
              </>
            )}
          </div>
          <h2 className="font-display text-[1.75rem] font-light leading-[1.12] text-bank-text transition-colors group-hover:text-bank-gold sm:text-[2.1rem]">
            {article.title}
          </h2>
          {article.summary && (
            <p className="max-w-prose text-[15px] leading-relaxed text-bank-text-muted">
              {article.summary}
            </p>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-bank-text-muted transition-colors group-hover:text-bank-gold">
            Weiterlesen
            <ArrowRight size={13} strokeWidth={1.5} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default NewsHeroFeatured;
