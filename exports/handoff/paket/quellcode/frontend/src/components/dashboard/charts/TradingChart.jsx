import React, { useEffect, useMemo, useRef } from 'react';
import {
  AreaSeries,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
} from 'lightweight-charts';
import { useTheme } from '@/context/ThemeContext';
import ChartEmpty from './ChartEmpty';
import {
  buildLightweightChartOptions,
  volumeScaleOptions,
} from './lightweightChartTheme';
import { CHART_COLORS } from './chartTheme';

const SMA_WINDOW = 20;

const normalizeOhlc = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const byTime = new Map();
  for (const bar of rows) {
    if (typeof bar?.t !== 'number') continue;
    byTime.set(bar.t, bar);
  }
  return Array.from(byTime.values()).sort((a, b) => a.t - b.t);
};

const computeSma = (rows, window = SMA_WINDOW) => {
  const out = [];
  for (let i = window - 1; i < rows.length; i += 1) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j += 1) sum += rows[j].c;
    out.push({ time: rows[i].t, value: sum / window });
  }
  return out;
};

const rgba = (hex, alpha) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * TradingView Lightweight Charts — candle + area modes with volume strip & SMA.
 * Lazy-load this component on trading pages to keep the main bundle lean.
 */
const TradingChart = ({
  mode = 'area',
  data = [],
  currency = 'USD',
  height = 288,
  showSma = false,
  up = true,
  emptyHint = 'Keine Chartdaten verfügbar.',
}) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const bars = useMemo(() => normalizeOhlc(data), [data]);
  const trendColor = up ? CHART_COLORS.success : CHART_COLORS.error;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || bars.length === 0) return undefined;

    const chart = createChart(el, {
      ...buildLightweightChartOptions(isDark, currency),
      width: el.clientWidth,
      height,
    });
    chartRef.current = chart;

    const upColor = CHART_COLORS.success;
    const downColor = CHART_COLORS.error;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('volume').applyOptions(volumeScaleOptions());

    if (mode === 'candle') {
      chart.addSeries(CandlestickSeries, {
        upColor,
        downColor,
        borderVisible: false,
        wickUpColor: upColor,
        wickDownColor: downColor,
      }).setData(
        bars.map((d) => ({
          time: d.t,
          open: d.o,
          high: d.h,
          low: d.l,
          close: d.c,
        })),
      );
    } else {
      chart.addSeries(AreaSeries, {
        lineColor: trendColor,
        topColor: rgba(trendColor, 0.28),
        bottomColor: rgba(trendColor, 0),
        lineWidth: 2,
      }).setData(bars.map((d) => ({ time: d.t, value: d.c })));
    }

    if (showSma) {
      const sma = computeSma(bars);
      if (sma.length > 0) {
        chart.addSeries(LineSeries, {
          color: CHART_COLORS.primary,
          lineWidth: 1.5,
          lineStyle: LineStyle.Dashed,
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        }).setData(sma);
      }
    }

    volumeSeries.setData(
      bars.map((d) => ({
        time: d.t,
        value: d.v || 0,
        color: rgba(d.c >= d.o ? upColor : downColor, 0.38),
      })),
    );

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, mode, showSma, currency, isDark, height, trendColor]);

  if (bars.length === 0) {
    return <ChartEmpty className="h-full" hint={emptyHint} />;
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-md"
      style={{ height }}
      role="img"
      aria-label={mode === 'candle' ? 'Kerzenchart' : 'Kursverlauf'}
    />
  );
};

export default TradingChart;
