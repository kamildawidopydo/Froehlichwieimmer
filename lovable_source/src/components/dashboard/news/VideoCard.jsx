import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Video } from 'lucide-react';

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

const formatDuration = (seconds) => {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = Math.floor(n % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
};

const VideoCard = ({ video }) => {
  if (!video) return null;
  const durationLabel = formatDuration(video.duration_seconds);

  return (
    <Link
      to={`/dashboard/news/v/${video.slug}`}
      className="group relative block overflow-hidden border border-bank-border bg-white transition-all duration-300 hover:border-bank-gold/55 hover:shadow-editorial-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-bank-bg/60">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-bank-gold/55">
            <Video size={28} strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center border border-bank-gold/65 bg-bank-ink/85 text-bank-gold">
            <Play size={20} strokeWidth={1.5} fill="currentColor" />
          </div>
        </div>
        {durationLabel && (
          <span className="absolute bottom-2 right-2 border border-bank-gold/45 bg-bank-ink/85 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-bank-gold">
            {durationLabel}
          </span>
        )}
        {video.show_label && (
          <span className="absolute left-3 top-3 border border-bank-border bg-white/95 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-bank-text shadow-sm backdrop-blur">
            {video.show_label}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <h3
          className="dashboard-page-title line-clamp-2 text-[1.05rem] font-semibold leading-snug text-bank-text"
        >
          {video.title}
        </h3>
        {video.summary && (
          <p className="line-clamp-2 text-[12.5px] leading-snug text-bank-text-muted">
            {video.summary}
          </p>
        )}
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] tabular-nums text-bank-text-muted">
          {formatDate(video.published_at)}
        </p>
      </div>
    </Link>
  );
};

export default VideoCard;
