import React, { useCallback, useId, useMemo, useState } from 'react';
import { Group } from '@visx/group';
import { AreaClosed, LinePath } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { scaleLinear, scaleTime } from '@visx/scale';
import { curveStepAfter, curveMonotoneX } from '@visx/curve';
import { formatEUR } from '@/lib/dashboardFormatters';
import ChartEmpty from './ChartEmpty';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import {
  CHART_COLORS,
  CHART_FONT,
  CHART_CURSOR_LINE,
  compactEur,
  positiveNegativeColor,
} from './chartTheme';
import VisxChartShell from './visx/VisxChartShell';
import {
  VISX_AREA_MARGIN_COMPACT,
  axisLeftProps,
  axisTickLabel,
  gridRowsProps,
  innerSize,
} from './visx/visxTheme';
import {
  fmtAxisDayMonth,
  nearestTimeIndex,
  normalizeTimeSeries,
  pickTimeAxisTicks,
} from './visx/visxTimeUtils';
import VisxChartFade from './visx/VisxChartFade';

const formatPct = (v) =>
  `${Number(v) >= 0 ? '+' : ''}${Number(v).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;

const PortfolioHeroChart = ({
  data = [],
  mode = 'value',
  lineColor,
  height = 240,
  snapshotCount = 0,
  rangeDays = 365,
  emptyHint = 'Verlauf erscheint nach dem ersten Snapshot.',
  emptySub,
}) => {
  const uid = useId().replace(/:/g, '');
  const [hoverIndex, setHoverIndex] = useState(null);

  const points = useMemo(
    () =>
      normalizeTimeSeries(data).map((row) => ({
        ...row,
        value: mode === 'value' ? Number(row.total || 0) : Number(row.pct || 0),
      })),
    [data, mode],
  );

  const useStep = snapshotCount < 10 || mode === 'value';
  const curve = useStep ? curveStepAfter : curveMonotoneX;

  const yDomain = useMemo(() => {
    if (!points.length) return null;
    const vals = points.map((p) => p.value);
    if (mode === 'performance') {
      const min = Math.min(...vals, 0);
      const max = Math.max(...vals, 0);
      const pad = Math.max((max - min) * 0.12, 0.5);
      return { min: min - pad, max: max + pad };
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.06, max * 0.02, 1);
    return { min: Math.max(0, min - pad), max: max + pad };
  }, [points, mode]);

  const resolvedLineColor =
    lineColor ??
    (mode === 'performance' && points.length
      ? positiveNegativeColor(points[points.length - 1].value >= 0)
      : CHART_COLORS.success);

  const onMouseMove = useCallback(
    (event, innerWidth) => {
      setHoverIndex(nearestTimeIndex(event, points, VISX_AREA_MARGIN_COMPACT.left, innerWidth));
    },
    [points],
  );

  if (points.length < 2 || !yDomain) {
    return (
      <ChartEmpty
        className="h-full bg-bank-bg/30"
        height={height}
        hint={emptyHint}
        sub={emptySub}
        lottie
      />
    );
  }

  const activeIdx = hoverIndex ?? points.length - 1;
  const chartKey = `${mode}-${rangeDays}-${points.length}-${points[points.length - 1]?.date ?? ''}`;
  const active = points[activeIdx];
  const xTicks = pickTimeAxisTicks(points, 6);

  const fmtY = mode === 'value' ? compactEur : formatPct;
  const fmtTooltip =
    mode === 'value' ? (v) => formatEUR(v) : (v) => formatPct(v);

  return (
    <div className="relative h-full w-full" style={{ minHeight: height }}>
      <div
        className="pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2"
        style={{ opacity: hoverIndex != null ? 1 : 0 }}
      >
        {active && (
          <ChartTooltipFrame label={active.at.toLocaleDateString('de-DE')}>
            <ChartTooltipRow
              label={mode === 'value' ? 'Gesamt' : 'Performance'}
              value={fmtTooltip(active.value)}
              tone={
                mode === 'performance' && active.value < 0
                  ? 'error'
                  : mode === 'performance'
                    ? 'success'
                    : 'primary'
              }
            />
          </ChartTooltipFrame>
        )}
      </div>

      <VisxChartShell
        height={height}
        className="cursor-crosshair"
        onMouseMove={(e) => {
          const w = e.currentTarget.getBoundingClientRect().width;
          const { innerWidth } = innerSize(w, height, VISX_AREA_MARGIN_COMPACT);
          onMouseMove(e, innerWidth);
        }}
        onMouseLeave={() => setHoverIndex(null)}
        ariaLabel="Gesamtvermögen Verlauf"
      >
        {({ width, height: h }) => {
          const margin = VISX_AREA_MARGIN_COMPACT;
          const { innerWidth, innerHeight } = innerSize(width, h, margin);

          const xScale = scaleTime({
            domain: [points[0].at, points[points.length - 1].at],
            range: [0, innerWidth],
          });

          const yScale = scaleLinear({
            domain: [yDomain.min, yDomain.max],
            range: [innerHeight, 0],
            nice: true,
          });

          const hoverX = xScale(points[activeIdx]?.at);
          const zeroY = mode === 'performance' ? yScale(0) : null;

          return (
            <svg width={width} height={h} style={{ fontFamily: CHART_FONT }}>
              <defs>
                <linearGradient id={`${uid}-heroGrad`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={resolvedLineColor} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={resolvedLineColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              <Group left={margin.left} top={margin.top}>
                <GridRows scale={yScale} width={innerWidth} {...gridRowsProps()} />

                {zeroY != null && (
                  <line
                    x1={0}
                    y1={zeroY}
                    x2={innerWidth}
                    y2={zeroY}
                    stroke={CHART_COLORS.reference}
                    strokeDasharray="4 4"
                    strokeWidth={0.75}
                  />
                )}

                <VisxChartFade chartKey={chartKey}>
                  <AreaClosed
                    data={points}
                    x={(d) => xScale(d.at) ?? 0}
                    y={(d) => yScale(d.value) ?? innerHeight}
                    yScale={yScale}
                    fill={`url(#${uid}-heroGrad)`}
                    curve={curve}
                  />

                  <LinePath
                    data={points}
                    x={(d) => xScale(d.at) ?? 0}
                    y={(d) => yScale(d.value) ?? innerHeight}
                    stroke={resolvedLineColor}
                    strokeWidth={2}
                    curve={curve}
                  />
                </VisxChartFade>

                {points.map((p, i) => (
                  <circle
                    key={p.date}
                    cx={xScale(p.at) ?? 0}
                    cy={yScale(p.value) ?? innerHeight}
                    r={useStep ? 3 : 0}
                    fill={resolvedLineColor}
                    stroke="#fff"
                    strokeWidth={1.25}
                    opacity={hoverIndex == null || hoverIndex === i ? (useStep ? 1 : 0) : 0.35}
                  />
                ))}

                {hoverIndex != null && hoverX != null && (
                  <line
                    x1={hoverX}
                    y1={0}
                    x2={hoverX}
                    y2={innerHeight}
                    stroke={CHART_CURSOR_LINE.stroke}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}

                <AxisLeft scale={yScale} {...axisLeftProps(fmtY)} numTicks={4} />
                <AxisBottom
                  top={innerHeight}
                  scale={xScale}
                  tickValues={xTicks.map((t) => t.at)}
                  tickFormat={(d) =>
                    d.toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: rangeDays <= 30 ? '2-digit' : 'short',
                    })
                  }
                  stroke="transparent"
                  tickStroke="transparent"
                  hideTicks
                  tickLabelProps={() =>
                    axisTickLabel({ textAnchor: 'middle', dy: 8, fontSize: 10 })
                  }
                />
              </Group>
            </svg>
          );
        }}
      </VisxChartShell>
    </div>
  );
};

export default PortfolioHeroChart;
