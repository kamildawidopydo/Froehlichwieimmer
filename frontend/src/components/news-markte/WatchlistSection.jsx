import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Heart, ArrowUpRight, Sparkles, Newspaper } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import MiniSparkline from '@/components/watchlist/MiniSparkline';
import SymbolNews from '@/components/watchlist/SymbolNews';
import { useWatchlist } from '@/services/watchlistApi';
import { formatMarketPrice, formatChangePct, formatLastUpdated } from '@/services/marketService';

const SPARKLINE_SYMBOLS = new Set(['DAX', 'SPX', 'NDX', 'DJI']);
const ASSET_LABEL = {
  index: 'Index', stock: 'Aktie', etf: 'ETF',
  commodity: 'Rohstoff', fx: 'Währung', fund: 'Fonds', bond: 'Anleihe',
};

const WatchlistRow = ({ item, onRemove }) => {
  const q = item.quote;
  const positive = (q?.change_percent ?? 0) >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const changeColor = positive ? 'text-emerald-700' : 'text-rose-700';

  return (
    <article
      className="group relative border-b border-bank-border/60 px-4 py-4 transition-colors hover:bg-bank-bg/40 sm:px-5"
      data-testid={`watchlist-row-${item.symbol}`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-serif text-[15.5px] text-bank-text">{item.display_name}</p>
            <span className="rounded-full border border-bank-border px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              {item.symbol}
            </span>
          </div>
          <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
            {ASSET_LABEL[item.asset_type] || 'Wertpapier'}
            {q?.data_source === 'fallback' && ' · Fallback'}
          </p>
        </div>

        {SPARKLINE_SYMBOLS.has(item.symbol) && (
          <div className="hidden sm:block">
            <MiniSparkline symbol={item.symbol} width={90} height={26} />
          </div>
        )}

        <div className="min-w-[76px] text-right">
          <p className="font-serif text-[16px] tabular-nums text-bank-text" data-numeric>
            {q?.price != null ? formatMarketPrice(q.price) : '–'}
            {q?.currency && (
              <span className="ml-1 text-[10px] font-mono uppercase tracking-[0.14em] text-bank-text-muted">{q.currency}</span>
            )}
          </p>
          {q?.change_percent != null && (
            <p className={`mt-0.5 flex items-center justify-end gap-1 font-mono text-[11.5px] tabular-nums ${changeColor}`}>
              <Icon size={11} strokeWidth={1.8} />
              {positive ? '+' : '−'}{formatChangePct(q.change_percent)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.symbol)}
          aria-label={`${item.display_name} entfernen`}
          data-testid={`watchlist-remove-${item.symbol}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bank-border text-rose-600 transition-colors hover:bg-rose-50"
        >
          <Heart size={13} strokeWidth={1.6} fill="currentColor" />
        </button>
      </div>

      {/* One-line news preview */}
      <SymbolNews symbol={item.symbol} displayName={item.display_name} limit={1} variant="compact" />
    </article>
  );
};

const WatchlistSection = () => {
  const { items, loading, isAuthed, remove } = useWatchlist();

  return (
    <section className="border-t border-bank-border pt-14 sm:pt-16" data-testid="watchlist-section">
      <div className="flex flex-col gap-3">
        <Eyebrow>Meine Watchlist</Eyebrow>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">
            Ihre persönliche Beobachtung
          </h2>
          <Link
            to="/news/watchlist"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium uppercase tracking-[0.18em] text-bank-primary underline-offset-4 hover:underline"
            data-testid="watchlist-manage-link"
          >
            Verwalten <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
        </div>
        <p className="max-w-2xl text-[13px] text-bank-text-muted">
          Beobachten. Verstehen. Einordnen. — Kurse und passende aktuelle Meldungen zu Ihren Werten,
          serverseitig gespeichert und geräteübergreifend verfügbar.
        </p>
      </div>

      <div className="mt-8">
        {!isAuthed ? (
          <div className="flex flex-col items-start gap-4 border border-bank-border bg-white px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8" data-testid="watchlist-cta-login">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.24em] text-bank-accent-strong">
                <Sparkles size={13} strokeWidth={1.6} /> Persönliche Watchlist
              </p>
              <p className="mt-2 font-serif text-lg leading-snug text-bank-text sm:text-xl">
                Erstellen Sie Ihre persönliche Watchlist und behalten Sie relevante Märkte und Unternehmen im Blick.
              </p>
              <p className="mt-2 text-[13px] text-bank-text-muted">
                Wir speichern Ihre Watchlist geräteübergreifend, verknüpfen sie mit passenden News und aktuellen Kursdaten.
              </p>
            </div>
            <Link
              to="/login?next=/news"
              className="inline-flex items-center gap-2 whitespace-nowrap bg-bank-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-bank-primary/90"
              data-testid="watchlist-login-btn"
            >
              Einloggen &amp; Watchlist erstellen
              <ArrowUpRight size={14} strokeWidth={1.7} />
            </Link>
          </div>
        ) : loading ? (
          <div className="border border-bank-border bg-white">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[100px] animate-pulse border-b border-bank-border/60 bg-neutral-50" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-start gap-3 border border-bank-border bg-white px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8" data-testid="watchlist-empty">
            <div>
              <p className="font-serif text-lg text-bank-text">Ihre Watchlist ist leer</p>
              <p className="mt-1 text-[13px] text-bank-text-muted">
                Setzen Sie unten das Herz auf einer Kachel oder öffnen Sie die Verwaltung, um Symbole zu suchen und hinzuzufügen.
              </p>
            </div>
            <Link
              to="/news/watchlist"
              className="inline-flex items-center gap-1.5 border border-bank-border px-4 py-2 text-[12.5px] font-medium text-bank-text transition-colors hover:border-bank-primary/60"
              data-testid="watchlist-add-first-link"
            >
              Symbol hinzufügen
              <ArrowUpRight size={13} strokeWidth={1.7} />
            </Link>
          </div>
        ) : (
          <>
            <div className="border border-bank-border bg-white" data-testid="watchlist-list">
              {items.slice(0, 5).map((item) => (
                <WatchlistRow key={item.symbol} item={item} onRemove={remove} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {items[0]?.quote?.last_updated ? (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                  <span>Letzte Aktualisierung: {formatLastUpdated(items[0].quote.last_updated)} Uhr</span>
                  {items[0].quote.is_delayed && (<><span aria-hidden className="text-bank-gold">·</span><span>Marktdaten zeitverzögert</span></>)}
                  <span aria-hidden className="text-bank-gold">·</span>
                  <span>Beobachten. Verstehen. Einordnen.</span>
                </p>
              ) : <span />}
              <Link
                to="/news/watchlist"
                className="inline-flex items-center gap-1.5 border border-bank-border px-4 py-2 text-[12px] font-medium uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-primary/60"
                data-testid="watchlist-more-news-btn"
              >
                <Newspaper size={12} strokeWidth={1.7} />
                Weitere News &amp; Verwaltung
              </Link>
            </div>
            {items.length > 5 && (
              <p className="mt-2 text-[12px] text-bank-text-muted">
                {items.length - 5} weitere Werte in Ihrer{' '}
                <Link to="/news/watchlist" className="text-bank-primary underline-offset-4 hover:underline">vollständigen Watchlist</Link>.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default WatchlistSection;
