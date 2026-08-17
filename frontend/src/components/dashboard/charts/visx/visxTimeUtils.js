/** Shared helpers for Visx time-scale charts. */

export const parseSeriesDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const normalizeTimeSeries = (rows, dateKey = 'date') =>
  (rows || [])
    .map((row) => {
      const at = parseSeriesDate(row[dateKey]);
      if (!at) return null;
      return { ...row, at };
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at);

export const pickTimeAxisTicks = (points, maxTicks = 5) => {
  if (!points.length) return [];
  if (points.length <= maxTicks) return points.map((p, i) => ({ ...p, i }));

  const step = Math.max(1, Math.floor((points.length - 1) / (maxTicks - 1)));
  const ticks = [];
  for (let i = 0; i < points.length; i += step) {
    ticks.push({ ...points[i], i });
  }
  const last = points.length - 1;
  if (!ticks.some((t) => t.i === last)) {
    ticks.push({ ...points[last], i: last });
  }
  return ticks.slice(0, maxTicks);
};

export const fmtAxisDayMonth = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
};

export const nearestTimeIndex = (event, points, marginLeft, innerWidth) => {
  if (!points.length || innerWidth <= 0) return null;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left - marginLeft;
  const ratio = x / innerWidth;
  const tMin = points[0].at.getTime();
  const tMax = points[points.length - 1].at.getTime();
  const target = tMin + ratio * (tMax - tMin || 1);

  let best = 0;
  let bestDist = Infinity;
  points.forEach((p, i) => {
    const dist = Math.abs(p.at.getTime() - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
};
