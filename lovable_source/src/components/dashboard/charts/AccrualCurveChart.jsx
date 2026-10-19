import React, { useCallback, useId, useMemo, useState } from 'react';
import { Group } from '@visx/group';
import { AreaClosed, LinePath } from '@visx/shape';
import { GridRows } from '@visx/grid';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { scaleLinear, scaleTime } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { formatEUR } from '@/lib/dashboardFormatters';
import ChartEmpty from './ChartEmpty';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import { CHART_COLORS, CHART_FONT, compactEur } from './chartTheme';
import VisxChartShell from './visx/VisxChartShell';
import {
  VISX_AREA_MARGIN,
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

const SERIES = [
  { key: 'grossCum', label: 'Brutto kumuliert', color: CHART_COLORS.gross, gradId: 'accrualGross' },
  { key: 'netCum', label: 'Netto kumuliert', color: CHART_COLORS.net, gradId: 'accrualNet' },
];

const AccrualCurveChart = ({
  data = [],
  height = 260,
  emptyHint = 'Keine Zinsdaten verfügbar.',
}) => {
  const uid = useId().replace(/:/g, '');
  const [hoverIndex, setHoverIndex] = useState(null);

  const points = useMemo(() => normalizeTimeSeries(data), [data]);

  const yDomain = useMemo(() => {
    if (!points.length) return null;
    const vals = points.flatMap((p) => [Number(p.grossCum || 0), Number(p.netCum || 0)]);
    const min = 0;
    const max = Math.max(...vals, 1);
    const pad = max * 0.08;
    return { min, max: max + pad };
  }, [points]);

  const onMouseMove = useCallback(
    (event, innerWidth) => {
      setHoverIndex(nearestTimeIndex(event, points, VISX_AREA_MARGIN.left, innerWidth));
    },
    [points],
  );

  if (!points.length || !yDomain) {
    return <ChartEmpty height={height} hint={emptyHint} />;
  }

  const activeIdx = hoverIndex ?? points.length - 1;
  const active = points[activeIdx];
  const xTicks = pickTimeAxisTicks(points, 6);

  return (
    <div style={{ width: '100%', height }}>
      <div className="mb-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-0.5">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[10.5px] text-bank-text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative" style={{ height: height - 28 }}>
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2">
          {active && (
            <ChartTooltipFrame label={active.at.toLocaleDateString('de-DE')}>
              <ChartTooltipRow label="Brutto" value={formatEUR(active.grossCum)} tone="gold" />
              <ChartTooltipRow label="Netto" value={formatEUR(active.netCum)} tone="success" />
            </ChartTooltipFrame>
          )}
        </div>

        <VisxChartShell
          height={height - 28}
          className="cursor-crosshair"
          onMouseMove={(e) => {
            const w = e.currentTarget.getBoundingClientRect().width;
            const { innerWidth } = innerSize(w, height - 28, VISX_AREA_MARGIN);
            onMouseMove(e, innerWidth);
          }}
          onMouseLeave={() => setHoverIndex(null)}
          ariaLabel="Zinsentwicklung kumuliert"
        >
          {({ width, height: h }) => {
            const margin = VISX_AREA_MARGIN;
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

            return (
              <svg width={width} height={h} style={{ fontFamily: CHART_FONT }}>
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={s.gradId} id={`${uid}-${s.gradId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>

                <Group left={margin.left} top={margin.top}>
                  <GridRows scale={yScale} width={innerWidth} {...gridRowsProps()} />

                  {SERIES.map((s) => (
                    <AreaClosed
                      key={s.key}
                      data={points}
                      x={(d) => xScale(d.at) ?? 0}
                      y={(d) => yScale(Number(d[s.key] || 0)) ?? innerHeight}
                      yScale={yScale}
                      fill={`url(#${uid}-${s.gradId})`}
                      curve={curveMonotoneX}
                    />
                  ))}

                  {SERIES.map((s) => (
                    <LinePath
                      key={`line-${s.key}`}
                      data={points}
                      x={(d) => xScale(d.at) ?? 0}
                      y={(d) => yScale(Number(d[s.key] || 0)) ?? innerHeight}
                      stroke={s.color}
                      strokeWidth={2}
                      curve={curveMonotoneX}
                    />
                  ))}

                  {hoverIndex != null && hoverX != null && (
                    <>
                      <line
                        x1={hoverX}
                        y1={0}
                        x2={hoverX}
                        y2={innerHeight}
                        stroke={CHART_COLORS.cursorLine}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                      {SERIES.map((s) => (
                        <circle
                          key={`dot-${s.key}`}
                          cx={hoverX}
                          cy={yScale(Number(points[hoverIndex][s.key] || 0))}
                          r={3.5}
                          fill={s.color}
                          stroke="#fff"
                          strokeWidth={1.25}
                        />
                      ))}
                    </>
                  )}

                  <AxisLeft scale={yScale} {...axisLeftProps(compactEur)} />
                  <AxisBottom
                    top={innerHeight}
                    scale={xScale}
                    tickValues={xTicks.map((t) => t.at)}
                    tickFormat={fmtAxisDayMonth}
                    stroke={CHART_COLORS.axis}
                    tickStroke="transparent"
                    hideTicks
                    tickLabelProps={() =>
                      axisTickLabel({ textAnchor: 'middle', dy: 10, fontSize: 10 })
                    }
                  />
                </Group>
              </svg>
            );
          }}
        </VisxChartShell>
      </div>
    </div>
  );
};

export default AccrualCurveChart;
