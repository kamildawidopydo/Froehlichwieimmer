import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import SafeNewsImage from '@/components/news/SafeNewsImage';
import { fetchMarketOverview, formatDisplayPrice, formatChangePct } from '@/services/marketService';

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
  const values = points.map((p) => (typeof p === 'number' ? p : (p?.close ?? p?.value ?? p?.y))).filter(Number.isFinite);
  if (values.length < 2) return <span className="inline-block" style={{ width, height }} aria-hidden />;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`).join(' ');
  const stroke = positive === true ? '#047857' : positive === false ? '#b91c1c' : '#003781';
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

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const CATEGORY_LABEL = {
  politik: 'Politik', wirtschaft: 'Wirtschaft', unternehmen: 'Unternehmen',
  maerkte: 'Märkte', europa: 'Europa', welt: 'Welt', zinsen: 'Zinsen',
  waehrungen: 'Währungen', rohstoffe: 'Rohstoffe', energie: 'Energie',
  klima: 'Klima', technologie: 'Technologie', industrie: 'Industrie',
  mobilitaet: 'Mobilität', gesundheit: 'Gesundheit', sicherheit: 'Sicherheit',
  wissen: 'Wissen', 'fonds-etfs': 'Fonds & ETFs',
};

const humanize = (raw) => CATEGORY_LABEL[raw] || (raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '');

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

/* ─── Rechte Spalte: Markt-Sidebar (strukturell) ─────────────────────────── */

const MarketRow = ({ tile, sparkline, prominent }) => {
  const { primary } = formatDisplayPrice(tile);
  const pct = tile.change_percent;
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

const MarketSidebar = () => {
  const [state, setState] = useState({ loading: true, tiles: [], lastUpdated: null, isDelayed: true, error: false });
  const [sparks, setSparks] = useState({}); // symbol → entry

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
              <span className="tabular-nums">{fmtStamp(state.lastUpdated)}</span>
              {state.isDelayed && <><br />Kurse können zeitverzögert sein</>}
            </p>
          )}
          <Link
            to="/news"
            className="mt-6 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary hover:underline"
            data-testid="home-market-sidebar-more"
          >
            Zum Marktüberblick <ArrowRight size={12} strokeWidth={1.8} />
          </Link>
        </>
      )}
    </aside>
  );
};

/* ─── Linke Spalte: Nachrichten-Hauptbereich (strukturell) ───────────────── */

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
  const heroPublisher = heroItem
    ? (heroItem.content_type === 'aggregated' ? (heroItem.source_name || 'Externer Publisher') : 'Fröhlich Redaktion')
    : '';
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
            to={`/nachrichten/${heroItem.slug}`}
            data-testid="home-news-top"
            className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
              <SafeNewsImage
                src={heroItem.image_url}
                category={heroItem.category}
                alt={heroItem.title || ''}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
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
                    <span className="text-bank-text-muted normal-case tracking-normal">{heroTime}</span>
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
                const publisher = it.content_type === 'aggregated'
                  ? (it.source_name || 'Externer Publisher')
                  : 'Fröhlich Redaktion';
                const t = timeAgo(it.published_at);
                return (
                  <li key={it.slug}>
                    <Link
                      to={`/nachrichten/${it.slug}`}
                      className="group flex items-start gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
                      data-testid={`home-news-secondary-${it.slug}`}
                    >
                      <div className="relative aspect-[16/10] w-[120px] shrink-0 overflow-hidden bg-neutral-100 sm:w-[140px]">
                        <SafeNewsImage
                          src={it.image_url}
                          category={it.category}
                          alt={it.title || ''}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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
                          {t && <span>{t}</span>}
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
            const publisher = it.content_type === 'aggregated'
              ? (it.source_name || 'Externer Publisher')
              : 'Fröhlich Redaktion';
            const t = timeAgo(it.published_at);
            return (
              <Link
                key={it.slug}
                to={`/nachrichten/${it.slug}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
                data-testid={`home-news-editorial-${it.slug}`}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
                  <SafeNewsImage
                    src={it.image_url}
                    category={it.category}
                    alt={it.title || ''}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
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
                    {t && <span>{t}</span>}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Kompakte „Weitere Meldungen"-Liste (dichter Info-Block) ─── */}
      {compactListItems.length > 0 && (
        <div className="mt-14 border-t border-bank-border/50 pt-8" data-testid="home-news-compact-list">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Weitere Meldungen</p>
          <ul className="mt-4 divide-y divide-bank-border/50">
            {compactListItems.map((it) => {
              const cat = humanize(it.category);
              const publisher = it.content_type === 'aggregated'
                ? (it.source_name || null)
                : 'Fröhlich Redaktion';
              const t = timeAgo(it.published_at);
              return (
                <li key={it.slug}>
                  <Link
                    to={`/nachrichten/${it.slug}`}
                    className="group grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 sm:grid-cols-[76px_1fr_auto]"
                    data-testid={`home-news-compact-${it.slug}`}
                  >
                    <span className="tabular-nums font-mono text-[11px] uppercase tracking-[0.16em] text-bank-text-muted sm:text-[11.5px]">
                      {t || '—'}
                    </span>
                    <h5 className="col-start-2 font-serif text-[15px] leading-snug text-bank-text group-hover:text-bank-primary">
                      {it.title}
                    </h5>
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
      )}

      {/* Einziger Haupt-CTA am Ende des News-Bereichs */}
      <Link
        to="/nachrichten"
        className="mt-10 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary hover:underline"
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
