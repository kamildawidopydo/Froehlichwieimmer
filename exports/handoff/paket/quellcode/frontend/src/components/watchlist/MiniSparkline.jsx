import React, { useEffect, useState, useMemo } from 'react';
import { watchlistApi } from '@/services/watchlistApi';

/**
 * Tiny inline SVG sparkline. Editorial style — thin stroke, no fills.
 * Fetches from /api/news-markte/market/sparkline/{symbol}. Silent-fails
 * with a subtle placeholder rule when the symbol isn't supported, when
 * the API returns 401/403/404/5xx, or when the payload contains malformed
 * points (undefined/NaN/null close prices).
 */
const MiniSparkline = ({ symbol, width = 96, height = 28, className = '' }) => {
  const [points, setPoints] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setPoints(null);
    setFailed(false);
    watchlistApi
      .sparkline(symbol)
      .then((data) => {
        if (!alive) return;
        setPoints(Array.isArray(data?.points) ? data.points : []);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [symbol]);

  const svg = useMemo(() => {
    if (!Array.isArray(points)) return null;
    // Keep only points with a finite numeric close price. Everything else
    // (undefined/null/NaN/Infinity/string) is dropped so we never build a
    // path with `NaN` coordinates or the JS `undefined` sentinel.
    const values = points
      .map((p) => (p && typeof p.c === 'number' && Number.isFinite(p.c) ? p.c : null))
      .filter((v) => v !== null);
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 0.001);
    const stepX = width / (values.length - 1);
    const coords = values.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const first = values[0];
    const last = values[values.length - 1];
    const positive = last >= first;
    const stroke = positive ? '#047857' : '#be123c'; // emerald-700 / rose-700
    const d = `M ${coords.join(' L ')}`;
    return { d, stroke };
  }, [points, width, height]);

  // Neutral fallback rule — identical footprint to keep card heights stable.
  const Placeholder = (
    <svg
      width={width}
      height={height}
      className={className}
      data-testid={`sparkline-${symbol}-placeholder`}
      aria-hidden
    >
      <line
        x1="0"
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="rgba(0,0,0,0.08)"
        strokeDasharray="2 3"
      />
    </svg>
  );

  if (failed) return Placeholder;

  if (points === null) {
    // Loading skeleton — same box size to prevent layout jumps.
    return (
      <div
        className={`inline-block animate-pulse rounded ${className}`}
        style={{ width, height, background: 'rgba(0,0,0,0.04)' }}
        data-testid={`sparkline-${symbol}-loading`}
      />
    );
  }

  if (!svg || typeof svg.d !== 'string' || !svg.d.startsWith('M')) {
    return Placeholder;
  }

  return (
    <svg
      width={width}
      height={height}
      className={className}
      data-testid={`sparkline-${symbol}`}
      aria-hidden
    >
      <path
        d={svg.d}
        fill="none"
        stroke={svg.stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default MiniSparkline;
