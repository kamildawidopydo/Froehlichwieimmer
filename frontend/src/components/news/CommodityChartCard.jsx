import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import MarketAreaChart from '@/components/news/MarketAreaChart';
import { CHART_RANGES } from '@/lib/market/chartOverviewConfig';
import { snapshotPath } from '@/lib/market/marketInstruments';
import {
  computeRangeStats,
  formatChangePct,
  formatTooltipPrice,
} from '@/components/news/marketChartUtils';

const CommodityChartCard = ({ label, slug, points = [], range }) => {
  const stats = useMemo(() => computeRangeStats(points), [points]);
  const rangeLabel = CHART_RANGES.find((r) => r.id === range)?.label ?? range;
  const up = (stats?.changePct ?? 0) >= 0;
  const hasData = points.length >= 2;

  return (
    <article className="rounded-xl border border-bank-border/80 bg-white p-4 shadow-editorial-sm dark:border-white/10 dark:bg-bank-ink/25">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-semibold text-bank-text">{label}</h3>
          {hasData && stats && (
            <p
              className={cn(
                'mt-1 inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums',
                up ? 'text-bank-success' : 'text-bank-error',
              )}
            >
              {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {formatChangePct(stats.changePct)}
              <span className="font-normal text-bank-text-muted"> · {rangeLabel}</span>
            </p>
          )}
        </div>
        {hasData && stats && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-bank-text-muted">
              Aktuell
            </p>
            <p className="text-[17px] font-semibold tabular-nums text-bank-text">
              {formatTooltipPrice(stats.last)}
            </p>
          </div>
        )}
      </div>

      <MarketAreaChart
        points={points}
        range={range}
        height={300}
        variant="detailed"
        showHighLow
      />

      {hasData && stats && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-bank-border/40 pt-2 text-[10.5px] tabular-nums text-bank-text-muted">
          <span>Tief {formatTooltipPrice(stats.min)}</span>
          <span>Hoch {formatTooltipPrice(stats.max)}</span>
          <span>Start {formatTooltipPrice(stats.first)}</span>
        </div>
      )}

      <p className="mt-3 border-t border-bank-border/50 pt-2">
        <Link
          to={snapshotPath('rohstoff', slug)}
          className="text-[12px] font-medium text-bank-accent hover:underline"
        >
          Detailansicht »
        </Link>
      </p>
    </article>
  );
};

export default CommodityChartCard;
