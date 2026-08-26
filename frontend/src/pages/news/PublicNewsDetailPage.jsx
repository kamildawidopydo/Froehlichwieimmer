import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, Newspaper } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { useAuth } from '@/context/AuthContext';
import { useNewsArticle } from '@/hooks/useNewsArticle';
import { categoryLabel } from '@/lib/news/euronewsFeeds';
import {
  dedupeSummaryParagraphs,
  formatNewsDate,
  formatReadTime,
  shouldShowSummary,
  splitParagraphs,
} from '@/lib/news/formatNews';
import PublicNewsLayout from '@/components/news/PublicNewsLayout';
import PublicNewsErrorState from '@/components/news/PublicNewsErrorState';
import RelatedNewsArticles from '@/components/news/RelatedNewsArticles';
import NewsStrategyCrosslink from '@/components/news/NewsStrategyCrosslink';
import SafeNewsImage from '@/components/news/SafeNewsImage';
import EuronewsVideoPlayer from '@/components/dashboard/news/EuronewsVideoPlayer';

const ArticleSkeleton = () => (
  <div className="mx-auto max-w-3xl space-y-8">
    <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-bank-bg/70" />
    <div className="space-y-4">
      <div className="h-4 w-1/3 animate-pulse rounded bg-bank-bg/60" />
      <div className="h-9 w-5/6 animate-pulse rounded bg-bank-bg/80" />
      <div className="h-3 w-1/4 animate-pulse rounded bg-bank-bg/50" />
    </div>
    <div className="space-y-3">
      <div className="h-3 w-full animate-pulse rounded bg-bank-bg/60" />
      <div className="h-3 w-11/12 animate-pulse rounded bg-bank-bg/60" />
      <div className="h-3 w-10/12 animate-pulse rounded bg-bank-bg/60" />
    </div>
  </div>
);

const PublicNewsDetailPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { article, loading, error } = useNewsArticle(slug);
  const readTime = formatReadTime(article?.read_time_minutes);
  // Wenn alle 3 Bild-Fallback-Stufen fehlschlagen, blenden wir den Hero-Container
  // komplett aus → Artikeltext rückt automatisch nach.
  const [heroHidden, setHeroHidden] = useState(false);

  const paragraphs = useMemo(
    () =>
      splitParagraphs(
        article?.content && article.content.length > 0
          ? article.content
          : article?.summary,
      ),
    [article?.content, article?.summary],
  );

  const dedupedParagraphs = useMemo(
    () => dedupeSummaryParagraphs(paragraphs, article?.summary),
    [article?.summary, paragraphs],
  );

  const showSummary = useMemo(
    () => shouldShowSummary(article?.summary, paragraphs),
    [article?.summary, paragraphs],
  );

  return (
    <PublicNewsLayout>
      <PageMeta
        title={article?.title ?? 'News'}
        description={article?.summary ?? undefined}
        path={`/news/${slug}`}
        image={article?.image_url}
        noIndex
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/news"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-bank-text-muted transition-colors hover:text-bank-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          Zurück zu News
        </Link>
        {user && article && (
          <Link
            to={`/dashboard/news/${article.slug}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-bank-text-muted transition-colors hover:text-bank-gold"
          >
            <LayoutDashboard size={13} strokeWidth={1.5} />
            Im Dashboard öffnen
          </Link>
        )}
      </div>

      {loading ? (
        <ArticleSkeleton />
      ) : error ? (
        <PublicNewsErrorState error={error} />
      ) : !article ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-bank-border/60 bg-bank-surface px-6 py-16 text-center shadow-sm dark:bg-bank-ink/20">
          <Newspaper size={32} strokeWidth={1.4} className="mx-auto mb-4 text-bank-gold/50" />
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
            Nicht verfügbar
          </p>
          <h1 className="font-display mt-2 text-[1.5rem] font-light text-bank-text">
            Diese Meldung ist nicht mehr verfügbar
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-bank-text-muted">
            Sie wurde möglicherweise aus dem aktuellen Nachrichten-Feed entfernt.
          </p>
          <div className="mt-6">
            <Link
              to="/news"
              className="inline-flex items-center gap-1.5 rounded-lg border border-bank-border px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-bank-text transition-colors hover:border-bank-gold/40 hover:text-bank-gold"
            >
              <ArrowLeft size={12} strokeWidth={1.5} />
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      ) : (
        <>
          <article className="mx-auto max-w-3xl space-y-8">
          {article.video_embed_url ? (
            <EuronewsVideoPlayer
              embedUrl={article.video_embed_url}
              thumbnailUrl={article.video_thumbnail_url ?? article.image_url}
              title={article.title}
              sourceUrl={article.video_source_url ?? article.source_url}
            />
          ) : article.image_url && !heroHidden ? (
            <div className="overflow-hidden rounded-2xl border border-bank-border/60 bg-bank-bg/40 shadow-sm" data-testid="news-detail-hero-image">
              <SafeNewsImage
                src={article.image_url}
                category={article.category}
                alt={article.title || ''}
                loading="eager"
                className="aspect-[16/9] w-full object-cover"
                onFinalError={() => setHeroHidden(true)}
                testId="news-detail-hero-img"
              />
            </div>
          ) : null}

          <header className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-bank-gold/35 bg-bank-gold/10 px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-bank-gold">
                {categoryLabel(article.category)}
              </span>
            </div>
            <h1 className="font-display text-[2rem] font-light leading-[1.08] text-bank-text sm:text-[2.5rem]">
              {article.title}
            </h1>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] tabular-nums text-bank-text-muted">
              Veröffentlicht · {formatNewsDate(article.published_at, { long: true })}
              {readTime ? ` · ${readTime}` : ''}
            </p>
          </header>

          <div className="rounded-2xl border border-bank-border/60 bg-bank-surface p-6 shadow-sm sm:p-8 dark:bg-bank-ink/20">
            {showSummary && article.summary && (
              <p className="mb-6 max-w-prose text-[1.1rem] font-medium leading-relaxed text-bank-text">
                {article.summary}
              </p>
            )}
            {dedupedParagraphs.length > 0 ? (
              <div className="max-w-prose space-y-5 text-[15px] leading-[1.8] text-bank-text">
                {dedupedParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-bank-text-muted">
                Für diese Meldung steht aktuell kein vollständiger Text zur Verfügung.
              </p>
            )}
          </div>
          </article>

          <RelatedNewsArticles
            category={article.category}
            excludeSlug={article.slug}
          />
          <NewsStrategyCrosslink article={article} />
        </>
      )}
    </PublicNewsLayout>
  );
};

export default PublicNewsDetailPage;
