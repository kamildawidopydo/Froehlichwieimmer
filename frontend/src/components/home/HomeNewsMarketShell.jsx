import { getApiBase } from '@/lib/apiBase';
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import SafeNewsImage from '@/components/news/SafeNewsImage';
import { fetchMarketOverview, fetchSidebarStockGroups, formatDisplayPrice, formatChangePct, formatMarketPrice } from '@/services/marketService';

/* ── Sparkline: real backend points, module-level cache, one fetch per symbol ── */
const SPARKLINE_CACHE = new Map(); // symbol → { points, interval, ts }
const SPARKLINE_TTL_MS = 60 * 1000; // 60s

const fetchSparkline = async (apiInstance, symbol) => {
  const cached = SPARKLINE_CACHE.get(symbol);
  if (cached && Date.now() - cached.ts < SPARKLINE_TTL_MS) return cached;
  try {
    const res = await apiInstance.get(`/news-markte/market/sparkline/${symbol}`);
    const points = Array.isArray(res.data?.points) ? res.data.points : [];
    const entry = { points, interval: res.data?.interval || null, prevClose: res.data?.prev_close ?? null, ts: Date.now(), error: false };
    SPARKLINE_CACHE.set(symbol, entry);
    return entry;
  } catch {
    const entry = { points: [], interval: null, prevClose: null, ts: Date.now(), error: true };
    SPARKLINE_CACHE.set(symbol, entry);
    return entry;
  }
};

const Sparkline = ({ points, width = 96, height = 26, positive }) => {
  if (!Array.isArray(points) || points.length < 2) {
    return <span className="inline-block" style={{ width, height }} aria-hidden />;
  }
  const values = points.map((p) => (typeof p === 'number' ? p : (p?.c ?? p?.close ?? p?.value ?? p?.y))).filter(Number.isFinite);
  if (values.length < 2) return <span className="inline-block" style={{ width, height }} aria-hidden />;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`).join(' ');
  const stroke = positive === true ? '#047857' : positive === false ? '#b91c1c' : '#36A852';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Session News-Redesign 1/6 — Grundarchitektur (nur Struktur, keine neue Card-Logik).
 *
 * Layout:
 * - Desktop (≥lg): 70/30 Grid – links Nachrichten-Hauptbereich, rechts Markt-Sidebar
 * - Mobile / Tablet: einspaltig, Nachrichten zuerst, dann Marktübersicht
 *
 * Daten:
 * - Nachrichten: GET /api/news/nachrichten?limit=8  (bestehende, einzige Quelle)
 * - Marktdaten:  fetchMarketOverview('EUR')          (bestehender Service, EIN Fetch)
 *
 * Datenregeln (verbindlich für alle 6 Schritte):
 * - Keine Demo-News, keine hardcodierten Preise, keine simulierten Charts
 * - Fehlender Wert → „—"
 * - is_delayed / lastUpdated aus Backend übernommen
 * - Bei fehlenden Bildern greift SafeNewsImage (bestehender SVG-Fallback)
 */

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const CATEGORY_LABEL = {
  politik: 'Politik', wirtschaft: 'Wirtschaft', unternehmen: 'Unternehmen',
  maerkte: 'Märkte', europa: 'Europa', welt: 'Welt', zinsen: 'Zinsen',
  waehrungen: 'Währungen', rohstoffe: 'Rohstoffe', energie: 'Energie',
  klima: 'Klima', technologie: 'Technologie', industrie: 'Industrie',
  mobilitaet: 'Mobilität', gesundheit: 'Gesundheit', sicherheit: 'Sicherheit',
  wissen: 'Wissen', 'fonds-etfs': 'Fonds & ETFs',
  automobil: 'Automobil', handel: 'Handel', luxus: 'Luxus',
  medien: 'Medien', startups: 'Startups', finanzen: 'Finanzen',
  immobilien: 'Immobilien', arbeit: 'Arbeit', pharma: 'Pharma',
  kryptowaehrungen: 'Kryptowährungen', nachhaltigkeit: 'Nachhaltigkeit',
  banking: 'Banking', logistik: 'Logistik', konsum: 'Konsum',
};

const humanize = (raw) => CATEGORY_LABEL[raw] || (raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '');

/**
 * Einheitliche Publisher-Anzeige.
 * - Fröhlich-eigene Artikel (`content_type !== 'aggregated'`) → "Fröhlich Redaktion".
 * - Aggregierte Artikel      → `source_name` aus Backend.
 *   Fehlt der Publisher, wird nichts erfunden (kein "Externer Publisher"-Fake).
 */
const publisherOf = (it) => {
  if (!it) return null;
  if (it.content_type === 'aggregated') return it.source_name || null;
  return 'Fröhlich Redaktion';
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return 'gerade eben';
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  return `vor ${Math.floor(s / 86400)} Tagen`;
};

const fmtStamp = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())} Uhr`;
};

// Session 84 · Trust — dezente "Kurs verzögert · Stand …"-Formatierung.
// Zeigt HH:MM Uhr in Europe/Berlin; wenn der Datenstand NICHT vom heutigen
// Handelstag stammt, ergänzen wir das Datum, damit ein Freitags-Schlusskurs
// am Montag nicht wie ein aktueller Kurs aussieht.
const fmtDelayedStamp = (iso) => {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  const tz = 'Europe/Berlin';
  const now = new Date();
  const dayFmt = new Intl.DateTimeFormat('de-DE', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat('de-DE', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  const sameDay = dayFmt.format(d) === dayFmt.format(now);
  return sameDay
    ? `${timeFmt.format(d)} Uhr`
    : `${dayFmt.format(d)}, ${timeFmt.format(d)} Uhr`;
};

/* ─── Rechte Spalte: Markt-Sidebar (strukturell) ─────────────────────────── */

const MarketRow = ({ tile, sparkline, prominent }) => {
  const { primary } = formatDisplayPrice(tile);
  // Backend liefert change_percent; marketService normalisiert das zu changePct.
  const pct = tile.changePct ?? tile.change_percent;
  const hasPct = Number.isFinite(pct);
  const up = hasPct && pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const pctColor = !hasPct ? 'text-bank-text-muted' : up ? 'text-emerald-700' : 'text-red-700';
  if (prominent) {
    return (
      <div className="pb-4" data-testid={`market-sidebar-row-${tile.symbol}`}>
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-[18px] text-bank-text-strong">{tile.name || tile.symbol}</span>
          <span className={`inline-flex items-center gap-0.5 text-[12px] font-medium ${pctColor} tabular-nums`}>
            {hasPct ? <Icon size={13} strokeWidth={2} /> : null}
            {hasPct ? formatChangePct(pct) : '—'}
          </span>
        </div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <span className="font-serif text-[22px] text-bank-text tabular-nums">{primary || '—'}</span>
          <Sparkline points={sparkline?.points || []} width={110} height={30} positive={hasPct ? up : null} />
        </div>
      </div>
    );
  }
  return (
    <li className="flex items-center justify-between gap-3 py-2.5" data-testid={`market-sidebar-row-${tile.symbol}`}>
      <span className="min-w-0 flex-1 truncate text-[13px] text-bank-text-strong">{tile.name || tile.symbol}</span>
      <Sparkline points={sparkline?.points || []} width={64} height={20} positive={hasPct ? up : null} />
      <span className="flex flex-col items-end tabular-nums">
        <span className="text-[13px] font-medium text-bank-text">{primary || '—'}</span>
        <span className={`inline-flex items-center gap-0.5 text-[11px] ${pctColor}`}>
          {hasPct ? <Icon size={10} strokeWidth={2} /> : null}
          {hasPct ? formatChangePct(pct) : '—'}
        </span>
      </span>
    </li>
  );
};

/* ─── Stock-Gruppen-Sektion (Beliebte / Gewinner / Verlierer) ─────────── */
const StockGroupRow = ({ row, direction }) => {
  const pct = Number(row.changePct);
  const hasPct = Number.isFinite(pct);
  const up = hasPct && pct >= 0;
  const pctColor = !hasPct
    ? 'text-bank-text-muted'
    : up ? 'text-emerald-700' : 'text-red-700';
  const priceText = row.price != null && Number.isFinite(Number(row.price))
    ? `${formatMarketPrice(row.price)} ${row.currency || 'EUR'}`
    : '—';
  const pctText = hasPct
    ? `${up ? '+' : '−'}${Math.abs(pct).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : '—';
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : null;

  return (
    <li
      className="flex items-baseline justify-between gap-3 py-2.5"
      data-testid={`home-market-stock-row-${row.symbol}`}
    >
      <Link
        to={`/aktien/${encodeURIComponent(row.symbol)}`}
        className="min-w-0 flex-1 truncate font-serif text-[14px] leading-tight text-bank-text-strong hover:text-bank-primary hover:underline"
        title={row.name}
      >
        {row.name || row.symbol}
      </Link>
      <span
        className="shrink-0 tabular-nums text-[12.5px] text-bank-text"
        data-testid={`home-market-stock-price-${row.symbol}`}
      >
        {priceText}
      </span>
      <span
        className={`inline-flex w-[62px] shrink-0 items-center justify-end gap-0.5 tabular-nums text-[12px] font-medium ${pctColor}`}
        data-testid={`home-market-stock-change-${row.symbol}`}
      >
        {Icon && hasPct ? <Icon size={11} strokeWidth={2} aria-hidden /> : null}
        <span>{pctText}</span>
      </span>
    </li>
  );
};

const StockGroupSection = ({ eyebrow, title, rows, direction, loading, error, testid, emptyText }) => (
  <section
    className="mt-10 border-t border-bank-border/50 pt-6"
    aria-label={title}
    data-testid={testid}
  >
    <Eyebrow>{eyebrow}</Eyebrow>
    <h3 className="mt-3 font-serif text-[22px] leading-tight text-bank-text">{title}</h3>
    {loading ? (
      <ul className="mt-4 space-y-2" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 py-1.5">
            <div className="h-3.5 w-32 animate-pulse bg-neutral-100" />
            <div className="ml-auto h-3.5 w-14 animate-pulse bg-neutral-100" />
            <div className="h-3.5 w-12 animate-pulse bg-neutral-100" />
          </li>
        ))}
      </ul>
    ) : error ? (
      <p className="mt-4 text-[13px] text-bank-text-muted">Marktdaten derzeit nicht verfügbar.</p>
    ) : rows.length === 0 ? (
      <p className="mt-4 text-[13px] text-bank-text-muted">{emptyText || 'Keine Werte verfügbar.'}</p>
    ) : (
      <ul className="mt-4 divide-y divide-bank-border/50" data-testid={`${testid}-list`}>
        {rows.map((row) => (
          <StockGroupRow key={row.symbol} row={row} direction={direction} />
        ))}
      </ul>
    )}
  </section>
);

const MarketSidebar = () => {
  const [state, setState] = useState({ loading: true, tiles: [], lastUpdated: null, isDelayed: true, error: false });
  const [sparks, setSparks] = useState({}); // symbol → entry
  const [groups, setGroups] = useState({ loading: true, error: false, popular: [], gainers: [], losers: [], lastUpdated: null });

  useEffect(() => {
    let alive = true;
    fetchMarketOverview('EUR')
      .then((o) => {
        if (!alive) return;
        const tiles = [
          ...o.indices.filter((i) => ['DAX', 'SPX', 'NDX'].includes(i.symbol)),
          ...o.commodities.filter((c) => ['GOLD', 'OIL'].includes(c.symbol)),
          ...o.fx.filter((f) => f.symbol === 'EURUSD'),
        ];
        const stamps = tiles.map((t) => t.lastUpdated).filter(Boolean).map((s) => new Date(s).getTime()).filter(Number.isFinite);
        const oldest = stamps.length ? new Date(Math.min(...stamps)).toISOString() : (o.lastUpdated || null);
        setState({ loading: false, tiles, lastUpdated: oldest, isDelayed: !!o.isDelayed, error: false });
      })
      .catch(() => { if (alive) setState({ loading: false, tiles: [], lastUpdated: null, isDelayed: true, error: true }); });
    return () => { alive = false; };
  }, []);

  // Stock-Gruppen (Beliebte / Gewinner / Verlierer) — EIN Fetch, drei Listen.
  // Backend: /api/news-markte/market/stocks. Keine N+1: alle 3 Module speisen
  // sich aus derselben Antwort (client-seitige Ableitung im Service).
  useEffect(() => {
    let alive = true;
    fetchSidebarStockGroups('EUR')
      .then((g) => {
        if (!alive) return;
        // Session 84 · Trust — prefer the oldest market-data `asOf` of the
        // visible rows; fall back to lastUpdated only if no bar timestamp
        // is available (e.g. yfinance fast_info path).
        const stamp = g.oldestAsOf
          || g.popular[0]?.asOf || g.gainers[0]?.asOf || g.losers[0]?.asOf
          || g.popular[0]?.lastUpdated || g.gainers[0]?.lastUpdated || g.losers[0]?.lastUpdated
          || null;
        setGroups({ loading: false, error: g.total === 0, popular: g.popular, gainers: g.gainers, losers: g.losers, lastUpdated: stamp, asOfKnown: !!(g.oldestAsOf || g.popular[0]?.asOf || g.gainers[0]?.asOf || g.losers[0]?.asOf) });
      })
      .catch(() => { if (alive) setGroups((s) => ({ ...s, loading: false, error: true })); });
    return () => { alive = false; };
  }, []);

  // Parallel-Fetch der Sparklines nur für sichtbare Symbole, mit Modul-Cache (60s TTL)
  useEffect(() => {
    if (!state.tiles.length) return undefined;
    let alive = true;
    const symbols = state.tiles.map((t) => t.symbol);
    Promise.all(symbols.map((s) => fetchSparkline(api, s).then((e) => [s, e])))
      .then((pairs) => { if (alive) setSparks((prev) => ({ ...prev, ...Object.fromEntries(pairs) })); });
    return () => { alive = false; };
  }, [state.tiles]);

  const prominent = state.tiles.find((t) => t.symbol === 'DAX') || state.tiles[0];
  const rest = state.tiles.filter((t) => t !== prominent);

  return (
    <aside
      className="mt-12 lg:mt-0 lg:pl-8 lg:border-l lg:border-bank-border/60"
      data-testid="home-market-sidebar"
      aria-label="Marktübersicht"
    >
      <Eyebrow>Marktüberblick</Eyebrow>
      <h3 className="mt-3 font-serif text-[24px] leading-tight text-bank-text">Aktuelle Kurse.</h3>

      {state.loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[22px] animate-pulse bg-neutral-100" />
          ))}
        </div>
      ) : state.tiles.length === 0 ? (
        <p className="mt-6 text-[13px] text-bank-text-muted" data-testid="home-market-sidebar-empty">
          Marktdaten aktuell nicht verfügbar.
        </p>
      ) : (
        <>
          {prominent && (
            <div className="mt-6 border-b border-bank-border/50 pb-4" data-testid="home-market-sidebar-prominent">
              <MarketRow tile={prominent} sparkline={sparks[prominent.symbol]} prominent />
            </div>
          )}
          <ul className="mt-2 divide-y divide-bank-border/50" data-testid="home-market-sidebar-list">
            {rest.map((t) => <MarketRow key={t.symbol} tile={t} sparkline={sparks[t.symbol]} />)}
          </ul>
          {state.lastUpdated && (
            <p className="mt-4 text-[10.5px] leading-relaxed text-bank-text-muted" data-testid="home-market-sidebar-timestamp">
              <span className="text-bank-text-strong">Kursstand:</span>{' '}
              <time dateTime={state.lastUpdated} className="tabular-nums">{fmtStamp(state.lastUpdated)}</time>
              {state.isDelayed && <><br />Kurse können zeitverzögert sein</>}
            </p>
          )}
          <Link
            to="/news"
            className="mt-6 inline-flex min-h-[44px] items-center gap-1 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/70 sm:min-h-0 sm:py-0"
            data-testid="home-market-sidebar-more"
          >
            Zum Marktüberblick <ArrowRight size={12} strokeWidth={1.8} />
          </Link>
        </>
      )}

      {/* ── Ergänzungsmodule: Beliebte Aktien · Gewinner · Verlierer ── */}
      <StockGroupSection
        eyebrow="Beliebte Aktien"
        title="Meistgehandelte Werte."
        rows={groups.popular}
        loading={groups.loading}
        error={groups.error}
        testid="home-market-stocks-popular"
      />
      <StockGroupSection
        eyebrow="Top-Gewinner"
        title="Stärkste Kursgewinne."
        rows={groups.gainers}
        direction="up"
        loading={groups.loading}
        error={groups.error}
        testid="home-market-stocks-gainers"
        emptyText="Aktuell keine markanten Gewinner."
      />
      <StockGroupSection
        eyebrow="Top-Verlierer"
        title="Stärkste Kursverluste."
        rows={groups.losers}
        direction="down"
        loading={groups.loading}
        error={groups.error}
        testid="home-market-stocks-losers"
        emptyText="Aktuell keine markanten Verlierer."
      />
      {!groups.loading && !groups.error && groups.lastUpdated && (
        <p className="mt-4 text-[10.5px] leading-relaxed text-bank-text-muted" data-testid="home-market-stocks-timestamp">
          Kurs verzögert · Stand{' '}
          <time dateTime={groups.lastUpdated} className="tabular-nums">{fmtDelayedStamp(groups.lastUpdated)}</time>
        </p>
      )}
      {!groups.loading && groups.error && (
        <p className="mt-4 text-[10.5px] leading-relaxed text-bank-text-muted" data-testid="home-market-stocks-unavailable">
          Kurs derzeit nicht verfügbar
        </p>
      )}
    </aside>
  );
};

/* ─── Linke Spalte: Nachrichten-Hauptbereich (strukturell) ───────────────── */

/* ─── CompactWithTabs: client-side category tabs over the compact list ── */
const TAB_ORDER = ['maerkte', 'unternehmen', 'wirtschaft', 'zinsen', 'rohstoffe', 'technologie'];
const CompactWithTabs = ({ items }) => {
  const [active, setActive] = useState('all');
  // Only tabs with actually-present items (after dedup upstream)
  const counts = useMemo(() => {
    const m = {};
    items.forEach((it) => { if (it.category) m[it.category] = (m[it.category] || 0) + 1; });
    return m;
  }, [items]);
  const tabs = useMemo(() => {
    const available = TAB_ORDER.filter((c) => (counts[c] || 0) > 0);
    return [{ id: 'all', label: 'Alle', count: items.length }, ...available.map((c) => ({ id: c, label: humanize(c), count: counts[c] }))];
  }, [counts, items.length]);
  const visible = active === 'all' ? items : items.filter((it) => it.category === active);
  const onKey = (e, idx) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = e.key === 'ArrowRight' ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    document.getElementById(`compact-tab-${tabs[next].id}`)?.focus();
  };
  return (
    <div className="mt-14 border-t border-bank-border/50 pt-8" data-testid="home-news-compact-list">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Nachrichten im Überblick</p>
      </div>
      <div
        role="tablist"
        aria-label="Themen filtern"
        className="mt-4 flex gap-x-6 gap-y-2 overflow-x-auto border-b border-bank-border/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="home-news-compact-tablist"
      >
        {tabs.map((t, idx) => {
          const sel = active === t.id;
          return (
            <button
              key={t.id}
              id={`compact-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={sel}
              tabIndex={sel ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKey(e, idx)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/70 ${sel ? 'border-bank-primary text-bank-primary' : 'border-transparent text-bank-text-muted hover:text-bank-text'}`}
              data-testid={`home-news-compact-tab-${t.id}`}
            >
              {t.label}
              <span className="ml-1 tabular-nums text-[10px] opacity-70">{t.count}</span>
            </button>
          );
        })}
      </div>
      <ul className="mt-2 divide-y divide-bank-border/50" data-testid="home-news-compact-items">
        {visible.map((it) => {
          const cat = humanize(it.category);
          const publisher = publisherOf(it);
          const t = timeAgo(it.published_at);
          return (
            <li key={it.slug}>
              <Link
                to={`/news/${it.slug}`}
                className="group grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/70 sm:grid-cols-[76px_1fr_auto]"
                data-testid={`home-news-compact-${it.slug}`}
              >
                <time
                  dateTime={it.published_at || undefined}
                  className="tabular-nums font-mono text-[11px] uppercase tracking-[0.16em] text-bank-text-muted sm:text-[11.5px]"
                >{t || '—'}</time>
                <h5 className="col-start-2 font-serif text-[15px] leading-snug text-bank-text group-hover:text-bank-primary">{it.title}</h5>
                <span className="col-span-2 flex flex-wrap items-center gap-x-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted sm:col-span-1 sm:col-start-3 sm:justify-self-end sm:self-center">
                  {cat && <span className="text-bank-gold">{cat}</span>}
                  {cat && publisher && <span aria-hidden className="normal-case">·</span>}
                  {publisher && <span className="normal-case tracking-normal">{publisher}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const NewsMain = () => {
  const [state, setState] = useState({ items: [], loading: true, error: false });

  useEffect(() => {
    let alive = true;
    api.get('/news/nachrichten', { params: { limit: 16 } })
      .then((res) => {
        if (!alive) return;
        const items = (res.data.items || [])
          .filter((it) => it && it.slug)
          .slice()
          .sort((a, b) => {
            const da = a.published_at ? new Date(a.published_at).getTime() : 0;
            const db = b.published_at ? new Date(b.published_at).getTime() : 0;
            return db - da;
          });
        setState({ items, loading: false, error: false });
      })
      .catch(() => { if (alive) setState({ items: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, []);

  /*
   * Deduplizierung über alle News-Blöcke:
   *   heroItem → secondaryItems → editorialGridItems → compactListItems
   * Jeder slug erscheint nur EINMAL im gesamten News-Hauptbereich.
   */
  const validItems = state.items;
  const heroItem = validItems[0] || null;
  const usedSlugs = new Set(heroItem ? [heroItem.slug] : []);
  const secondaryItems = validItems.filter((it) => !usedSlugs.has(it.slug)).slice(0, 4);
  secondaryItems.forEach((it) => usedSlugs.add(it.slug));
  const editorialGridItems = validItems.filter((it) => !usedSlugs.has(it.slug)).slice(0, 4);
  editorialGridItems.forEach((it) => usedSlugs.add(it.slug));
  const compactListItems = validItems.filter((it) => !usedSlugs.has(it.slug)).slice(0, 6);
  compactListItems.forEach((it) => usedSlugs.add(it.slug));

  const heroCategory = heroItem ? humanize(heroItem.category) : '';
  const heroPublisher = publisherOf(heroItem);
  const heroTime = heroItem ? timeAgo(heroItem.published_at) : '';

  return (
    <div data-testid="home-news-main">
      <Eyebrow>Aktuelle Nachrichten</Eyebrow>
      <h2 className="mt-3 font-serif text-3xl leading-[1.05] text-bank-text sm:text-4xl lg:text-[42px]">
        Wichtige Themen.<br />Klar eingeordnet.
      </h2>

      {/* ── Hauptstory (dominant) ─────────────────────────────────────── */}
      <div className="mt-8" data-testid="home-news-top-slot">
        {state.loading ? (
          <>
            <div className="aspect-[16/9] w-full animate-pulse bg-neutral-100" />
            <div className="mt-5 h-3 w-24 animate-pulse bg-neutral-100" />
            <div className="mt-3 h-8 w-3/4 animate-pulse bg-neutral-100" />
            <div className="mt-3 h-4 w-2/3 animate-pulse bg-neutral-100" />
          </>
        ) : heroItem ? (
          <Link
            to={`/news/${heroItem.slug}`}
            data-testid="home-news-top"
            className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/70"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
              <SafeNewsImage
                src={heroItem.image_url}
                category={heroItem.category}
                alt={heroItem.title || ''}
                loading="eager"
                className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.015]"
              />
            </div>
            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.2em]">
                {heroCategory && <span className="text-bank-gold" data-testid="home-news-top-kicker">{heroCategory}</span>}
                {heroPublisher && (
                  <>
                    <span className="text-bank-border" aria-hidden>·</span>
                    <span className="text-bank-text-muted normal-case tracking-normal">{heroPublisher}</span>
                  </>
                )}
                {heroTime && (
                  <>
                    <span className="text-bank-border" aria-hidden>·</span>
                    <time
                      dateTime={heroItem.published_at || undefined}
                      className="text-bank-text-muted normal-case tracking-normal"
                    >
                      {heroTime}
                    </time>
                  </>
                )}
              </div>
              <h3
                className="mt-3 font-serif text-[26px] leading-[1.12] text-bank-text group-hover:text-bank-primary sm:text-[30px] lg:text-[34px]"
                data-testid="home-news-top-headline"
              >
                {heroItem.title}
              </h3>
              {heroItem.summary && (
                <p className="mt-3 max-w-[54ch] text-[14.5px] leading-relaxed text-bank-text-muted line-clamp-3">
                  {heroItem.summary}
                </p>
              )}
            </div>
          </Link>
        ) : (
          <div className="border-l-2 border-bank-gold/50 pl-4 py-2" data-testid="home-news-top-empty">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Redaktion in Vorbereitung</p>
            <p className="mt-2 text-[14px] text-bank-text-muted">
              Aktuelle Analysen folgen in Kürze. Unsere Redaktion sichtet gerade die neuesten Marktentwicklungen.
            </p>
          </div>
        )}
      </div>

      {/* ── Secondary News (kompakte Liste, klar sekundär) ─────────────── */}
      {(state.loading || secondaryItems.length > 0) && (
        <ul
          className="mt-10 divide-y divide-bank-border/50 border-t border-bank-border/50"
          data-testid="home-news-secondary-list"
        >
          {state.loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex items-start gap-4 py-5">
                  <div className="aspect-[16/10] w-[120px] shrink-0 animate-pulse bg-neutral-100 sm:w-[140px]" />
                  <div className="min-w-0 flex-1">
                    <div className="h-3 w-20 animate-pulse bg-neutral-100" />
                    <div className="mt-2 h-5 w-4/5 animate-pulse bg-neutral-100" />
                    <div className="mt-2 h-3 w-1/3 animate-pulse bg-neutral-100" />
                  </div>
                </li>
              ))
            : secondaryItems.map((it) => {
                const cat = humanize(it.category);
                const publisher = publisherOf(it);
                const t = timeAgo(it.published_at);
                return (
                  <li key={it.slug}>
                    <Link
                      to={`/news/${it.slug}`}
                      className="group flex items-start gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/70"
                      data-testid={`home-news-secondary-${it.slug}`}
                    >
                      <div className="relative aspect-[16/10] w-[120px] shrink-0 overflow-hidden bg-neutral-100 sm:w-[140px]">
                        <SafeNewsImage
                          src={it.image_url}
                          category={it.category}
                          alt={it.title || ''}
                          className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.02]"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.2em]">
                          {cat && <span className="text-bank-gold">{cat}</span>}
                        </div>
                        <h4 className="mt-1.5 font-serif text-[16px] leading-snug text-bank-text group-hover:text-bank-primary sm:text-[17px]">
                          {it.title}
                        </h4>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-bank-text-muted">
                          {publisher && <span>{publisher}</span>}
                          {publisher && t && <span aria-hidden>·</span>}
                          {t && <time dateTime={it.published_at || undefined}>{t}</time>}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
        </ul>
      )}

      {/* ── Editorial Grid (2-spaltig Desktop, 1-spaltig Mobile) ─────── */}
      {editorialGridItems.length > 0 && (
        <div
          className="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 border-t border-bank-border/50 pt-12 sm:grid-cols-2"
          data-testid="home-news-editorial-grid"
        >
          {editorialGridItems.map((it) => {
            const cat = humanize(it.category);
            const publisher = publisherOf(it);
            const t = timeAgo(it.published_at);
            return (
              <Link
                key={it.slug}
                to={`/news/${it.slug}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/70"
                data-testid={`home-news-editorial-${it.slug}`}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
                  <SafeNewsImage
                    src={it.image_url}
                    category={it.category}
                    alt={it.title || ''}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.02]"
                  />
                </div>
                <div className="mt-4">
                  {cat && (
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-gold">
                      {cat}
                    </span>
                  )}
                  <h4 className="mt-2 font-serif text-[19px] leading-snug text-bank-text group-hover:text-bank-primary sm:text-[20px]">
                    {it.title}
                  </h4>
                  {it.summary && (
                    <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-bank-text-muted">
                      {it.summary}
                    </p>
                  )}
                  <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-[11px] text-bank-text-muted">
                    {publisher && <span>{publisher}</span>}
                    {publisher && t && <span aria-hidden>·</span>}
                    {t && <time dateTime={it.published_at || undefined}>{t}</time>}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Kompakte „Nachrichten im Überblick"-Liste mit Themen-Tabs ─── */}
      {compactListItems.length > 0 && (
        <CompactWithTabs items={compactListItems} />
      )}

      {/* Einziger Haupt-CTA am Ende des News-Bereichs */}
      <Link
        to="/nachrichten"
        className="mt-10 inline-flex min-h-[44px] items-center gap-1 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/70 sm:min-h-0 sm:py-0"
        data-testid="home-news-more"
      >
        Alle Nachrichten <ArrowRight size={12} strokeWidth={1.8} />
      </Link>
    </div>
  );
};

/* ─── Wrapper: 70/30 Grid Desktop, Stack Mobile ─────────────────────────── */

const HomeNewsMarketShell = () => (
  <section
    className="bg-gradient-to-b from-bank-cream/40 to-white py-16 sm:py-20"
    data-testid="home-news-market-shell"
    aria-label="Nachrichten & Marktüberblick"
  >
    <div className="mx-auto max-w-6xl px-6 sm:px-10">
      <div className="grid grid-cols-1 gap-x-8 gap-y-0 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <NewsMain />
        <MarketSidebar />
      </div>
    </div>
  </section>
);

export default HomeNewsMarketShell;
