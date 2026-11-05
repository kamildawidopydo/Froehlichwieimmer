import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { useNewsList } from '@/hooks/useNewsList';
import { cn } from '@/lib/utils';

// Session 81.08 — Hot-News-Bugfix „tote Detailseite".
// Wurzel: Widget liest Supabase `news_articles` (Euronews-Cache), aber die
// internen Detail-Endpunkte /api/news/nachrichten/:slug bzw. /api/content/news/:slug
// kennen diese aggregierten Slugs nicht → 404 → „Meldung nicht verfügbar".
// Lösung ohne Backend-Änderung und ohne erfundene Inhalte:
//   1) Wenn eine Original-`source_url` vorhanden ist → in neuem Tab öffnen
//      (Euronews-/Publisher-Feed enthält immer die Originalquelle).
//   2) Andernfalls Fröhlich-eigene Redaktions-Slugs → interne kanonische
//      Detail-Route /news/nachrichten/:slug (NachrichtenDetailPage).
//   3) Fehlt beides → kein Link (statt einer toten Karte).
// Die Regel ist eine Verallgemeinerung der bestehenden linkPropsFor-Logik in
// NachrichtenPage.jsx: Supabase-Feed verwendet abweichende content_type-Werte
// (z. B. 'euronews') gegenüber dem FastAPI-Feed. `source_url`-Presence ist
// das robustere Signal dafür, dass die Karte extern öffnen muss.
const buildHotNewsLinkProps = (item) => {
  if (!item) return null;
  if (item.source_url) {
    return { external: true, href: item.source_url };
  }
  if (!item.slug) return null;
  return { external: false, to: `/news/nachrichten/${item.slug}` };
};

const HotNewsCarousel = ({ category = 'business', maxItems = 12 }) => {
  const { items, loading } = useNewsList({ source: 'articles', category, tab: 'recent' });
  const articles = (items || []).slice(0, maxItems);
  const [idx, setIdx] = useState(0);

  if (!loading && articles.length === 0) return null;

  const current = articles[idx];
  const total = articles.length;
  const linkProps = buildHotNewsLinkProps(current);

  const prev = () => setIdx((i) => (i <= 0 ? total - 1 : i - 1));
  const next = () => setIdx((i) => (i >= total - 1 ? 0 : i + 1));

  const CardBody = () => (
    <>
      <p className="line-clamp-3 text-[14px] font-medium leading-snug text-bank-text transition-colors group-hover:text-bank-primary">
        {current.title}
      </p>
      <p className="mt-2 text-[11px] text-bank-text-muted">
        {current.published_at
          ? new Date(current.published_at).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : ''}
        {current.read_time_minutes ? ` · ${current.read_time_minutes} Min.` : ''}
        {linkProps?.external ? (
          <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted">
            · {current.source_name || 'Externe Quelle'} ↗
          </span>
        ) : null}
      </p>
    </>
  );

  return (
    <div className="rounded-xl border border-bank-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
          <Flame size={16} className="text-orange-500" strokeWidth={1.6} />
          Hot News
        </h3>
        {total > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prev}
              disabled={total <= 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bank-border text-bank-text-muted hover:bg-bank-bg disabled:opacity-40"
              aria-label="Vorherige"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="min-w-[3rem] text-center text-[11px] tabular-nums text-bank-text-muted">
              {total ? idx + 1 : 0}/{total}
            </span>
            <button
              type="button"
              onClick={next}
              disabled={total <= 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bank-border text-bank-text-muted hover:bg-bank-bg disabled:opacity-40"
              aria-label="Nächste"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-lg bg-bank-border/40" />
      ) : current && linkProps ? (
        linkProps.external ? (
          <a
            href={linkProps.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
            data-testid="hot-news-link"
          >
            <CardBody />
          </a>
        ) : (
          <Link to={linkProps.to} className="group block" data-testid="hot-news-link">
            <CardBody />
          </Link>
        )
      ) : null}

      {total > 1 && (
        <div className="mt-4 flex justify-center gap-1">
          {articles.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Artikel ${i + 1}`}
              onClick={() => setIdx(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === idx ? 'w-4 bg-bank-primary' : 'w-1.5 bg-bank-border',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HotNewsCarousel;
