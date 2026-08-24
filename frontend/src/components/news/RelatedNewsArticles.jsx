import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRelatedArticles } from '@/services/newsService';
import { categoryLabel } from '@/lib/news/euronewsFeeds';
import { formatNewsDate, formatReadTime } from '@/lib/news/formatNews';
import SafeNewsImage from '@/components/news/SafeNewsImage';

const RelatedCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-bank-border/60 bg-bank-surface shadow-sm dark:bg-bank-ink/20">
    <div className="aspect-[16/9] w-full animate-pulse bg-bank-bg/70" />
    <div className="space-y-2.5 p-4">
      <div className="h-3 w-20 animate-pulse rounded bg-bank-bg/60" />
      <div className="h-4 w-full animate-pulse rounded bg-bank-bg/80" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-bank-bg/70" />
      <div className="h-3 w-28 animate-pulse rounded bg-bank-bg/50" />
    </div>
  </div>
);

const RelatedNewsCard = ({ article }) => {
  const [imgHidden, setImgHidden] = useState(false);
  const readTime = formatReadTime(article.read_time_minutes);
  const showImage = Boolean(article.image_url) && !imgHidden;

  return (
    <Link
      to={`/news/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-bank-border/70 bg-bank-surface shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-bank-gold/35 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 dark:bg-bank-ink/25"
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
          <span className="absolute left-2.5 top-2.5 rounded-full border border-bank-border/60 bg-bank-surface/95 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-bank-text-muted backdrop-blur-sm">
            {categoryLabel(article.category)}
          </span>
        </div>
      )}
      <div className="flex flex-col gap-2 p-4">
        {!showImage && (
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-bank-gold">
            {categoryLabel(article.category)}
          </span>
        )}
        <h3 className="font-display line-clamp-3 text-[0.98rem] font-light leading-snug text-bank-text transition-colors group-hover:text-bank-gold">
          {article.title}
        </h3>
        {article.summary && (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-bank-text-muted">
            {article.summary}
          </p>
        )}
        <p className="pt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] tabular-nums text-bank-text-muted/80">
          {formatNewsDate(article.published_at)}
          {readTime ? ` · ${readTime}` : ''}
        </p>
      </div>
    </Link>
  );
};

const RelatedNewsArticles = ({ category, excludeSlug }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    listRelatedArticles({
      category,
      excludeSlug,
      limit: 3,
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted) setItems(data ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, excludeSlug]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="mx-auto mt-14 max-w-5xl border-t border-bank-border/60 pt-10">
      <h2 className="font-display mb-6 text-[1.35rem] font-light text-bank-text">
        Ähnliche Meldungen
      </h2>
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <RelatedCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-3">
          {items.map((article) => (
            <RelatedNewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
};

export default RelatedNewsArticles;
