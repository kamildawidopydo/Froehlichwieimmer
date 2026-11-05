import React from 'react';
import { fmtEurPlain, fmtEurSigned, fmtPctSigned, toneClass } from '@/lib/ipoEstimate';

// Seven-value estimate grid (admin dialog + expandable table row).
export const IpoEstimateSummary = ({ est, testIdPrefix = 'ipo-est' }) => {
  const cells = [
    ['IPO-Kaufpreis / Aktie', fmtEurPlain(est?.purchasePrice), 'purchase-price'],
    ['Anzahl der Aktien', est?.shares != null ? `${est.shares.toLocaleString('de-DE')} Stück` : '–', 'shares'],
    ['Gesamter Kaufbetrag', fmtEurPlain(est?.totalCost), 'total-cost'],
    ['Geschätzter Wert / Aktie', fmtEurPlain(est?.estimatedValue), 'estimated-value'],
    ['Geschätzter Gesamtwert', fmtEurPlain(est?.estimatedTotal), 'estimated-total'],
  ];
  return (
    <div className="rounded-lg border border-bank-border bg-bank-bg/40 p-3 text-[12px]" data-testid={`${testIdPrefix}-summary`}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {cells.map(([label, value, key]) => (
          <div key={key}>
            <p className="text-bank-text-muted">{label}</p>
            <p className="font-medium tabular-nums" data-testid={`${testIdPrefix}-${key}`}>{value}</p>
          </div>
        ))}
        <div>
          <p className="text-bank-text-muted">Geschätzter Gewinn / Verlust</p>
          <p className={`font-semibold tabular-nums ${toneClass(est?.profit)}`} data-testid={`${testIdPrefix}-profit`}>
            {fmtEurSigned(est?.profit)}
          </p>
        </div>
        <div>
          <p className="text-bank-text-muted">Geschätzte Rendite</p>
          <p className={`font-semibold tabular-nums ${toneClass(est?.returnPct)}`} data-testid={`${testIdPrefix}-return`}>
            {fmtPctSigned(est?.returnPct)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IpoEstimateSummary;
