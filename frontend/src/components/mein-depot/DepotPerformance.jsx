import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR } from '@/lib/dashboardFormatters';
import { CHART_COLORS } from '@/components/dashboard/charts/chartTheme';
import { cn } from '@/lib/utils';

/**
 * DepotPerformance — Vermögensentwicklung auf /mein-depot (Schritt 2/7).
 *
 * Datenquelle: `heroSnapshots` aus DashboardDataContext (Mongo-Collection
 * `portfolio_snapshots`, Endpoint `/api/portfolio/snapshots?days=400`).
 *
 * Zeitraum-Tabs erscheinen NUR, wenn tatsächlich genug Snapshot-Punkte im
 * jeweiligen Zeitfenster liegen (>=2 Datenpunkte im Range). Kein Tab, das nur
 * denselben Datensatz anzeigt.
 *
 * Empty-State: <2 Snapshots → Text-Empty (kein Fake-Chart, keine Fake-Linie).
 */

// Session 82.25 — Zeitraum-Achse: 7T / 30T / 90T / 1J / MAX (Mongo-Snapshot-Feed).
const RANGES = [
  { key: '7T', days: 7 },
  { key: '30T', days: 30 },
  { key: '90T', days: 90 },
  { key: '1J', days: 365 },
  { key: 'MAX', days: Infinity },
];

const filterByRange = (snapshots, days) => {
  if (!Array.isArray(snapshots) || snapshots.length === 0) return [];
  if (!Number.isFinite(days)) return snapshots;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const iso = cutoff.toISOString().slice(0, 10);
  return snapshots.filter((s) => (s?.snapshot_date || '') >= iso);
};

const TooltipContent = ({ active, payload, label, metric }) => {
  if (!active || !payload?.length) return null;
  const val = Number(payload[0]?.value || 0);
  // Session 82.55 — Metrik-abhängige Tooltip-Formatierung. `metric` steuert
  // ausschließlich das Label; der Wert kommt exakt aus dem Recharts-Payload,
  // also dem persistierten Snapshot (keine Front-End-Neu-Berechnung).
  const isPl = metric === 'pl';
  const pct = isPl ? payload[0]?.payload?.pl_pct : null;
  return (
    <div className="rounded-sm border border-bank-border bg-white px-3 py-2 shadow-sm" data-testid="mein-depot-performance-tooltip">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-bank-text-muted">
        {isPl ? 'Gesamt G/V' : 'Depotwert'}
      </p>
      <p className={cn('mt-1 text-[13px] font-semibold tabular-nums', isPl ? (val >= 0 ? 'text-emerald-700' : 'text-rose-700') : 'text-bank-text')}>
        {formatEUR(val)}
        {isPl && pct != null && Number.isFinite(Number(pct)) && (
          <span className="ml-2 font-mono text-[10.5px] tabular-nums text-bank-text-muted">
            {Number(pct) >= 0 ? '+' : ''}{Number(pct).toFixed(2).replace('.', ',')} %
          </span>
        )}
      </p>
    </div>
  );
};

const DepotPerformance = () => {
  const { heroSnapshots, gesamtvermoegen, loading } = useDashboardData();

  // Session 82.55 — beide Serien aus echten Snapshots. `total` = total_value,
  // `pl` = profit_loss, `pl_pct` = profit_loss_pct. Kein Frontend-Recalc.
  // Incomplete-Flag pro Punkt persistiert, damit incomplete-Gate im aktiven
  // Fenster ausgewertet werden kann.
  const seriesRaw = useMemo(() => {
    const base = (heroSnapshots || [])
      .map((s) => ({
        date: s?.snapshot_date,
        total: Number(s?.total_value || 0),
        pl: Number.isFinite(Number(s?.profit_loss)) ? Number(s.profit_loss) : null,
        pl_pct: Number.isFinite(Number(s?.profit_loss_pct)) ? Number(s.profit_loss_pct) : null,
        incomplete: s?.stocks_valuation_complete === false || s?.bonds_valuation_complete === false,
      }))
      .filter((p) => p.date && Number.isFinite(p.total));
    if (base.length === 0) return [];
    const today = new Date().toISOString().slice(0, 10);
    const last = base[base.length - 1];
    // "Heute"-Punkt: nur `total` wird an gesamtvermoegen angeglichen; für `pl`
    // gibt es keine Live-Neuberechnung → letzter persistierter Snapshot-Wert
    // bleibt maßgeblich (kein Frontend-Recalc).
    if (last.date !== today) {
      base.push({ ...last, date: today, total: Number(gesamtvermoegen) || last.total });
    } else {
      base[base.length - 1] = { ...last, date: today, total: Number(gesamtvermoegen) || last.total };
    }
    return base;
  }, [heroSnapshots, gesamtvermoegen]);

  // Nur Ranges anzeigen, für die tatsächlich Daten existieren (>= 2 Punkte).
  const availableRanges = useMemo(() => {
    if (seriesRaw.length < 2) return [];
    return RANGES.filter((r) => filterByRange(seriesRaw, r.days).length >= 2);
  }, [seriesRaw]);

  const [range, setRange] = useState(null);
  const activeRange = range && availableRanges.find((r) => r.key === range)
    ? range
    : availableRanges[availableRanges.length - 1]?.key || null;

  const activeDays = RANGES.find((r) => r.key === activeRange)?.days;
  const series = useMemo(
    () => (activeDays == null ? seriesRaw : filterByRange(seriesRaw, activeDays)),
    [seriesRaw, activeDays],
  );

  const first = series[0];
  const last = series[series.length - 1];
  const deltaAbs = first && last ? last.total - first.total : 0;
  const deltaPct = first && first.total > 0 ? (deltaAbs / first.total) * 100 : 0;
  const up = deltaAbs >= 0;

  // Session 82.55 — Metrik-Toggle: 'total' (Vermögen) oder 'pl' (Gesamt G/V).
  const [metric, setMetric] = useState('total');
  // Incomplete-Gate: sobald irgendein Snapshot im aktiven Fenster incomplete
  // ist, verbieten wir die P&L-Kurve komplett (keine scheinpräzise Kurve).
  const windowIncomplete = useMemo(() => series.some((p) => p.incomplete === true), [series]);
  // Prüfen ob überhaupt ein Snapshot im Fenster ein persistiertes profit_loss
  // hat — sonst Toggle deaktivieren.
  const hasPl = useMemo(() => series.some((p) => Number.isFinite(p.pl)), [series]);
  const showPl = metric === 'pl' && hasPl && !windowIncomplete;
  const plFirst = series.find((p) => Number.isFinite(p.pl))?.pl ?? 0;
  const plLast = [...series].reverse().find((p) => Number.isFinite(p.pl))?.pl ?? 0;
  const plUp = (plLast - plFirst) >= 0;
  const activeUp = showPl ? plUp : up;
  const activeColor = showPl
    ? (plUp ? CHART_COLORS.gold : '#B0444C')
    : (up ? CHART_COLORS.gold : '#B0444C');

  const formatDateShort = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    } catch {
      return d;
    }
  };

  return (
    <section
      aria-labelledby="mein-depot-performance-title"
      data-testid="mein-depot-performance"
      className="mb-12"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">
            Vermögensentwicklung
          </p>
          <h2
            id="mein-depot-performance-title"
            className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
          >
            {series.length >= 2 ? 'Ihr Depot im Zeitverlauf' : 'Ihr Depot im Zeitverlauf'}
          </h2>
        </div>
        {availableRanges.length > 1 && (
          <div
            role="tablist"
            aria-label="Zeitraum"
            data-testid="mein-depot-performance-tabs"
            className="inline-flex flex-wrap gap-1 rounded-sm border border-bank-border bg-white p-1"
          >
            {availableRanges.map((r) => {
              const active = r.key === activeRange;
              return (
                <button
                  key={r.key}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  data-testid={`mein-depot-range-${r.key}`}
                  onClick={() => setRange(r.key)}
                  className={cn(
                    'min-h-[36px] rounded-sm px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold',
                    active
                      ? 'bg-bank-text text-white'
                      : 'text-bank-text-muted hover:bg-bank-bg hover:text-bank-text',
                  )}
                >
                  {r.key}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div
          data-testid="mein-depot-performance-skeleton"
          className="h-[260px] animate-pulse rounded-sm bg-bank-border/25"
        />
      ) : series.length < 2 ? (
        <div
          data-testid="mein-depot-performance-empty"
          className="rounded-sm border border-dashed border-bank-border px-6 py-10 text-center"
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">
            Noch keine Historie
          </p>
          <p className="mt-3 text-[14px] font-medium text-bank-text">
            Noch keine Vermögensentwicklung verfügbar
          </p>
          <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-bank-text-muted">
            Sobald historische Depotwerte vorliegen, wird Ihre Entwicklung hier dargestellt.
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <p
                className={cn(
                  'inline-flex items-center gap-1 font-mono text-[11px] tabular-nums',
                  showPl ? (plUp ? 'text-emerald-700' : 'text-rose-700') : (up ? 'text-emerald-700' : 'text-rose-700'),
                )}
                data-testid="mein-depot-performance-delta"
              >
                <span aria-hidden>{showPl ? (plUp ? '+' : '') : (up ? '+' : '')}</span>
                <span className="sr-only">{(showPl ? plUp : up) ? 'Zugewinn ' : 'Rückgang '}</span>
                {formatEUR(showPl ? (plLast - plFirst) : deltaAbs)}
                {!showPl && ` · ${up ? '+' : ''}${deltaPct.toFixed(2).replace('.', ',')} %`}
              </p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">
                {activeRange}
              </p>
            </div>
            {/* Session 82.55 — Vermögen / G-V Toggle */}
            <div
              role="tablist"
              aria-label="Metrik"
              data-testid="mein-depot-performance-metric"
              className="inline-flex gap-1 rounded-sm border border-bank-border bg-white p-1"
            >
              {[
                { key: 'total', label: 'Vermögen' },
                { key: 'pl', label: 'Gesamt G/V' },
              ].map((m) => {
                const active = metric === m.key;
                const disabled = m.key === 'pl' && !hasPl;
                return (
                  <button
                    key={m.key}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    aria-disabled={disabled}
                    disabled={disabled}
                    data-testid={`mein-depot-metric-${m.key}`}
                    onClick={() => !disabled && setMetric(m.key)}
                    className={cn(
                      'min-h-[32px] rounded-sm px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold',
                      active ? 'bg-bank-text text-white' : disabled ? 'cursor-not-allowed text-bank-text-muted/40' : 'text-bank-text-muted hover:bg-bank-bg hover:text-bank-text',
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          {metric === 'pl' && windowIncomplete ? (
            <div
              data-testid="mein-depot-performance-pl-incomplete"
              className="flex h-[260px] items-center justify-center rounded-sm border border-dashed border-bank-border"
            >
              <div className="text-center">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Bewertung unvollständig</p>
                <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-bank-text-muted">
                  In diesem Zeitraum fehlen Marktbewertungen. Die Gesamt-G/V-Kurve wird deshalb nicht angezeigt.
                </p>
              </div>
            </div>
          ) : (
          <div className="h-[260px] w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 10, bottom: 6, left: 0 }}>
                <defs>
                  <linearGradient id="depotPerfGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activeColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={activeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--bank-border)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--bank-text-muted)' }}
                  tickFormatter={formatDateShort}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--bank-border)' }}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--bank-text-muted)' }}
                  tickFormatter={(v) =>
                    Number(v).toLocaleString('de-DE', { maximumFractionDigits: 0 })
                  }
                  tickLine={false}
                  axisLine={false}
                  width={68}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<TooltipContent metric={showPl ? 'pl' : 'total'} />} />
                <Area
                  type="monotone"
                  dataKey={showPl ? 'pl' : 'total'}
                  stroke={activeColor}
                  strokeWidth={1.6}
                  fill="url(#depotPerfGradient)"
                  dot={false}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>
      )}
    </section>
  );
};

export default DepotPerformance;
