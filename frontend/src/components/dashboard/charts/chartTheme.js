/** Shared Recharts styling — bank palette, sans-serif (dashboard). */

export const CHART_FONT = '"IBM Plex Sans", system-ui, sans-serif';

/** Bank-aligned chart colors (light mode defaults; axis ticks overridden in dark via CSS). */
export const CHART_COLORS = {
  primary: '#2186D4',
  primaryDeep: '#146EB4',
  accent: '#38A3E8',
  gold: '#B49450',
  secondary: '#386EA8',
  success: '#10B981',
  error: '#dc2626',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  grid: 'rgba(226, 232, 240, 0.55)',
  axis: 'rgba(226, 232, 240, 0.85)',
  cursorBar: 'rgba(33, 134, 212, 0.05)',
  cursorLine: 'rgba(33, 134, 212, 0.35)',
  reference: 'rgba(226, 232, 240, 0.95)',
  neutral: '#64748b',
  gross: '#2186D4',
  net: '#146EB4',
};

export const CHART_TICK = {
  fontSize: 11,
  fill: CHART_COLORS.textMuted,
  fontFamily: CHART_FONT,
};

export const CHART_TICK_SM = {
  fontSize: 10,
  fill: CHART_COLORS.textMuted,
  fontFamily: CHART_FONT,
};

export const CHART_AXIS_STROKE = CHART_COLORS.axis;
export const CHART_GRID_STROKE = CHART_COLORS.grid;

export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.gold,
  CHART_COLORS.accent,
  CHART_COLORS.secondary,
  CHART_COLORS.success,
  '#146EB4',
  '#5BA3E0',
  CHART_COLORS.error,
];

export const CHART_COUPON = CHART_COLORS.success;
export const CHART_PRINCIPAL = CHART_COLORS.primary;

export const BUCKET_COLORS = {
  y1: CHART_COLORS.error,
  y3: CHART_COLORS.gold,
  beyond: CHART_COLORS.primary,
  unknown: CHART_COLORS.neutral,
};

export const BUCKET_LABELS = {
  y1: '≤ 1 Jahr',
  y3: '1 – 3 Jahre',
  beyond: '> 3 Jahre',
  unknown: 'Ohne Fälligkeit',
};

export const MATURITY_BUCKET_COLORS = {
  d30: CHART_COLORS.error,
  d60: CHART_COLORS.gold,
  d90: CHART_COLORS.primary,
  beyond: CHART_COLORS.neutral,
};

export const MATURITY_BUCKET_LABELS = {
  d30: '≤ 30 Tage',
  d60: '31 – 60 Tage',
  d90: '61 – 90 Tage',
  beyond: '> 90 Tage',
};

export const CHART_CURSOR_BAR = { fill: CHART_COLORS.cursorBar };
export const CHART_CURSOR_LINE = {
  stroke: CHART_COLORS.cursorLine,
  strokeWidth: 1,
  strokeDasharray: '4 4',
};

export const CHART_LEGEND = {
  verticalAlign: 'top',
  height: 26,
  iconType: 'circle',
  iconSize: 8,
  wrapperStyle: {
    fontSize: 11,
    color: CHART_COLORS.textMuted,
    fontFamily: CHART_FONT,
    paddingBottom: 4,
  },
};

export const chartMargin = { top: 8, right: 12, bottom: 4, left: 0 };

export const chartXAxisProps = {
  tick: CHART_TICK_SM,
  stroke: CHART_AXIS_STROKE,
  tickLine: false,
  axisLine: false,
  minTickGap: 24,
};

export const chartYAxisProps = {
  tick: CHART_TICK_SM,
  stroke: CHART_AXIS_STROKE,
  tickLine: false,
  axisLine: false,
  width: 52,
};

export const positiveNegativeColor = (up) => (up ? CHART_COLORS.success : CHART_COLORS.error);

export const compactEur = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) {
    return `${(v / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`;
  }
  if (Math.abs(v) >= 1000) {
    return `${(v / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}k €`;
  }
  return `${v.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`;
};

export const piePadding = (count) => (count > 1 ? 2 : 0);

export const pieStroke = (count) => (count > 1 ? CHART_COLORS.border : 'none');
