import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
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

const RANGES = [
  { key: 7, label: '7T' },
  { key: 30, label: '30T' },
  { key: 90, label: '90T' },
  { key: 365, label: '1J' },
  { key: 9999, label: 'Alle' },
];

const BREAKDOWN_SERIES = [
  { key: 'cash', name: 'Guthaben', color: CHART_COLORS.success },
  { key: 'stocks', name: 'Aktien', color: CHART_COLORS.primary },
  { key: 'bonds', name: 'Anleihen', color: CHART_COLORS.gold },
  { key: 'contracts', name: 'Festgeld', color: CHART_COLORS.secondary },
];

const formatEURFull = (v) => Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

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
  const [rangeDays, setRangeDays] = useState(30);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (user) fetchSnapshots();
  }, [user, rangeDays]);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('user_portfolio_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: true });
      if (rangeDays < 9999) {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - rangeDays);
        q = q.gte('snapshot_date', fromDate.toISOString().slice(0, 10));
      }
      const { data, error } = await q;
      if (error) throw error;
      setSnapshots(data || []);
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => snapshots.map((s) => ({
    date: s.snapshot_date,
    total: Number(s.total_value || 0),
    cash: Number(s.cash_balance || 0),
    stocks: Number(s.stocks_value || 0),
    bonds: Number(s.bonds_value || 0),
    contracts: Number(s.contracts_value || 0),
  })), [snapshots]);

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const diff = first && last ? last.total - first.total : 0;
  const diffPct = first && first.total > 0 ? (diff / first.total) * 100 : 0;
  const up = diff >= 0;
  const lineColor = positiveNegativeColor(up);

  const formatXAxis = (d) => {
    const date = new Date(d);
    if (rangeDays <= 30) return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    if (rangeDays <= 365) return date.toLocaleDateString('de-DE', { month: 'short', day: '2-digit' });
    return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="bg-white border border-bank-border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-bank-text flex items-center gap-2">
            <TrendingUp size={16} className="text-bank-primary" />
            Vermögen-Verlauf
          </h3>
          {last && (
            <p className="text-xs text-bank-text-muted mt-0.5">
              Aktuell: <strong className="text-bank-text">{formatEURFull(last.total)}</strong>
              {first && first.snapshot_date !== last.snapshot_date && (
                <span className={`ml-2 font-medium ${up ? 'text-emerald-600' : 'text-bank-error'}`}>
                  {up ? '+' : ''}{formatEURFull(diff)} ({up ? '+' : ''}{diffPct.toFixed(2)}%)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${showBreakdown
              ? 'bg-bank-ink text-white border-bank-ink'
              : 'bg-white text-bank-text-muted border-bank-border hover:bg-bank-bg'}`}
          >
            Aufschlüsselung
          </button>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeDays(r.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${rangeDays === r.key
                ? 'bg-bank-ink text-white border-bank-ink'
                : 'bg-white text-bank-text-muted border-bank-border hover:bg-bank-bg'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw size={18} className="animate-spin text-bank-text-muted/70" />
          </div>
        ) : chartData.length === 0 ? (
          <ChartEmpty
            height={256}
            icon={TrendingUp}
            hint="Noch keine Verlaufsdaten verfügbar."
            sub="Tägliche Momentaufnahmen werden automatisch erstellt."
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
              <YAxis tickFormatter={compactEur} {...chartYAxisProps} width={70} domain={['auto', 'auto']} />
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
