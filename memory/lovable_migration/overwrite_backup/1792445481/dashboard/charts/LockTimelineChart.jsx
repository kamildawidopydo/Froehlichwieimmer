import React, { useMemo, useState } from 'react';
import { formatDate, formatEUR } from '@/lib/dashboardFormatters';
import ChartEmpty from './ChartEmpty';
import ChartLegend from './ChartLegend';
import { ChartTooltipFrame, ChartTooltipRow } from './ChartTooltip';
import { CHART_COLORS, CHART_FONT } from './chartTheme';
import {
  TimelineEndDot,
  TimelineRow,
  TimelineTrack,
  formatTimelineAxisDate,
} from './timelineChartParts';

const LABEL_W = 108;
const ROW_GAP = 12;
const ROW_H = 36;
const AXIS_H = 32;
const HEUTE_ROW_H = 22;

const dayDiff = (a, b) => Math.round((b - a) / 86_400_000);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const filterTicksNearToday = (ticks, todayPct, minGapPct = 9) =>
  ticks.filter((tick) => Math.abs(tick.pct - todayPct) >= minGapPct);

const LockTimelineChart = ({
  rows = [],
  height = 240,
  emptyHint = 'Keine Flexgeld-Verträge mit Festbindung.',
}) => {
  const [activeId, setActiveId] = useState(null);

  const chart = useMemo(() => {
    const valid = (rows || []).filter((r) => r.activeFrom && r.lockUntil);
    if (valid.length === 0) return null;

    const minStart = Math.min(...valid.map((r) => new Date(r.activeFrom).getTime()));
    const maxLock = Math.max(...valid.map((r) => new Date(r.lockUntil).getTime()));
    const today = Date.now();
    const maxEnd = Math.max(maxLock, today);
    const spanDays = Math.max(dayDiff(minStart, maxEnd), 1);
    const todayDay = clamp(dayDiff(minStart, today), 0, spanDays);
    const todayPct = (todayDay / spanDays) * 100;

    const items = valid.map((r) => {
      const start = new Date(r.activeFrom).getTime();
      const lock = new Date(r.lockUntil).getTime();
      const offsetDays = Math.max(0, dayDiff(minStart, start));
      const lockDays = Math.max(0, dayDiff(start, lock));
      const leftPct = (offsetDays / spanDays) * 100;
      const widthPct = Math.max((lockDays / spanDays) * 100, 2);
      const label =
        (r.bankName?.length || 0) > 16 ? `${r.bankName.slice(0, 14)}…` : r.bankName;
      const progress = r.lockProgressPct != null ? clamp(Number(r.lockProgressPct), 0, 100) : 0;

      return { ...r, label, leftPct, widthPct, lockDays, progress };
    });

    const tickCount = 5;
    const rawTicks = Array.from({ length: tickCount }, (_, i) => {
      const day = Math.round((spanDays * i) / (tickCount - 1));
      const ts = minStart + day * 86_400_000;
      const pct = (day / spanDays) * 100;
      return { ts, pct, label: formatTimelineAxisDate(ts) };
    });

    const ticks = filterTicksNearToday(rawTicks, todayPct);

    const bodyH = items.length * ROW_H + Math.max(0, items.length - 1) * ROW_GAP;
    const totalH = HEUTE_ROW_H + bodyH + AXIS_H;

    return { items, ticks, todayPct, bodyH, totalH, minStart, maxEnd };
  }, [rows]);

  if (!chart) {
    return <ChartEmpty height={height} hint={emptyHint} />;
  }

  const { items, ticks, todayPct, bodyH, totalH } = chart;
  const trackLeft = LABEL_W + 12;

  return (
    <div
      className="select-none"
      style={{ minHeight: Math.max(height, totalH), fontFamily: CHART_FONT }}
      role="img"
      aria-label="Festbindung-Zeitachse"
    >
      <div className="relative" style={{ height: HEUTE_ROW_H + bodyH }}>
        <div
          className="pointer-events-none absolute top-0 flex items-end"
          style={{ left: trackLeft, right: 0, height: HEUTE_ROW_H }}
        >
          <div className="absolute bottom-0 top-2 w-px -translate-x-1/2 border-l border-dashed border-bank-error/60" style={{ left: `${todayPct}%` }} />
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap rounded border border-bank-error/30 bg-white px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-bank-error shadow-sm dark:bg-bank-surface"
            style={{ left: `${todayPct}%`, top: 0 }}
          >
            Heute
          </span>
        </div>

        <div className="flex flex-col" style={{ gap: ROW_GAP, paddingTop: HEUTE_ROW_H }}>
          {items.map((row, i) => {
            const isActive = activeId === row.contractId;
            const barColor = row.isLocked ? CHART_COLORS.primary : CHART_COLORS.success;
            const barBg = row.isLocked
              ? 'rgba(33, 134, 212, 0.14)'
              : 'rgba(16, 185, 129, 0.14)';

            return (
              <TimelineRow
                key={row.contractId}
                active={isActive}
                delayMs={i * 45}
                className="!py-1.5"
                onEnter={() => setActiveId(row.contractId)}
                onLeave={() => setActiveId((id) => (id === row.contractId ? null : id))}
                onFocus={() => setActiveId(row.contractId)}
                onBlur={() => setActiveId((id) => (id === row.contractId ? null : id))}
              >
                <div className="flex items-center gap-3" style={{ height: ROW_H }}>
                  <span
                    className="shrink-0 truncate text-[12px] font-medium text-bank-text"
                    style={{ width: LABEL_W }}
                  >
                    {row.label}
                  </span>
                  <TimelineTrack className="!h-3.5 !rounded-full !border-0 bg-bank-bg/90">
                    <div
                      className="absolute inset-y-0 rounded-full transition-all duration-500 ease-out motion-reduce:transition-none"
                      style={{
                        left: `${row.leftPct}%`,
                        width: `${row.widthPct}%`,
                        background: barBg,
                      }}
                    />
                    <div
                      className="absolute inset-y-0 rounded-full transition-all duration-500 ease-out motion-reduce:transition-none"
                      style={{
                        left: `${row.leftPct}%`,
                        width: `${(row.widthPct * row.progress) / 100}%`,
                        minWidth: row.progress > 0 ? 2 : 0,
                        background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                        boxShadow: isActive ? `0 0 0 1px ${barColor}44` : undefined,
                      }}
                    />
                    <TimelineEndDot
                      pct={row.leftPct + row.widthPct}
                      color={barColor}
                    />
                  </TimelineTrack>
                </div>

                {isActive && (
                  <ChartTooltipFrame className="ml-[calc(108px+0.75rem)] mt-2" label={row.bankName}>
                    <ChartTooltipRow label="Anlage" value={formatEUR(row.amount)} tone="default" />
                    {row.rate != null && (
                      <ChartTooltipRow label="Zinssatz" value={`${Number(row.rate).toFixed(2)} % p.a.`} tone="primary" />
                    )}
                    <ChartTooltipRow
                      label="Festbindung bis"
                      value={row.lockUntil ? formatDate(row.lockUntil) : '–'}
                      tone={row.isLocked ? 'primary' : 'success'}
                    />
                    {row.activeUntil && (
                      <ChartTooltipRow label="Vertrag bis" value={formatDate(row.activeUntil)} tone="muted" />
                    )}
                    <ChartTooltipRow
                      label="Status"
                      value={
                        row.isLocked
                          ? `Noch ${row.daysRemaining ?? row.lockDays} Tage (${Math.round(row.progress)} % verstrichen)`
                          : 'Frei verfügbar'
                      }
                      tone={row.isLocked ? 'primary' : 'success'}
                      divider
                    />
                  </ChartTooltipFrame>
                )}
              </TimelineRow>
            );
          })}
        </div>
      </div>

      <div
        className="relative border-t border-bank-border/50 pt-2.5"
        style={{ marginLeft: trackLeft, height: AXIS_H, fontFamily: CHART_FONT }}
      >
        {ticks.map((tick) => (
          <span
            key={tick.ts}
            className="absolute -translate-x-1/2 text-[10px] tabular-nums text-bank-text-muted"
            style={{ left: `${tick.pct}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      <ChartLegend
        className="mt-2 border-t-0"
        items={[
          { key: 'locked', label: 'Festbindung aktiv', color: CHART_COLORS.primary },
          { key: 'free', label: 'Frei verfügbar', color: CHART_COLORS.success },
        ]}
      />
    </div>
  );
};

export default LockTimelineChart;
