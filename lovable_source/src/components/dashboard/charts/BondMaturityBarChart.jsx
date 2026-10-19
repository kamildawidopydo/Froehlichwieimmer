import React, { useMemo } from 'react';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { scaleBand, scaleLinear } from '@visx/scale';
import { formatEUR } from '@/lib/dashboardFormatters';
import ChartEmpty from './ChartEmpty';
import ChartLegend from './ChartLegend';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import {
  BUCKET_COLORS,
  BUCKET_LABELS,
  CHART_COLORS,
  CHART_FONT,
  compactEur,
} from './chartTheme';
import useChartHover from './useChartHover';
import VisxChartShell from './visx/VisxChartShell';
import {
  VISX_BAR_MARGIN,
  INACTIVE_BAR_OPACITY,
  axisBottomProps,
  axisLeftProps,
  bandPaddingForCount,
  clampBarInBand,
  gridRowsProps,
  innerSize,
} from './visx/visxTheme';

const BUCKET_ORDER = ['y1', 'y3', 'beyond', 'unknown'];
const MAX_BAR_W = 56;

const bucketForRestTage = (restTage, hasMaturity) => {
  if (!hasMaturity) return 'unknown';
  if (restTage <= 365) return 'y1';
  if (restTage <= 1095) return 'y3';
  return 'beyond';
};

const BondMaturityBarChart = ({
  rows = [],
  height = 280,
  emptyHint = 'Keine Anleihen-Positionen für die Darstellung.',
}) => {
  const data = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const totals = Object.fromEntries(BUCKET_ORDER.map((k) => [k, { marktwert: 0, count: 0 }]));
    rows.forEach((r) => {
      const bucket = bucketForRestTage(Number(r.restTage || 0), !!r.faelligkeitsdatum);
      totals[bucket].marktwert += Number(r.marktwert || 0);
      totals[bucket].count += 1;
    });
    return BUCKET_ORDER.map((key) => ({
      key,
      label: BUCKET_LABELS[key],
      marktwert: totals[key].marktwert,
      count: totals[key].count,
      fill: BUCKET_COLORS[key],
    })).filter((d) => d.marktwert > 0);
  }, [rows]);

  const chartHeight = height - 36;
  const { hoverIndex, onMouseMove, onMouseLeave } = useChartHover(data.length);

  if (!data.length) {
    return <ChartEmpty height={height} hint={emptyHint} />;
  }

  const activeIdx = hoverIndex;
  const activeRow = activeIdx != null ? data[activeIdx] : null;

  return (
    <div style={{ width: '100%', height }}>
      <div className="relative" style={{ height: chartHeight }}>
        <VisxChartShell
          height={chartHeight}
          className="cursor-crosshair"
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          ariaLabel="Marktwert nach Restlaufzeit"
        >
          {({ width, height: h }) => {
            const margin = VISX_BAR_MARGIN;
            const { innerWidth, innerHeight } = innerSize(width, h, margin);
            const maxVal = Math.max(...data.map((d) => d.marktwert), 0);
            const niceMax =
              maxVal <= 0 ? 1 : Math.ceil((maxVal * 1.08) / 1000) * 1000 || maxVal * 1.08;

            const xScale = scaleBand({
              domain: data.map((d) => d.label),
              range: [0, innerWidth],
              padding: bandPaddingForCount(data.length),
            });

            const yScale = scaleLinear({
              domain: [0, niceMax],
              range: [innerHeight, 0],
              nice: true,
            });

            const tooltipLeftPct = activeRow
              ? ((margin.left + clampBarInBand(xScale, activeRow.label, MAX_BAR_W).center) / width) *
                100
              : 50;

            return (
              <>
                {activeRow && (
                  <div
                    className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 transition-[left] duration-75"
                    style={{ left: `${Math.min(88, Math.max(12, tooltipLeftPct))}%` }}
                  >
                    <ChartTooltipFrame label={activeRow.label}>
                      <ChartTooltipRow label="Marktwert" value={formatEUR(activeRow.marktwert)} />
                      <ChartTooltipRow label="Positionen" value={String(activeRow.count)} tone="muted" />
                    </ChartTooltipFrame>
                  </div>
                )}

                <svg width={width} height={h} style={{ fontFamily: CHART_FONT }}>
                  <Group left={margin.left} top={margin.top}>
                    <GridRows scale={yScale} width={innerWidth} {...gridRowsProps()} />

                    {data.map((row, i) => {
                      const { x, width: barW } = clampBarInBand(xScale, row.label, MAX_BAR_W);
                      const barH = innerHeight - (yScale(row.marktwert) ?? innerHeight);
                      const y = yScale(row.marktwert) ?? innerHeight;
                      const isActive = activeIdx === i;
                      const opacity = activeIdx == null || isActive ? 1 : INACTIVE_BAR_OPACITY;

                      return (
                        <g key={row.key} opacity={opacity}>
                          <Bar x={x} y={y} width={barW} height={barH} fill={row.fill} rx={4} />
                          {barW >= 28 && (
                            <text
                              x={x + barW / 2}
                              y={y - 5}
                              textAnchor="middle"
                              fill={CHART_COLORS.textMuted}
                              fontSize={9}
                              fontWeight={500}
                            >
                              {compactEur(row.marktwert)}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    <AxisLeft scale={yScale} {...axisLeftProps(compactEur)} />
                    <AxisBottom top={innerHeight} scale={xScale} {...axisBottomProps()} />
                  </Group>
                </svg>
              </>
            );
          }}
        </VisxChartShell>
      </div>

      <ChartLegend
        className="mt-2 border-t-0 pt-0"
        items={data.map((row) => ({ key: row.key, label: row.label, color: row.fill }))}
      />
    </div>
  );
};

export default BondMaturityBarChart;
