import { CHART_COLORS, CHART_FONT, CHART_TICK_SM } from '../chartTheme';

export const VISX_BAR_MARGIN = { top: 14, right: 12, bottom: 28, left: 52 };
export const VISX_AREA_MARGIN = { top: 18, right: 18, bottom: 36, left: 62 };
export const VISX_AREA_MARGIN_COMPACT = { top: 10, right: 14, bottom: 30, left: 52 };

export const innerSize = (width, height, margin) => ({
  innerWidth: Math.max(0, width - margin.left - margin.right),
  innerHeight: Math.max(0, height - margin.top - margin.bottom),
});

export const axisTickLabel = (overrides = {}) => ({
  fill: CHART_TICK_SM.fill,
  fontSize: CHART_TICK_SM.fontSize,
  fontFamily: CHART_FONT,
  ...overrides,
});

export const axisLeftProps = (tickFormat) => ({
  stroke: CHART_COLORS.axis,
  tickStroke: 'transparent',
  hideTicks: true,
  numTicks: 5,
  tickFormat,
  tickLabelProps: () => axisTickLabel({ textAnchor: 'end', dx: -6, dy: 3 }),
});

export const axisBottomProps = () => ({
  stroke: CHART_COLORS.axis,
  tickStroke: 'transparent',
  hideTicks: true,
  tickLabelProps: () => axisTickLabel({ textAnchor: 'middle', dy: 4 }),
});

export const gridRowsProps = () => ({
  stroke: CHART_COLORS.grid,
  strokeWidth: 0.75,
  strokeOpacity: 1,
});

/** More categories → tighter bars; few categories → wider gaps, capped bar width. */
export const bandPaddingForCount = (count) => {
  if (count <= 2) return 0.62;
  if (count <= 3) return 0.55;
  if (count <= 5) return 0.42;
  return 0.3;
};

export const clampBarInBand = (xScale, label, maxWidth = 52) => {
  const slotX = xScale(label) ?? 0;
  const slotW = xScale.bandwidth();
  const barW = Math.min(slotW, maxWidth);
  return {
    x: slotX + (slotW - barW) / 2,
    width: barW,
    center: slotX + slotW / 2,
  };
};

export const INACTIVE_BAR_OPACITY = 0.78;
