import {
  CHART_AXIS_STROKE,
  CHART_COLORS,
  CHART_FONT,
  CHART_GRID_STROKE,
} from '@/components/dashboard/charts/chartTheme';

/** News / public market SVG chart tokens (light + dark via CSS class on wrapper). */
export const NEWS_CHART = {
  font: CHART_FONT,
  grid: CHART_GRID_STROKE,
  axis: CHART_AXIS_STROKE,
  textMuted: CHART_COLORS.textMuted,
  text: CHART_COLORS.text,
  cursorLine: CHART_COLORS.cursorLine,
  primary: CHART_COLORS.primary,
};

export const newsChartSurfaceClass =
  'news-market-chart rounded-lg border border-bank-border/40 bg-bank-bg/20 dark:border-white/10 dark:bg-bank-ink/15';
