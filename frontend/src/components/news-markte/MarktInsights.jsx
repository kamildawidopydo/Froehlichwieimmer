import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { formatValue, formatClock, formatChangePct } from '@/services/newsMarkteApi';

const InsightTile = ({ insight }) => {
  const positive = insight.change_pct > 0;
  const negative = insight.change_pct < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const changeColor = positive ? 'text-emerald-700' : negative ? 'text-rose-700' : 'text-bank-text-muted';
  return (
    <div
      className="flex min-w-0 flex-col justify-between gap-4 border border-bank-border bg-white px-5 py-5 transition-colors hover:border-bank-accent-strong/50"
      data-testid={`market-tile-${insight.symbol}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.24em] text-bank-text-muted">
            {insight.name}
          </p>
          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-neutral-400">
            {insight.symbol}
          </p>
        </div>
        <Icon className={`h-4 w-4 shrink-0 ${changeColor}`} strokeWidth={1.5} />
      </div>
      <div>
        <p className="font-serif text-2xl tabular-nums text-bank-text sm:text-[26px]" data-numeric>
          {formatValue(insight.value)}
        </p>
        {insight.unit && (
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-bank-text-muted">
            {insight.unit}
          </p>
        )}
      </div>
      <div className={`flex items-center justify-between text-[12.5px] font-mono ${changeColor}`}>
        <span className="tabular-nums">{formatChangePct(insight.change_pct)}</span>
        <span className="text-[10.5px] text-neutral-400">{formatClock(insight.updated_at)}</span>
      </div>
    </div>
  );
};

const latestClockLabel = (insights = []) => {
  const times = insights
    .map((i) => (i.updated_at ? new Date(i.updated_at).getTime() : null))
    .filter((t) => t && !Number.isNaN(t))
    .sort((a, b) => b - a);
  if (times.length === 0) return null;
  return new Date(times[0]).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

const MarktInsights = ({ insights = [], loading }) => (
  <section
    className="border-t border-bank-border pt-14 sm:pt-16"
    data-testid="markt-insights"
  >
    <div className="flex flex-col gap-3">
      <Eyebrow>Markt-Insights</Eyebrow>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-serif text-3xl leading-tight text-bank-text sm:text-4xl">Was an den Märkten passiert</h2>
        <p className="max-w-md text-[13.5px] text-bank-text-muted sm:text-right">
          Kompakter Überblick über Indizes, Rohstoffe und Währungen.
        </p>
      </div>
    </div>

    {loading ? (
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-[130px] animate-pulse bg-neutral-100" />
        ))}
      </div>
    ) : (
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {insights.map((i) => (
          <InsightTile key={i.symbol} insight={i} />
        ))}
      </div>
    )}
    {!loading && insights.length > 0 && (
      <p
        className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] uppercase tracking-[0.16em] text-bank-text-muted"
        data-testid="markt-insights-last-updated"
      >
        {latestClockLabel(insights) && (
          <span>Letzte Aktualisierung: {latestClockLabel(insights)} Uhr</span>
        )}
        <span aria-hidden className="text-bank-gold">·</span>
        <span>Marktdaten zeitverzögert</span>
        <span aria-hidden className="text-bank-gold">·</span>
        <span>Angaben ohne Gewähr — keine Anlageempfehlung</span>
      </p>
    )}
  </section>
);

export default MarktInsights;
