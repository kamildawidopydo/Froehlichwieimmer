import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_COLORS,
  CHART_GRID_STROKE,
  CHART_LEGEND,
  chartMargin,
} from '@/components/dashboard/charts/chartTheme';

const formatEur = (n) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

const compactEur = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1000) {
    return `${(v / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}k €`;
  }
  return `${v.toFixed(0)} €`;
};

const CALC_GRID = 'rgba(255,255,255,0.08)';
const CALC_TICK = 'rgba(255,255,255,0.5)';

function ChartTooltip({ active, payload, label, showNet }) {
  if (!active || !payload?.length) return null;
  const balance = payload.find((p) => p.dataKey === 'balance')?.value;
  const netBalance = payload.find((p) => p.dataKey === 'netBalance')?.value;
  return (
    <div className="rounded-md border border-white/15 bg-bank-ink/95 px-3 py-2 text-xs text-white shadow-lg">
      <p className="font-medium text-bank-gold-soft">{label}</p>
      {balance != null && <p className="mt-1">Brutto: {formatEur(balance)}</p>}
      {showNet && netBalance != null && <p className="text-white/80">Netto: {formatEur(netBalance)}</p>}
    </div>
  );
}

export default function SavingsGrowthChart({ series, showNet }) {
  if (!series?.length) return null;

  return (
    <div className="mt-8 h-[220px] w-full sm:h-[260px]" data-testid="calc-growth-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={chartMargin}>
          <defs>
            <linearGradient id="calcBalanceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="calcNetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.gold} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART_COLORS.gold} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CALC_GRID || CHART_GRID_STROKE} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: CALC_TICK, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={compactEur}
            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<ChartTooltip showNet={showNet} />} />
          {showNet && (
            <Legend
              {...CHART_LEGEND}
              wrapperStyle={{ ...CHART_LEGEND.wrapperStyle, color: 'rgba(255,255,255,0.55)' }}
              formatter={(value) => (value === 'balance' ? 'Brutto' : 'Nach Steuern')}
            />
          )}
          <Area
            type="monotone"
            dataKey="balance"
            name="balance"
            stroke={CHART_COLORS.accent}
            strokeWidth={2}
            fill="url(#calcBalanceGrad)"
            isAnimationActive={false}
          />
          {showNet && (
            <Area
              type="monotone"
              dataKey="netBalance"
              name="netBalance"
              stroke={CHART_COLORS.gold}
              strokeWidth={2}
              fill="url(#calcNetGrad)"
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
