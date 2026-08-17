import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Newspaper } from 'lucide-react';
import {
  PageContainer,
  SurfaceCard,
} from '@/components/dashboard/PageHeader';
import PageMeta from '@/components/PageMeta';
import { useNewsArticle } from '@/hooks/useNewsArticle';
import { categoryLabel } from '@/lib/news/euronewsFeeds';
import NewsErrorState from '@/components/dashboard/news/NewsErrorState';
import EuronewsVideoPlayer from '@/components/dashboard/news/EuronewsVideoPlayer';

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
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

const splitParagraphs = (raw) => {
  if (!raw) return [];
  return String(raw)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
};

const normalizeText = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[„“”"']/g, '')
    .replace(/[.,;:!?()[\]{}]/g, '')
    .trim();

const ArticleSkeleton = () => (
  <div className="space-y-6">
    <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-bank-surface/80" />
    <div className="space-y-3">
      <div className="h-4 w-1/3 animate-pulse rounded bg-bank-surface/60" />
      <div className="h-7 w-5/6 animate-pulse rounded bg-bank-surface/80" />
      <div className="h-3 w-1/4 animate-pulse rounded bg-bank-surface/60" />
    </div>
    <div className="space-y-2">
      <div className="h-3 w-full animate-pulse rounded bg-bank-surface/60" />
      <div className="h-3 w-11/12 animate-pulse rounded bg-bank-surface/60" />
      <div className="h-3 w-10/12 animate-pulse rounded bg-bank-surface/60" />
      <div className="h-3 w-9/12 animate-pulse rounded bg-bank-surface/60" />
    </div>
  </div>
);

const NewsDetailPage = () => {
  const { slug } = useParams();
  const { article, loading, error } = useNewsArticle(slug);

  const paragraphs = useMemo(
    () =>
      splitParagraphs(
        article?.content && article.content.length > 0
          ? article.content
          : article?.summary,
      ),
    [article?.content, article?.summary],
  );

  const dedupedParagraphs = useMemo(() => {
    if (!article?.summary || paragraphs.length === 0) return paragraphs;
    const first = paragraphs[0];
    if (normalizeText(first) === normalizeText(article.summary)) {
      return paragraphs.slice(1);
    }
    return paragraphs;
  }, [article?.summary, paragraphs]);

  const showSummary = useMemo(() => {
    if (!article?.summary) return false;
    if (paragraphs.length === 0) return true;
    return normalizeText(paragraphs[0]) !== normalizeText(article.summary);
  }, [article?.summary, paragraphs]);

  return (
    <PageContainer>
      <PageMeta
        title={article?.title ?? 'Nachrichten'}
        description={article?.summary ?? undefined}
        path={`/dashboard/news/${slug}`}
        image={article?.image_url}
        noIndex
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard/news"
          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted transition-colors hover:text-bank-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
        >
          <ArrowLeft size={12} strokeWidth={1.5} />
          Zurück zu Nachrichten
        </Link>
        {article && (
          <Link
            to={`/news/${article.slug}`}
            className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted transition-colors hover:text-bank-gold"
          >
            <ExternalLink size={12} strokeWidth={1.5} />
            Auf der Website ansehen
          </Link>
        )}
      </div>

      {loading ? (
        <ArticleSkeleton />
      ) : error ? (
        <NewsErrorState error={error} />
      ) : !article ? (
        <SurfaceCard accent className="py-14 text-center">
          <Newspaper size={32} strokeWidth={1.4} className="mx-auto mb-4 text-bank-gold/55" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
            Nicht verfügbar
          </p>
          <h3
            className="dashboard-page-title mt-2 text-[1.2rem] font-semibold leading-tight text-bank-text"
          >
            Diese Meldung ist nicht mehr verfügbar
          </h3>
          <span aria-hidden className="my-4 inline-block h-px w-12 bg-bank-gold/55" />
          <p className="mx-auto max-w-md text-[13px] leading-snug text-bank-text-muted">
            Sie wurde möglicherweise aus dem aktuellen Nachrichten-Feed entfernt.
          </p>
          <div className="mt-5">
            <Link
              to="/dashboard/news"
              className="inline-flex items-center gap-1.5 border border-bank-ink bg-white px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text transition-colors hover:bg-bank-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
            >
              <ArrowLeft size={12} strokeWidth={1.5} />
              Zurück zur Übersicht
            </Link>
          </div>
        </SurfaceCard>
      ) : (
        <article className="space-y-7">
          {article.video_embed_url ? (
            <EuronewsVideoPlayer
              embedUrl={article.video_embed_url}
              thumbnailUrl={article.video_thumbnail_url ?? article.image_url}
              title={article.title}
              sourceUrl={article.video_source_url ?? article.source_url}
            />
          ) : article.image_url ? (
            <div className="relative overflow-hidden border border-bank-border bg-bank-bg/40">
              <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
              <img
                src={article.image_url}
                alt={article.title}
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          ) : null}

          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-bank-gold/45 bg-bank-gold/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-bank-gold">
                {categoryLabel(article.category)}
              </span>
            </div>
            <h1
              className="dashboard-page-title text-[2rem] font-semibold leading-[1.05] text-bank-text sm:text-[2.6rem]"
            >
              {article.title}
            </h1>
            <span aria-hidden className="block h-px w-16 bg-bank-gold/55" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] tabular-nums text-bank-text-muted">
              Veröffentlicht · {formatDate(article.published_at)}
            </p>
          </header>

          <SurfaceCard accent>
            {showSummary && article.summary && (
              <>
                <p className="dashboard-page-title mb-5 max-w-prose text-[1.15rem] font-semibold leading-[1.55] text-bank-text drop-cap">
                  {article.summary}
                </p>
                <span aria-hidden className="mb-5 block h-px w-12 bg-bank-gold/55" />
              </>
            )}
            {dedupedParagraphs.length > 0 ? (
              <div className="max-w-prose space-y-4 text-[15px] leading-[1.75] text-bank-text">
                {dedupedParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-bank-text-muted">
                Für diese Meldung steht aktuell kein vollständiger Text zur Verfügung.
              </p>
            )}
          </SurfaceCard>
        </article>
      )}
    </PageContainer>
  );
};

export default NewsDetailPage;
