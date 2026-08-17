import React, { memo, useId, useMemo } from 'react';
import { cn } from '@/lib/utils';

function buildPath(points, width, height, padding = 6) {
  if (points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 0.01;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  return points
    .map((v, i) => {
      const x = padding + (i / (points.length - 1)) * innerW;
      const y = padding + innerH - ((v - min) / range) * innerH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAreaPath(linePath, width, height, padding = 6) {
  if (!linePath) return '';
  return `${linePath} L${width - padding},${height - padding} L${padding},${height - padding} Z`;
}

const VIEW_W = 200;
const VIEW_H = 52;

const InterestRateSparkline = memo(function InterestRateSparkline({
  history = [],
  className,
  showLabels = false,
}) {
  const gradId = useId().replace(/:/g, '');
  const rates = useMemo(
    () => (history.length ? history.map((h) => h.interest_rate) : []),
    [history]
  );

  const linePath = useMemo(() => buildPath(rates, VIEW_W, VIEW_H), [rates]);
  const areaPath = useMemo(() => buildAreaPath(linePath, VIEW_W, VIEW_H), [linePath]);

  if (rates.length < 2) {
    return (
      <div className={cn('flex h-12 items-center text-[11px] text-[#9ca3af] dark:text-bank-text-muted/80', className)} aria-hidden>
        —
      </div>
    );
  }

  return (
    <div className={cn('min-w-0 w-full max-w-[220px]', className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-12 w-full overflow-visible"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="#16a34a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {showLabels && (
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#9ca3af] dark:text-bank-text-muted/80">
          letzte {rates.length} Monate
        </p>
      )}
    </div>
  );
});

export default InterestRateSparkline;
