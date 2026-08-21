import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import WatchButton from '@/components/watchlist/WatchButton';
import { useWatchlist } from '@/services/watchlistApi';
import { fetchFeaturedStocks, formatMarketPrice, formatChangePct, formatLastUpdated } from '@/services/marketService';

const StockCard = ({ row, watch }) => {
  const positive = (row.changePct ?? 0) >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const changeColor = positive ? 'text-emerald-700' : 'text-rose-700';
  const prefix = positive ? '+' : '−';
  return (
    <div
      className="group relative flex min-w-0 flex-col justify-between gap-3 border border-bank-border bg-white px-5 py-4 transition-colors hover:border-bank-accent-strong/50"
      data-testid={`stock-tile-${row.symbol}`}
    >
      <WatchButton
        symbol={row.symbol}
        displayName={row.name}
        assetType="stock"
        watched={watch.isWatched(row.symbol)}
        isAuthed={watch.isAuthed}
        onAdd={watch.add}
        onRemove={watch.remove}
      />
      <div className="flex items-start justify-between gap-3 pr-8">
        <div className="min-w-0">
          <p className="truncate font-serif text-[16px] text-bank-text">{row.name}</p>
          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-neutral-400">{row.symbol}</p>
        </div>
        <Icon className={`h-4 w-4 shrink-0 ${changeColor}`} strokeWidth={1.5} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="font-serif text-xl tabular-nums text-bank-text" data-numeric>
          {formatMarketPrice(row.price)} <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-bank-text-muted">{row.currency}</span>
        </p>
        <span className={`font-mono text-[12.5px] tabular-nums ${changeColor}`}>
          {prefix}{formatChangePct(row.changePct)}
        </span>
      </div>
    </div>
  );
};

const AktienImFokus = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const watch = useWatchlist();

  useEffect(() => {
    let alive = true;
    fetchFeaturedStocks(12)
      .then((r) => { if (alive) setRows(r); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const lastUpdated = rows[0]?.lastUpdated;
  const isDelayed = rows[0]?.isDelayed ?? true;

  return (
    <section className="border-t border-bank-border pt-14 sm:pt-16" data-testid="aktien-im-fokus">
      <div className="flex flex-col gap-3">
        <Eyebrow>Aktien im Fokus</Eyebrow>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">
            Ausgewählte Titel im Überblick
          </h2>
          <p className="max-w-md text-[13.5px] text-bank-text-muted sm:text-right">
            Kurz-Snapshot deutscher und internationaler Titel für unsere Anleger — keine Anlageempfehlung.
          </p>
        </div>
      </div>

      {error ? (
        <p
          className="mt-6 border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900"
          data-testid="aktien-error"
        >
          Marktdaten sind derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.
        </p>
      ) : loading ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[120px] animate-pulse bg-neutral-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="aktien-grid">
            {rows.map((r) => (<StockCard key={r.symbol} row={r} watch={watch} />))}
          </div>
          <p
            className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] uppercase tracking-[0.16em] text-bank-text-muted"
            data-testid="aktien-last-updated"
          >
            {lastUpdated && <span>Letzte Aktualisierung: {formatLastUpdated(lastUpdated)} Uhr</span>}
            {lastUpdated && isDelayed && <span aria-hidden className="text-bank-gold">·</span>}
            {isDelayed && <span>Marktdaten zeitverzögert</span>}
            <span aria-hidden className="text-bank-gold">·</span>
            <span>Keine Anlageempfehlung</span>
          </p>
        </>
      )}
    </section>
  );
};

export default AktienImFokus;
