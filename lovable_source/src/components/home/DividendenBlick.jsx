import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { fetchHomepageStockBundle } from '@/services/stockBundleService';

/**
 * Session 81.00 — „Dividenden im Blick" · Investment Cockpit Phase 4
 *
 * Vollständiger Dividenden-Analysebereich für deutsche Anleger.
 * Datenquelle: `/api/stocks/bundle?include_dividends=true` (gemeinsamer
 * Homepage-Bundle, wiederverwendet Fundamentals- + Dividenden-Caches).
 * Keine Fake-Daten, keine Kaufempfehlungen, keine Hochrechnungen.
 * Fehlende Providerwerte → „—".
 */

const REGIONS = [
  { id: 'DE', label: 'Deutschland', symbols: [
    'SAP', 'SIE', 'ALV', 'DBK', 'IFX', 'RHM',
    'DTE', 'MUV2', 'BAS', 'MBG', 'BMW', 'VOW3',
    'EOAN', 'RWE', 'HEN3', 'BEI', 'ENR', 'DHL',
    'VNA', 'CBK', 'ADS',
  ] },
  { id: 'EU', label: 'Europa',      symbols: [] },   // aktuell keine im Universe
  { id: 'US', label: 'USA',         symbols: ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN'] },
];

const YIELD_FILTERS = [
  { id: 'any',  label: 'Alle',     min: null },
  { id: 'ge1',  label: '≥ 1 %',    min: 1 },
  { id: 'ge2',  label: '≥ 2 %',    min: 2 },
  { id: 'ge3',  label: '≥ 3 %',    min: 3 },
];

const SORTS = [
  { id: 'yield_desc', label: 'Dividendenrendite ↓' },
  { id: 'name_asc',   label: 'Unternehmen A–Z' },
  { id: 'ex_asc',     label: 'Nächstes Ex-Datum' },
];

const emDash = '—';
const fmtPct = (n, d = 2) => (n == null || !Number.isFinite(Number(n)))
  ? emDash
  : `${Number(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const fmtSignedPct = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return emDash;
  const v = Number(n);
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±';
  return `${sign}${Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
};
const fmtNum = (n, d = 2) => (n == null || !Number.isFinite(Number(n)))
  ? emDash
  : Number(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtDate = (iso) => {
  if (!iso) return emDash;
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return emDash; }
};

// Kompakte 5-Jahres-Dividenden-Sparkline (SVG, inline, keine externe Lib)
const DivSparkline = ({ history, width = 84, height = 22 }) => {
  const points = (history || []).filter((h) => (h.total || 0) > 0);
  if (points.length < 2) return <span className="inline-block w-[84px] text-right text-bank-text-muted">{emDash}</span>;
  const totals = points.map((p) => p.total);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const span = max - min || 1;
  const dx = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * dx).toFixed(1)} ${(height - ((p.total - min) / span) * height).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="inline-block">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.3" className="text-bank-primary-strong" />
    </svg>
  );
};

const DividendenBlick = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState('DE');
  const [minYieldId, setMinYieldId] = useState('any');
  const [sortId, setSortId] = useState('yield_desc');
  const [monthFilter, setMonthFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchHomepageStockBundle();
        if (alive) {
          const withDiv = (data.items || []).filter((it) => it.dividends && it.dividends.has_dividends);
          setItems(withDiv);
          setLoading(false);
        }
      } catch {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Region-Klassifikation
  const bySymbolRegion = useMemo(() => {
    const map = {};
    REGIONS.forEach((r) => r.symbols.forEach((s) => { map[s] = r.id; }));
    return map;
  }, []);

  // Tabs (nur Regionen mit ≥1 realem Dividenden-Datensatz)
  const availableTabs = useMemo(() => {
    const counts = { DE: 0, EU: 0, US: 0 };
    items.forEach((it) => {
      const reg = bySymbolRegion[it.symbol];
      if (reg && it.dividends?.dividend_yield_pct != null) counts[reg]++;
    });
    return REGIONS.filter((r) => counts[r.id] > 0);
  }, [items, bySymbolRegion]);

  const currentTab = availableTabs.find((t) => t.id === region) || availableTabs[0];

  useEffect(() => {
    if (availableTabs.length && !availableTabs.find((t) => t.id === region)) {
      setRegion(availableTabs[0].id);
    }
  }, [availableTabs, region]);

  // Monats-Filter aus tatsächlich vorhandenen Ex-Daten
  const availableMonths = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      const d = it.dividends?.next_ex_dividend_date;
      if (d && d.length >= 7) set.add(d.slice(0, 7));
    });
    return Array.from(set).sort();
  }, [items]);

  // Anzeige-Liste
  const visibleItems = useMemo(() => {
    if (!currentTab) return [];
    const minY = YIELD_FILTERS.find((f) => f.id === minYieldId)?.min ?? null;
    let list = items.filter((it) => bySymbolRegion[it.symbol] === currentTab.id);
    if (minY != null) list = list.filter((it) => Number(it.dividends?.dividend_yield_pct) >= minY);
    if (monthFilter !== 'all') {
      list = list.filter((it) => (it.dividends?.next_ex_dividend_date || '').slice(0, 7) === monthFilter);
    }
    list = [...list].sort((a, b) => {
      const A = a.dividends || {}, B = b.dividends || {};
      if (sortId === 'yield_desc') return Number(B.dividend_yield_pct || -1) - Number(A.dividend_yield_pct || -1);
      if (sortId === 'name_asc')   return String(a.company_name || a.symbol).localeCompare(String(b.company_name || b.symbol), 'de');
      if (sortId === 'ex_asc') {
        const ax = A.next_ex_dividend_date || '9999-99-99';
        const bx = B.next_ex_dividend_date || '9999-99-99';
        return ax.localeCompare(bx);
      }
      return 0;
    });
    return list;
  }, [items, currentTab, minYieldId, sortId, monthFilter, bySymbolRegion]);

  // „Kommende Dividendentermine" — chronologisch, alle Regionen
  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return items
      .filter((it) => it.dividends?.next_ex_dividend_date && it.dividends.next_ex_dividend_date >= today)
      .sort((a, b) => a.dividends.next_ex_dividend_date.localeCompare(b.dividends.next_ex_dividend_date))
      .slice(0, 6);
  }, [items]);

  if (!loading && availableTabs.length === 0) return null;

  return (
    <section
      id="home-dividenden-blick"
      aria-labelledby="home-dividenden-blick-heading"
      data-testid="home-dividenden-blick"
      className="relative border-t border-bank-border bg-bank-bg py-16 sm:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        <header className="max-w-3xl">
          <Eyebrow>Dividenden-Cockpit</Eyebrow>
          <h2
            id="home-dividenden-blick-heading"
            className="mt-4 font-display text-[1.9rem] font-light leading-[1.1] tracking-tight text-bank-text sm:text-[2.25rem]"
          >
            Dividenden im Blick
          </h2>
          <p className="mt-4 max-w-[42rem] text-[14.5px] leading-relaxed text-bank-text-muted sm:text-[15.5px]">
            Ausschüttungskennzahlen, Historie und kommende Termine — ausschließlich aus vorhandenen Providerdaten.
          </p>
          <div className="mt-4 h-px w-16 bg-bank-gold/60" aria-hidden />
        </header>

        {loading ? (
          <div className="mt-10 space-y-2">
            {[0,1,2,3].map((i) => (<div key={i} className="h-14 animate-pulse bg-neutral-100 dark:bg-bank-ink/20" />))}
          </div>
        ) : (
          <>
            {/* Region-Tabs (nur wenn > 1 Region echte Daten hat) */}
            {availableTabs.length > 1 && (
              <div
                role="tablist"
                aria-label="Regionen"
                className="mt-10 flex flex-wrap gap-2 border-b border-bank-border"
                data-testid="dividenden-tablist"
              >
                {availableTabs.map((t) => {
                  const active = currentTab?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={active}
                      aria-controls={`dividenden-panel-${t.id}`}
                      id={`dividenden-tab-${t.id}`}
                      tabIndex={active ? 0 : -1}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                          const dir = e.key === 'ArrowRight' ? 1 : -1;
                          const idx = availableTabs.findIndex((x) => x.id === currentTab.id);
                          setRegion(availableTabs[(idx + dir + availableTabs.length) % availableTabs.length].id);
                          e.preventDefault();
                        }
                      }}
                      onClick={() => setRegion(t.id)}
                      data-testid={`dividenden-tab-${t.id}`}
                      className={`min-h-[44px] border-b-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                        active ? 'border-bank-gold text-bank-text' : 'border-transparent text-bank-text-muted hover:text-bank-text'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filter + Sort */}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3" data-testid="dividenden-filters">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Rendite</span>
                <div role="group" aria-label="Rendite-Filter" className="flex gap-1">
                  {YIELD_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setMinYieldId(f.id)}
                      aria-pressed={minYieldId === f.id}
                      data-testid={`dividenden-yield-${f.id}`}
                      className={`min-h-[36px] rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors ${
                        minYieldId === f.id
                          ? 'border-bank-primary/60 bg-bank-primary/10 text-bank-primary-strong'
                          : 'border-bank-border bg-white text-bank-text-muted hover:text-bank-text dark:bg-bank-ink/20'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {availableMonths.length > 0 && (
                <label className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Ex-Monat</span>
                  <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    data-testid="dividenden-month-select"
                    className="min-h-[36px] rounded-md border border-bank-border bg-white px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text dark:bg-bank-ink/20"
                  >
                    <option value="all">Alle</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {new Date(`${m}-01`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Sortierung</span>
                <select
                  value={sortId}
                  onChange={(e) => setSortId(e.target.value)}
                  data-testid="dividenden-sort-select"
                  className="min-h-[36px] rounded-md border border-bank-border bg-white px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text dark:bg-bank-ink/20"
                >
                  {SORTS.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
                </select>
              </label>
            </div>

            {/* Tabelle / Cards */}
            <div
              role="tabpanel"
              id={`dividenden-panel-${currentTab?.id || 'DE'}`}
              aria-labelledby={`dividenden-tab-${currentTab?.id || 'DE'}`}
              className="mt-6"
              data-testid={`dividenden-panel-${currentTab?.id || 'DE'}`}
            >
              {visibleItems.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-bank-text-muted" data-testid="dividenden-empty">
                  Keine Aktien entsprechen den aktuellen Filtern.
                </p>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full border-collapse text-left text-[14px]" data-testid="dividenden-table">
                      <caption className="sr-only">Aktien mit Dividendenkennzahlen — {currentTab?.label}</caption>
                      <thead className="border-b border-bank-border text-[10.5px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
                        <tr>
                          <th scope="col" className="pb-4 pr-5 text-left font-medium">Unternehmen</th>
                          <th scope="col" className="pb-4 pr-5 text-right font-medium">Kurs</th>
                          <th scope="col" className="pb-4 pr-5 text-right font-medium">Div.-Rendite</th>
                          <th scope="col" className="pb-4 pr-5 text-right font-medium">Div./Aktie</th>
                          <th scope="col" className="pb-4 pr-5 text-right font-medium">Payout</th>
                          <th scope="col" className="pb-4 pr-5 text-right font-medium">5J-CAGR</th>
                          <th scope="col" className="pb-4 pr-5 text-right font-medium">Stab. Jahre</th>
                          <th scope="col" className="pb-4 pr-5 text-right font-medium">Nächstes Ex</th>
                          <th scope="col" className="pb-4 pr-5 text-right font-medium">5J-Verlauf</th>
                          <th scope="col" className="pb-4 font-medium" aria-label="Analyse" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bank-border/60">
                        {visibleItems.map((r, idx) => {
                          const d = r.dividends || {};
                          return (
                            <tr
                              key={r.symbol}
                              className={`group transition-colors hover:bg-bank-mint/25 ${idx % 2 === 1 ? 'bg-bank-surface-elev/40' : ''}`}
                              data-testid={`div-row-${r.symbol}`}
                            >
                              <td className="py-5 pr-5">
                                <Link to={`/aktien/${r.symbol}`} className="block">
                                  <p className="font-serif text-[16px] text-bank-text">{r.company_name || r.symbol}</p>
                                  <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">{r.symbol}</p>
                                </Link>
                              </td>
                              <td className="py-5 pr-5 text-right font-mono tabular-nums text-[14.5px] text-bank-text">
                                {fmtNum(r.previous_close)} {r.currency || ''}
                              </td>
                              <td className="py-5 pr-5 text-right font-mono tabular-nums text-[15px] text-bank-primary-strong">
                                {fmtPct(d.dividend_yield_pct)}
                              </td>
                              <td className="py-5 pr-5 text-right font-mono tabular-nums text-[14px] text-bank-text">
                                {fmtNum(d.dividend_rate_annual)} {r.currency || ''}
                              </td>
                              <td className="py-5 pr-5 text-right font-mono tabular-nums text-[14px] text-bank-text">
                                {fmtPct(d.payout_ratio_pct, 1)}
                              </td>
                              <td className="py-5 pr-5 text-right font-mono tabular-nums text-bank-text-muted">
                                {fmtSignedPct(d.cagr_5y_pct)}
                              </td>
                              <td className="py-5 pr-5 text-right font-mono tabular-nums text-bank-text-muted">
                                {d.stable_or_rising_years != null ? d.stable_or_rising_years : emDash}
                              </td>
                              <td className="py-5 pr-5 text-right font-mono tabular-nums text-bank-text-muted">
                                {fmtDate(d.next_ex_dividend_date)}
                              </td>
                              <td className="py-5 pr-5 text-right">
                                <DivSparkline history={d.history_5y} />
                              </td>
                              <td className="py-5 text-right">
                                <Link
                                  to={`/aktien/${r.symbol}`}
                                  data-testid={`div-analyse-${r.symbol}`}
                                  className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-primary-strong opacity-70 transition-opacity hover:underline group-hover:opacity-100"
                                >
                                  <ArrowRight className="h-3 w-3" strokeWidth={1.6} aria-hidden />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <ul className="divide-y divide-bank-border md:hidden" data-testid="dividenden-cards">
                    {visibleItems.map((r) => {
                      const d = r.dividends || {};
                      return (
                        <li key={r.symbol}>
                          <Link to={`/aktien/${r.symbol}`} className="block py-4" data-testid={`div-card-${r.symbol}`}>
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="font-serif text-[15px] text-bank-text">{r.company_name || r.symbol}</p>
                              <p className="font-mono tabular-nums text-[13.5px] text-bank-primary-strong">{fmtPct(d.dividend_yield_pct)}</p>
                            </div>
                            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">{r.symbol}</p>
                            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                              <div className="flex justify-between"><dt className="text-bank-text-muted">Div./Aktie</dt><dd className="tabular-nums">{fmtNum(d.dividend_rate_annual)} {r.currency || ''}</dd></div>
                              <div className="flex justify-between"><dt className="text-bank-text-muted">Payout</dt><dd className="tabular-nums">{fmtPct(d.payout_ratio_pct, 1)}</dd></div>
                              <div className="flex justify-between"><dt className="text-bank-text-muted">5J-CAGR</dt><dd className="tabular-nums">{fmtSignedPct(d.cagr_5y_pct)}</dd></div>
                              <div className="flex justify-between"><dt className="text-bank-text-muted">Nächstes Ex</dt><dd className="tabular-nums">{fmtDate(d.next_ex_dividend_date)}</dd></div>
                            </dl>
                            <div className="mt-3 flex items-center justify-between">
                              <DivSparkline history={d.history_5y} width={120} height={24} />
                              <span className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-primary-strong">
                                Analyse öffnen <ArrowRight className="h-3 w-3" strokeWidth={1.6} aria-hidden />
                              </span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            {/* Kommende Dividendentermine — Card-Grid statt Textliste */}
            {upcoming.length > 0 && (
              <div className="mt-14" data-testid="dividenden-upcoming">
                <div className="flex items-center gap-2 border-b border-bank-border pb-3">
                  <CalendarDays className="h-4 w-4 text-bank-gold" strokeWidth={1.6} aria-hidden />
                  <h3 className="font-serif text-[18px] leading-tight text-bank-text">
                    Kommende Dividendentermine
                  </h3>
                </div>
                <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-bank-text-muted">
                  Chronologisch nach nächstem Ex-Dividenden-Datum, aus dem vorhandenen Datenbestand.
                </p>
                <ul
                  className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  aria-label="Liste kommender Ex-Dividenden-Termine"
                >
                  {upcoming.map((r) => {
                    const d = r.dividends || {};
                    return (
                      <li key={r.symbol}>
                        <Link
                          to={`/aktien/${r.symbol}`}
                          data-testid={`div-upcoming-${r.symbol}`}
                          className="group flex h-full flex-col border border-bank-border bg-white p-4 transition-colors hover:border-bank-gold/50 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="font-serif text-[15px] leading-tight text-bank-text group-hover:text-bank-primary">
                              {r.company_name || r.symbol}
                            </p>
                            <p className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                              {r.symbol}
                            </p>
                          </div>
                          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                            <div>
                              <dt className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bank-text-muted">Ex-Dividende</dt>
                              <dd className="mt-0.5 font-mono tabular-nums text-[13.5px] text-bank-text">
                                {fmtDate(d.next_ex_dividend_date)}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bank-text-muted">Zahlung</dt>
                              <dd className="mt-0.5 font-mono tabular-nums text-[13.5px] text-bank-text">
                                {fmtDate(d.next_payment_date)}
                              </dd>
                            </div>
                            <div className="col-span-2">
                              <dt className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bank-text-muted">Dividende je Aktie</dt>
                              <dd className="mt-0.5 font-mono tabular-nums text-[13.5px] text-bank-primary-strong">
                                {d.dividend_rate_annual != null
                                  ? `${fmtNum(d.dividend_rate_annual)} ${r.currency || ''}`
                                  : emDash}
                              </dd>
                            </div>
                          </dl>
                          <span className="mt-4 inline-flex items-center gap-1 self-start font-mono text-[10px] uppercase tracking-[0.2em] text-bank-primary-strong opacity-70 transition-opacity group-hover:opacity-100">
                            Analyse öffnen <ArrowRight className="h-3 w-3" strokeWidth={1.6} aria-hidden />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted" data-testid="dividenden-provenance">
                Datenstand yfinance-Cache · Kurse und Termine können zeitverzögert sein
              </p>
              <Link
                to="/aktien/dividendenkalender"
                data-testid="dividenden-kalender-cta"
                className="inline-flex min-h-[44px] items-center gap-2 border-b border-bank-primary/60 pb-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary-strong transition-colors hover:border-bank-primary hover:text-bank-primary-hover focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bank-gold"
              >
                Zum Dividendenkalender <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default DividendenBlick;
