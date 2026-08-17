import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

const isAllowedEmbed = (url) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return /(?:^|\.)euronews\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
};

const EuronewsVideoPlayer = ({ embedUrl, thumbnailUrl, title, sourceUrl }) => {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quality, setQuality] = useState('auto');
  const url = String(embedUrl ?? '');
  const isStreamUrl = /\.(m3u8|mp4|webm|m3u|mpd)(\?|$)/i.test(url) ||
    /(content|playlist|manifest|master)\./i.test(url);
  const canRenderIframe = isAllowedEmbed(url) && !failed;
  const externalUrl = sourceUrl && String(sourceUrl).startsWith('http') ? sourceUrl : null;

  const streamOptions = useMemo(() => {
    if (!isStreamUrl) return [];
    const opts = [{ id: 'auto', label: 'Auto', url }];
    if (/\/(SHD|MHD|LHD)\//i.test(url)) {
      const shd = url.replace(/\/(SHD|MHD|LHD)\//i, '/SHD/');
      const mhd = url.replace(/\/(SHD|MHD|LHD)\//i, '/MHD/');
      const lhd = url.replace(/\/(SHD|MHD|LHD)\//i, '/LHD/');
      opts.push(
        { id: 'high', label: 'Hoch', url: shd },
        { id: 'medium', label: 'Mittel', url: mhd },
        { id: 'low', label: 'Niedrig', url: lhd },
      );
    }
    return opts;
  }, [isStreamUrl, url]);

  const selectedStreamUrl = useMemo(() => {
    if (!isStreamUrl) return url;
    const hit = streamOptions.find((o) => o.id === quality);
    return hit?.url ?? url;
  }, [isStreamUrl, quality, streamOptions, url]);

  useEffect(() => {
    setFailed(false);
    setLoading(true);
  }, [url, quality]);

  const FallbackPanel = ({ message, submessage }) => (
    <div className="absolute inset-0 z-20 grid place-items-center p-6 text-center text-white">
      <div>
        <AlertTriangle size={24} className="mx-auto mb-2 text-white/90" />
        <p className="text-sm font-medium">{message}</p>
        {submessage && (
          <p className="mt-1 text-xs text-white/80">{submessage}</p>
        )}
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/20"
          >
            Bei Euronews ansehen
          </a>
        )}
      </div>
    </div>
  );

  if (isStreamUrl) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-bank-border/80 bg-black">
        {streamOptions.length > 1 && (
          <div className="absolute right-3 top-3 z-10">
            <label className="sr-only" htmlFor="video-quality-select">Qualität</label>
            <select
              id="video-quality-select"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="rounded-md border border-white/25 bg-black/60 px-2 py-1 text-xs text-white backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {streamOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  Qualität: {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/45">
            <div className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 text-xs text-white">
              <Loader2 size={14} className="animate-spin" />
              Video wird geladen...
            </div>
          </div>
        )}

        {failed && (
          <FallbackPanel
            message="Video konnte nicht abgespielt werden."
            submessage="Bitte später erneut versuchen."
          />
        )}

        <video
          src={selectedStreamUrl}
          controls
          playsInline
          autoPlay={false}
          muted
          preload="metadata"
          poster={thumbnailUrl || undefined}
          className="h-full w-full"
          onWaiting={() => setLoading(true)}
          onLoadStart={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onPlaying={() => setLoading(false)}
          onError={() => {
            setFailed(true);
            setLoading(false);
          }}
        />
      </div>
    );
  }

  if (!canRenderIframe) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-bank-border/80 bg-black">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover opacity-55"
          />
        )}
        <FallbackPanel
          message="Video kann hier gerade nicht abgespielt werden."
          submessage="Bitte später erneut versuchen."
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-bank-border/80 bg-black">
      {loading && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/45">
          <div className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2 text-xs text-white">
            <Loader2 size={14} className="animate-spin" />
            Video wird geladen...
          </div>
        </div>
      )}
      {failed && (
        <FallbackPanel
          message="Video konnte nicht abgespielt werden."
          submessage="Bitte später erneut versuchen."
        />
      )}
      <iframe
        title={title || 'Euronews Video'}
        src={url}
        allow="fullscreen; encrypted-media; picture-in-picture; clipboard-write"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
        onLoad={() => setLoading(false)}
        className="absolute inset-0 h-full w-full pointer-events-auto"
      />
    </div>
  );
};

export default EuronewsVideoPlayer;
