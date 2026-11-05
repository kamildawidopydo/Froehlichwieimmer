import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, Video } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { useAuth } from '@/context/AuthContext';
import { useNewsVideo } from '@/hooks/useNewsVideo';
import { listRelatedVideos } from '@/services/newsService';
import { formatNewsDate } from '@/lib/news/formatNews';
import PublicNewsLayout from '@/components/news/PublicNewsLayout';
import PublicNewsErrorState from '@/components/news/PublicNewsErrorState';
import PublicVideoCarousel from '@/components/news/PublicVideoCarousel';
import EuronewsVideoPlayer from '@/components/dashboard/news/EuronewsVideoPlayer';

const VideoSkeleton = () => (
  <div className="mx-auto max-w-3xl space-y-8">
    <div className="aspect-video w-full animate-pulse rounded-2xl bg-bank-bg/70" />
    <div className="space-y-4">
      <div className="h-4 w-1/3 animate-pulse rounded bg-bank-bg/60" />
      <div className="h-9 w-5/6 animate-pulse rounded bg-bank-bg/80" />
    </div>
  </div>
);

const PublicNewsVideoPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { video, loading, error } = useNewsVideo(slug);
  const [relatedVideos, setRelatedVideos] = useState([]);

  useEffect(() => {
    if (!video?.slug) return undefined;
    const controller = new AbortController();
    listRelatedVideos({
      showLabel: video.show_label,
      excludeSlug: video.slug,
      limit: 8,
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted) setRelatedVideos(data ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRelatedVideos([]);
      });
    return () => controller.abort();
  }, [video?.slug, video?.show_label]);

  return (
    <PublicNewsLayout>
      <PageMeta
        title={video?.title ?? 'Videos'}
        description={video?.summary ?? undefined}
        path={`/news/v/${slug}`}
        image={video?.thumbnail_url}
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
        {user && video && (
          <Link
            to={`/dashboard/news/v/${video.slug}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-bank-text-muted transition-colors hover:text-bank-gold"
          >
            <LayoutDashboard size={13} strokeWidth={1.5} />
            Im Dashboard öffnen
          </Link>
        )}
      </div>

      {loading ? (
        <VideoSkeleton />
      ) : error ? (
        <PublicNewsErrorState error={error} />
      ) : !video ? (
        <div className="mx-auto max-w-lg rounded-2xl border border-bank-border/60 bg-bank-surface px-6 py-16 text-center shadow-sm dark:bg-bank-ink/20">
          <Video size={32} strokeWidth={1.4} className="mx-auto mb-4 text-bank-gold/50" />
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
            Nicht verfügbar
          </p>
          <h1 className="font-display mt-2 text-[1.5rem] font-light text-bank-text">
            Dieses Video ist nicht mehr verfügbar
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-bank-text-muted">
            Es wurde möglicherweise aus dem aktuellen Video-Feed entfernt.
          </p>
        </div>
      ) : (
        <article className="mx-auto max-w-3xl space-y-8">
          <div className="overflow-hidden rounded-2xl border border-bank-border/60 bg-bank-bg/40 shadow-sm">
            <EuronewsVideoPlayer
              embedUrl={video.embed_url}
              thumbnailUrl={video.thumbnail_url}
              title={video.title}
              sourceUrl={video.source_url}
            />
          </div>

          <header className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-bank-gold/35 bg-bank-gold/10 px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-bank-gold">
                Videos
              </span>
              {video.show_label && (
                <span className="rounded-full border border-bank-border/70 bg-bank-surface px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-bank-text-muted dark:bg-bank-ink/30">
                  {video.show_label}
                </span>
              )}
            </div>
            <h1 className="font-display text-[2rem] font-light leading-[1.08] text-bank-text sm:text-[2.5rem]">
              {video.title}
            </h1>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] tabular-nums text-bank-text-muted">
              Veröffentlicht · {formatNewsDate(video.published_at, { long: true })}
            </p>
          </header>

          <div className="rounded-2xl border border-bank-border/60 bg-bank-surface p-6 shadow-sm sm:p-8 dark:bg-bank-ink/20">
            {video.summary ? (
              <p className="max-w-prose text-[15px] leading-[1.8] text-bank-text">
                {video.summary}
              </p>
            ) : (
              <p className="text-[14px] text-bank-text-muted">
                Für dieses Video steht aktuell keine Beschreibung zur Verfügung.
              </p>
            )}
          </div>

          <PublicVideoCarousel
            title="Weitere Videos"
            videos={relatedVideos}
          />
        </article>
      )}
    </PublicNewsLayout>
  );
};

export default PublicNewsVideoPage;
