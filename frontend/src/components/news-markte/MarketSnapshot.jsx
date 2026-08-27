import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  fetchMarketOverview,
  formatDisplayPrice,
  formatChangePct,
  formatLastUpdated,
} from '@/services/marketService';

// Session 80.29 Phase 4 — „Märkte heute"
// Kompakter Markt-Snapshot direkt unter „Heute wichtig":
//   Desktop:  4 Items in einer horizontalen Zeile (nicht sticky)
//   Mobile:   2×2 Grid
// Daten: bestehende /api/news-markte/market/overview-Route (yfinance-Fallback).
// Keine Mock-Werte — bei fehlenden/veralteten Daten wird das Item ausgeblendet;
// sind alle vier leer, rendert die Komponente `null`.

// Auswahl exakt gemäß User-Prompt: DAX, S&P 500, EUR/USD, Gold.
// Session 80.29e: Kurz-Label für UI, `fallbackNote` beschreibt das exakte
// Instrument (wird als `title`-Tooltip gerendert). Rückgriff auf Backend-`note`,
// falls dort präzisere Angaben stehen.
const SNAPSHOT_SYMBOLS = [
  { symbol: 'DAX',    label: 'DAX',      bucket: 'indices',    fallbackNote: 'DAX Performance-Index (^GDAXI)' },
  { symbol: 'SPX',    label: 'S&P 500',  bucket: 'indices',    fallbackNote: 'S&P 500 Index (^GSPC)' },
  { symbol: 'EURUSD', label: 'EUR/USD',  bucket: 'fx',         fallbackNote: 'Spot EUR/USD (1 EUR = x USD)' },
  { symbol: 'GOLD',   label: 'Gold',     bucket: 'commodities', fallbackNote: 'COMEX Gold-Future (GC=F) · Feinunze' },
];

const REFRESH_MS = 120_000; // stiller Refresh alle 2 Min., an Sidebar-Rhythmus angelehnt

const findRow = (data, cfg) => {
  const list = data?.[cfg.bucket] || [];
  return list.find((r) => r.symbol === cfg.symbol) || null;
};

const SnapshotTile = ({ label, row, note }) => {
  const changePct = row?.changePct;
  const positive = Number(changePct) >= 0;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;
  // Semantik gemäß 80.26-Farbsystem:
  //   positiv  → Petrol (bank-petrol-strong)
  //   negativ  → Coral  (bank-coral-strong)
  const changeColor = positive ? 'text-bank-petrol-strong' : 'text-bank-coral-strong';
  const prefix = positive ? '+' : '−';
  const { primary, secondary } = formatDisplayPrice(row);

  return (
    <div
      className="flex min-w-0 flex-col justify-between gap-2 border border-bank-border bg-white px-4 py-3 sm:px-5 sm:py-4"
      data-testid={`market-snapshot-${row.symbol.toLowerCase()}`}
      title={note || undefined}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">
          {label}
        </span>
        <Arrow className={`h-3.5 w-3.5 shrink-0 ${changeColor}`} strokeWidth={1.8} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="font-serif text-[17px] leading-tight tabular-nums text-bank-text sm:text-[19px]" data-numeric>
            {primary}
          </p>
          {secondary && (
            <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-bank-text-muted">
              {secondary}
            </p>
          )}
        </div>
        <span className={`font-mono text-[11.5px] tabular-nums ${changeColor}`}>
          {prefix}{formatChangePct(changePct)}
        </span>
      </div>
    </div>
  );
};

const MarketSnapshot = () => {
  const [tiles, setTiles] = useState([]);
  const [meta, setMeta] = useState({ lastUpdated: null, isDelayed: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const data = await fetchMarketOverview();
        if (!alive) return;
        const resolved = SNAPSHOT_SYMBOLS
          .map((cfg) => {
            const row = findRow(data, cfg);
            if (!row || row.price == null || Number.isNaN(Number(row.price))) return null;
            const note = row.note || cfg.fallbackNote;
            return { cfg, row, note };
          })
          .filter(Boolean);
        setTiles(resolved);
        setMeta({
          lastUpdated: data?.lastUpdated || null,
          isDelayed: !!data?.isDelayed,
        });
      } catch {
        if (alive) setTiles([]);
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

  // Skeleton beim Erstladen — vermeidet Layout-Sprung.
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[80px] animate-pulse border border-bank-border bg-neutral-50" />
          ))}
        </div>
      </section>
    );
  }

  // Graceful: alle vier ohne Daten → Komponente komplett ausblenden.
  if (tiles.length === 0) return null;

  return (
    <section
      aria-labelledby="markt-heute-title"
      className="mb-14 border-b border-bank-border pb-14"
      data-testid="market-snapshot"
    >
      <div className="mb-4 flex items-baseline justify-between gap-6">
        <p id="markt-heute-title" className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-petrol-strong">
          Märkte heute
        </p>
        <p className="hidden text-[11px] uppercase tracking-[0.18em] text-bank-text-muted sm:block">
          Orientierung — keine Anlageempfehlung
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map(({ cfg, row, note }) => (
          <SnapshotTile key={cfg.symbol} label={cfg.label} row={row} note={note} />
        ))}
      </div>
      {(meta.lastUpdated || meta.isDelayed) && (
        <p
          className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted"
          data-testid="market-snapshot-meta"
        >
          {meta.lastUpdated && (
            <span>Letzte Aktualisierung: {formatLastUpdated(meta.lastUpdated)} Uhr</span>
          )}
          {meta.lastUpdated && meta.isDelayed && <span aria-hidden className="text-bank-gold">·</span>}
          {meta.isDelayed && <span>Marktdaten zeitverzögert</span>}
        </p>
      )}
    </section>
  );
};

export default MarketSnapshot;
