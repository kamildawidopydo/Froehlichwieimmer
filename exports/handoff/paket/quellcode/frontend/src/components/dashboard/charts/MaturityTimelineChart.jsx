import React, { useMemo, useState } from 'react';
import { formatDate, formatEUR } from '@/lib/dashboardFormatters';
import ChartEmpty from './ChartEmpty';
import ChartLegend from './ChartLegend';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import { MATURITY_BUCKET_COLORS, MATURITY_BUCKET_LABELS } from './chartTheme';
import { TimelineAxis, TimelineRow, TimelineTrack, formatTimelineAxisDate } from './timelineChartParts';

const LABEL_W = 120;
const DATE_W = 88;
const MIN_BAR_PCT = 10;

/**
 * Maturity ladder: remaining term per Festgeld contract, coloured by bucket.
 */
const MaturityTimelineChart = ({
  rows = [],
  height = 260,
  emptyHint = 'Keine Festgeld-Fälligkeiten geplant.',
}) => {
  const [activeId, setActiveId] = useState(null);

  const sorted = useMemo(
    () =>
      [...(rows || [])].sort(
        (a, b) => Number(a.daysToMaturity ?? 0) - Number(b.daysToMaturity ?? 0),
      ),
    [rows],
  );

  const maxDays = useMemo(
    () => Math.max(...sorted.map((r) => Number(r.daysToMaturity ?? 0)), 1),
    [sorted],
  );

  const farthestDate = sorted[sorted.length - 1]?.maturityDate;

  if (!sorted.length) {
    return <ChartEmpty height={height} hint={emptyHint} />;
  }

  return (
    <div>
      <TimelineAxis
        leftGutter={LABEL_W + 12}
        startLabel="Heute"
        endLabel={farthestDate ? formatTimelineAxisDate(farthestDate) : `${maxDays} T`}
      />

      <div className="space-y-1 overflow-y-auto pr-1" style={{ maxHeight: height }}>
        {sorted.map((r, i) => {
          const days = Number(r.daysToMaturity ?? 0);
          const widthPct = Math.max((days / maxDays) * 100, MIN_BAR_PCT);
          const color = MATURITY_BUCKET_COLORS[r.bucket] || MATURITY_BUCKET_COLORS.beyond;
          const bucketLabel = MATURITY_BUCKET_LABELS[r.bucket] || MATURITY_BUCKET_LABELS.beyond;
          const isActive = activeId === r.contractId;
          const labelInside = widthPct >= 14;

          return (
            <TimelineRow
              key={r.contractId ?? i}
              active={isActive}
              delayMs={i * 40}
              onEnter={() => setActiveId(r.contractId)}
              onLeave={() => setActiveId((id) => (id === r.contractId ? null : id))}
              onFocus={() => setActiveId(r.contractId)}
              onBlur={() => setActiveId((id) => (id === r.contractId ? null : id))}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="truncate text-[13px] font-medium text-bank-text">
                  {r.bankName || `Vertrag ${i + 1}`}
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-bank-success">
                  {formatEUR(r.netto)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="shrink-0 self-center truncate text-[11px] leading-none text-bank-text-muted"
                  style={{ width: LABEL_W }}
                >
                  {bucketLabel}
                </span>

                <TimelineTrack className="h-7">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{
                      width: `calc(${widthPct}% - 1px)`,
                      maxWidth: '100%',
                      background: `linear-gradient(90deg, ${color}66 0%, ${color} 100%)`,
                      boxShadow: isActive ? `0 0 0 1px ${color}66` : undefined,
                    }}
                  />
                  {labelInside ? (
                    <span
                      className="pointer-events-none absolute inset-y-0 flex items-center justify-end whitespace-nowrap px-2 text-[10.5px] font-semibold tabular-nums text-white drop-shadow-sm"
                      style={{
                        left: 0,
                        width: `calc(${widthPct}% - 1px)`,
                        maxWidth: '100%',
                      }}
                    >
                      {days} T
                    </span>
                  ) : (
                    <span
                      className="pointer-events-none absolute inset-y-0 flex items-center whitespace-nowrap pl-1 text-[10.5px] font-semibold tabular-nums text-bank-text"
                      style={{ left: `calc(${widthPct}% + 4px)` }}
                    >
                      {days} T
                    </span>
                  )}
                </TimelineTrack>

                <span
                  className="shrink-0 self-center text-right text-[11px] leading-none tabular-nums text-bank-text-muted"
                  style={{ width: DATE_W }}
                >
                  {r.maturityDate ? formatDate(r.maturityDate) : '–'}
                </span>
              </div>

              {isActive && (
                <ChartTooltipFrame className="mt-2.5" label={r.bankName}>
                  <ChartTooltipRow label="Netto-Auszahlung" value={formatEUR(r.netto)} tone="success" />
                  <ChartTooltipRow label="Brutto" value={formatEUR(r.brutto)} tone="gold" />
                  {r.rate != null && (
                    <ChartTooltipRow label="Zinssatz" value={`${Number(r.rate).toFixed(2)} % p.a.`} tone="primary" />
                  )}
                  <ChartTooltipRow
                    label="Fälligkeit"
                    value={r.maturityDate ? formatDate(r.maturityDate) : '–'}
                    divider
                  />
                  <ChartTooltipRow label="Verbleibend" value={`${days} Tage · ${bucketLabel}`} tone="muted" />
                </ChartTooltipFrame>
              )}
            </TimelineRow>
          );
        })}
      </div>

      <ChartLegend
        items={Object.entries(MATURITY_BUCKET_LABELS).map(([key, label]) => ({
          key,
          label,
          color: MATURITY_BUCKET_COLORS[key],
        }))}
      />
    </div>
  );
};

export default MaturityTimelineChart;
