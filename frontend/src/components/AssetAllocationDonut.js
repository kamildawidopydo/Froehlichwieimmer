import React, { useMemo } from 'react';
import { PieChart as PieIcon } from 'lucide-react';
import EditorialDonut from '@/components/dashboard/charts/EditorialDonut';
import { CHART_PALETTE, compactEur } from '@/components/dashboard/charts/chartTheme';

const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const centerTotalLabel = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 100_000) return compactEur(n);
  return formatEUR(n);
};

const AssetAllocationDonut = ({ cash = 0, stocks = 0, bonds = 0, contracts = 0 }) => {
  const allData = useMemo(
    () => [
      { id: 'cash', name: 'Guthaben', marktwert: Number(cash || 0), color: CHART_PALETTE[0] },
      { id: 'stocks', name: 'Aktien', marktwert: Number(stocks || 0), color: CHART_PALETTE[1] },
      { id: 'bonds', name: 'Anleihen', marktwert: Number(bonds || 0), color: CHART_PALETTE[2] },
      { id: 'contracts', name: 'Verträge', marktwert: Number(contracts || 0), color: CHART_PALETTE[3] },
    ].filter((d) => d.marktwert > 0),
    [cash, stocks, bonds, contracts],
  );

  const classCount = allData.length;
  const total = allData.reduce((s, d) => s + d.marktwert, 0);

  return (
    <div className="flex flex-col rounded-lg border border-bank-border bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-editorial-sm">
      <div className="mb-3 flex items-center gap-2">
        <PieIcon size={16} className="text-bank-primary" />
        <h3 className="chart-title text-sm font-semibold text-bank-text">Allokation</h3>
      </div>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <PieIcon size={36} className="mb-3 text-bank-text-muted/30" />
          <p className="text-sm text-bank-text-muted/80">Keine Daten verfügbar</p>
          <p className="mt-1 text-xs text-bank-text-muted/60">
            Ihr Vermögen erscheint hier, sobald erste Werte vorliegen.
          </p>
        </div>
      ) : (
        <EditorialDonut
          rows={allData}
          height={220}
          layout="vertical"
          legendVariant="detailed"
          nameKey="name"
          valueKey="marktwert"
          idKey="id"
          getCenterValue={(t) => centerTotalLabel(t)}
          centerSub={`${classCount} ${classCount === 1 ? 'Anlageklasse' : 'Anlageklassen'}`}
        />
      )}
    </div>
  );
};

export default AssetAllocationDonut;
