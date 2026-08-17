import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Video } from 'lucide-react';
import { formatNewsDate, formatVideoDuration } from '@/lib/news/formatNews';
import HighlightText from '@/components/news/HighlightText';

const PublicVideoCard = ({ video, highlightQuery = '' }) => {
  if (!video) return null;
  const durationLabel = formatVideoDuration(video.duration_seconds);

  return (
    <Link
      to={`/news/v/${video.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-bank-border/70 bg-bank-surface shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-bank-gold/35 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 dark:bg-bank-ink/25"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-bank-bg/50">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-bank-gold/45">
            <Video size={28} strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-bank-ink/80 text-white backdrop-blur-sm">
            <Play size={18} strokeWidth={1.5} fill="currentColor" />
          </div>
        </div>
        {durationLabel && (
          <span className="absolute bottom-2.5 right-2.5 rounded-md bg-bank-ink/80 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white backdrop-blur-sm">
            {durationLabel}
          </span>
        )}
        {video.show_label && (
          <span className="absolute left-3 top-3 rounded-full border border-bank-border/60 bg-bank-surface/95 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-bank-text-muted backdrop-blur-sm">
            {video.show_label}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <h3 className="font-display line-clamp-2 text-[1.15rem] font-light leading-snug text-bank-text transition-colors group-hover:text-bank-gold">
          <HighlightText text={video.title} query={highlightQuery} />
        </h3>
        {video.summary && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-bank-text-muted">
            <HighlightText text={video.summary} query={highlightQuery} />
          </p>
        )}
        <p className="mt-auto pt-1 text-[11px] font-medium uppercase tracking-[0.14em] tabular-nums text-bank-text-muted/80">
          {formatNewsDate(video.published_at)}
        </p>
      </div>
    </Link>
  );
};

export default PublicVideoCard;
