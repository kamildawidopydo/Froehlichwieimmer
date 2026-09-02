import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import SafeNewsImage from '@/components/news/SafeNewsImage';
import { fetchMarketOverview, formatDisplayPrice, formatChangePct } from '@/services/marketService';

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

const MarketRow = ({ tile }) => {
  const { primary } = formatDisplayPrice(tile);
  const pct = tile.change_percent;
  const hasPct = Number.isFinite(pct);
  const up = hasPct && pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <li
      className="flex items-baseline justify-between gap-3 py-3"
      data-testid={`market-sidebar-row-${tile.symbol}`}
    >
      <span className="text-[13px] text-bank-text-strong">{tile.name || tile.symbol}</span>
      <span className="flex items-baseline gap-2 tabular-nums">
        <span className="text-[13px] font-medium text-bank-text">{primary || '—'}</span>
        {hasPct ? (
          <span className={`inline-flex items-center gap-0.5 text-[11.5px] font-medium ${up ? 'text-emerald-700' : 'text-red-700'}`}>
            <Icon size={12} strokeWidth={2} />
            {formatChangePct(pct)}
          </span>
        ) : (
          <span className="text-[11.5px] text-bank-text-muted">—</span>
        )}
      </span>
    </li>
  );
};

const MarketSidebar = () => {
  const [state, setState] = useState({ loading: true, tiles: [], lastUpdated: null, isDelayed: true, error: false });

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
          <ul className="mt-4 divide-y divide-bank-border/50" data-testid="home-market-sidebar-list">
            {state.tiles.map((t) => <MarketRow key={t.symbol} tile={t} />)}
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
    api.get('/news/nachrichten', { params: { limit: 8 } })
      .then((res) => {
        if (!alive) return;
        const items = (res.data.items || []).slice().sort((a, b) => {
          const da = a.published_at ? new Date(a.published_at).getTime() : 0;
          const db = b.published_at ? new Date(b.published_at).getTime() : 0;
          return db - da;
        });
        setState({ items, loading: false, error: false });
      })
      .catch(() => { if (alive) setState({ items: [], loading: false, error: true }); });
    return () => { alive = false; };
  }, []);

  const top = state.items[0];
  const secondary = state.items.slice(1, 5);

  return (
    <div data-testid="home-news-main">
      <Eyebrow>Aktuelle Nachrichten</Eyebrow>
      <h2 className="mt-3 font-serif text-3xl leading-[1.1] text-bank-text sm:text-4xl lg:text-[42px]">
        Wichtige Themen.<br />Klar eingeordnet.
      </h2>

      {/* Top-News-Slot */}
      <div className="mt-8" data-testid="home-news-top-slot">
        {state.loading ? (
          <div className="h-[380px] animate-pulse bg-neutral-100" />
        ) : top ? (
          <Link
            to={`/nachrichten/${top.slug}`}
            data-testid="home-news-top"
            className="group block"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
              <SafeNewsImage
                src={top.image_url}
                category={top.category}
                alt={top.title || ''}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
              />
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em]">
                <span className="text-bank-gold">{humanize(top.category)}</span>
                {top.published_at && <><span className="text-bank-border" aria-hidden>·</span><span className="text-bank-text-muted normal-case tracking-normal">{timeAgo(top.published_at)}</span></>}
              </div>
              <h3 className="mt-2 font-serif text-[24px] leading-tight text-bank-text group-hover:text-bank-primary sm:text-[28px]">
                {top.title}
              </h3>
              {top.summary && (
                <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-bank-text-muted">{top.summary}</p>
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

      {/* Sekundäre Nachrichten-Slots (2×2 Desktop, 1 Spalte Mobile) */}
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2" data-testid="home-news-secondary-grid">
        {state.loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[200px] animate-pulse bg-neutral-100" />)
          : secondary.length
            ? secondary.map((it) => (
                <Link
                  key={it.slug}
                  to={`/nachrichten/${it.slug}`}
                  className="group block"
                  data-testid={`home-news-secondary-${it.slug}`}
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
                    <SafeNewsImage src={it.image_url} category={it.category} alt={it.title || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
                      <span className="text-bank-gold">{humanize(it.category)}</span>
                      {it.published_at && <><span className="text-bank-border" aria-hidden>·</span><span className="text-bank-text-muted normal-case tracking-normal">{timeAgo(it.published_at)}</span></>}
                    </div>
                    <h4 className="mt-1.5 font-serif text-[16px] leading-snug text-bank-text group-hover:text-bank-primary">{it.title}</h4>
                  </div>
                </Link>
              ))
            : null}
      </div>

      {/* Platzhalter-Slot für spätere Kategorien-Sektionen (Schritt 2+) */}
      <div className="mt-14" data-testid="home-news-categories-slot" aria-hidden />

      <Link
        to="/nachrichten"
        className="mt-8 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary hover:underline"
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
