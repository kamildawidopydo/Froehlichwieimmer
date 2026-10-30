import React, { useMemo, useState } from 'react';
import { PieChart, Search } from 'lucide-react';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR, formatEURSigned, pnlTone } from '@/lib/dashboardFormatters';
import { buildDepotRows, filterSortRows, DEPOT_FILTERS } from '@/lib/depotRows';
import useDepotSparklines from '@/hooks/useDepotSparklines';
import { DepotRow, DepotCard } from '@/components/mein-depot/DepotPositionRow';
import DepotAnalyseDialog from '@/components/mein-depot/DepotAnalyseDialog';

const pctTxt = (v) =>
  v == null ? '–' : `${Math.round(v * 100) > 0 ? '+' : ''}${Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

const COLUMNS = [
  ['name', 'Wertpapier', 'text-left'], [null, 'Stück', 'text-right'], [null, 'Einstand (EUR)', 'text-right'],
  [null, 'Kurs (EUR)', 'text-right'], ['value', 'Wert (EUR)', 'text-right'], ['gv', 'G/V €', 'text-right'],
  ['dayAbs', 'Heute', 'text-right'], ['weight', 'Anteil', 'text-right'], [null, 'Entwicklung 30T', 'text-left'], [null, '', 'text-right'],
];
const SORTS = [['value', 'Depotwert'], ['name', 'Name'], ['gv', 'G/V €'], ['pct', 'G/V %'], ['dayAbs', 'Tagesveränderung'], ['weight', 'Gewichtung']];

const Kpi = ({ label, value, sub, tone, testid }) => (
  <div className="rounded-lg border border-bank-border bg-white p-4" data-testid={testid}>
    <p className="text-[11px] uppercase tracking-wide text-bank-text-muted">{label}</p>
    <p className={`mt-1 text-[18px] font-semibold tabular-nums ${tone || 'text-bank-text'}`}>{value}</p>
    {sub && <p className={`text-[12px] tabular-nums ${tone || 'text-bank-text-muted'}`}>{sub}</p>}
  </div>
);

const DepotKpis = ({ rows, updatedAt }) => {
  const k = useMemo(() => {
    const value = rows.reduce((s, r) => s + r.value, 0);
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    const gv = rows.reduce((s, r) => s + (r.gv ?? 0), 0);
    const day = rows.reduce((s, r) => s + (r.dayAbs ?? 0), 0);
    const dayBase = value - day;
    return { value, cost, gv, gvPct: cost > 0 ? (gv / cost) * 100 : null, day, dayPct: dayBase > 0 ? (day / dayBase) * 100 : null };
  }, [rows]);
  const hasIpo = rows.some((r) => r.kind === 'ipo');
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6" data-testid="depot-pro-kpis">
      <Kpi label="Gesamtdepotwert" value={formatEUR(k.value)} testid="depot-kpi-value" />
      <Kpi label="Gewinn / Verlust" value={formatEURSigned(k.gv)} sub={`${pctTxt(k.gvPct)}${hasIpo ? ' · inkl. IPO-Schätzung' : ''}`} tone={pnlTone(k.gv)} testid="depot-kpi-gv" />
      <Kpi label="Tagesentwicklung" value={formatEURSigned(k.day)} sub={`${pctTxt(k.dayPct)} · nur Börsenkurse`} tone={pnlTone(k.day)} testid="depot-kpi-day" />
      <Kpi label="Investiertes Kapital" value={formatEUR(k.cost)} testid="depot-kpi-cost" />
      <Kpi label="Positionen" value={String(rows.length)} testid="depot-kpi-count" />
      <Kpi
        label="Letzte Kursaktualisierung"
        value={updatedAt ? new Date(updatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '–'}
        sub={updatedAt ? new Date(updatedAt).toLocaleDateString('de-DE') : 'Keine Kursdaten'}
        testid="depot-kpi-updated"
      />
    </div>
  );
};

const DepotProSection = () => {
  const { stockMetrics, stockPriceMap, stockPricesUpdatedAt, bondPositions, computeBondMetrics, festgeldTotal, tagesgeldTotal, flexgeldTotal } = useDashboardData();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'value', dir: 'desc' });
  const [analyseOpen, setAnalyseOpen] = useState(false);

  const rows = useMemo(
    () => buildDepotRows({ stockMetrics, stockPriceMap, bondPositions, computeBondMetrics }),
    [stockMetrics, stockPriceMap, bondPositions, computeBondMetrics],
  );
  const visible = useMemo(() => filterSortRows(rows, { filter, query, sortKey: sort.key, sortDir: sort.dir }), [rows, filter, query, sort]);
  const sparks = useDepotSparklines(rows.filter((r) => r.kind !== 'bond' && !r.ipoUnlisted).map((r) => r.symbol));
  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  return (
    <section className="mt-8" data-testid="depot-pro-section">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[1.05rem] font-semibold text-bank-text">Depotübersicht</h2>
        <button type="button" onClick={() => setAnalyseOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-bank-border bg-white px-3 text-[13px] font-medium hover:bg-bank-bg" data-testid="depot-analyse-btn">
          <PieChart size={15} /> Depotanalyse
        </button>
      </div>
      <DepotKpis rows={rows} updatedAt={stockPricesUpdatedAt} />
      <div className="mt-4 rounded-lg border border-bank-border bg-white">
        <div className="flex flex-col gap-2 border-b border-bank-border p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5" data-testid="depot-filters">
            {DEPOT_FILTERS.map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} data-testid={`depot-filter-${k}`}
                className={`rounded-full px-3 py-1 text-[12px] ${filter === k ? 'bg-bank-ink text-white' : 'bg-bank-bg text-bank-text-muted hover:text-bank-text'}`}>{l}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="relative flex-1 md:w-56">
              <Search size={14} className="absolute left-2.5 top-2.5 text-bank-text-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name oder Symbol" data-testid="depot-search"
                className="h-9 w-full rounded-md border border-bank-border pl-8 pr-2 text-[13px]" />
            </label>
            <select value={`${sort.key}:${sort.dir}`} onChange={(e) => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir }); }}
              className="h-9 rounded-md border border-bank-border px-2 text-[12px] lg:hidden" data-testid="depot-sort-select">
              {SORTS.flatMap(([k, l]) => [<option key={`${k}d`} value={`${k}:desc`}>{l} ↓</option>, <option key={`${k}a`} value={`${k}:asc`}>{l} ↑</option>])}
            </select>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-bank-text-muted" data-testid="depot-empty">Sie haben derzeit keine Wertpapierpositionen.</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-bank-text-muted" data-testid="depot-no-match">Keine Positionen für diese Auswahl.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-[13px]" data-testid="depot-pro-table">
                <thead className="bg-bank-bg/60 text-[11px] uppercase tracking-wide text-bank-text-muted">
                  <tr>
                    {COLUMNS.map(([k, l, align], i) => (
                      <th key={l || i} className={`px-3 py-2 font-medium ${align}`}>
                        {k ? (
                          <button type="button" onClick={() => toggleSort(k)} data-testid={`depot-sort-${k}`} className="uppercase hover:text-bank-text">
                            {l}{sort.key === k ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                          </button>
                        ) : l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{visible.map((r) => <DepotRow key={r.key} row={r} spark={sparks[r.symbol]} />)}</tbody>
              </table>
            </div>
            <ul className="lg:hidden">{visible.map((r) => <DepotCard key={r.key} row={r} spark={sparks[r.symbol]} />)}</ul>
          </>
        )}
      </div>
      <DepotAnalyseDialog open={analyseOpen} onOpenChange={setAnalyseOpen} rows={rows}
        totals={{ festgeld: festgeldTotal, tagesgeld: tagesgeldTotal, flexgeld: flexgeldTotal }} />
    </section>
  );
};

export default DepotProSection;
