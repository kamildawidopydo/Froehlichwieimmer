import React, { useEffect, useState } from 'react';
import { ExternalLink, Newspaper } from 'lucide-react';
import { symbolNewsApi, formatPublishedAt } from '@/services/symbolNewsApi';

const NewsCard = ({ item, dense = false }) => (
  <a
    href={item.url}
    target="_blank"
    rel="noopener noreferrer"
    className="group block rounded-none border-l-2 border-bank-border pl-3 transition-colors hover:border-bank-accent-strong"
    data-testid={`symbol-news-item`}
  >
    <p className={`font-serif ${dense ? 'text-[13px] leading-snug' : 'text-[14px] leading-snug'} text-bank-text transition-colors group-hover:text-bank-primary`}>
      {item.title}
      <ExternalLink size={10} strokeWidth={1.7} className="ml-1 inline-block opacity-60 transition-opacity group-hover:opacity-100" />
    </p>
    {!dense && item.summary && (
      <p className="mt-1 text-[12.5px] leading-relaxed text-bank-text-muted">{item.summary}</p>
    )}
    <p className={`${dense ? 'mt-1' : 'mt-1.5'} flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted`}>
      <span className="font-medium">{item.source || 'Externe Quelle'}</span>
      {item.published_at && (<><span aria-hidden className="text-bank-gold">·</span><span>{formatPublishedAt(item.published_at)}</span></>)}
      {item.category && (<><span aria-hidden className="text-bank-gold">·</span><span>{item.category}</span></>)}
    </p>
  </a>
);

/**
 * SymbolNews — renders up to `limit` news items for a given symbol.
 * Two visual modes:
 *  - `variant="compact"` (default, /news): 1 headline, no summary
 *  - `variant="detailed"` (/news/watchlist): 2–3 headlines with summary
 */
const SymbolNews = ({ symbol, displayName, limit = 3, variant = 'detailed', data }) => {
  const [items, setItems] = useState(data?.items ?? null);
  const [meta, setMeta] = useState(data ? { data_source: data.data_source, empty_reason: data.empty_reason, provider_configured: data.provider_configured } : null);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (data) {
      setItems(data.items || []);
      setMeta({ data_source: data.data_source, empty_reason: data.empty_reason, provider_configured: data.provider_configured });
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    symbolNewsApi
      .forSymbol(symbol)
      .then((d) => {
        if (!alive) return;
        setItems(d.items || []);
        setMeta({ data_source: d.data_source, empty_reason: d.empty_reason, provider_configured: d.provider_configured });
      })
      .catch(() => { if (alive) { setItems([]); setMeta({ data_source: 'error' }); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [symbol, data]);

  const shown = (items || []).slice(0, limit);

  if (loading) {
    return (
      <div className="mt-3 space-y-2" aria-hidden data-testid={`symbol-news-loading-${symbol}`}>
        {Array.from({ length: variant === 'compact' ? 1 : 2 }).map((_, i) => (
          <div key={i} className="h-[38px] animate-pulse rounded-none bg-neutral-100" />
        ))}
      </div>
    );
  }

  if (shown.length === 0) {
    return (
      <div className="mt-3 border-l-2 border-bank-border/60 pl-3" data-testid={`symbol-news-empty-${symbol}`}>
        <p className="flex items-center gap-1.5 text-[11.5px] leading-relaxed text-bank-text-muted">
          <Newspaper size={11} strokeWidth={1.6} />
          Aktuell keine relevanten Meldungen zu {displayName || symbol} verfügbar.
        </p>
        {meta?.empty_reason === 'no_provider' && (
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-bank-text-muted/80">
            News-Provider noch nicht konfiguriert
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`mt-3 space-y-${variant === 'compact' ? '2' : '3'}`} data-testid={`symbol-news-list-${symbol}`}>
      {shown.map((item, idx) => (
        <NewsCard key={`${symbol}-${idx}-${item.url || item.title}`} item={item} dense={variant === 'compact'} />
      ))}
    </div>
  );
};

export default SymbolNews;
