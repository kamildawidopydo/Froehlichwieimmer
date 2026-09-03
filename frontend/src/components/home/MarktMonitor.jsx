import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Info } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import MiniSparkline from '@/components/watchlist/MiniSparkline';
import { fetchMarketOverview, formatLastUpdated } from '@/services/marketService';

/**
 * Session 80.97 → 80.98 — „Märkte im Überblick" · Investment-Cockpit Phase 2
 *
 * Investment-Cockpit-Erweiterung ohne neue Provider-Requests:
 *   1. Marktimpuls-Kopfzeile  — kompakter Streifen mit Δ % pro Instrument
 *   2. Monitor mit Tabs        — bestehendes Layout (Übersicht/Indizes/Rohstoffe/Devisen)
 *   3. Top-Bewegungen          — stärkste + / − Änderung des Datenstands
 *   4. Marktbreite im Monitor  — X von Y Instrumenten positiv (rein informativ)
 *   5. Datenstand + Tooltip    — Delay-Hinweis, keine „LIVE"-Kennzeichnung
 *
 * Datenquelle unverändert: `/api/news-markte/market/overview` (yfinance-First,
 * Backend-Cache TTL 300–600s). Alle abgeleiteten Werte kommen aus DIESEM einen
 * Payload — 0 zusätzliche API-Requests, 0 N+1. Tab-Wechsel filtert clientseitig.
 *
 * Duplicate-Request-Analyse (Preview-Metriken):
 *   Root-Cause = React.StrictMode (`src/index.js` L40) — Doppel-Effekt-Aufruf ist
 *   ein DEV-only Sicherheitsmechanismus und findet in Production **nicht** statt.
 *   Der Overview-Fetch ist durch `didLoadRef` gegen Doppel-Aufrufe innerhalb einer
 *   einzigen Komponente geschützt; MiniSparkline nutzt symbol-basiertes Effect-
 *   Dependency und wird pro Symbol nur einmal pro Session gemounted (siehe
 *   Session 80.97 — alle Zeilen bleiben gemountet, Tab-Wechsel toggelt CSS).
 */

const INSTRUMENTS = [
  { symbol: 'DAX',    label: 'DAX',         group: 'indices',     decimals: 2, unit: 'Punkte' },
  { symbol: 'SPX',    label: 'S&P 500',     group: 'indices',     decimals: 2, unit: 'Punkte' },
  { symbol: 'NDX',    label: 'NASDAQ 100',  group: 'indices',     decimals: 2, unit: 'Punkte' },
  { symbol: 'DJI',    label: 'Dow Jones',   group: 'indices',     decimals: 2, unit: 'Punkte' },
  { symbol: 'GOLD',   label: 'Gold',        group: 'commodities', decimals: 2, unit: '€ / Feinunze', useDisplay: true },
  { symbol: 'SILVER', label: 'Silber',      group: 'commodities', decimals: 2, unit: '€ / Feinunze', useDisplay: true },
  { symbol: 'OIL',    label: 'Brent',       group: 'commodities', decimals: 2, unit: '€ / Barrel',   useDisplay: true },
  { symbol: 'EURUSD', label: 'EUR/USD',     group: 'fx',          decimals: 4, unit: '' },
];

const TABS = [
  { id: 'overview',    label: 'Übersicht',
    filter: (s) => ['DAX','SPX','NDX','DJI','GOLD','OIL','EURUSD'].includes(s) },
  { id: 'indices',     label: 'Indizes',     filter: (_, cfg) => cfg.group === 'indices' },
  { id: 'commodities', label: 'Rohstoffe',   filter: (_, cfg) => cfg.group === 'commodities' },
  { id: 'fx',          label: 'Devisen',     filter: (_, cfg) => cfg.group === 'fx' },
];

const priceOf = (row, cfg) => {
  if (!row) return null;
  if (cfg.useDisplay && row.displayPrice != null) return Number(row.displayPrice);
  return row.price != null ? Number(row.price) : null;
};

const numFmt = (n, decimals) =>
  Number(n).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const pctFmt = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return null;
  const v = Number(n);
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±';
  return `${sign}${Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
};

const changeColor = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return 'text-bank-text-muted';
  const v = Number(n);
  if (v > 0.05) return 'text-emerald-700 dark:text-emerald-400';
  if (v < -0.05) return 'text-rose-700 dark:text-rose-400';
  return 'text-bank-text-muted';
};

const contextLine = (rows) => {
  const byGroup = { indices: [], commodities: [], fx: [] };
  rows.forEach((r) => { if (r?.group && byGroup[r.group]) byGroup[r.group].push(r); });
  const avg = (arr) => {
    const vals = arr.map((r) => Number(r.changePct)).filter((v) => Number.isFinite(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const describe = (v) => {
    if (v == null) return 'Daten unvollständig';
    if (v >= 0.5) return 'im Plus';
    if (v > 0.05) return 'leicht fester';
    if (v > -0.05) return 'seitwärts';
    if (v > -0.5) return 'leicht schwächer';
    return 'im Minus';
  };
  return [
    { label: 'Aktienmärkte', word: describe(avg(byGroup.indices)) },
    { label: 'Rohstoffe',    word: describe(avg(byGroup.commodities)) },
    { label: 'Devisen',      word: describe(avg(byGroup.fx)) },
  ];
};

// ---------------------------------------------------------------------------
// Marktimpuls-Kopfzeile (kompakte Δ%-Strip aus derselben Overview-Antwort)
// ---------------------------------------------------------------------------
const IMPULSE_SYMBOLS = ['DAX', 'SPX', 'NDX', 'GOLD', 'EURUSD'];

const MarktImpuls = ({ rows }) => {
  const items = IMPULSE_SYMBOLS
    .map((sym) => rows.find((r) => r.symbol === sym))
    .filter((r) => r && r.changePct != null);
  if (!items.length) return null;
  return (
    <div
      className="mx-auto mt-8 flex max-w-full snap-x snap-mandatory items-center gap-x-6 gap-y-2 overflow-x-auto border-y border-bank-border/80 py-3 sm:justify-center"
      data-testid="marktmonitor-impuls"
      aria-label="Marktbewegungen des aktuellen Datenstands"
    >
      {items.map((r) => (
        <div key={r.symbol} className="flex shrink-0 snap-start items-baseline gap-2" data-testid={`impuls-${r.symbol}`}>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
            {r.label}
          </span>
          <span className={`font-mono tabular-nums text-[13px] ${changeColor(r.changePct)}`}>
            {pctFmt(r.changePct)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Top-Bewegungen + Marktbreite (rein aus vorhandenen Daten abgeleitet)
// ---------------------------------------------------------------------------
const TopMovers = ({ rows }) => {
  const withChg = rows.filter((r) => Number.isFinite(Number(r.changePct)));
  if (!withChg.length) return null;
  const sorted = [...withChg].sort((a, b) => Number(b.changePct) - Number(a.changePct));
  const up = sorted[0];
  const down = sorted[sorted.length - 1];
  const positive = withChg.filter((r) => Number(r.changePct) > 0).length;
  const negative = withChg.filter((r) => Number(r.changePct) < 0).length;
  const total = withChg.length;

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="marktmonitor-topmovers">
      <div className="flex items-center justify-between gap-4 border-l border-emerald-500/50 bg-emerald-50/40 px-4 py-3 dark:bg-emerald-900/10">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
            Stärkste Bewegung ↑
          </p>
          <p className="mt-1 font-serif text-[15px] leading-tight text-bank-text">{up?.label ?? '—'}</p>
        </div>
        <p className="font-mono tabular-nums text-[15px] text-emerald-700 dark:text-emerald-400" data-testid="topmover-up">
          {up ? pctFmt(up.changePct) : '—'}
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 border-l border-rose-500/50 bg-rose-50/40 px-4 py-3 dark:bg-rose-900/10">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
            Stärkste Bewegung ↓
          </p>
          <p className="mt-1 font-serif text-[15px] leading-tight text-bank-text">{down?.label ?? '—'}</p>
        </div>
        <p className="font-mono tabular-nums text-[15px] text-rose-700 dark:text-rose-400" data-testid="topmover-down">
          {down && Number(down.changePct) < 0 ? pctFmt(down.changePct) : '—'}
        </p>
      </div>
      <div className="flex flex-col justify-between gap-1 border-l border-bank-gold/50 bg-bank-mint/30 px-4 py-3 dark:bg-bank-ink/20" data-testid="marktmonitor-breite">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
          Marktbreite im Monitor
        </p>
        <p className="font-serif text-[15px] leading-tight text-bank-text">
          <span className="tabular-nums">{positive}</span> von <span className="tabular-nums">{total}</span> positiv
        </p>
        <p className="font-mono text-[10.5px] text-bank-text-muted">
          <span className="tabular-nums">{negative}</span> negativ · nur beobachtete Instrumente
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------
const MarktMonitor = () => {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [activeTab, setActiveTab] = useState('overview');
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ov = await fetchMarketOverview();
        if (alive) setState({ loading: false, error: null, data: ov });
      } catch (err) {
        if (alive) setState({ loading: false, error: err, data: null });
      }
    })();
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => {
    if (!state.data) return [];
    const bag = {};
    ['indices','commodities','fx'].forEach((k) => (state.data[k] || []).forEach((q) => { if (q?.symbol) bag[q.symbol] = q; }));
    return INSTRUMENTS.map((cfg) => {
      const q = bag[cfg.symbol];
      if (!q) {
        return { ...cfg, price: null, changePct: null, present: false };
      }
      return {
        ...cfg,
        price: priceOf(q, cfg),
        changePct: q.changePct,
        present: true,
      };
    });
  }, [state.data]);

  const anyPresent = rows.some((r) => r.present && r.price != null);
  const lastUpdatedLabel = state.data?.lastUpdated ? formatLastUpdated(state.data.lastUpdated) : null;
  const contextRows = useMemo(() => contextLine(rows), [rows]);

  const reveal = {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-72px' },
    transition: { duration: prefersReduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <section
      id="home-market-monitor"
      aria-labelledby="home-market-monitor-heading"
      data-testid="home-market-monitor"
      className="relative border-t border-bank-border bg-bank-bg py-14 sm:py-16"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        <motion.header {...reveal} className="mx-auto max-w-3xl text-center">
          <Eyebrow>Marktumfeld</Eyebrow>
          <h2
            id="home-market-monitor-heading"
            className="mt-4 font-display text-[1.75rem] font-light leading-[1.15] tracking-tight text-bank-text sm:text-[2rem]"
          >
            Märkte im Überblick
          </h2>
          <p className="mx-auto mt-4 max-w-[36rem] text-[14px] leading-relaxed text-bank-text-muted sm:text-[15px]">
            Wichtige Indizes, Rohstoffe und Devisen auf einen Blick.
          </p>
        </motion.header>

        {/* Marktimpuls-Kopfzeile */}
        {anyPresent ? <MarktImpuls rows={rows} /> : null}

        <motion.div {...reveal} className="mt-8">
          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Marktmonitor-Kategorien"
            className="mx-auto flex w-full max-w-full snap-x snap-mandatory gap-2 overflow-x-auto border-b border-bank-border pb-0 sm:justify-center"
            data-testid="marktmonitor-tablist"
          >
            {TABS.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`marktmonitor-panel-${t.id}`}
                  id={`marktmonitor-tab-${t.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setActiveTab(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      const dir = e.key === 'ArrowRight' ? 1 : -1;
                      const idx = TABS.findIndex((x) => x.id === activeTab);
                      const next = TABS[(idx + dir + TABS.length) % TABS.length];
                      setActiveTab(next.id);
                      e.preventDefault();
                    }
                  }}
                  data-testid={`marktmonitor-tab-${t.id}`}
                  className={`min-h-[44px] shrink-0 snap-start border-b-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                    active
                      ? 'border-bank-gold text-bank-text'
                      : 'border-transparent text-bank-text-muted hover:text-bank-text'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Rows */}
          <div
            role="tabpanel"
            id={`marktmonitor-panel-${activeTab}`}
            aria-labelledby={`marktmonitor-tab-${activeTab}`}
            data-testid={`marktmonitor-panel-${activeTab}`}
            className="mt-6"
          >
            {state.loading ? (
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-2">
                {[0,1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center gap-4 border-b border-bank-border px-4 py-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-bank-bg/60" />
                    <div className="ml-auto h-4 w-16 animate-pulse rounded bg-bank-bg/60" />
                  </div>
                ))}
              </div>
            ) : !anyPresent ? (
              <p className="py-8 text-center text-[13px] text-bank-text-muted" data-testid="marktmonitor-empty">
                Marktdaten aktuell nicht verfügbar.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-2">
                {rows.map((r) => {
                  const tab = TABS.find((t) => t.id === activeTab) || TABS[0];
                  const isVisible = tab.filter(r.symbol, r);
                  const pct = pctFmt(r.changePct);
                  const priceStr = r.price != null ? numFmt(r.price, r.decimals) : '—';
                  return (
                    <li
                      key={r.symbol}
                      className={`flex items-center justify-between gap-4 border-b border-bank-border px-4 py-4 ${isVisible ? '' : 'hidden'}`}
                      data-testid={`marktmonitor-row-${r.symbol}`}
                      aria-hidden={!isVisible}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-[15px] leading-tight text-bank-text">{r.label}</p>
                        <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                          {r.unit || '\u00A0'}
                        </p>
                      </div>
                      <MiniSparkline symbol={r.symbol} width={72} height={22} className="hidden sm:inline-block" />
                      <div className="min-w-[110px] shrink-0 text-right">
                        <p className="font-mono tabular-nums text-[14.5px] text-bank-text" data-testid={`marktmonitor-price-${r.symbol}`}>
                          {priceStr}
                        </p>
                        <p className={`mt-0.5 font-mono tabular-nums text-[11.5px] ${changeColor(r.changePct)}`} data-testid={`marktmonitor-change-${r.symbol}`}>
                          {pct || '—'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Top-Bewegungen + Marktbreite (aus vorhandenen Daten) */}
          {!state.loading && anyPresent ? <TopMovers rows={rows} /> : null}

          {/* Context lines */}
          {!state.loading && anyPresent ? (
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="marktmonitor-context">
              {contextRows.map((c) => (
                <div key={c.label} className="flex items-baseline gap-2 border-l border-bank-gold/40 pl-3 text-[12.5px]">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">{c.label}</span>
                  <span className="text-bank-text">{c.word}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Data provenance + Delay-Tooltip */}
          {!state.loading ? (
            <p
              className="mt-6 flex items-center justify-center gap-1.5 text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted"
              data-testid="marktmonitor-provenance"
            >
              <span>
                {lastUpdatedLabel ? `Datenstand ${lastUpdatedLabel} Uhr` : 'Datenstand nicht verfügbar'}
                {state.data?.isDelayed ? ' · Kurse zeitverzögert' : ''}
              </span>
              {state.data?.isDelayed ? (
                <span
                  className="inline-flex cursor-help items-center"
                  tabIndex={0}
                  title="Die angezeigten Marktdaten können zeitverzögert sein."
                  aria-label="Die angezeigten Marktdaten können zeitverzögert sein."
                  data-testid="marktmonitor-delay-info"
                >
                  <Info size={11} strokeWidth={1.6} />
                </span>
              ) : null}
            </p>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
};

export default MarktMonitor;
