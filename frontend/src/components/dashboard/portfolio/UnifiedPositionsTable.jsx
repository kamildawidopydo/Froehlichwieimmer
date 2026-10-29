import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useDashboardData } from '@/context/DashboardDataContext';
import StockLogo from '@/components/StockLogo';
import BondLogo from '@/components/BondLogo';
import Sparkline from '@/components/dashboard/charts/Sparkline';
import { formatEUR } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';
import SecurityPositionCard from '@/components/dashboard/portfolio/SecurityPositionCard';

const PctBadge = ({ value }) => {
  if (value == null) return <span className="text-[12px] text-bank-text-muted">–</span>;
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular-nums',
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
      )}
    >
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {up ? '+' : ''}
      {Number(value).toFixed(2)}%
    </span>
  );
};

/** All stock + bond holdings in one IBKR-style table. */
const UnifiedPositionsTable = ({ sparklines = {} }) => {
  const navigate = useNavigate();
  const { stockMetrics, bondPositions, stockPriceMap, computeBondMetrics } = useDashboardData();

  const hasIpoPositions = (stockMetrics || []).some((m) => m.isIpoValuation);

  const rows = useMemo(() => {
    const stocks = (stockMetrics || []).map((m) => {
      const p = stockPriceMap[m.symbol];
      return {
        id: `s-${m.id}`,
        kind: 'stock',
        symbol: m.symbol,
        name: m.stockName || m.symbol,
        logoUrl: m.logoUrl,
        qty: Number(m.qty),
        price: m.price ?? p?.price,
        currency: p?.currency || 'EUR',
        marktwert: Number(m.marktwert || 0),
        dayPct: p?.change_pct != null ? Number(p.change_pct) : null,
        gvPct: m.pct,
        to: `/dashboard/aktien/${encodeURIComponent(m.symbol)}`,
      };
    });
    const bonds = (bondPositions || []).map((b) => {
      const m = computeBondMetrics(b);
      return {
        id: `b-${b.id}`,
        kind: 'bond',
        bond: b,
        symbol: b.isin || b.id,
        name: b.bond_name || b.isin || 'Anleihe',
        qty: null,
        price: null,
        currency: 'EUR',
        marktwert: m.marktwert,
        dayPct: null,
        gvPct: m.rendite,
        to: '/dashboard/anleihen',
      };
    });
    return [...stocks, ...bonds].sort((a, b) => b.marktwert - a.marktwert);
  }, [stockMetrics, bondPositions, stockPriceMap, computeBondMetrics]);

  const listRef = useAutoAnimateRef(rows.length > 0);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-bank-border bg-white p-10 text-center shadow-sm">
        <p className="text-[14px] text-bank-text-muted">Keine offenen Positionen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {(stockMetrics || []).map((m) => <SecurityPositionCard key={m.id} metric={m} quote={stockPriceMap[m.symbol]} />)}
      </div>
      {bondPositions.length > 0 && (
    <div className="overflow-hidden rounded-xl border border-bank-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-bank-border bg-bank-bg/60">
            <tr>
              {['Symbol', 'Name', '30T', 'Stück', 'Kurs', 'Marktwert', 'Tag', 'G/V'].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-bank-text-muted',
                    i >= 3 ? 'text-right' : 'text-left',
                    i === 2 && 'text-center',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={listRef} className="divide-y divide-bank-border/70">
            {rows.filter((r) => r.kind === 'bond').map((r) => {
              const up = (r.dayPct ?? r.gvPct ?? 0) >= 0;
              return (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-bank-bg/40"
                  onClick={() => navigate(r.to)}
                >
                  <td className="px-4 py-3 font-mono text-[13px] font-medium text-bank-text">{r.symbol}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.kind === 'stock' ? (
                        <StockLogo symbol={r.symbol} name={r.name} logoUrl={r.logoUrl} size="sm" />
                      ) : (
                        <BondLogo bond={r.bond} size="sm" />
                      )}
                      <span className="max-w-[180px] truncate text-[13px] text-bank-text">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      {r.kind === 'stock' ? (
                        <Sparkline values={sparklines[r.symbol]} up={up} />
                      ) : (
                        <span className="text-[11px] text-bank-text-muted">–</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-bank-text-muted">
                    {r.qty != null ? r.qty.toLocaleString('de-DE', { maximumFractionDigits: 4 }) : '–'}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                    {r.price != null
                      ? Number(r.price).toLocaleString('de-DE', { style: 'currency', currency: r.currency })
                      : '–'}
                  </td>
                  <td className="px-4 py-3 text-right text-[13.5px] font-semibold tabular-nums">
                    {formatEUR(r.marktwert)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PctBadge value={r.dayPct} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.gvPct != null ? (
                      <span className={cn('text-[13px] font-medium tabular-nums', up ? 'text-emerald-600' : 'text-rose-600')}>
                        {up ? '+' : ''}
                        {Number(r.gvPct).toFixed(2)}%
                      </span>
                    ) : (
                      '–'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
      )}
    </div>
  );
};

export default UnifiedPositionsTable;
