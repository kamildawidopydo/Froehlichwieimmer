/** Pure SVG chart math for public /news market charts — no React, no re-exports. */

const MONTH_SHORT = {
  Jan: 'Jan',
  Feb: 'Feb',
  'Mär.': 'Mrz',
  Apr: 'Apr',
  Mai: 'Mai',
  Juni: 'Jun',
  Juli: 'Jul',
  Aug: 'Aug',
  Sep: 'Sep',
  Okt: 'Okt',
  Nov: 'Nov',
  Dez: 'Dez',
};

export const berlinHour = (unixSec) => {
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

export const formatAxisMonth = (unixSec) => {
  try {
    const raw = new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(new Date(unixSec * 1000));
    return MONTH_SHORT[raw] ?? raw.replace('.', '');
  } catch {
    return '';
  }
};

export const formatAxisDate = (unixSec, range) => {
  try {
    const d = new Date(unixSec * 1000);
    if (range === '1d') {
      return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(d);
    }
    if (range === '7d' || range === '1mo') {
      return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(d);
    }
    return formatAxisMonth(unixSec);
  } catch {
    return '';
  }
};

export const formatMarketAxisPrice = (value) => {
  if (value == null) return '';
  const n = Number(value);
  if (n >= 10000) return n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  if (n >= 1000) return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (n >= 100) return n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const niceStep = (rough) => {
  const exp = Math.floor(Math.log10(rough));
  const base = 10 ** exp;
  const frac = rough / base;
  if (frac <= 1) return base;
  if (frac <= 2) return 2 * base;
  if (frac <= 5) return 5 * base;
  return 10 * base;
};

export const buildYScale = (closes, tickCount = 5) => {
  const dataMin = Math.min(...closes);
  const dataMax = Math.max(...closes);
  const span = dataMax - dataMin || Math.abs(dataMax) * 0.05 || 1;
  const pad = span * 0.06;
  const roughMin = dataMin - pad;
  const roughMax = dataMax + pad;
  const step = niceStep((roughMax - roughMin) / Math.max(tickCount - 1, 1));
  const min = Math.floor(roughMin / step) * step;
  const max = Math.ceil(roughMax / step) * step;
  const ticks = [];
  for (let v = min; v <= max + step * 0.001; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  if (ticks.length < 3) ticks.push(min, min + step, max);
  return { min, max, ticks: [...new Set(ticks)].sort((a, b) => a - b) };
};

export const pickXTicks = (points, range) => {
  if (!points.length) return [];

  if (range === '1y' || range === '3y' || range === '5y' || range === '3mo') {
    const seen = new Set();
    const ticks = [];
    for (let i = 0; i < points.length; i++) {
      const label = formatAxisMonth(points[i].t);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      ticks.push({ i, label });
    }
    const last = points.length - 1;
    const lastLabel = formatAxisMonth(points[last].t);
    if (!ticks.some((t) => t.i === last)) ticks.push({ i: last, label: lastLabel });
    if (ticks.length > 7) {
      const step = Math.ceil(ticks.length / 6);
      return ticks.filter((_, idx) => idx % step === 0 || idx === ticks.length - 1);
    }
    return ticks;
  }

  const step = Math.max(1, Math.floor(points.length / 6));
  const ticks = [];
  for (let i = 0; i < points.length; i += step) {
    ticks.push({ i, label: formatAxisDate(points[i].t, range) });
  }
  const last = points.length - 1;
  if (!ticks.some((t) => t.i === last)) {
    ticks.push({ i: last, label: formatAxisDate(points[last].t, range) });
  }
  return ticks.slice(0, 7);
};

export const pickTimeTicks = (points, formatter = berlinHour) => {
  if (!points?.length) return [];
  const step = Math.max(1, Math.floor(points.length / 4));
  const ticks = [];
  for (let i = 0; i < points.length; i += step) {
    ticks.push({ i, label: formatter(points[i].t) });
  }
  const last = points.length - 1;
  if (!ticks.some((t) => t.i === last)) ticks.push({ i: last, label: formatter(points[last].t) });
  return ticks.slice(0, 5);
};

export const pickPriceTicks = (min, max) => {
  const span = max - min || 1;
  const step = span / 3;
  return [min, min + step, min + step * 2, max].map((v) =>
    v.toLocaleString('de-DE', { maximumFractionDigits: 0 }),
  );
};

export const buildLineGeometry = ({
  points,
  width,
  height,
  padL,
  padR,
  padT,
  padB,
  getValue = (p) => p.c,
  extraValues = [],
  tickCount = 5,
}) => {
  if (!points.length) return null;

  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const values = [...points.map(getValue), ...extraValues.filter((v) => v != null)];
  const { min, max, ticks: yTicks } = buildYScale(values, tickCount);
  const span = max - min || 1;

  const xAt = (i) => padL + (i / Math.max(points.length - 1, 1)) * innerW;
  const yAt = (v) => padT + innerH - ((v - min) / span) * innerH;

  const linePts = points
    .map((p, i) => `${xAt(i).toFixed(1)},${yAt(getValue(p)).toFixed(1)}`)
    .join(' ');
  const areaPts = `${padL},${padT + innerH} ${linePts} ${padL + innerW},${padT + innerH}`;

  let minIdx = 0;
  let maxIdx = 0;
  points.forEach((p, i) => {
    const v = getValue(p);
    if (v <= getValue(points[minIdx])) minIdx = i;
    if (v >= getValue(points[maxIdx])) maxIdx = i;
  });

  return {
    linePts,
    areaPts,
    xAt,
    yAt,
    yTicks,
    min,
    max,
    span,
    innerW,
    innerH,
    minIdx,
    maxIdx,
  };
};

export const computeRangeStats = (points) => {
  if (!points?.length) return null;
  const closes = points.map((p) => Number(p.c));
  const first = closes[0];
  const last = closes[closes.length - 1];
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const changePct = first ? ((last - first) / first) * 100 : 0;
  return { first, last, min, max, changePct };
};

export const formatTooltipPrice = (value, { decimals } = {}) => {
  if (value == null) return '—';
  const n = Number(value);
  if (decimals != null) {
    return n.toLocaleString('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  if (n >= 1000) {
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
};

export const formatChangePct = (pct) => {
  if (pct == null || Number.isNaN(pct)) return '—';
  const n = Number(pct);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
};

export const hoverIndexFromEvent = (event, pointCount) => {
  if (pointCount < 2) return null;
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  const idx = Math.round(ratio * (pointCount - 1));
  return Math.max(0, Math.min(pointCount - 1, idx));
};
