import React, { useMemo } from 'react';
import { formatEUR } from '@/lib/dashboardFormatters';
import ChartEmpty from './ChartEmpty';
import EditorialDonut from './EditorialDonut';
import { CHART_PALETTE } from './chartTheme';

const BankAllocationChart = ({
  rows = [],
  height = 220,
  emptyHint = 'Keine Bankzuordnung verfügbar.',
  className,
}) => {
  const prepared = useMemo(
    () =>
      (rows || []).map((row, idx) => ({
        ...row,
        id: row.bankId ?? idx,
        displayName: row.bankName,
        marktwert: Number(row.exposureEur || 0),
        color: row.isOverLimit ? CHART_PALETTE[7] : CHART_PALETTE[idx % CHART_PALETTE.length],
        subLabel: `${formatEUR(row.exposureEur)} / Limit ${formatEUR(row.limitEur)}`,
      })),
    [rows],
  );

  if (!prepared.length) {
    return <ChartEmpty height={height} hint={emptyHint} />;
  }

  return (
    <EditorialDonut
      rows={prepared}
      height={height}
      emptyHint={emptyHint}
      layout="horizontal"
      legendVariant="detailed"
      legendMax={8}
      className={className}
    />
  );
};

export default BankAllocationChart;
