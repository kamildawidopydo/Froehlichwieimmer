import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fetchMarketIndices, MARKET_INDICES } from '@/services/marketService';
import { cn } from '@/lib/utils';

const REFRESH_MS = 60_000;

const formatIndexValue = (v) =>
  v == null ? '–' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatPct = (v) =>
  v == null ? '' : `${v >= 0 ? '+' : ''}${Number(v).toFixed(2).replace('.', ',')}%`;

const emptyIndices = () =>
  MARKET_INDICES.map((i) => ({
    symbol: i.symbol,
    label: i.label,
    price: null,
    changePct: null,
  }));

/** Compact live market-index strip — global in dashboard topbar or page-local. */
const MarketTicker = ({ className, compact = false }) => {
  const [indices, setIndices] = useState(() => emptyIndices());
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const data = await fetchMarketIndices();
      if (active) {
        setIndices(data?.length ? data : emptyIndices());
        setLoaded(true);
      }
    };
    load();
    timerRef.current = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const rows = loaded ? indices : emptyIndices();

  return (
    <div
      className={cn(
        compact ? 'overflow-x-auto py-1' : 'mb-6 overflow-x-auto rounded-xl border border-bank-border bg-white shadow-sm',
        className,
      )}
    >
      <div className={cn('flex min-w-max', compact ? 'divide-x divide-bank-border/60' : 'divide-x divide-bank-border')}>
        {rows.map((idx, i) => {
          if (!loaded) {
            return <div key={i} className="h-[52px] w-44 animate-pulse bg-bank-surface-elev/60" />;
          }
          const up = (idx.changePct ?? 0) >= 0;
          return (
            <div key={idx.symbol} className="flex min-w-[10.5rem] flex-1 items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-[0.04em] text-bank-text-muted">
                  {idx.label}
                </p>
                <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-bank-text">
                  {formatIndexValue(idx.price)}
                </p>
              </div>
              {idx.changePct != null ? (
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-[12px] font-semibold tabular-nums',
                    up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                  )}
                >
                  {up ? <ArrowUpRight size={12} strokeWidth={2} /> : <ArrowDownRight size={12} strokeWidth={2} />}
                  {formatPct(idx.changePct)}
                </span>
              ) : (
                <span className="shrink-0 text-[11px] text-bank-text-muted">–</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketTicker;
