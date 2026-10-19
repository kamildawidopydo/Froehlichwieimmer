import React, { useMemo } from 'react';
import { useDashboardData } from '@/context/DashboardDataContext';
import ChartEmpty from '@/components/dashboard/charts/ChartEmpty';
import EditorialDonut from '@/components/dashboard/charts/EditorialDonut';

const SectorAllocationChart = ({ height = 240 }) => {
  const { stockMetrics, stockCatalog } = useDashboardData();

  const rows = useMemo(() => {
    const sectorMap = {};
    (stockMetrics || []).forEach((m) => {
      const cat = stockCatalog?.find((s) => s.symbol === m.symbol);
      const sector = cat?.sector || m.sector || 'Sonstige';
      sectorMap[sector] = (sectorMap[sector] || 0) + Number(m.marktwert || 0);
    });
    return Object.entries(sectorMap)
      .map(([name, marktwert], idx) => ({
        id: name,
        displayName: name,
        marktwert,
        idx,
      }))
      .filter((d) => d.marktwert > 0)
      .sort((a, b) => b.marktwert - a.marktwert);
  }, [stockMetrics, stockCatalog]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-bank-border bg-white p-5 shadow-sm">
        <h3 className="chart-title mb-4 text-[15px] font-semibold text-bank-text">
          Sektor-Allokation (Aktien)
        </h3>
        <ChartEmpty height={160} hint="Keine Aktienpositionen für Sektoren-Analyse." />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-bank-border bg-white p-5 shadow-sm">
      <h3 className="chart-title mb-4 text-[15px] font-semibold text-bank-text">
        Sektor-Allokation (Aktien)
      </h3>
      <EditorialDonut rows={rows} height={height} legendMax={6} />
    </div>
  );
};

export default SectorAllocationChart;
