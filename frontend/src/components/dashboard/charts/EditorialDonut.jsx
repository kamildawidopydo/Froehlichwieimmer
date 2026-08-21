import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { cn } from '@/lib/utils';
import { formatEUR } from '@/lib/dashboardFormatters';
import { DASHBOARD_EASE } from '@/components/dashboard/motion/dashboardMotion';
import ChartEmpty from './ChartEmpty';
import { CHART_COLORS, CHART_FONT, CHART_PALETTE } from './chartTheme';

const MIN_SLICE_FRACTION = 0.035;
const DIM_OPACITY = 0.72;
const HOVER_OUTER_BOOST = 2;

const shortLabel = (text, max = 16) => {
  const s = String(text || '');
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
};

/** Donut ring radii — must stay well inside size/2. */
const donutRadii = (size) => ({
  innerR: size * 0.32,
  outerR: size * 0.44,
});

const EditorialDonut = ({
  rows = [],
  height = 260,
  emptyHint = 'Keine Daten für die Darstellung.',
  centerLabel = 'Gesamt',
  centerSub,
  getCenterValue,
  legendMax = 6,
  hideLegend = false,
  layout = 'horizontal',
  legendVariant = 'detailed',
  nameKey = 'displayName',
  valueKey = 'marktwert',
  idKey = 'id',
  className,
}) => {
  const [hoverIdx, setHoverIdx] = useState(null);

  const prepared = useMemo(() => {
    const filtered = rows.filter((r) => Number(r[valueKey] || 0) > 0);
    const total = filtered.reduce((s, r) => s + Number(r[valueKey] || 0), 0);
    return filtered.map((r, idx) => ({
      ...r,
      idx,
      value: Number(r[valueKey] || 0),
      color: r.color ?? CHART_PALETTE[idx % CHART_PALETTE.length],
      pctTotal: total > 0 ? (Number(r[valueKey] || 0) / total) * 100 : 0,
      label: r[nameKey] ?? r.name ?? '—',
    }));
  }, [rows, nameKey, valueKey]);

  const total = prepared.reduce((s, r) => s + r.value, 0);
  const isHorizontal = layout === 'horizontal';
  /** Detailed legends need full width — side-by-side truncates labels in narrow columns. */
  const stacked = !isHorizontal || legendVariant === 'detailed';
  const isSingle = prepared.length === 1;
  const size = stacked ? Math.min(height - 48, 168) : 140;
  const { innerR, outerR } = donutRadii(size);
  const padAngle = prepared.length > 1 ? 0.015 : 0.002;

  if (prepared.length === 0) {
    return <ChartEmpty height={height} hint={emptyHint} lottie />;
  }

  const centerValue = getCenterValue ? getCenterValue(total, prepared) : formatEUR(total);
  const resolvedCenterSub =
    typeof centerSub === 'function' ? centerSub(total, prepared) : centerSub;
  const legendRows = prepared.length > legendMax ? prepared.slice(0, legendMax) : prepared;
  const legendMore = prepared.length - legendRows.length;
  const active = hoverIdx != null ? prepared[hoverIdx] : null;

  const pieValue = (d) =>
    isSingle ? d.value : Math.max(d.value, total * MIN_SLICE_FRACTION);

  const legendList = (
    <ul
      className={cn(
        'w-full space-y-0',
        stacked ? 'mt-3 border-t border-bank-border/50 pt-2' : 'min-w-0 flex-1 space-y-1.5 pt-0.5',
      )}
    >
      {legendRows.map((row) => (
        <li
          key={row[idKey] ?? row.idx}
          className={cn(
            'rounded-md px-1 py-1.5 transition-colors sm:px-2',
            hoverIdx === row.idx && 'bg-bank-primary/[0.06]',
            hoverIdx != null && hoverIdx !== row.idx && 'opacity-60',
          )}
          onMouseEnter={() => setHoverIdx(row.idx)}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <div
            className={cn(
              'grid items-center gap-x-2 sm:gap-x-3',
              legendVariant === 'detailed'
                ? 'grid-cols-[10px_minmax(0,1fr)_auto_auto]'
                : 'grid-cols-[10px_minmax(0,1fr)_auto]',
            )}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ background: row.color }}
            />
            <span className="min-w-0 text-[12px] font-medium leading-tight text-bank-text">
              {row.label}
            </span>
            {legendVariant === 'detailed' && (
              <span className="whitespace-nowrap text-right text-[11px] font-semibold tabular-nums text-bank-text">
                {formatEUR(row.value)}
              </span>
            )}
            <span className="min-w-[2.75rem] whitespace-nowrap text-right text-[10.5px] tabular-nums text-bank-text-muted">
              {row.pctTotal.toFixed(1).replace('.', ',')} %
            </span>
          </div>
          {row.subLabel && legendVariant === 'detailed' && (
            <p className="col-start-2 mt-0.5 pl-[18px] text-[10px] leading-snug text-bank-text-muted sm:pl-[22px]">
              {row.subLabel}
            </p>
          )}
        </li>
      ))}
      {legendMore > 0 && (
        <li className="px-2 text-[10.5px] text-bank-text-muted">+ {legendMore} weitere</li>
      )}
    </ul>
  );

  return (
    <div
      style={{ width: '100%', minHeight: stacked ? undefined : height }}
      className={cn(
        stacked ? 'flex flex-col items-stretch' : 'flex items-start gap-4 sm:gap-5',
        className,
      )}
    >
      <div className={cn('relative shrink-0', stacked && 'mx-auto')} style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="block overflow-visible"
          style={{ fontFamily: CHART_FONT }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <Group top={size / 2} left={size / 2}>
            <circle
              r={outerR + 1}
              fill="none"
              stroke={CHART_COLORS.border}
              strokeWidth={1}
              opacity={0.55}
            />
            <Pie
              data={prepared}
              pieValue={pieValue}
              outerRadius={outerR}
              innerRadius={innerR}
              padAngle={padAngle}
              cornerRadius={0}
            >
              {(pie) =>
                pie.arcs.map((arc) => {
                  const idx = arc.index;
                  const isActive = hoverIdx === idx;
                  const path = pie.path({
                    ...arc,
                    outerRadius: outerR + (isActive ? HOVER_OUTER_BOOST : 0),
                    innerRadius: innerR,
                    cornerRadius: 0,
                  });
                  return (
                    <motion.path
                      key={prepared[idx]?.[idKey] ?? idx}
                      d={path || 'M0 0'}
                      fill={arc.data.color}
                      stroke="#fff"
                      strokeWidth={prepared.length > 1 ? 2 : 0}
                      strokeLinejoin="round"
                      opacity={hoverIdx == null || isActive ? 1 : DIM_OPACITY}
                      className="cursor-pointer"
                      animate={{ d: path || 'M0 0', opacity: hoverIdx == null || isActive ? 1 : DIM_OPACITY }}
                      transition={{ duration: 0.2, ease: DASHBOARD_EASE }}
                      onMouseEnter={() => setHoverIdx(idx)}
                    />
                  );
                })
              }
            </Pie>
          </Group>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <p className="max-w-[88%] truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-bank-text-muted">
            {active ? shortLabel(active.label, 14) : centerLabel}
          </p>
          <p className="mt-0.5 max-w-[88%] truncate text-[15px] font-semibold leading-tight tabular-nums text-bank-text">
            {active ? formatEUR(active.value) : centerValue}
          </p>
          {active && (
            <p className="mt-1 text-[10px] tabular-nums text-bank-text-muted">
              {active.pctTotal.toFixed(1).replace('.', ',')} %
            </p>
          )}
          {!active && resolvedCenterSub && (
            <p className="mt-1 max-w-[88%] truncate text-[9.5px] leading-tight text-bank-text-muted">
              {resolvedCenterSub}
            </p>
          )}
        </div>
      </div>

      {!hideLegend && legendList}
    </div>
  );
};

export default EditorialDonut;
