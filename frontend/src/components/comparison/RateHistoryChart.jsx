import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Session 93 · Phase 4 — Kompaktes SVG-Line-Chart für Zinsverlauf.
 * KEINE externe Chart-Library. Daten kommen aus:
 *   GET /api/public/savings-offers/{id}/rate-history
 *
 * Bei zu wenigen Datenpunkten zeigt der Chart einen Hinweis.
 */
const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 24, right: 24, bottom: 32, left: 44 };

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function RateHistoryChart({ items = [], className }) {
  const points = useMemo(() => {
    if (!items?.length) return [];
    // Sort ascending
    return [...items].sort(
      (a, b) => new Date(a.valid_from).getTime() - new Date(b.valid_from).getTime()
    );
  }, [items]);

  if (points.length < 2) {
    return (
      <div
        className={cn(
          'flex min-h-[180px] items-center justify-center border border-dashed border-bank-border bg-bank-bg px-6 py-10 text-center text-[13px] text-bank-text-muted',
          className
        )}
        data-testid="rate-history-empty"
      >
        Für dieses Angebot liegen noch nicht genügend historische Zinsdaten vor.
      </div>
    );
  }

  const minRate = Math.min(...points.map((p) => p.rate));
  const maxRate = Math.max(...points.map((p) => p.rate));
  const rateSpan = Math.max(maxRate - minRate, 0.1);
  const startT = new Date(points[0].valid_from).getTime();
  const endT = new Date(points[points.length - 1].valid_from).getTime();
  const tSpan = Math.max(endT - startT, 1);
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const xy = (p) => {
    const t = new Date(p.valid_from).getTime();
    const x = PADDING.left + ((t - startT) / tSpan) * innerW;
    const y = PADDING.top + (1 - (p.rate - minRate) / rateSpan) * innerH;
    return [x, y];
  };

  const path = points
    .map((p, i) => {
      const [x, y] = xy(p);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Y-axis ticks (3 lines)
  const yTicks = [minRate, (minRate + maxRate) / 2, maxRate];

  return (
    <div className={cn('w-full', className)} data-testid="rate-history-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Zinsverlauf-Diagramm"
      >
        {/* Gridlines */}
        {yTicks.map((t, i) => {
          const y = PADDING.top + (1 - (t - minRate) / rateSpan) * innerH;
          return (
            <g key={i}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray={i === 1 ? '2 3' : ''}
              />
              <text
                x={PADDING.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
                fill="#8A8A8A"
              >
                {t.toFixed(2).replace('.', ',')}%
              </text>
            </g>
          );
        })}
        {/* Path */}
        <path d={path} stroke="#0B2F5E" strokeWidth="2" fill="none" />
        {/* Points */}
        {points.map((p, i) => {
          const [x, y] = xy(p);
          const isPromo = p.rate_type === 'promotional' || p.rate_type === 'promo';
          const isBonus = p.rate_type === 'bonus';
          const fill = isPromo ? '#C6A15B' : isBonus ? '#9CA3AF' : '#0B2F5E';
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3.5} fill={fill} />
              <title>
                {fmtDate(p.valid_from)} · {p.rate.toFixed(2).replace('.', ',')}% ({p.rate_type})
              </title>
            </g>
          );
        })}
        {/* X labels: first/last */}
        <text
          x={PADDING.left}
          y={HEIGHT - 8}
          fontSize="10"
          fontFamily="ui-monospace, monospace"
          fill="#8A8A8A"
        >
          {fmtDate(points[0].valid_from)}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 8}
          textAnchor="end"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
          fill="#8A8A8A"
        >
          {fmtDate(points[points.length - 1].valid_from)}
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-bank-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-bank-primary" /> Standard
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-bank-gold" /> Aktion
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gray-400" /> Bonus
        </span>
      </div>
    </div>
  );
}
