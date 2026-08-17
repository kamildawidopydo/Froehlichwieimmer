import React, { useMemo } from 'react';
import EditorialDonut from './EditorialDonut';

const TOP_N = 7;

const itemDisplayName = (r) => {
  const name = r.name || r.displayName || 'Position';
  if (r.isin) return `${name} · ${r.isin}`;
  if (r.symbol) return `${name} · ${r.symbol}`;
  if (r.id != null) return `${name} · #${String(r.id).slice(-6)}`;
  return name;
};

const BondMarktwertPieChart = ({
  items = [],
  height = 280,
  emptyHint = 'Keine Marktwerte für die Verteilung.',
}) => {
  const rows = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const sorted = [...items].sort((a, b) => Number(b.marktwert || 0) - Number(a.marktwert || 0));
    let combined;
    if (sorted.length <= TOP_N) {
      combined = sorted.map((r) => ({
        ...r,
        displayName: itemDisplayName(r),
        marktwert: Number(r.marktwert || 0),
      }));
    } else {
      const head = sorted.slice(0, TOP_N);
      const tail = sorted.slice(TOP_N);
      const sonstige = tail.reduce((s, r) => s + Number(r.marktwert || 0), 0);
      combined = [
        ...head.map((r) => ({
          ...r,
          displayName: itemDisplayName(r),
          marktwert: Number(r.marktwert || 0),
        })),
        {
          id: '__sonstige__',
          name: 'Sonstige',
          displayName: `Sonstige (${tail.length})`,
          marktwert: sonstige,
          color: '#94a3b8',
        },
      ];
    }
    return combined;
  }, [items]);

  return (
    <EditorialDonut
      rows={rows}
      height={height}
      emptyHint={emptyHint}
      centerLabel="Gesamt"
      layout="horizontal"
      legendVariant="detailed"
      nameKey="displayName"
      valueKey="marktwert"
      idKey="id"
      legendMax={8}
    />
  );
};

export default BondMarktwertPieChart;
