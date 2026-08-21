import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ArrowLeft, ArrowUp, ArrowDown, TrendingUp, TrendingDown, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import MiniSparkline from '@/components/watchlist/MiniSparkline';
import { watchlistApi, useWatchlist } from '@/services/watchlistApi';
import { formatMarketPrice, formatChangePct, formatLastUpdated } from '@/services/marketService';

const SPARKLINE_SYMBOLS = new Set(['DAX', 'SPX', 'NDX', 'DJI']);

const ASSET_LABEL = {
  index: 'Index',
  stock: 'Aktie',
  etf: 'ETF',
  commodity: 'Rohstoff',
  fx: 'Währung',
  fund: 'Fonds',
  bond: 'Anleihe',
};

const useDebounced = (v, ms = 300) => {
  const [d, setD] = useState(v);
  useEffect(() => { const id = setTimeout(() => setD(v), ms); return () => clearTimeout(id); }, [v, ms]);
  return d;
};

const SearchPanel = ({ existingSymbols, onAdded }) => {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 350);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!debounced.trim()) { setResults([]); setSource(null); return; }
    let alive = true;
    setLoading(true);
    watchlistApi.search(debounced.trim(), 12)
      .then((d) => { if (alive) { setResults(d.items || []); setSource(d.source); } })
      .catch(() => { if (alive) setResults([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [debounced]);

  const handleAdd = async (item) => {
    try {
      await onAdded({ symbol: item.symbol, display_name: item.name, asset_type: item.asset_type });
      toast.success(`${item.name} hinzugefügt`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Konnte nicht hinzugefügt werden.');
    }
  };

  return (
    <div className="border border-bank-border bg-white p-5 sm:p-6" data-testid="watchlist-search-panel">
      <p className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.24em] text-bank-accent-strong">
        <Search size={12} strokeWidth={1.7} /> Symbol hinzufügen
      </p>
      <h3 className="mt-2 font-serif text-xl text-bank-text">Suche nach Aktien, Indizes oder ETFs</h3>
      <p className="mt-1 text-[13px] text-bank-text-muted">
        Beispiele: <span className="font-mono">TSLA</span>, <span className="font-mono">NVDA</span>,{' '}
        <span className="font-mono">SAP</span>, <span className="font-mono">VOW3.DE</span>, <span className="font-mono">Amazon</span>
      </p>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bank-text-muted" strokeWidth={1.6} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Symbol oder Name suchen …"
          data-testid="watchlist-search-input"
          autoComplete="off"
          className="w-full rounded-full border border-bank-border bg-white py-2.5 pl-10 pr-10 text-[14px] outline-none transition-colors focus:border-bank-primary"
        />
        {query && (
          <button
            type="button"
            aria-label="Suche zurücksetzen"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-bank-text-muted hover:bg-neutral-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {loading && <p className="mt-3 text-[12px] text-bank-text-muted">Suche läuft …</p>}
      {!loading && debounced.trim() && results.length === 0 && (
        <p className="mt-3 text-[12.5px] text-bank-text-muted" data-testid="watchlist-search-empty">
          Keine Treffer für „{debounced}".{' '}
          {source === 'curated' && 'Der Live-Anbieter ist noch nicht konfiguriert — sobald Alpha Vantage aktiv ist, stehen dort deutlich mehr Symbole zur Verfügung.'}
        </p>
      )}
      {results.length > 0 && (
        <div className="mt-4 border-t border-bank-border/60 pt-3" data-testid="watchlist-search-results">
          <ul className="divide-y divide-bank-border/60">
            {results.map((r) => {
              const already = existingSymbols.has(r.symbol);
              return (
                <li key={r.symbol} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="truncate font-serif text-[14.5px] text-bank-text">{r.name}</span>
                      <span className="rounded-full border border-bank-border px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                        {r.symbol}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                      {ASSET_LABEL[r.asset_type] || 'Wertpapier'}
                      {r.region ? ` · ${r.region}` : ''}
                      {r.source === 'curated' && ' · kuratiert'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(r)}
                    disabled={already}
                    data-testid={`watchlist-search-add-${r.symbol}`}
                    className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[12px] transition-colors ${
                      already
                        ? 'cursor-not-allowed border-bank-border/60 text-bank-text-muted'
                        : 'border-bank-primary text-bank-primary hover:bg-bank-primary hover:text-white'
                    }`}
                  >
                    {already ? 'Bereits enthalten' : (<><Plus size={12} strokeWidth={1.8} /> Hinzufügen</>)}
                  </button>
                </li>
              );
            })}
          </ul>
          {source === 'curated' && (
            <p className="mt-3 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              Ergebnisse aus unserer kuratierten Auswahl · Live-Symbolsuche aktiv, sobald der Alpha-Vantage-Key gesetzt ist.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const WatchlistPage = () => {
  const { items, loading, isAuthed, add, remove, reorder } = useWatchlist();
  const navigate = useNavigate();
  const existingSymbols = useMemo(() => new Set(items.map((i) => i.symbol)), [items]);

  useEffect(() => {
    if (!loading && !isAuthed) navigate('/login?next=/news/watchlist', { replace: true });
  }, [loading, isAuthed, navigate]);

  const move = async (idx, delta) => {
    const target = idx + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [row] = next.splice(idx, 1);
    next.splice(target, 0, row);
    try {
      await reorder(next.map((i) => i.symbol));
    } catch {
      toast.error('Sortierung konnte nicht gespeichert werden.');
    }
  };

  return (
    <div className="bg-white" data-testid="watchlist-page">
      <PageMeta
        title="Meine Watchlist — Fröhlich Vermögensberatung"
        description="Verwalten Sie Ihre persönliche Watchlist: Aktien, Indizes, ETFs, Rohstoffe. Live-Kurse, Sparklines und passende Marktnachrichten auf einen Blick."
        path="/news/watchlist"
        noIndex
      />

      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-6xl px-6 pb-12 pt-14 sm:px-10 sm:pt-16">
          <Link
            to="/news"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bank-text-muted hover:text-bank-primary"
          >
            <ArrowLeft size={12} strokeWidth={1.7} /> Zurück zu News &amp; Märkte
          </Link>
          <div className="mt-6 flex flex-col gap-2">
            <Eyebrow>Meine Watchlist</Eyebrow>
            <h1 className="font-serif text-4xl leading-[1.05] text-bank-text sm:text-5xl">
              Ihre persönliche Beobachtung
            </h1>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-bank-text-muted">
              Behalten Sie relevante Titel, Indizes und Rohstoffe im Blick. Live-Kurse, dezente Sparklines für die
              wichtigsten Indizes, geräteübergreifende Speicherung.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main list */}
        <section className="min-w-0">
          {loading ? (
            <div className="border border-bank-border bg-white">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[80px] animate-pulse border-b border-bank-border/60 bg-neutral-50" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="border border-dashed border-bank-border bg-neutral-50/60 px-6 py-12 text-center" data-testid="watchlist-empty-main">
              <Heart className="mx-auto h-8 w-8 text-bank-text-muted" strokeWidth={1.4} />
              <p className="mt-4 font-serif text-lg text-bank-text">Ihre Watchlist ist leer</p>
              <p className="mt-1 text-[13px] text-bank-text-muted">
                Suchen Sie rechts nach Symbolen oder tippen Sie z. B. „NVDA", „VOW3.DE" oder „Apple".
              </p>
            </div>
          ) : (
            <div className="border border-bank-border bg-white" data-testid="watchlist-full-list">
              {items.map((item, idx) => {
                const q = item.quote;
                const positive = (q?.change_percent ?? 0) >= 0;
                const Icon = positive ? TrendingUp : TrendingDown;
                const changeColor = positive ? 'text-emerald-700' : 'text-rose-700';
                return (
                  <div
                    key={item.symbol}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-bank-border/60 px-4 py-4 sm:px-5"
                    data-testid={`watchlist-full-row-${item.symbol}`}
                  >
                    {/* Sort controls */}
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label="Nach oben verschieben"
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        data-testid={`watchlist-up-${item.symbol}`}
                        className="p-0.5 text-bank-text-muted hover:text-bank-primary disabled:opacity-30"
                      >
                        <ArrowUp size={12} strokeWidth={1.7} />
                      </button>
                      <button
                        type="button"
                        aria-label="Nach unten verschieben"
                        onClick={() => move(idx, 1)}
                        disabled={idx === items.length - 1}
                        data-testid={`watchlist-down-${item.symbol}`}
                        className="p-0.5 text-bank-text-muted hover:text-bank-primary disabled:opacity-30"
                      >
                        <ArrowDown size={12} strokeWidth={1.7} />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-serif text-[15.5px] text-bank-text">{item.display_name}</p>
                        <span className="rounded-full border border-bank-border px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                          {item.symbol}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                        {ASSET_LABEL[item.asset_type] || 'Wertpapier'}
                        {q?.data_source === 'fallback' && ' · Fallback-Kurs'}
                      </p>
                      {SPARKLINE_SYMBOLS.has(item.symbol) && (
                        <div className="mt-2 sm:hidden">
                          <MiniSparkline symbol={item.symbol} width={140} height={26} />
                        </div>
                      )}
                    </div>

                    {/* Price + Sparkline + Remove */}
                    <div className="flex items-center gap-3">
                      {SPARKLINE_SYMBOLS.has(item.symbol) && (
                        <div className="hidden sm:block">
                          <MiniSparkline symbol={item.symbol} width={90} height={26} />
                        </div>
                      )}
                      <div className="min-w-[76px] text-right">
                        <p className="font-serif text-[16px] tabular-nums text-bank-text" data-numeric>
                          {q?.price != null ? formatMarketPrice(q.price) : '–'}
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
                        onClick={() => remove(item.symbol)}
                        aria-label={`${item.display_name} entfernen`}
                        data-testid={`watchlist-full-remove-${item.symbol}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bank-border text-rose-600 transition-colors hover:bg-rose-50"
                      >
                        <Heart size={13} strokeWidth={1.6} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {items[0]?.quote?.last_updated && (
            <p className="mt-3 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              Letzte Aktualisierung: {formatLastUpdated(items[0].quote.last_updated)} Uhr · Marktdaten zeitverzögert · Keine Anlageempfehlung
            </p>
          )}
        </section>

        {/* Search sidebar */}
        <aside className="min-w-0">
          <SearchPanel existingSymbols={existingSymbols} onAdded={add} />
          <div className="mt-6 border border-bank-border bg-bank-bg/40 p-5 text-[12.5px] leading-relaxed text-bank-text-muted">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text">Datenquelle</p>
            <p className="mt-2">
              Kurse werden serverseitig gecacht (5 – 15 Minuten). Sparklines aktualisieren sich alle 15 Minuten.
              Solange kein Live-Datenanbieter konfiguriert ist, sehen Sie deterministische Fallback-Werte,
              erkennbar am Label „Fallback-Kurs".
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WatchlistPage;
