import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useDashboardData } from '@/context/DashboardDataContext';
import { fetchStockHistory } from '@/services/stockHistoryService';
import { formatEUR, formatPctSigned } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';
import ChartEmpty from '@/components/dashboard/charts/ChartEmpty';
import DashboardTabPanel from '@/components/dashboard/motion/DashboardTabPanel';
import { ChartTooltipFrame, ChartTooltipRow } from '@/components/dashboard/charts/ChartTooltip';
import {
  CHART_COLORS,
  CHART_CURSOR_LINE,
  CHART_GRID_STROKE,
  CHART_LEGEND,
  chartMargin,
  chartXAxisProps,
  chartYAxisProps,
} from '@/components/dashboard/charts/chartTheme';

const BENCHMARKS = [
  { id: '^GDAXI', label: 'DAX' },
  { id: '^GSPC', label: 'S&P 500' },
  { id: '^STOXX50E', label: 'Euro Stoxx 50' },
];

const RANGE_OPTIONS = [
  { id: '1mo', labelKey: '1M', sliceDays: 31 },
  { id: '3mo', labelKey: '3M', sliceDays: 93 },
  { id: '1y', labelKey: '1J', sliceDays: 365 },
  { id: 'ytd', labelKey: 'YTD', sliceDays: null },
];

const toDateKey = (unixSec) => {
  try {
    return new Date(unixSec * 1000).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const filterSnapshotsByRange = (snaps, rangeId) => {
  const sorted = [...(snaps || [])].sort((a, b) =>
    String(a.snapshot_date).localeCompare(String(b.snapshot_date)),
  );
  const today = new Date();
  if (rangeId === 'ytd') {
    const year = String(today.getFullYear());
    return sorted.filter((s) => String(s.snapshot_date).slice(0, 4) === year);
  }
  const opt = RANGE_OPTIONS.find((r) => r.id === rangeId);
  if (!opt?.sliceDays) return sorted;
  const cut = new Date(today);
  cut.setDate(cut.getDate() - opt.sliceDays);
  const cutStr = cut.toISOString().slice(0, 10);
  return sorted.filter((s) => String(s.snapshot_date).slice(0, 10) >= cutStr);
};

const portfolioValueOnDate = (date, snapMap, sortedSnapDates, fallback) => {
  let val = null;
  for (const d of sortedSnapDates) {
    if (d <= date) val = snapMap[d];
    else break;
  }
  if (val == null && sortedSnapDates.length) {
    val = snapMap[sortedSnapDates[0]];
  }
  return val ?? fallback;
};

const buildPerformanceSeries = (benchPoints, snapshots, liveTotal) => {
  if (!benchPoints.length) return [];

  const snapMap = {};
  snapshots.forEach((s) => {
    snapMap[String(s.snapshot_date).slice(0, 10)] = Number(s.total_value || 0);
  });
  const today = new Date().toISOString().slice(0, 10);
  snapMap[today] = Number(liveTotal || 0);

  const sortedSnapDates = Object.keys(snapMap)
    .filter((d) => snapMap[d] != null && !Number.isNaN(snapMap[d]))
    .sort();

  const fallback = sortedSnapDates.length
    ? snapMap[sortedSnapDates[sortedSnapDates.length - 1]]
    : Number(liveTotal || 0);

  const rows = benchPoints
    .map(({ date, close }) => {
      const portfolioEur = portfolioValueOnDate(date, snapMap, sortedSnapDates, fallback);
      if (portfolioEur == null || close == null) return null;
      return { date, portfolioEur, benchmarkClose: close };
    })
    .filter(Boolean);

  if (rows.length < 2) return [];

  const portBase = rows[0].portfolioEur || 1;
  const benchBase = rows[0].benchmarkClose || 1;

  return rows.map((r) => ({
    date: r.date,
    portfolio: (r.portfolioEur / portBase) * 100,
    benchmark: (r.benchmarkClose / benchBase) * 100,
    portfolioEur: r.portfolioEur,
  }));
};

const PerformanceBenchmarkChart = ({ height = 280 }) => {
  const { heroSnapshots, gesamtvermoegen, bondsMarktwert, depotWert } = useDashboardData();
  const [benchmarkId, setBenchmarkId] = useState('^GDAXI');
  const [rangeId, setRangeId] = useState('1y');
  const [benchmarkPoints, setBenchmarkPoints] = useState([]);
  const [benchLoading, setBenchLoading] = useState(false);

  const historyRange = rangeId;

  useEffect(() => {
    let active = true;
    setBenchLoading(true);
    fetchStockHistory(benchmarkId, historyRange, '1d')
      .then(({ points }) => {
        if (!active) return;
        const mapped = (points || [])
          .map((p) => ({ date: toDateKey(p.t), close: p.c }))
          .filter((p) => p.date && typeof p.close === 'number');
        setBenchmarkPoints(mapped);
      })
      .catch(() => {
        if (active) setBenchmarkPoints([]);
      })
      .finally(() => {
        if (active) setBenchLoading(false);
      });
    return () => {
      active = false;
    };
  }, [benchmarkId, historyRange]);

  const benchLabel = BENCHMARKS.find((b) => b.id === benchmarkId)?.label || 'Benchmark';

  const data = useMemo(() => {
    const snaps = filterSnapshotsByRange(heroSnapshots, rangeId);
    return buildPerformanceSeries(benchmarkPoints, snaps, gesamtvermoegen);
  }, [heroSnapshots, gesamtvermoegen, benchmarkPoints, rangeId]);

  const last = data[data.length - 1];
  const first = data[0];
  const portReturn = first && last ? last.portfolio - 100 : 0;
  const benchReturn = first && last && last.benchmark != null ? last.benchmark - 100 : null;

  const wpTotal = Number(depotWert || 0) + Number(bondsMarktwert || 0);

  if (!benchLoading && data.length < 2) {
    return (
      <ChartEmpty
        height={192}
        lottie
        hint={
          benchmarkPoints.length === 0
            ? 'Benchmark-Daten konnten nicht geladen werden.'
            : 'Performance-Verlauf erscheint nach mehreren Tages-Snapshots.'
        }
      />
    );
  }

  return (
    <div className="rounded-lg border border-bank-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="chart-title text-[15px] font-semibold text-bank-text">Performance vs. {benchLabel}</h3>
          <p className="mt-1 text-[12px] text-bank-text-muted">
            Normalisiert (Start = 100) · Wertpapiere {formatEUR(wpTotal)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-bank-border p-0.5">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRangeId(r.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  rangeId === r.id ? 'bg-bank-primary/10 text-bank-primary' : 'text-bank-text-muted hover:text-bank-text',
                )}
              >
                {r.labelKey}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-bank-border p-0.5">
            {BENCHMARKS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBenchmarkId(b.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  benchmarkId === b.id ? 'bg-bank-primary text-white' : 'text-bank-text-muted hover:text-bank-text',
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex gap-4 text-[12px]">
            <span>
              Portfolio:{' '}
              <strong className={portReturn >= 0 ? 'text-bank-success' : 'text-bank-error'}>
                {formatPctSigned(portReturn)}
              </strong>
            </span>
            {benchReturn != null && (
              <span>
                {benchLabel}:{' '}
                <strong className={benchReturn >= 0 ? 'text-bank-success' : 'text-bank-error'}>
                  {formatPctSigned(benchReturn)}
                </strong>
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="relative">
        {benchLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 text-[12px] text-bank-text-muted">
            Lade Benchmark…
          </div>
        )}
        <DashboardTabPanel tabKey={`${rangeId}-${benchmarkId}`}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={chartMargin}>
            <defs>
              <linearGradient id="perfPortfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) =>
                new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', {
                  month: 'short',
                  year: '2-digit',
                })
              }
              {...chartXAxisProps}
              minTickGap={48}
            />
            <YAxis {...chartYAxisProps} width={42} domain={['auto', 'auto']} />
            <Tooltip
              cursor={CHART_CURSOR_LINE}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const dateLabel = new Date(`${label}T12:00:00`).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <ChartTooltipFrame label={dateLabel}>
                    {payload.map((p) => (
                      <ChartTooltipRow
                        key={p.dataKey}
                        label={p.name}
                        value={typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
                        tone={p.dataKey === 'portfolio' ? 'primary' : 'muted'}
                      />
                    ))}
                  </ChartTooltipFrame>
                );
              }}
            />
            <Legend {...CHART_LEGEND} verticalAlign="bottom" height={32} />
            <Area
              type="monotone"
              dataKey="portfolio"
              name="Portfolio"
              stroke={CHART_COLORS.primary}
              fill="url(#perfPortfolioGrad)"
              strokeWidth={2}
              connectNulls
              isAnimationActive
              animationDuration={420}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              name={benchLabel}
              stroke={CHART_COLORS.neutral}
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        </DashboardTabPanel>
      </div>
    </div>
  );
};

export default PerformanceBenchmarkChart;
