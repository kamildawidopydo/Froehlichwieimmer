import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Video } from 'lucide-react';
import {
  PageContainer,
  SurfaceCard,
} from '@/components/dashboard/PageHeader';
import PageMeta from '@/components/PageMeta';
import { useNewsVideo } from '@/hooks/useNewsVideo';
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

const VideoSkeleton = () => (
  <div className="space-y-6">
    <div className="aspect-video w-full animate-pulse rounded-2xl bg-bank-surface/80" />
    <div className="space-y-3">
      <div className="h-4 w-1/3 animate-pulse rounded bg-bank-surface/60" />
      <div className="h-7 w-5/6 animate-pulse rounded bg-bank-surface/80" />
      <div className="h-3 w-1/4 animate-pulse rounded bg-bank-surface/60" />
    </div>
    <div className="h-3 w-full animate-pulse rounded bg-bank-surface/60" />
  </div>
);

const NewsVideoPage = () => {
  const { slug } = useParams();
  const { video, loading, error } = useNewsVideo(slug);

  return (
    <PageContainer>
      <PageMeta
        title={video?.title ?? 'Videos'}
        description={video?.summary ?? undefined}
        path={`/dashboard/news/v/${slug}`}
        image={video?.thumbnail_url}
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
        {video && (
          <Link
            to={`/news/v/${video.slug}`}
            className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted transition-colors hover:text-bank-gold"
          >
            <ExternalLink size={12} strokeWidth={1.5} />
            Auf der Website ansehen
          </Link>
        )}
      </div>

      {loading ? (
        <VideoSkeleton />
      ) : error ? (
        <NewsErrorState error={error} />
      ) : !video ? (
        <SurfaceCard accent className="py-14 text-center">
          <Video size={32} strokeWidth={1.4} className="mx-auto mb-4 text-bank-gold/55" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
            Nicht verfügbar
          </p>
          <h3
            className="dashboard-page-title mt-2 text-[1.2rem] font-semibold leading-tight text-bank-text"
          >
            Dieses Video ist nicht mehr verfügbar
          </h3>
          <span aria-hidden className="my-4 inline-block h-px w-12 bg-bank-gold/55" />
          <p className="mx-auto max-w-md text-[13px] leading-snug text-bank-text-muted">
            Es wurde möglicherweise aus dem aktuellen Video-Feed entfernt.
          </p>
        </SurfaceCard>
      ) : (
        <article className="space-y-7">
          <div className="relative overflow-hidden border border-bank-border bg-bank-bg/40">
            <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
            <EuronewsVideoPlayer
              embedUrl={video.embed_url}
              thumbnailUrl={video.thumbnail_url}
              title={video.title}
              sourceUrl={video.source_url}
            />
          </div>

          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-bank-gold/45 bg-bank-gold/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-bank-gold">
                Videos
              </span>
              {video.show_label && (
                <span className="border border-bank-border bg-white px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
                  {video.show_label}
                </span>
              )}
            </div>
            <h1
              className="dashboard-page-title text-[2rem] font-semibold leading-[1.05] text-bank-text sm:text-[2.6rem]"
            >
              {video.title}
            </h1>
            <span aria-hidden className="block h-px w-16 bg-bank-gold/55" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] tabular-nums text-bank-text-muted">
              Veröffentlicht · {formatDate(video.published_at)}
            </p>
          </header>

          <SurfaceCard accent>
            {video.summary ? (
              <p className="max-w-prose text-[15px] leading-[1.75] text-bank-text">
                {video.summary}
              </p>
            ) : (
              <p className="text-[13.5px] text-bank-text-muted">
                Für dieses Video steht aktuell keine Beschreibung zur Verfügung.
              </p>
            )}
          </SurfaceCard>
        </article>
      )}
    </PageContainer>
  );
};

export default NewsVideoPage;
