import React, { useEffect, useRef, useState } from 'react';
import { fetchMarketOverview, formatChangePct, formatLastUpdated } from '@/services/marketService';

/**
 * Session 80.34 — Professional Live Market Intelligence Strip
 *
 * Ersetzt den kompakten 4-Kachel-Snapshot von 80.29 durch einen
 * einheitlichen 6-Instrument-Streifen (DAX, S&P 500, NASDAQ-100, Gold,
 * Brent Öl, EUR/USD). Desktop = 6 Spalten mit feinen Hairlines, Mobile
 * = 2×3-Grid. Keine Trading-Terminal-Optik.
 *
 * Datenquelle unverändert:
 *   /api/news-markte/market/overview  →  yfinance-First (80.29e)
 *   Backend-Cache TTL: 300s (indices/commodities), 600s (FX), 24h stale.
 *   Frontend-Refresh: 60s → 4-5 Frontend-Refreshes pro Cache-Fenster.
 *   Damit ist der Provider vor Polling geschützt.
 *
 * Keine Fake-Daten, keine Hardcodes, keine ETF-Proxies. Bei fehlendem
 * Instrument wird die Kachel ausgeblendet; ist die gesamte Liste leer,
 * rendert die Komponente `null`.
 */

// Konfiguration pro Instrument — Label kompakt für UI-Kicker, `tooltip`
// beschreibt das exakte Instrument (max. eine Zeile), `bucket` ist der
// Backend-Response-Schlüssel.
const INSTRUMENTS = [
  { symbol: 'DAX',    label: 'DAX',        bucket: 'indices',
    tooltip: 'Deutscher Aktienindex · 40 große deutsche Unternehmen',
    decimals: 2, unit: 'Punkte' },
  { symbol: 'SPX',    label: 'S&P 500',    bucket: 'indices',
    tooltip: '500 große börsennotierte US-Unternehmen',
    decimals: 2, unit: 'Punkte' },
  { symbol: 'NDX',    label: 'NASDAQ 100', bucket: 'indices',
    tooltip: '100 große Nicht-Finanzunternehmen der Nasdaq',
    decimals: 2, unit: 'Punkte' },
  { symbol: 'GOLD',   label: 'Gold',       bucket: 'commodities',
    tooltip: 'COMEX Gold Future · Preis je Feinunze',
    decimals: 2, unit: '€ / Feinunze', useDisplay: true },
  { symbol: 'OIL',    label: 'Brent',      bucket: 'commodities',
    tooltip: 'Brent Crude Oil Future · Preis je Barrel',
    decimals: 2, unit: '€ / Barrel', useDisplay: true },
  { symbol: 'EURUSD', label: 'EUR/USD',    bucket: 'fx',
    tooltip: 'Euro in US-Dollar',
    decimals: 4, unit: '' },
];

const REFRESH_MS = 60_000;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const numFmt = (n, decimals) =>
  Number(n).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const priceOf = (row, cfg) => {
  // Für Commodities zeigen wir den EUR-konvertierten Wert (`display_price`),
  // sonst den nativen Provider-Preis.
  if (cfg.useDisplay && row.displayPrice != null) return Number(row.displayPrice);
  return row.price != null ? Number(row.price) : null;
};

const absChangeOf = (row, cfg) => {
  // Wenn wir den display_price nutzen (EUR-konvertiert), müssen wir die
  // absolute Veränderung ebenfalls auf EUR-Basis rechnen.  yfinance liefert
  // `change` im nativen (USD-)Wert. Wir konvertieren proportional zum
  // aktuellen fx_rate, damit „+3,20 €" mit „3.994,67 €" konsistent ist.
  if (cfg.useDisplay && row.fxRate && row.change != null) {
    return Number(row.change) * Number(row.fxRate);
  }
  return row.change != null ? Number(row.change) : null;
};

// Regelbasierte Markt-Kontext-Beschreibung eines Instruments — nur aus %.
const contextWord = (pct) => {
  const p = Number(pct);
  if (!Number.isFinite(p)) return null;
  if (p >= 0.75) return 'deutlich fester';
  if (p >= 0.15) return 'fester';
  if (p > -0.15) return 'nahezu unverändert';
  if (p > -0.75) return 'schwächer';
  return 'deutlich schwächer';
};

const buildMarketContext = (rowsBySymbol) => {
  // Kompakte Zusammenfassung nach Region/Asset-Klasse — nur wenn die
  // relevanten Instrumente Daten haben.  Reihenfolge fest: Europa · US ·
  // Rohstoffe · FX.
  const parts = [];
  const dax = rowsBySymbol.DAX;
  const spx = rowsBySymbol.SPX; const ndx = rowsBySymbol.NDX;
  const gold = rowsBySymbol.GOLD; const oil = rowsBySymbol.OIL;
  const eur = rowsBySymbol.EURUSD;

  if (dax) {
    const w = contextWord(dax.changePct);
    if (w) parts.push(`Europäische Aktien ${w}`);
  }
  if (spx || ndx) {
    // Mittelwert US, wenn beide vorhanden — sonst das vorhandene
    const usPcts = [spx?.changePct, ndx?.changePct].filter((x) => Number.isFinite(Number(x))).map(Number);
    if (usPcts.length) {
      const avg = usPcts.reduce((a, b) => a + b, 0) / usPcts.length;
      const w = contextWord(avg);
      if (w) parts.push(`US-Aktien ${w}`);
    }
  }
  if (gold) {
    const w = contextWord(gold.changePct);
    if (w) parts.push(`Gold ${w}`);
  } else if (oil) {
    const w = contextWord(oil.changePct);
    if (w) parts.push(`Brent ${w}`);
  }
  if (eur) {
    const w = contextWord(eur.changePct);
    if (w) parts.push(`EUR/USD ${w}`);
  }
  if (parts.length < 2) return null;
  return parts.slice(0, 3).join(' · ') + '.';
};

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------
const Tile = ({ cfg, row }) => {
  const [tint, setTint] = useState(null);
  const prevPriceRef = useRef(null);

  const price = priceOf(row, cfg);
  const absChange = absChangeOf(row, cfg);
  const pct = row.changePct;

  const positive = Number(pct) >= 0;
  const arrow = positive ? '↑' : '↓';
  const sign = positive ? '+' : '−';
  const changeColor = Math.abs(Number(pct)) < 0.005
    ? 'text-bank-text-muted'
    : positive ? 'text-bank-petrol-strong' : 'text-bank-coral-strong';

  // Dezente Tint-Animation bei Preisänderung zwischen Refreshes.
  useEffect(() => {
    if (prevPriceRef.current != null && price != null && price !== prevPriceRef.current) {
      const rising = price > prevPriceRef.current;
      setTint(rising ? 'petrol' : 'coral');
      const t = setTimeout(() => setTint(null), 450);
      prevPriceRef.current = price;
      return () => clearTimeout(t);
    }
    prevPriceRef.current = price;
    return undefined;
  }, [price]);

  const tintClass = tint === 'petrol'
    ? 'bg-bank-petrol-tint/40'
    : tint === 'coral'
      ? 'bg-bank-coral-tint/40'
      : 'bg-white';

  // Screenreader: klarer, aussprechbarer Satz.
  const srText = Number.isFinite(Number(pct))
    ? `${cfg.label} ${positive ? 'steigt' : 'fällt'} heute um ${Math.abs(Number(pct)).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Prozent`
    : `${cfg.label}: keine Veränderung`;

  return (
    <div
      className={`relative flex min-w-0 flex-col justify-between gap-1.5 px-4 py-3.5 transition-colors duration-500 sm:px-5 ${tintClass}`}
      data-testid={`market-snapshot-${cfg.symbol.toLowerCase()}`}
      title={cfg.tooltip}
    >
      <span className="sr-only">{srText}</span>
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-text-muted">
        {cfg.label}
      </p>
      <p className="font-serif text-[19px] leading-tight tabular-nums text-bank-text sm:text-[21px]" data-numeric>
        {price != null ? numFmt(price, cfg.decimals) : '—'}
      </p>
      <div className={`flex items-baseline gap-1.5 font-mono text-[11.5px] tabular-nums ${changeColor}`}>
        {absChange != null && (
          <span>{sign}{numFmt(Math.abs(absChange), cfg.decimals)}</span>
        )}
        <span aria-hidden className="text-bank-text-muted">·</span>
        <span>{sign}{formatChangePct(pct)}</span>
        <span aria-hidden className="ml-0.5">{arrow}</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const MarketSnapshot = () => {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ lastUpdated: null, isDelayed: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const data = await fetchMarketOverview();
        if (!alive) return;
        const resolved = INSTRUMENTS
          .map((cfg) => {
            const list = data?.[cfg.bucket] || [];
            const row = list.find((r) => r.symbol === cfg.symbol) || null;
            if (!row || row.price == null || Number.isNaN(Number(row.price))) return null;
            return { cfg, row };
          })
          .filter(Boolean);
        setRows(resolved);
        setMeta({
          lastUpdated: data?.lastUpdated || null,
          isDelayed: !!data?.isDelayed,
        });
        setError(false);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      load();
    }, REFRESH_MS);
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) load();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      alive = false;
      clearInterval(id);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, []);

  if (loading) {
    return (
      <section
        aria-labelledby="markt-heute-title"
        className="mb-14 border-b border-bank-border pb-14"
        data-testid="market-snapshot-loading"
      >
        <div className="mb-4 flex items-baseline justify-between gap-6">
          <p id="markt-heute-title" className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-petrol-strong">
            Märkte heute
          </p>
        </div>
        <div className="grid grid-cols-2 divide-y divide-bank-border border border-bank-border sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[92px] animate-pulse bg-neutral-50" />
          ))}
        </div>
      </section>
    );
  }

  if (error || rows.length === 0) return null;

  const rowsBySymbol = Object.fromEntries(rows.map(({ cfg, row }) => [cfg.symbol, row]));
  const contextLine = buildMarketContext(rowsBySymbol);

  // Staleness-Kennzeichnung: älter als 15 Min. → „letzter verfügbarer Stand"
  let stale = false;
  if (meta.lastUpdated) {
    try {
      const ageMin = (Date.now() - new Date(meta.lastUpdated).getTime()) / 60000;
      if (ageMin > 15) stale = true;
    } catch { /* noop */ }
  }

  return (
    <section
      aria-labelledby="markt-heute-title"
      className="mb-14 border-b border-bank-border pb-14"
      data-testid="market-snapshot"
    >
      <div className="mb-3 flex items-baseline justify-between gap-6">
        <p id="markt-heute-title" className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-petrol-strong">
          Märkte heute
        </p>
        <div className="flex items-baseline gap-2 text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
          {meta.lastUpdated && (
            <span data-testid="market-snapshot-timestamp">
              {stale ? 'Letzter verfügbarer Stand' : 'Stand'}{' '}
              {formatLastUpdated(meta.lastUpdated)} Uhr
            </span>
          )}
        </div>
      </div>

      {contextLine && (
        <p
          className="mb-4 text-[12.5px] leading-relaxed text-bank-text-muted"
          data-testid="market-snapshot-context"
        >
          {contextLine}
        </p>
      )}

      {/* Ein zusammenhängendes Modul mit feinen Hairlines zwischen den
          Instrumenten — nicht sechs einzelne Cards. */}
      <div
        className="grid grid-cols-2 divide-x divide-y divide-bank-border border border-bank-border bg-white sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0"
        role="table"
        aria-label="Aktueller Marktüberblick"
      >
        {rows.map(({ cfg, row }) => (
          <Tile key={cfg.symbol} cfg={cfg} row={row} />
        ))}
      </div>

      <p className="mt-3 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
        Orientierung — keine Anlageempfehlung
        {meta.isDelayed && (
          <>
            <span aria-hidden className="mx-2 text-bank-gold">·</span>
            <span>Marktdaten zeitverzögert</span>
          </>
        )}
      </p>
    </section>
  );
};

export default MarketSnapshot;
