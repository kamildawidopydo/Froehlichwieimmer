import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, RefreshCw } from 'lucide-react';
import ChartEmpty from '@/components/dashboard/charts/ChartEmpty';
import { ChartTooltipFrame, ChartTooltipRow } from '@/components/dashboard/charts/ChartTooltip';
import {
  CHART_COLORS,
  CHART_CURSOR_LINE,
  CHART_GRID_STROKE,
  CHART_LEGEND,
  chartMargin,
  chartXAxisProps,
  chartYAxisProps,
  compactEur,
  positiveNegativeColor,
} from '@/components/dashboard/charts/chartTheme';
import { fetchPortfolioJson } from '@/services/portfolioApi';

/**
 * PortfolioHistoryChart — Vermögensverlauf (Session 82.25 · Mongo-native).
 *
 * Datenquelle: `GET /api/portfolio/snapshots?range={7d|30d|90d|1y|max}`.
 * Ausschließlich reale, persistierte Tages-Snapshots aus MongoDB. Kein
 * historischer Fake-Backfill, keine synthetischen Zwischenpunkte.
 *
 * Empty/One/Multi Point State:
 *   0 Punkte → ChartEmpty
 *   1 Punkt  → ChartEmpty (Verlauf braucht mindestens zwei Punkte)
 *   2+ Punkte → echte Verlaufslinie
 */

const RANGES = [
  { key: '7d', label: '7T' },
  { key: '30d', label: '30T' },
  { key: '90d', label: '90T' },
  { key: '1y', label: '1J' },
  { key: 'max', label: 'Alle' },
];

const BREAKDOWN_SERIES = [
  { key: 'cash', name: 'Guthaben', color: CHART_COLORS.success },
  { key: 'stocks', name: 'Aktien', color: CHART_COLORS.primary },
  { key: 'bonds', name: 'Anleihen', color: CHART_COLORS.gold },
];

const formatEURFull = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const formatDateLabel = (d) =>
  new Date(d).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const TotalTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipFrame label={formatDateLabel(label)}>
      <ChartTooltipRow label="Gesamt" value={formatEURFull(payload[0]?.value)} tone="primary" />
    </ChartTooltipFrame>
  );
};

const BreakdownTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipFrame label={formatDateLabel(label)}>
      {payload.map((p) => (
        <ChartTooltipRow
          key={String(p.dataKey)}
          label={p.name}
          value={formatEURFull(p.value)}
          tone="default"
        />
      ))}
    </ChartTooltipFrame>
  );
};

const PortfolioHistoryChart = () => {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState('30d');
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        setSnapshots([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await fetchPortfolioJson(`/api/portfolio/snapshots?range=${rangeKey}`);
        if (!cancelled) setSnapshots(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setSnapshots([]);
        // Kein toast — Empty-State ist der korrekte UI-Fall.
        // eslint-disable-next-line no-console
        console.error('portfolio snapshots fetch failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, rangeKey]);

  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        date: s.snapshot_date,
        total: Number(s.total_value || 0),
        cash: Number(s.cash_value || 0),
        stocks: Number(s.stock_value || 0),
        bonds: Number(s.bond_value || 0),
      })),
    [snapshots],
  );

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const diff = first && last ? last.total - first.total : 0;
  const diffPct = first && first.total > 0 ? (diff / first.total) * 100 : 0;
  const up = diff >= 0;
  const lineColor = positiveNegativeColor(up);

  const formatXAxis = (d) => {
    const date = new Date(d);
    if (rangeKey === '7d' || rangeKey === '30d')
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    if (rangeKey === '90d' || rangeKey === '1y')
      return date.toLocaleDateString('de-DE', { month: 'short', day: '2-digit' });
    return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
  };

  const canRenderChart = chartData.length >= 2;

  return (
    <div className="bg-white border border-bank-border rounded-xl p-5 shadow-sm" data-testid="portfolio-history-chart">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-bank-text flex items-center gap-2">
            <TrendingUp size={16} className="text-bank-primary" />
            Vermögensverlauf
          </h3>
          {last && (
            <p className="text-xs text-bank-text-muted mt-0.5">
              Aktuell: <strong className="text-bank-text">{formatEURFull(last.total)}</strong>
              {first && first.date !== last.date && (
                <span className={`ml-2 font-medium ${up ? 'text-emerald-600' : 'text-bank-error'}`}>
                  {up ? '+' : ''}
                  {formatEURFull(diff)} ({up ? '+' : ''}
                  {diffPct.toFixed(2)}%)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            data-testid="portfolio-history-toggle-breakdown"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              showBreakdown
                ? 'bg-bank-ink text-white border-bank-ink'
                : 'bg-white text-bank-text-muted border-bank-border hover:bg-bank-bg'
            }`}
          >
            Aufschlüsselung
          </button>
          {RANGES.map((r) => (
            <button
              key={r.key}
              data-testid={`portfolio-history-range-${r.key}`}
              onClick={() => setRangeKey(r.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                rangeKey === r.key
                  ? 'bg-bank-ink text-white border-bank-ink'
                  : 'bg-white text-bank-text-muted border-bank-border hover:bg-bank-bg'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center" data-testid="portfolio-history-loading">
            <RefreshCw size={18} className="animate-spin text-bank-text-muted/70" />
          </div>
        ) : !canRenderChart ? (
          <ChartEmpty
            height={256}
            icon={TrendingUp}
            hint={
              chartData.length === 1
                ? 'Erst ein Tages-Snapshot vorhanden.'
                : 'Noch keine Verlaufsdaten verfügbar.'
            }
            sub="Tägliche Momentaufnahmen werden ab jetzt automatisch erstellt (22:00 UTC)."
            data-testid="portfolio-history-empty"
          />
        ) : showBreakdown ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={chartMargin}>
              <defs>
                {BREAKDOWN_SERIES.map(({ key, color }) => (
                  <linearGradient key={key} id={`ph_${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.08} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatXAxis} {...chartXAxisProps} minTickGap={40} />
              <YAxis tickFormatter={compactEur} {...chartYAxisProps} width={70} />
              <Tooltip cursor={CHART_CURSOR_LINE} content={<BreakdownTooltip />} />
              <Legend {...CHART_LEGEND} />
              {BREAKDOWN_SERIES.map(({ key, name, color }) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  name={name}
                  stroke={color}
                  fill={`url(#ph_${key})`}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={chartMargin}>
              <defs>
                <linearGradient id="ph_total" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatXAxis} {...chartXAxisProps} minTickGap={40} />
              <YAxis
                tickFormatter={compactEur}
                {...chartYAxisProps}
                width={70}
                domain={['auto', 'auto']}
              />
              <Tooltip cursor={CHART_CURSOR_LINE} content={<TotalTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke={lineColor}
                strokeWidth={2}
                fill="url(#ph_total)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PortfolioHistoryChart;
