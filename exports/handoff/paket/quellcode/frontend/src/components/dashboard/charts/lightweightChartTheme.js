import { ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { CHART_COLORS, CHART_FONT } from './chartTheme';

const SURFACES = {
  light: {
    background: '#ffffff',
    text: CHART_COLORS.textMuted,
    grid: CHART_COLORS.grid,
    crosshair: CHART_COLORS.cursorLine,
    labelBg: CHART_COLORS.secondary,
  },
  dark: {
    background: '#0c1a2e',
    text: '#afc8d0',
    grid: 'rgba(56, 78, 110, 0.35)',
    crosshair: 'rgba(104, 163, 255, 0.38)',
    labelBg: '#1c2e48',
  },
};

export function buildLightweightChartOptions(isDark, currency) {
  const t = isDark ? SURFACES.dark : SURFACES.light;
  return {
    layout: {
      background: { type: ColorType.Solid, color: t.background },
      textColor: t.text,
      fontFamily: CHART_FONT,
      fontSize: 11,
      attributionLogo: false,
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { color: t.grid },
    },
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.08, bottom: 0.22 },
    },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: t.crosshair,
        width: 1,
        style: LineStyle.Dashed,
        labelBackgroundColor: t.labelBg,
      },
      horzLine: {
        color: t.crosshair,
        labelBackgroundColor: t.labelBg,
      },
    },
    localization: {
      locale: 'de-DE',
      priceFormatter: (price) =>
        Number(price).toLocaleString('de-DE', {
          style: 'currency',
          currency: currency || 'USD',
          maximumFractionDigits: 2,
        }),
    },
  };
}

export function volumeScaleOptions() {
  return {
    scaleMargins: { top: 0.78, bottom: 0 },
  };
}
