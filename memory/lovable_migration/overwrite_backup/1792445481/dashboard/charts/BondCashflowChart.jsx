import React, { useMemo } from 'react';
import { Group } from '@visx/group';
import { BarStack } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { formatEUR } from '@/lib/dashboardFormatters';
import ChartEmpty from './ChartEmpty';
import ChartLegend from './ChartLegend';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import {
  CHART_COUPON,
  CHART_COLORS,
  CHART_FONT,
  CHART_PRINCIPAL,
  CHART_TICK_SM,
  compactEur,
} from './chartTheme';
import useChartHover from './useChartHover';
import VisxChartShell from './visx/VisxChartShell';
import {
  VISX_BAR_MARGIN,
  INACTIVE_BAR_OPACITY,
  axisBottomProps,
  axisLeftProps,
  axisTickLabel,
  bandPaddingForCount,
  clampBarInBand,
  gridRowsProps,
  innerSize,
} from './visx/visxTheme';

const MAX_YEARS = 12;
const STACK_KEYS = ['tilgung', 'kupon'];
const MAX_BAR_W = 52;

const BondCashflowChart = ({
  bonds = [],
  height = 280,
  emptyHint = 'Keine künftigen Zahlungen planbar (Fälligkeit fehlt).',
}) => {
  const data = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const byYear = new Map();
    bonds.forEach((b) => {
      if (!b?.faelligkeitsdatum) return;
      const maturityYear = new Date(b.faelligkeitsdatum).getFullYear();
      if (Number.isNaN(maturityYear) || maturityYear < currentYear) return;
      const kupon = Number(b.jahresKupon || 0);
      for (let y = currentYear; y <= maturityYear; y++) {
        const entry = byYear.get(y) || { year: y, kupon: 0, tilgung: 0 };
        if (kupon > 0) entry.kupon += kupon;
        if (y === maturityYear) entry.tilgung += Number(b.nominal || 0);
        byYear.set(y, entry);
      }
    });
    return Array.from(byYear.values())
      .sort((a, b) => a.year - b.year)
      .slice(0, MAX_YEARS)
      .map((e) => ({ ...e, label: String(e.year) }));
  }, [bonds]);

  const milestoneIdx = useMemo(() => {
    if (!data.length) return -1;
    let maxT = -1;
    let idx = -1;
    data.forEach((row, i) => {
      if (row.tilgung > maxT) {
        maxT = row.tilgung;
        idx = i;
      }
    });
    return maxT > 0 ? idx : -1;
  }, [data]);

  const currentYear = new Date().getFullYear();
  const todayIdx = data.findIndex((d) => d.year === currentYear);
  const chartHeight = height - 36;
  const { hoverIndex, onMouseMove, onMouseLeave } = useChartHover(data.length);

  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: STACK_KEYS,
        range: [CHART_PRINCIPAL, CHART_COUPON],
      }),
    [],
  );

  if (!data.length) {
    return <ChartEmpty height={height} hint={emptyHint} />;
  }

  const activeIdx = hoverIndex ?? (todayIdx >= 0 ? todayIdx : null);
  const activeRow = activeIdx != null ? data[activeIdx] : null;

  return (
    <div style={{ width: '100%', height }}>
      <div className="relative" style={{ height: chartHeight }}>
        <VisxChartShell
          height={chartHeight}
          className="cursor-crosshair"
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          ariaLabel="Erwartete Zahlungen Kupon und Tilgung"
        >
          {({ width, height: h }) => {
            const margin = VISX_BAR_MARGIN;
            const { innerWidth, innerHeight } = innerSize(width, h, margin);
            const maxTotal = Math.max(
              0,
              ...data.map((row) => row.kupon + row.tilgung),
            );
            const niceMax =
              maxTotal <= 0 ? 1 : Math.ceil((maxTotal * 1.08) / 1000) * 1000 || maxTotal * 1.08;

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
                      <ChartTooltipRow label="Kupon" value={formatEUR(activeRow.kupon)} tone="success" />
                      {activeRow.tilgung > 0 && (
                        <ChartTooltipRow label="Tilgung" value={formatEUR(activeRow.tilgung)} tone="primary" />
                      )}
                      <ChartTooltipRow
                        label="Gesamt"
                        value={formatEUR(activeRow.kupon + activeRow.tilgung)}
                        divider
                      />
                    </ChartTooltipFrame>
                  </div>
                )}

                <svg width={width} height={h} style={{ fontFamily: CHART_FONT }}>
                  <Group left={margin.left} top={margin.top}>
                    <GridRows scale={yScale} width={innerWidth} {...gridRowsProps()} />

                    {milestoneIdx >= 0 && (
                      <g aria-hidden>
                        <line
                          x1={clampBarInBand(xScale, data[milestoneIdx].label, MAX_BAR_W).center}
                          y1={0}
                          x2={clampBarInBand(xScale, data[milestoneIdx].label, MAX_BAR_W).center}
                          y2={innerHeight}
                          stroke={CHART_COLORS.gold}
                          strokeWidth={1.25}
                          strokeDasharray="4 3"
                          strokeOpacity={0.85}
                        />
                        <text
                          x={clampBarInBand(xScale, data[milestoneIdx].label, MAX_BAR_W).center}
                          y={-4}
                          textAnchor="middle"
                          fill={CHART_COLORS.gold}
                          fontSize={9}
                          fontWeight={600}
                        >
                          Höchste Tilgung
                        </text>
                      </g>
                    )}

                    <BarStack
                      data={data}
                      keys={STACK_KEYS}
                      x={(d) => d.label}
                      xScale={xScale}
                      yScale={yScale}
                      color={colorScale}
                    >
                      {(barStacks) =>
                        barStacks.map((barStack) =>
                          barStack.bars.map((bar) => {
                            const label = bar.bar.data.label;
                            const i = data.findIndex((d) => d.label === label);
                            const isActive = activeIdx === i;
                            const opacity = activeIdx == null || isActive ? 1 : INACTIVE_BAR_OPACITY;
                            const isToday = bar.bar.data.year === currentYear;
                            const isTop =
                              bar.key === 'kupon' ||
                              (bar.key === 'tilgung' && bar.bar.data.kupon === 0);
                            const { x: barX, width: barW } = clampBarInBand(xScale, label, MAX_BAR_W);
                            const total = bar.bar.data.kupon + bar.bar.data.tilgung;
                            const slotX = xScale(label) ?? 0;
                            const slotW = xScale.bandwidth();

                            return (
                              <g key={`${barStack.index}-${bar.index}`} opacity={opacity}>
                                {isToday && bar.key === 'tilgung' && (
                                  <rect
                                    x={slotX + 1}
                                    y={0}
                                    width={Math.max(slotW - 2, barW)}
                                    height={innerHeight}
                                    rx={3}
                                    fill={CHART_COLORS.cursorBar}
                                    stroke={CHART_COLORS.primary}
                                    strokeWidth={0.75}
                                    strokeOpacity={0.35}
                                  />
                                )}
                                <rect
                                  x={barX}
                                  y={bar.y}
                                  width={barW}
                                  height={bar.height}
                                  rx={isTop ? 4 : 0}
                                  fill={bar.color}
                                  fillOpacity={bar.key === 'tilgung' ? 0.95 : 1}
                                />
                                {isTop && total > 0 && barW >= 24 && (
                                  <text
                                    x={barX + barW / 2}
                                    y={bar.y - 5}
                                    textAnchor="middle"
                                    fill={CHART_COLORS.textMuted}
                                    fontSize={9}
                                    fontWeight={500}
                                  >
                                    {compactEur(total)}
                                  </text>
                                )}
                              </g>
                            );
                          }),
                        )
                      }
                    </BarStack>

                    <AxisLeft scale={yScale} {...axisLeftProps(compactEur)} />
                    <AxisBottom
                      top={innerHeight}
                      scale={xScale}
                      {...axisBottomProps()}
                      tickLabelProps={(value) => {
                        const row = data.find((d) => d.label === value);
                        const isToday = row?.year === currentYear;
                        return axisTickLabel({
                          textAnchor: 'middle',
                          dy: 4,
                          fontWeight: isToday ? 600 : 400,
                          fill: isToday ? CHART_COLORS.primary : CHART_TICK_SM.fill,
                        });
                      }}
                    />
                  </Group>
                </svg>
              </>
            );
          }}
        </VisxChartShell>
      </div>

      <ChartLegend
        className="mt-2 border-t-0 pt-0"
        items={[
          { key: 'kupon', label: 'Kupon', color: CHART_COUPON },
          { key: 'tilgung', label: 'Tilgung (Nominal)', color: CHART_PRINCIPAL },
        ]}
      />
    </div>
  );
};

export default BondCashflowChart;
