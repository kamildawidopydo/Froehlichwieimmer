import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ArrowLeft, GripVertical, TrendingUp, TrendingDown, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import MiniSparkline from '@/components/watchlist/MiniSparkline';
import SymbolNews from '@/components/watchlist/SymbolNews';
import { watchlistApi, useWatchlist } from '@/services/watchlistApi';
import { symbolNewsApi } from '@/services/symbolNewsApi';
import { formatDisplayPrice, formatChangePct, formatLastUpdated } from '@/services/marketService';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const eventsClient = axios.create({ baseURL: `${API_BASE}/api`, withCredentials: true });

const SPARKLINE_SYMBOLS = new Set(['DAX', 'SPX', 'NDX', 'DJI']);
const ASSET_LABEL = {
  index: 'Index', stock: 'Aktie', etf: 'ETF',
  commodity: 'Rohstoff', fx: 'Währung', fund: 'Fonds', bond: 'Anleihe',
};

const useDebounced = (v, ms = 300) => {
  const [d, setD] = useState(v);
  useEffect(() => { const id = setTimeout(() => setD(v), ms); return () => clearTimeout(id); }, [v, ms]);
  return d;
};

// -------------------------------- Search -----------------------------------

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
        <span className="font-mono">SAP</span>, <span className="font-mono">VOW3.DE</span>,{' '}
        <span className="font-mono">Amazon</span>
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
          <button type="button" aria-label="Suche zurücksetzen" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-bank-text-muted hover:bg-neutral-100">
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
                      <span className="rounded-full border border-bank-border px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-bank-text-muted">{r.symbol}</span>
                    </p>
                    <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                      {ASSET_LABEL[r.asset_type] || 'Wertpapier'}{r.region ? ` · ${r.region}` : ''}{r.source === 'curated' && ' · kuratiert'}
                    </p>
                  </div>
                  <button
                    type="button" onClick={() => handleAdd(r)} disabled={already}
                    data-testid={`watchlist-search-add-${r.symbol}`}
                    className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[12px] transition-colors ${
                      already ? 'cursor-not-allowed border-bank-border/60 text-bank-text-muted'
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

// ---------------------------- Sortable Row ---------------------------------

const SortableWatchlistItem = ({ item, onRemove, newsData, eventInfo, selected, onToggleCompare }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.symbol });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 30 : 'auto' };

  const q = item.quote;
  const positive = (q?.change_percent ?? 0) >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const changeColor = positive ? 'text-emerald-700' : 'text-rose-700';

  const eventBadges = [];
  if (eventInfo) {
    if (typeof eventInfo.next_earnings_days === 'number' && eventInfo.next_earnings_days >= 0 && eventInfo.next_earnings_days <= 60) {
      const label = eventInfo.next_earnings_is_range && eventInfo.next_earnings_date_end !== eventInfo.next_earnings_date
        ? `voraussichtlich Earnings in ${eventInfo.next_earnings_days} Tagen`
        : eventInfo.next_earnings_days === 0
          ? 'Earnings heute'
          : `Earnings in ${eventInfo.next_earnings_days} Tag${eventInfo.next_earnings_days === 1 ? '' : 'en'}`;
      eventBadges.push({ label, tone: 'primary' });
    }
    if (typeof eventInfo.ex_dividend_days === 'number' && eventInfo.ex_dividend_days >= 0 && eventInfo.ex_dividend_days <= 60) {
      const label = eventInfo.ex_dividend_days === 0
        ? 'Ex-Dividende heute'
        : `Ex-Dividende in ${eventInfo.ex_dividend_days} Tag${eventInfo.ex_dividend_days === 1 ? '' : 'en'}`;
      eventBadges.push({ label, tone: 'gold' });
    }
    if (typeof eventInfo.dividend_yield_pct === 'number') {
      eventBadges.push({ label: `Div-Yield ${eventInfo.dividend_yield_pct.toFixed(2)} %`, tone: 'muted' });
    }
    if (typeof eventInfo.distance_from_52w_high_pct === 'number') {
      const d = eventInfo.distance_from_52w_high_pct;
      eventBadges.push({ label: `${d >= 0 ? '+' : ''}${d.toFixed(1)} % vom 52W-Hoch`, tone: 'muted' });
    }
    if (typeof eventInfo.news_count_24h === 'number' && eventInfo.news_count_24h > 0) {
      eventBadges.push({ label: `${eventInfo.news_count_24h} neue Meldung${eventInfo.news_count_24h === 1 ? '' : 'en'} (24 h)`, tone: 'primary' });
    }
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`group border-b border-bank-border/60 bg-white px-4 py-4 transition-shadow sm:px-5 ${isDragging ? 'shadow-lg' : ''} ${selected ? 'ring-2 ring-bank-primary/40 ring-inset' : ''}`}
      data-testid={`watchlist-full-row-${item.symbol}`}
      aria-roledescription="Sortierbares Element"
    >
      <div className="flex items-start gap-3">
        {/* Session 80.81 — compare checkbox */}
        <label className="mt-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-bank-text-muted hover:bg-bank-bg/60 focus-within:ring-2 focus-within:ring-bank-primary/40" aria-label={`${item.display_name} zum Vergleich auswählen`}>
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggleCompare}
            className="h-4 w-4 accent-bank-primary"
            data-testid={`watchlist-compare-check-${item.symbol}`}
          />
        </label>
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${item.display_name} verschieben — Leertaste, dann Pfeiltasten`}
          data-testid={`watchlist-drag-${item.symbol}`}
          className="mt-1 flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-bank-text-muted hover:bg-bank-bg/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 active:cursor-grabbing"
        >
          <GripVertical size={14} strokeWidth={1.6} />
        </button>

        <div className="min-w-0 flex-1">
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

          {eventBadges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" data-testid={`watchlist-events-${item.symbol}`}>
              {eventBadges.map((b, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ${
                    b.tone === 'primary'
                      ? 'border-bank-primary/40 bg-bank-primary/10 text-bank-primary-strong'
                      : b.tone === 'gold'
                        ? 'border-bank-gold/40 bg-bank-gold/10 text-bank-gold'
                        : 'border-bank-border bg-neutral-50 text-bank-text-muted'
                  }`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Detailed news — 3 items */}
          <SymbolNews symbol={item.symbol} displayName={item.display_name} limit={3} variant="detailed" data={newsData} />
        </div>

        <div className="flex items-center gap-3">
          {SPARKLINE_SYMBOLS.has(item.symbol) && (
            <div className="hidden sm:block">
              <MiniSparkline symbol={item.symbol} width={90} height={26} />
            </div>
          )}
          <div className="min-w-[96px] text-right">
            {(() => {
              const { primary, secondary } = q ? formatDisplayPrice(q) : { primary: '–', secondary: null };
              return (
                <>
                  <p className="font-serif text-[16px] tabular-nums text-bank-text" data-numeric>{primary}</p>
                  {secondary && (
                    <p className="mt-0.5 hidden font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted sm:block" data-testid={`watchlist-full-row-orig-${item.symbol}`}>
                      {secondary}
                    </p>
                  )}
                </>
              );
            })()}
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
            data-testid={`watchlist-full-remove-${item.symbol}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bank-border text-rose-600 transition-colors hover:bg-rose-50"
          >
            <Heart size={13} strokeWidth={1.6} fill="currentColor" />
          </button>
        </div>
      </div>
    </article>
  );
};

// ------------------------------- Page --------------------------------------

const WatchlistPage = () => {
  const { items, loading, isAuthed, add, remove, reorder } = useWatchlist();
  const navigate = useNavigate();
  const existingSymbols = useMemo(() => new Set(items.map((i) => i.symbol)), [items]);
  const [newsBySymbol, setNewsBySymbol] = useState({});
  const [eventsBySymbol, setEventsBySymbol] = useState({});
  const [sortMode, setSortMode] = useState('manual');
  const [selectedForCompare, setSelectedForCompare] = useState([]);

  useEffect(() => {
    if (!loading && !isAuthed) navigate('/login?next=/news/watchlist', { replace: true });
  }, [loading, isAuthed, navigate]);

  // Batch news fetch — bounded server-side calls even for 20+ items.
  useEffect(() => {
    if (items.length === 0) { setNewsBySymbol({}); return; }
    let alive = true;
    symbolNewsApi
      .batch(items.map((i) => i.symbol))
      .then((d) => { if (alive) setNewsBySymbol(d.by_symbol || {}); })
      .catch(() => { if (alive) setNewsBySymbol({}); });
    return () => { alive = false; };
  }, [items]);

  // Batch events fetch (earnings / ex-div) — one request, reuses server cache.
  useEffect(() => {
    if (items.length === 0) { setEventsBySymbol({}); return; }
    let alive = true;
    const syms = items.map((i) => i.symbol).join(',');
    eventsClient.get('/watchlist/events', { params: { symbols: syms } })
      .then((r) => {
        if (!alive) return;
        const by = {};
        for (const it of (r.data?.items || [])) { by[it.symbol] = it; }
        setEventsBySymbol(by);
      })
      .catch(() => { if (alive) setEventsBySymbol({}); });
    return () => { alive = false; };
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.symbol === active.id);
    const newIndex = items.findIndex((i) => i.symbol === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...items];
    const [row] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, row);
    try {
      await reorder(next.map((i) => i.symbol));
    } catch {
      toast.error('Sortierung konnte nicht gespeichert werden.');
    }
  };

  const sortableIds = useMemo(() => items.map((i) => i.symbol), [items]);

  // Session 80.81 — client-side sort presets; "manual" preserves DnD order.
  const displayedItems = useMemo(() => {
    if (sortMode === 'manual') return items;
    const arr = [...items];
    if (sortMode === 'recent') return arr.reverse();
    if (sortMode === 'alpha') return arr.sort((a, b) => (a.display_name || a.symbol).localeCompare(b.display_name || b.symbol, 'de'));
    if (sortMode === 'day-up' || sortMode === 'day-down') {
      return arr.sort((a, b) => {
        const av = a.quote?.change_percent ?? -Infinity;
        const bv = b.quote?.change_percent ?? -Infinity;
        return sortMode === 'day-up' ? bv - av : av - bv;
      });
    }
    return arr;
  }, [items, sortMode]);

  const toggleCompare = (sym) => {
    setSelectedForCompare((cur) => {
      if (cur.includes(sym)) return cur.filter((x) => x !== sym);
      if (cur.length >= 4) {
        toast.error('Maximal 4 Aktien vergleichbar.');
        return cur;
      }
      return [...cur, sym];
    });
  };

  const openCompare = () => {
    if (selectedForCompare.length < 2) {
      toast.error('Bitte mindestens 2 Aktien auswählen.');
      return;
    }
    const [base, ...peers] = selectedForCompare;
    const qs = peers.length ? `?compare=${peers.join(',')}` : '';
    navigate(`/aktien/${encodeURIComponent(base)}${qs}#compare`);
  };

  return (
    <div className="bg-white" data-testid="watchlist-page">
      <PageMeta
        title="Meine Watchlist — Fröhlich Vermögensberatung"
        description="Verwalten Sie Ihre persönliche Watchlist mit Live-Kursen, Sparklines und relevanten Nachrichten pro Wert. Geräteübergreifend gespeichert."
        path="/news/watchlist"
        noIndex
      />

      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-6xl px-6 pb-12 pt-14 sm:px-10 sm:pt-16">
          <Link to="/news" className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bank-text-muted hover:text-bank-primary">
            <ArrowLeft size={12} strokeWidth={1.7} /> Zurück zu News &amp; Märkte
          </Link>
          <div className="mt-6 flex flex-col gap-2">
            <Eyebrow>Meine Watchlist</Eyebrow>
            <h1 className="font-serif text-4xl leading-[1.05] text-bank-text sm:text-5xl">
              Ihre persönliche Beobachtung
            </h1>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-bank-text-muted">
              Kurse, Sparklines für die Leitindizes und die relevantesten Meldungen pro Wert.
              Beobachten. Verstehen. Einordnen — bewusst ohne Handelsempfehlungen.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          {/* Session 80.81 — sort presets */}
          {items.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3" data-testid="watchlist-toolbar">
              <label className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-bank-text-muted">
                Sortieren
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                  data-testid="watchlist-sort-select"
                  className="min-h-[36px] rounded-full border border-bank-border bg-white px-3 py-1.5 text-[12px] text-bank-text focus:outline-none focus:ring-2 focus:ring-bank-primary/40"
                >
                  <option value="manual">Manuell (Drag &amp; Drop)</option>
                  <option value="recent">Zuletzt hinzugefügt</option>
                  <option value="alpha">Alphabetisch</option>
                  <option value="day-up">Stärkste Tagesperformance</option>
                  <option value="day-down">Schwächste Tagesperformance</option>
                </select>
              </label>
              {selectedForCompare.length > 0 && (
                <div className="inline-flex items-center gap-3 rounded-full border border-bank-primary/50 bg-bank-primary/5 px-4 py-2" data-testid="watchlist-compare-bar">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-bank-primary-strong">
                    {selectedForCompare.length}/4 · {selectedForCompare.join(' · ')}
                  </span>
                  <button
                    type="button"
                    onClick={openCompare}
                    disabled={selectedForCompare.length < 2}
                    data-testid="watchlist-compare-cta"
                    className="inline-flex min-h-[36px] items-center rounded-full bg-bank-primary px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white hover:bg-bank-primary-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Ausgewählte vergleichen
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedForCompare([])}
                    aria-label="Auswahl zurücksetzen"
                    className="rounded-full p-1 text-bank-text-muted hover:bg-neutral-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
          {loading ? (
            <div className="border border-bank-border bg-white">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[120px] animate-pulse border-b border-bank-border/60 bg-neutral-50" />
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <div className="border border-bank-border bg-white" data-testid="watchlist-full-list">
                  {displayedItems.map((item) => (
                    <SortableWatchlistItem
                      key={item.symbol}
                      item={item}
                      onRemove={remove}
                      newsData={newsBySymbol[item.symbol]}
                      eventInfo={eventsBySymbol[item.symbol]}
                      selected={selectedForCompare.includes(item.symbol)}
                      onToggleCompare={() => toggleCompare(item.symbol)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          {items[0]?.quote?.last_updated && (
            <p className="mt-3 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              Letzte Aktualisierung: {formatLastUpdated(items[0].quote.last_updated)} Uhr · Marktdaten zeitverzögert ·
              Beobachten. Verstehen. Einordnen.
            </p>
          )}
        </section>

        <aside className="min-w-0">
          <SearchPanel existingSymbols={existingSymbols} onAdded={add} />
          <div className="mt-6 border border-bank-border bg-bank-bg/40 p-5 text-[12.5px] leading-relaxed text-bank-text-muted">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text">Datenquelle</p>
            <p className="mt-2">
              Kurse werden serverseitig gecacht (5 – 15 Minuten). Sparklines aktualisieren sich alle 15 Minuten.
              News werden pro Symbol gecacht (30 Minuten). Solange kein Live-Datenanbieter konfiguriert ist,
              sehen Sie deterministische Fallback-Werte für Kurse und keine News-Einträge.
            </p>
          </div>
          <div className="mt-6 border border-bank-border bg-white p-5 text-[12px] leading-relaxed text-bank-text-muted">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text">Sortieren</p>
            <p className="mt-2">
              Ziehen Sie die Werte per <GripVertical size={11} strokeWidth={1.7} className="inline align-middle" /> Griff
              in Ihre gewünschte Reihenfolge. Reihenfolge wird sofort gespeichert. Tastatur: <kbd className="rounded border border-bank-border bg-white px-1 py-0.5 text-[10.5px] font-mono">Leertaste</kbd> aktivieren,
              dann <kbd className="rounded border border-bank-border bg-white px-1 py-0.5 text-[10.5px] font-mono">↑</kbd>/<kbd className="rounded border border-bank-border bg-white px-1 py-0.5 text-[10.5px] font-mono">↓</kbd>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default WatchlistPage;
