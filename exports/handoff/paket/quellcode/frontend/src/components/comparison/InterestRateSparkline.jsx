import React, { memo, useId, useMemo } from 'react';
import { cn } from '@/lib/utils';

function buildPath(points, width, height, padding = 6) {
  // Only build a path from finite numeric values. Anything else (undefined,
  // null, NaN, Infinity, string) is dropped so we never emit a `d` string
  // containing `NaN` or the JS `undefined` sentinel.
  const nums = Array.isArray(points)
    ? points.filter((v) => typeof v === 'number' && Number.isFinite(v))
    : [];
  if (nums.length < 2) return '';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 0.01;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  return nums
    .map((v, i) => {
      const x = padding + (i / (nums.length - 1)) * innerW;
      const y = padding + innerH - ((v - min) / range) * innerH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAreaPath(linePath, width, height, padding = 6) {
  if (!linePath || typeof linePath !== 'string' || !linePath.startsWith('M')) return '';
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
  const rates = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history
      .map((h) => (h && typeof h.interest_rate === 'number' && Number.isFinite(h.interest_rate) ? h.interest_rate : null))
      .filter((v) => v !== null);
  }, [history]);

  const linePath = useMemo(() => buildPath(rates, VIEW_W, VIEW_H), [rates]);
  const areaPath = useMemo(() => buildAreaPath(linePath, VIEW_W, VIEW_H), [linePath]);
  const hasPath = rates.length >= 2 && typeof linePath === 'string' && linePath.startsWith('M');

  if (!hasPath) {
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
            <stop offset="0%" stopColor="rgb(var(--bank-petrol))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(var(--bank-petrol))" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {areaPath ? <path d={areaPath} fill={`url(#${gradId})`} /> : null}
        <path
          d={linePath}
          fill="none"
          stroke="rgb(var(--bank-petrol-strong))"
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
