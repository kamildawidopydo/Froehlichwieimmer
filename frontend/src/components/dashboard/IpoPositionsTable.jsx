import React from 'react';
import { cn } from '@/lib/utils';
import StockLogo from '@/components/StockLogo';
import { formatDate } from '@/lib/dashboardFormatters';
import { fmtEurSigned, fmtPctSigned, IPO_ESTIMATE_DISCLAIMER } from '@/lib/ipoEstimate';

// IPO allocations are booked in EUR (allocation contract + cash debit in EUR).
const formatLotPrice = (value, currency) => {
  if (value == null || !Number.isFinite(Number(value)) || currency !== 'EUR') return '–';
  return Number(value).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 });
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
    <div className={cn('overflow-hidden rounded-lg border border-bank-border bg-bank-surface shadow-sm', className)}>
      <div className="border-b border-bank-border bg-bank-bg/60 px-4 py-3">
        <p className="text-[14px] font-semibold text-bank-text">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-bank-border bg-bank-bg/50">
            <tr>
              {['Position', 'Aktienanzahl', 'IPO-Kaufpreis', 'Investierter Betrag', 'Geschätzter Aktienwert', 'Geschätzter Gesamtwert', 'Geschätzter Gewinn / Rendite', 'Kaufdatum'].map((h, i) => (
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
              const currency = m.currency;
              const gv = m.gv == null ? null : Math.round(Number(m.gv) * 100) / 100;
              const tone = gv == null || gv === 0 ? 'text-bank-text' : gv > 0 ? 'text-bank-success' : 'text-bank-error';
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
                    {Number(m.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stück
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-bank-text-muted">
                    {formatLotPrice(einstand, currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-bank-text">{formatLotPrice(m.einstand, currency)}</td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums font-medium text-bank-text">
                    {formatLotPrice(listing, currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-[13.5px] font-semibold tabular-nums text-bank-text" data-testid={`ipo-position-value-${m.symbol}`}>
                    {formatLotPrice(m.marktwert, currency)}
                  </td>
                  <td className={cn('px-4 py-3 text-right text-[13px] tabular-nums font-medium', tone)} data-testid={`ipo-position-profit-${m.symbol}`}>
                    <div>{fmtEurSigned(gv)}</div>
                    <div className="text-[11px]">{fmtPctSigned(m.pct == null ? null : Math.round(Number(m.pct) * 100) / 100)}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-bank-text-muted">{formatDate(m.purchase_date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-bank-border px-4 py-3 text-[11.5px] text-bank-text-muted" data-testid="ipo-estimate-disclaimer">
        {IPO_ESTIMATE_DISCLAIMER}
      </p>
    </div>
  );
};

export default IpoPositionsTable;
