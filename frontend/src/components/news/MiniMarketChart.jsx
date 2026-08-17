import React, { useId, useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMarketPrice } from '@/services/marketService';
import { CHART_COLORS, positiveNegativeColor } from '@/components/dashboard/charts/chartTheme';
import { NEWS_CHART } from './newsChartTheme';
import {
  berlinHour,
  buildLineGeometry,
  pickPriceTicks,
  pickTimeTicks,
} from './marketChartUtils';
import useSvgHover from './useSvgHover';

const EmptyChart = ({ className }) => (
  <div
    className={cn(
      'flex h-[80px] items-center justify-center rounded-md border border-dashed border-bank-border/70 bg-bank-bg/30 text-[10px] text-bank-text-muted',
      className,
    )}
  >
    Keine Chartdaten
  </div>
);

const MiniMarketChart = ({
  label,
  price,
  changePct,
  points = [],
  prevClose,
  decimals,
  className,
}) => {
  const gradientId = useId().replace(/:/g, '');
  const width = 168;
  const height = 80;
  const padL = 34;
  const padR = 4;
  const padT = 4;
  const padB = 16;

  const { hoverIndex, onMouseMove, onMouseLeave } = useSvgHover(points.length);

  const up = (changePct ?? 0) >= 0;
  const lineColor = positiveNegativeColor(up);

  const chart = useMemo(() => {
    if (!points.length) return null;
    const geom = buildLineGeometry({
      points,
      width,
      height,
      padL,
      padR,
      padT,
      padB,
      extraValues: prevClose != null ? [prevClose] : [],
    });
    if (!geom) return null;

    const refY = prevClose != null ? geom.yAt(prevClose) : null;
    const yTickLabels = pickPriceTicks(geom.min, geom.max);
    const xTicks = pickTimeTicks(points, berlinHour);
    const hGrid = [0.25, 0.5, 0.75].map((f) => padT + geom.innerH * f);

    return { ...geom, refY, yTickLabels, xTicks, hGrid };
  }, [points, prevClose, height]);

  const cardClass = cn(
    'rounded-lg border border-bank-border/70 bg-white p-3 shadow-editorial-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-bank-ink/40',
    className,
  );

  const displayPrice =
    hoverIndex != null && points[hoverIndex]
      ? formatMarketPrice(points[hoverIndex].c, { decimals, label })
      : formatMarketPrice(price, { decimals, label });

  const header = (
    <div className="mb-1.5 flex items-start justify-between gap-2">
      <span className="truncate text-[12px] font-medium text-bank-text">{label}</span>
      <div className="shrink-0 text-right">
        <span className="block text-[12px] font-semibold tabular-nums text-bank-text">
          {displayPrice}
        </span>
        {changePct != null && hoverIndex == null && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums',
              up ? 'text-bank-success' : 'text-bank-error',
            )}
          >
            {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {up ? '+' : ''}
            {Number(changePct).toFixed(2)}%
          </span>
        )}
        {hoverIndex != null && points[hoverIndex] && (
          <span className="text-[10px] tabular-nums text-bank-text-muted">
            {berlinHour(points[hoverIndex].t)}
          </span>
        )}
      </div>
    </div>
  );

  if (!chart || points.length < 2) {
    return (
      <div className={cardClass}>
        {header}
        <EmptyChart />
      </div>
    );
  }

  const activeIdx = hoverIndex ?? points.length - 1;
  const hoverX = chart.xAt(activeIdx);
  const hoverY = chart.yAt(points[activeIdx].c);

  return (
    <div
      className={cardClass}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {header}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[80px] w-full cursor-crosshair"
        role="img"
        aria-label={`${label} Intraday-Chart`}
        style={{ fontFamily: NEWS_CHART.font }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {chart.hGrid.map((y, i) => (
          <line
            key={`h-${i}`}
            x1={padL}
            y1={y}
            x2={width - padR}
            y2={y}
            stroke={NEWS_CHART.grid}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {chart.yTickLabels.map((tick, i) => {
          const y = padT + chart.innerH - (i / (chart.yTickLabels.length - 1)) * chart.innerH;
          return (
            <text
              key={tick}
              x={padL - 3}
              y={y + 3}
              textAnchor="end"
              fill={NEWS_CHART.textMuted}
              fontSize={7}
            >
              {tick}
            </text>
          );
        })}

        {chart.refY != null && (
          <line
            x1={padL}
            y1={chart.refY}
            x2={width - padR}
            y2={chart.refY}
            stroke={CHART_COLORS.gold}
            strokeWidth={1}
            strokeDasharray="3 2"
            strokeOpacity={0.85}
            vectorEffect="non-scaling-stroke"
          />
        )}

        <polygon points={chart.areaPts} fill={`url(#${gradientId})`} />
        <polyline
          points={chart.linePts}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {hoverIndex != null && (
          <>
            <line
              x1={hoverX}
              y1={padT}
              x2={hoverX}
              y2={padT + chart.innerH}
              stroke={NEWS_CHART.cursorLine}
              strokeWidth={1}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r={3}
              fill={lineColor}
              stroke="#fff"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}

        {chart.xTicks.map((tick) => (
          <text
            key={`${tick.i}-${tick.label}`}
            x={padL + (tick.i / Math.max(points.length - 1, 1)) * chart.innerW}
            y={height - 2}
            textAnchor="middle"
            fill={CHART_COLORS.textMuted}
            fontSize={7}
          >
            {tick.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default MiniMarketChart;
