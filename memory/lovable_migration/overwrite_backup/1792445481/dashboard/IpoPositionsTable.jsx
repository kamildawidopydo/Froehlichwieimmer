import React from 'react';
import { cn } from '@/lib/utils';
import StockLogo from '@/components/StockLogo';
import { formatEURSigned } from '@/lib/dashboardFormatters';

const formatLotPrice = (value, currency = 'USD') => {
  if (value == null || !Number.isFinite(Number(value))) return '–';
  try {
    return Number(value).toLocaleString('de-DE', {
      style: 'currency',
      currency: currency === 'EUR' ? 'EUR' : currency === 'GBP' ? 'GBP' : 'USD',
      maximumFractionDigits: 4,
    });
  } catch {
    return String(value);
  }
};

const formatPct = (v) => {
  if (v == null || !Number.isFinite(Number(v))) return '–';
  const n = Number(v);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)} %`;
};

/**
 * IPO holdings with admin valuation: Lots, Einstand/Lot, Listing, Gewinn.
 */
const IpoPositionsTable = ({
  metrics = [],
  stockPriceMap = {},
  onRowClick,
  title = 'IPO-Positionen',
  className,
}) => {
  const rows = (metrics || []).filter((m) => m.isIpoValuation);
  if (rows.length === 0) return null;

  return (
    <div className={cn('overflow-hidden rounded-xl border border-violet-200/80 bg-white shadow-sm', className)}>
      <div className="border-b border-violet-100 bg-violet-50/60 px-4 py-3">
        <p className="text-[14px] font-semibold text-bank-text">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-bank-border bg-bank-bg/50">
            <tr>
              {['Position', 'Lots', 'Einstand/Lot', 'Listing', 'Gewinn', 'Marktwert'].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-bank-text-muted',
                    i === 0 ? 'text-left' : 'text-right',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-bank-border/70">
            {rows.map((m) => {
              const currency = stockPriceMap[m.symbol]?.currency || m.currency || 'USD';
              const up = (m.gv ?? 0) >= 0;
              const einstand = m.ipoEinstandPerLot ?? m.avg;
              const listing = m.ipoListingPerLot ?? m.price;
              return (
                <tr
                  key={m.id || m.symbol}
                  className={cn(onRowClick && 'cursor-pointer hover:bg-bank-bg/40')}
                  onClick={onRowClick ? () => onRowClick(m) : undefined}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <StockLogo
                        symbol={m.symbol}
                        name={m.stockName}
                        logoUrl={m.logoUrl}
                        exchange={m.exchange}
                        isTradable={m.isTradable}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-bank-text">
                          {m.stockName || m.symbol}
                        </p>
                        <p className="font-mono text-[10.5px] text-bank-text-muted">{m.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-bank-text">
                    {Number(m.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-bank-text-muted">
                    {formatLotPrice(einstand, currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums font-medium text-bank-text">
                    {formatLotPrice(listing, currency)}
                  </td>
                  <td className={cn('px-4 py-3 text-right text-[13px] tabular-nums font-medium', up ? 'text-emerald-700' : 'text-rose-700')}>
                    <div>{formatEURSigned(m.gv)}</div>
                    <div className="text-[11px]">{formatPct(m.pct)}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-[13.5px] font-semibold tabular-nums text-bank-text">
                    {Number(m.marktwert).toLocaleString('de-DE', {
                      style: 'currency',
                      currency: currency === 'EUR' ? 'EUR' : currency === 'GBP' ? 'GBP' : 'USD',
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IpoPositionsTable;
