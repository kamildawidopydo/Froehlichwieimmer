import React, { useMemo } from 'react';
import { MARKET_INDICES } from '@/services/marketService';
import {
  CHART_COLORS,
  CHART_FONT,
  CHART_GRID_STROKE,
  CHART_PALETTE,
} from '@/components/dashboard/charts/chartTheme';

const berlinHour = (unixSec) => {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Europe/Berlin',
    }).format(new Date(unixSec * 1000));
  } catch {
    return '';
  }
};

const toPctSeries = (points, prevClose) => {
  if (!points?.length || prevClose == null || prevClose === 0) return [];
  return points.map((p) => ({
    t: p.t,
    v: ((p.c - prevClose) / prevClose) * 100,
  }));
};

const paletteColor = (index) => CHART_PALETTE[index % CHART_PALETTE.length];

const formatPct = (v) =>
  `${v >= 0 ? '+' : ''}${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

const MarketComparisonChart = ({ seriesMap = {} }) => {
  const width = 320;
  const height = 168;
  const padL = 38;
  const padR = 44;
  const padT = 10;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const chart = useMemo(() => {
    const lines = MARKET_INDICES.map((cfg, idx) => {
      const raw = seriesMap[cfg.symbol];
      const pts = toPctSeries(raw?.points ?? [], raw?.prevClose);
      const last = pts.length ? pts[pts.length - 1].v : null;
      return {
        ...cfg,
        points: pts,
        color: paletteColor(idx),
        lastPct: last,
      };
    }).filter((l) => l.points.length > 1);

    if (!lines.length) return null;

    const allValues = lines.flatMap((l) => l.points.map((p) => p.v));
    let min = Math.min(...allValues, -1.5);
    let max = Math.max(...allValues, 1.5);
    const cap = 1.5;
    min = Math.max(min, -cap);
    max = Math.min(max, cap);
    const span = max - min || 1;

    const refPoints = lines[0].points;
    const xAt = (i, len) => padL + (i / Math.max(len - 1, 1)) * innerW;
    const yAt = (v) => padT + innerH - ((v - min) / span) * innerH;

    const paths = lines.map((line) => {
      const pts = line.points
        .map((p, i) => `${xAt(i, line.points.length).toFixed(1)},${yAt(p.v).toFixed(1)}`)
        .join(' ');
      const lastI = line.points.length - 1;
      const endX = xAt(lastI, line.points.length);
      const endY = yAt(line.points[lastI].v);
      return { ...line, d: pts, endX, endY };
    });

    const yTicks = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5].filter((v) => v >= min && v <= max);
    const step = Math.max(1, Math.floor(refPoints.length / 5));
    const xTicks = [];
    for (let i = 0; i < refPoints.length; i += step) {
      xTicks.push({ i, label: berlinHour(refPoints[i].t) });
    }

    return { paths, yTicks, xTicks, refLen: refPoints.length, yAt };
  }, [seriesMap, innerW, innerH, padL, padT]);

  if (!chart) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-bank-border/70 bg-bank-bg/30 text-[12px] text-bank-text-muted">
        Vergleichschart nicht verfügbar
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-bank-border/70 bg-white p-3 shadow-editorial-sm dark:border-white/10 dark:bg-bank-ink/40">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-bank-text-muted">
        Intraday vs. Vortag
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
        role="img"
        aria-label="Index-Vergleichschart"
        style={{ fontFamily: CHART_FONT }}
      >
        {chart.yTicks.map((tick) => {
          const y = chart.yAt(tick);
          const isZero = tick === 0;
          return (
            <g key={tick}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke={isZero ? CHART_COLORS.gold : CHART_GRID_STROKE}
                strokeWidth={isZero ? 1 : 0.75}
                strokeDasharray={isZero ? '4 3' : undefined}
                strokeOpacity={isZero ? 0.75 : 1}
              />
              <text
                x={padL - 4}
                y={y + 3}
                textAnchor="end"
                fill={CHART_COLORS.textMuted}
                fontSize={8}
              >
                {tick.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
              </text>
            </g>
          );
        })}

        {chart.paths.map((line) => (
          <polyline
            key={line.symbol}
            points={line.d}
            fill="none"
            stroke={line.color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {chart.paths.map((line) => (
          <g key={`end-${line.symbol}`}>
            <circle cx={line.endX} cy={line.endY} r={2.5} fill={line.color} />
            <text
              x={line.endX + 4}
              y={line.endY + 3}
              fill={line.color}
              fontSize={8}
              fontWeight={600}
            >
              {line.lastPct != null ? formatPct(line.lastPct) : ''}
            </text>
          </g>
        ))}

        {chart.xTicks.map((tick) => (
          <text
            key={tick.i}
            x={padL + (tick.i / Math.max(chart.refLen - 1, 1)) * innerW}
            y={height - 4}
            textAnchor="middle"
            fill={CHART_COLORS.textMuted}
            fontSize={8}
          >
            {tick.label}
          </text>
        ))}
      </svg>

      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        {chart.paths.map((line) => (
          <li key={line.symbol} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-bank-text-muted">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: line.color }}
                aria-hidden
              />
              <span className="truncate">{line.label}</span>
            </span>
            {line.lastPct != null && (
              <span
                className="shrink-0 font-semibold tabular-nums"
                style={{ color: line.color }}
              >
                {formatPct(line.lastPct)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MarketComparisonChart;
