import React, { useId, useMemo } from 'react';
import { Group } from '@visx/group';
import { AreaClosed, LinePath } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { cn } from '@/lib/utils';
import { positiveNegativeColor } from '@/components/dashboard/charts/chartTheme';
import {
  axisLeftProps,
  axisTickLabel,
  innerSize,
  VISX_AREA_MARGIN,
  VISX_AREA_MARGIN_COMPACT,
} from '@/components/dashboard/charts/visx/visxTheme';
import VisxChartShell from '@/components/dashboard/charts/visx/VisxChartShell';
import NewsChartTooltip from './NewsChartTooltip';
import { NEWS_CHART, newsChartSurfaceClass } from './newsChartTheme';
import {
  buildYScale,
  computeRangeStats,
  formatAxisDate,
  formatChangePct,
  formatMarketAxisPrice,
  formatTooltipPrice,
  pickXTicks,
} from './marketChartUtils';
import useSvgHover from './useSvgHover';

const LAYOUT = {
  compact: { tickCount: 5, stroke: 2, margin: VISX_AREA_MARGIN_COMPACT },
  detailed: { tickCount: 6, stroke: 2.25, margin: VISX_AREA_MARGIN },
};

const MarketAreaChart = ({
  points = [],
  range = '1y',
  className,
  height = 220,
  variant = 'compact',
  showHighLow = false,
  showStats = false,
}) => {
  const gradientId = useId().replace(/:/g, '');
  const layout = LAYOUT[variant] ?? LAYOUT.compact;
  const { tickCount, stroke, margin } = layout;
  const isDetailed = variant === 'detailed';

  const { hoverIndex, onMouseMove, onMouseLeave } = useSvgHover(points.length);
  const stats = useMemo(() => computeRangeStats(points), [points]);

  const up = useMemo(() => {
    if (stats) return stats.changePct >= 0;
    if (points.length < 2) return true;
    return points[points.length - 1].c >= points[0].c;
  }, [points, stats]);

  const lineColor = positiveNegativeColor(up);
  const yDomain = useMemo(() => {
    if (!points.length) return null;
    const closes = points.map((p) => p.c);
    const extra = showHighLow && stats ? [stats.min, stats.max] : [];
    return buildYScale([...closes, ...extra], tickCount);
  }, [points, stats, showHighLow, tickCount]);

  const xTicks = useMemo(() => pickXTicks(points, range), [points, range]);

  if (!points.length || !yDomain) {
    return (
      <div
        style={{ height }}
        className={cn(
          'flex items-center justify-center rounded-md border border-dashed border-bank-border/70 bg-bank-bg/30 text-[12px] text-bank-text-muted',
          className,
        )}
      >
        Keine Chartdaten
      </div>
    );
  }

  const lastIdx = points.length - 1;
  const activeIdx = hoverIndex ?? lastIdx;
  const activePoint = points[activeIdx];
  const activeChange =
    stats?.first && activePoint
      ? ((activePoint.c - stats.first) / stats.first) * 100
      : null;

  let minIdx = 0;
  let maxIdx = 0;
  points.forEach((p, i) => {
    if (p.c <= points[minIdx].c) minIdx = i;
    if (p.c >= points[maxIdx].c) maxIdx = i;
  });

  const newsAxisLeft = {
    ...axisLeftProps((v) => formatMarketAxisPrice(v)),
    stroke: isDetailed ? NEWS_CHART.axis : 'transparent',
    tickLabelProps: () =>
      axisTickLabel({
        textAnchor: 'end',
        dx: -8,
        dy: 3.5,
        fill: NEWS_CHART.textMuted,
        fontSize: isDetailed ? 10.5 : 10,
        fontFamily: NEWS_CHART.font,
      }),
  };

  const newsGridRows = {
    stroke: NEWS_CHART.grid,
    strokeWidth: isDetailed ? 0.85 : 0.75,
    strokeDasharray: isDetailed ? '2 4' : undefined,
  };

  return (
    <div className={cn(isDetailed && newsChartSurfaceClass, className)}>
      {showStats && stats && (
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2 px-1 pt-1">
          <div className="text-[10px] uppercase tracking-wide text-bank-text-muted">
            {formatAxisDate(activePoint.t, range)}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-bank-text-muted">Schluss</p>
            <p className="text-[15px] font-semibold tabular-nums text-bank-text">
              {formatTooltipPrice(stats.last)}
            </p>
          </div>
        </div>
      )}

      <div className="relative" style={{ height }}>
        <VisxChartShell
          height={height}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          ariaLabel="Kursverlauf"
        >
          {({ width, height: h }) => {
            const { innerWidth, innerHeight } = innerSize(width, h, margin);
            const { min, max } = yDomain;

            const xScale = scaleLinear({
              domain: [0, Math.max(points.length - 1, 1)],
              range: [0, innerWidth],
            });

            const yScale = scaleLinear({
              domain: [min, max],
              range: [innerHeight, 0],
            });

            const x = (i) => xScale(i) ?? 0;
            const y = (v) => yScale(v) ?? innerHeight;
            const hoverX = x(activeIdx);
            const hoverY = y(activePoint.c);
            const tooltipLeftPct = ((hoverX + margin.left) / width) * 100;

            return (
              <>
                <div
                  className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 transition-[left] duration-75"
                  style={{ left: `${Math.min(92, Math.max(8, tooltipLeftPct))}%` }}
                >
                  <NewsChartTooltip
                    label={formatAxisDate(activePoint.t, range)}
                    value={formatTooltipPrice(activePoint.c)}
                    sub={
                      activeChange != null && hoverIndex != null
                        ? formatChangePct(activeChange)
                        : undefined
                    }
                  />
                </div>

                <svg width={width} height={h} style={{ fontFamily: NEWS_CHART.font }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={lineColor}
                        stopOpacity={isDetailed ? 0.38 : 0.32}
                      />
                      <stop offset="45%" stopColor={lineColor} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <Group left={margin.left} top={margin.top}>
                    {isDetailed && (
                      <>
                        <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={NEWS_CHART.axis} strokeWidth={1} />
                        <line
                          x1={0}
                          y1={innerHeight}
                          x2={innerWidth}
                          y2={innerHeight}
                          stroke={NEWS_CHART.axis}
                          strokeWidth={1}
                        />
                      </>
                    )}

                    <GridRows scale={yScale} width={innerWidth} {...newsGridRows} />

                    {isDetailed &&
                      xTicks.map((tick) => {
                        const vx = x(tick.i);
                        return (
                          <line
                            key={`vx-${tick.i}`}
                            x1={vx}
                            y1={0}
                            x2={vx}
                            y2={innerHeight}
                            stroke={NEWS_CHART.grid}
                            strokeWidth={0.5}
                            strokeOpacity={0.45}
                          />
                        );
                      })}

                    {showHighLow && stats && (
                      <>
                        <line
                          x1={0}
                          y1={y(stats.max)}
                          x2={innerWidth}
                          y2={y(stats.max)}
                          stroke={NEWS_CHART.primary}
                          strokeWidth={0.75}
                          strokeDasharray="4 3"
                          strokeOpacity={0.35}
                        />
                        <line
                          x1={0}
                          y1={y(stats.min)}
                          x2={innerWidth}
                          y2={y(stats.min)}
                          stroke={NEWS_CHART.textMuted}
                          strokeWidth={0.75}
                          strokeDasharray="4 3"
                          strokeOpacity={0.35}
                        />
                      </>
                    )}

                    <AreaClosed
                      data={points}
                      x={(_, i) => x(i)}
                      y={(d) => y(d.c)}
                      yScale={yScale}
                      fill={`url(#${gradientId})`}
                      curve={curveMonotoneX}
                    />

                    <LinePath
                      data={points}
                      x={(_, i) => x(i)}
                      y={(d) => y(d.c)}
                      stroke={lineColor}
                      strokeWidth={stroke}
                      curve={curveMonotoneX}
                    />

                    {hoverIndex != null && (
                      <>
                        <line
                          x1={hoverX}
                          y1={0}
                          x2={hoverX}
                          y2={innerHeight}
                          stroke={NEWS_CHART.cursorLine}
                          strokeWidth={1}
                          strokeDasharray="3 3"
                        />
                        <circle
                          cx={hoverX}
                          cy={hoverY}
                          r={4.5}
                          fill={lineColor}
                          stroke="#fff"
                          strokeWidth={1.5}
                        />
                      </>
                    )}

                    {hoverIndex == null && lastIdx >= 0 && (
                      <circle
                        cx={x(lastIdx)}
                        cy={y(points[lastIdx].c)}
                        r={isDetailed ? 3.5 : 3}
                        fill={lineColor}
                        stroke="#fff"
                        strokeWidth={1.25}
                      />
                    )}

                    {showHighLow && isDetailed && (
                      <>
                        <circle
                          cx={x(maxIdx)}
                          cy={y(points[maxIdx].c)}
                          r={2.5}
                          fill={NEWS_CHART.primary}
                          stroke="#fff"
                          strokeWidth={1}
                        />
                        <circle
                          cx={x(minIdx)}
                          cy={y(points[minIdx].c)}
                          r={2.5}
                          fill={NEWS_CHART.textMuted}
                          stroke="#fff"
                          strokeWidth={1}
                        />
                      </>
                    )}

                    <AxisLeft scale={yScale} tickValues={yDomain.ticks} {...newsAxisLeft} />

                    <AxisBottom
                      top={innerHeight}
                      scale={xScale}
                      tickValues={xTicks.map((t) => t.i)}
                      tickFormat={(i) => xTicks.find((t) => t.i === i)?.label ?? ''}
                      stroke={isDetailed ? NEWS_CHART.axis : 'transparent'}
                      tickStroke="transparent"
                      hideTicks
                      tickLabelProps={() =>
                        axisTickLabel({
                          textAnchor: 'middle',
                          dy: isDetailed ? 10 : 8,
                          fill: NEWS_CHART.textMuted,
                          fontSize: isDetailed ? 10.5 : 10,
                          fontFamily: NEWS_CHART.font,
                        })
                      }
                    />
                  </Group>
                </svg>
              </>
            );
          }}
        </VisxChartShell>
      </div>

      {showStats && stats && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-bank-border/40 px-1 pt-2 text-[10.5px] tabular-nums text-bank-text-muted">
          <span>Tief {formatMarketAxisPrice(stats.min)}</span>
          <span>Hoch {formatMarketAxisPrice(stats.max)}</span>
          <span>Start {formatMarketAxisPrice(stats.first)}</span>
        </div>
      )}
    </div>
  );
};

export default MarketAreaChart;
