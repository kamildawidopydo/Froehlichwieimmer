import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Search } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import { fetchHomepageStockBundle } from '@/services/stockBundleService';

/**
 * Session 81.02 — Dividendenkalender (öffentliche Route).
 *
 * Wiederverwendet den Homepage-Bundle-Endpoint `/api/stocks/bundle` mit
 * `include_dividends=true`. Kein neuer Provider, kein N+1, ein einziger
 * Request auf Modul-Ebene (Promise-Cache in `stockBundleService`).
 *
 * Datenbasis (verifiziert):
 *  - Verfügbar: dividend_yield_pct, dividend_rate_annual,
 *    next_ex_dividend_date, history_5y (0–6 Punkte)
 *  - Nicht verfügbar (Provider): next_payment_date, frequency
 *    → werden konsequent als „—" gerendert, nie geschätzt.
 *
 * Kein Ranking, keine Empfehlung, keine „beste Rendite"-Marker.
 */

const REGIONS = {
  DE: { label: 'Deutschland', currency: 'EUR', symbols: [
    'SAP', 'SIE', 'ALV', 'DBK', 'IFX', 'RHM',
    'DTE', 'MUV2', 'BAS', 'MBG', 'BMW', 'VOW3',
    'EOAN', 'RWE', 'HEN3', 'BEI', 'ENR', 'DHL',
    'VNA', 'CBK', 'ADS',
  ] },
  EU: { label: 'Europa',      currency: null,  symbols: [] },
  US: { label: 'USA',         currency: 'USD', symbols: ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN'] },
};

const RANGES = [
  { id: '7d',  label: 'Diese Woche',       days: 7 },
  { id: '30d', label: 'Nächste 30 Tage',   days: 30 },
  { id: '90d', label: '3 Monate',          days: 90 },
  { id: 'all', label: 'Alle verfügbaren',  days: null },
];

const YIELD_FILTERS = [
  { id: 'any', label: 'Alle',  min: null },
  { id: 'ge1', label: '≥ 1 %', min: 1 },
  { id: 'ge2', label: '≥ 2 %', min: 2 },
  { id: 'ge3', label: '≥ 3 %', min: 3 },
];

const SORTS = [
  { id: 'ex_asc',     label: 'Ex-Datum (aufsteigend)' },
  { id: 'yield_desc', label: 'Dividendenrendite ↓' },
  { id: 'name_asc',   label: 'Unternehmen A–Z' },
];

const emDash = '—';
const fmtNum = (n, d = 2) => (n == null || !Number.isFinite(Number(n)))
  ? emDash
  : Number(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n, d = 2) => (n == null || !Number.isFinite(Number(n)))
  ? emDash
  : `${Number(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
const fmtDate = (iso) => {
  if (!iso) return emDash;
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return emDash; }
};
const fmtLongDate = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return null; }
};

/** 5J-Sparkline (SVG, keine Lib) — nur wenn ≥2 echte Punkte vorhanden. */
const DivSparkline = ({ history, width = 84, height = 22 }) => {
  const points = (history || []).filter((h) => (h?.total || 0) > 0);
  if (points.length < 2) return <span className="text-bank-text-muted">{emDash}</span>;
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

const regionOf = (symbol) => {
  if (REGIONS.DE.symbols.includes(symbol)) return 'DE';
  if (REGIONS.US.symbols.includes(symbol)) return 'US';
  if (REGIONS.EU.symbols.includes(symbol)) return 'EU';
  return null;
};

/** Chronologische Gruppierung nach echten Termin-Buckets. */
const groupByBucket = (rows) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const inDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
  const buckets = { today: [], week: [], month: [], next: [], later: [] };
  const endOfWeek = inDays(7);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  rows.forEach((r) => {
    const iso = r.dividends?.next_ex_dividend_date;
    if (!iso) return;
    const d = new Date(iso); d.setHours(0, 0, 0, 0);
    if (d < today) return;
    if (d.getTime() === today.getTime()) buckets.today.push(r);
    else if (d < endOfWeek) buckets.week.push(r);
    else if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) buckets.month.push(r);
    else if ((d.getFullYear() === currentYear && d.getMonth() === currentMonth + 1)
          || (d.getFullYear() === currentYear + 1 && currentMonth === 11 && d.getMonth() === 0)) buckets.next.push(r);
    else buckets.later.push(r);
  });
  return buckets;
};

const BUCKET_LABELS = {
  today: 'Heute',
  week: 'Diese Woche',
  month: 'Später im Monat',
  next: 'Nächster Monat',
  later: 'Später',
};

const DividendenkalenderPage = () => {
  const [state, setState] = useState({ loading: true, items: [], error: false });
  const [region, setRegion] = useState('DE');
  const [range, setRange] = useState('30d');
  const [minYieldId, setMinYieldId] = useState('any');
  const [monthFilter, setMonthFilter] = useState('all');
  const [sortId, setSortId] = useState('ex_asc');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    fetchHomepageStockBundle()
      .then((d) => { if (alive) setState({ loading: false, items: d.items || [], error: false }); })
      .catch(() => { if (alive) setState({ loading: false, items: [], error: true }); });
    return () => { alive = false; };
  }, []);

  const withDivs = useMemo(
    () => state.items.filter((it) => it?.dividends?.has_dividends && it.dividends?.next_ex_dividend_date),
    [state.items],
  );

  /** Nur Region-Tabs anbieten, die tatsächlich zukünftige Termine haben. */
  const availableTabs = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const counts = { DE: 0, EU: 0, US: 0 };
    withDivs.forEach((it) => {
      const iso = it.dividends?.next_ex_dividend_date;
      if (!iso) return;
      const d = new Date(iso); d.setHours(0, 0, 0, 0);
      if (d < today) return;
      const r = regionOf(it.symbol);
      if (r) counts[r]++;
    });
    return Object.entries(REGIONS)
      .filter(([id]) => counts[id] > 0)
      .map(([id, meta]) => ({ id, label: meta.label, count: counts[id] }));
  }, [withDivs]);

  useEffect(() => {
    if (availableTabs.length && !availableTabs.find((t) => t.id === region)) {
      setRegion(availableTabs[0].id);
    }
  }, [availableTabs, region]);

  /** Nur Zeiträume anbieten, die mit vorhandenen Daten sinnvoll sind. */
  const availableRanges = useMemo(() => {
    if (!withDivs.length) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return RANGES.filter((r) => {
      if (r.days == null) return true;
      const end = new Date(today); end.setDate(end.getDate() + r.days);
      return withDivs.some((it) => {
        const iso = it.dividends?.next_ex_dividend_date;
        if (!iso) return false;
        const d = new Date(iso); d.setHours(0, 0, 0, 0);
        return d >= today && d <= end;
      });
    });
  }, [withDivs]);

  useEffect(() => {
    if (availableRanges.length && !availableRanges.find((r) => r.id === range)) {
      setRange(availableRanges[0].id);
    }
  }, [availableRanges, range]);

  const availableMonths = useMemo(() => {
    const set = new Set();
    withDivs.forEach((it) => {
      const d = it.dividends?.next_ex_dividend_date;
      if (d && d.length >= 7) set.add(d.slice(0, 7));
    });
    return Array.from(set).sort();
  }, [withDivs]);

  /** Endgültige Anzeigeliste — client-side gefiltert und sortiert. */
  const rows = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const rangeDef = RANGES.find((r) => r.id === range) || RANGES[3];
    const rangeEnd = rangeDef.days != null ? new Date(today) : null;
    if (rangeEnd) rangeEnd.setDate(rangeEnd.getDate() + rangeDef.days);
    const minY = YIELD_FILTERS.find((f) => f.id === minYieldId)?.min ?? null;
    const q = query.trim().toLowerCase();

    let out = withDivs.filter((it) => regionOf(it.symbol) === region);
    out = out.filter((it) => {
      const iso = it.dividends?.next_ex_dividend_date;
      if (!iso) return false;
      const d = new Date(iso); d.setHours(0, 0, 0, 0);
      if (d < today) return false;
      if (rangeEnd && d > rangeEnd) return false;
      return true;
    });
    if (minY != null) out = out.filter((it) => Number(it.dividends?.dividend_yield_pct) >= minY);
    if (monthFilter !== 'all') {
      out = out.filter((it) => (it.dividends?.next_ex_dividend_date || '').slice(0, 7) === monthFilter);
    }
    if (q) {
      out = out.filter((it) =>
        (it.company_name || '').toLowerCase().includes(q) || (it.symbol || '').toLowerCase().includes(q));
    }
    out = [...out].sort((a, b) => {
      const A = a.dividends || {}, B = b.dividends || {};
      if (sortId === 'yield_desc') return Number(B.dividend_yield_pct || -1) - Number(A.dividend_yield_pct || -1);
      if (sortId === 'name_asc')   return String(a.company_name || a.symbol).localeCompare(String(b.company_name || b.symbol), 'de');
      // ex_asc default
      return String(A.next_ex_dividend_date || '9999').localeCompare(String(B.next_ex_dividend_date || '9999'));
    });
    return out;
  }, [withDivs, region, range, minYieldId, monthFilter, sortId, query]);

  const buckets = useMemo(() => groupByBucket(rows), [rows]);

  /** KPI-Karten aus geladenen Daten (0 neue Requests). */
  const kpis = useMemo(() => {
    if (!withDivs.length) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
    const upcoming30 = withDivs.filter((it) => {
      const d = new Date(it.dividends.next_ex_dividend_date); d.setHours(0, 0, 0, 0);
      return d >= today && d <= in30;
    });
    const firms = new Set(withDivs.map((it) => it.symbol));
    const nextEx = withDivs
      .map((it) => it.dividends.next_ex_dividend_date)
      .filter(Boolean)
      .sort()[0];
    return {
      count30: upcoming30.length,
      firms: firms.size,
      nextEx,
    };
  }, [withDivs]);

  const CountryChip = ({ symbol }) => {
    const r = regionOf(symbol);
    if (!r) return null;
    return (
      <span className="inline-flex items-center border border-bank-border bg-white px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-bank-text-muted dark:bg-bank-ink/20">
        {r === 'DE' ? 'DE' : r === 'US' ? 'USA' : 'EU'}
      </span>
    );
  };

  const activeBuckets = Object.entries(buckets).filter(([, list]) => list.length > 0);

  return (
    <div className="bg-white" data-testid="dividendenkalender-page">
      <PageMeta
        title="Dividendenkalender"
        description="Ex-Dividenden-Termine, Ausschüttungen und Dividendenkennzahlen ausgewählter Unternehmen auf EssenceInvest."
        path="/aktien/dividendenkalender"
      />

      {/* Hero */}
      <section className="border-b border-bank-border bg-gradient-to-b from-bank-cream/40 to-white">
        <div className="mx-auto max-w-[1200px] px-5 pb-12 pt-14 sm:px-8 sm:pt-16 lg:px-12">
          <Eyebrow>Dividenden</Eyebrow>
          <h1 className="mt-3 font-display text-[2rem] font-light leading-[1.1] tracking-tight text-bank-text sm:text-[2.5rem]">
            Dividendenkalender
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted sm:text-[16px]">
            Ex-Dividenden-Termine, Ausschüttungen und Dividendenkennzahlen ausgewählter Unternehmen im Überblick.
          </p>
          <div className="mt-5 h-px w-16 bg-bank-gold/60" aria-hidden />
          <p className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted" data-testid="dk-provenance">
            Datenstand yfinance-Cache · Kurse und Termine können zeitverzögert sein
          </p>
        </div>
      </section>

      {/* KPI-Cards — neutrale Fakten aus geladenen Daten */}
      {kpis && (
        <section className="border-b border-bank-border bg-bank-surface-elev/40 py-8">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-5 sm:grid-cols-3 sm:px-8 lg:px-12" data-testid="dk-kpis">
            <div className="border border-bank-border bg-white p-5" data-testid="dk-kpi-30d">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Termine nächste 30 Tage</p>
              <p className="mt-3 font-mono tabular-nums text-[26px] leading-none text-bank-text">{kpis.count30}</p>
            </div>
            <div className="border border-bank-border bg-white p-5" data-testid="dk-kpi-firms">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Unternehmen mit Termin</p>
              <p className="mt-3 font-mono tabular-nums text-[26px] leading-none text-bank-text">{kpis.firms}</p>
            </div>
            <div className="border border-bank-border bg-white p-5" data-testid="dk-kpi-next">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Nächster Ex-Dividenden-Tag</p>
              <p className="mt-3 font-serif text-[20px] leading-tight text-bank-text">{fmtLongDate(kpis.nextEx) || emDash}</p>
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          {state.loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse bg-neutral-100" />)}
            </div>
          ) : state.error || !withDivs.length ? (
            <p className="py-10 text-center text-[13px] text-bank-text-muted" data-testid="dk-empty">
              Aktuell sind keine Dividendendaten verfügbar.
            </p>
          ) : (
            <>
              {/* Region-Tabs */}
              {availableTabs.length > 1 && (
                <div role="tablist" aria-label="Regionen" className="flex flex-wrap gap-2 border-b border-bank-border" data-testid="dk-tablist">
                  {availableTabs.map((t) => {
                    const active = region === t.id;
                    return (
                      <button
                        key={t.id}
                        role="tab"
                        aria-selected={active}
                        tabIndex={active ? 0 : -1}
                        onClick={() => setRegion(t.id)}
                        data-testid={`dk-tab-${t.id}`}
                        className={`min-h-[44px] border-b-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                          active ? 'border-bank-gold text-bank-text' : 'border-transparent text-bank-text-muted hover:text-bank-text'
                        }`}
                      >
                        {t.label} <span className="ml-1 text-bank-text-muted">({t.count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Filter-Zeile */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3" data-testid="dk-filters">
                <label className="flex min-w-[220px] items-center gap-2 border border-bank-border bg-white px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-bank-text-muted" strokeWidth={1.7} aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Unternehmen oder Ticker"
                    data-testid="dk-search"
                    aria-label="Unternehmen oder Ticker suchen"
                    className="w-full bg-transparent font-mono text-[12px] text-bank-text outline-none placeholder:text-bank-text-muted"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Zeitraum</span>
                  <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    data-testid="dk-range-select"
                    className="min-h-[36px] border border-bank-border bg-white px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text dark:bg-bank-ink/20"
                  >
                    {availableRanges.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}
                  </select>
                </label>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Rendite</span>
                  <div role="group" aria-label="Rendite-Filter" className="flex gap-1">
                    {YIELD_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setMinYieldId(f.id)}
                        aria-pressed={minYieldId === f.id}
                        data-testid={`dk-yield-${f.id}`}
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

                {availableMonths.length > 1 && (
                  <label className="flex items-center gap-2">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Ex-Monat</span>
                    <select
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      data-testid="dk-month-select"
                      className="min-h-[36px] border border-bank-border bg-white px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text dark:bg-bank-ink/20"
                    >
                      <option value="all">Alle</option>
                      {availableMonths.map((m) => (
                        <option key={m} value={m}>{new Date(`${m}-01`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Sortierung</span>
                  <select
                    value={sortId}
                    onChange={(e) => setSortId(e.target.value)}
                    data-testid="dk-sort-select"
                    className="min-h-[36px] border border-bank-border bg-white px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text dark:bg-bank-ink/20"
                  >
                    {SORTS.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
                  </select>
                </label>
              </div>

              {/* Buckets — nur nicht-leere Gruppen anzeigen */}
              {rows.length === 0 ? (
                <p className="mt-12 py-10 text-center text-[13px] text-bank-text-muted" data-testid="dk-no-results">
                  Keine Termine für die aktuelle Auswahl.
                </p>
              ) : (
                activeBuckets.map(([bucketId, list]) => (
                  <div key={bucketId} className="mt-10" data-testid={`dk-bucket-${bucketId}`}>
                    <div className="flex items-center gap-3 border-b border-bank-border pb-3">
                      <CalendarDays className="h-4 w-4 text-bank-gold" strokeWidth={1.6} aria-hidden />
                      <h2 className="font-serif text-[18px] leading-tight text-bank-text">{BUCKET_LABELS[bucketId]}</h2>
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                        {list.length} {list.length === 1 ? 'Termin' : 'Termine'}
                      </span>
                    </div>

                    {/* Desktop-Tabelle */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="mt-4 w-full border-collapse text-left text-[14px]" data-testid={`dk-table-${bucketId}`}>
                        <caption className="sr-only">Dividendentermine — {BUCKET_LABELS[bucketId]}</caption>
                        <thead className="border-b border-bank-border text-[10.5px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
                          <tr>
                            <th scope="col" className="pb-4 pr-5 text-left font-medium">Unternehmen</th>
                            <th scope="col" className="pb-4 pr-5 text-left font-medium">Land</th>
                            <th scope="col" className="pb-4 pr-5 text-right font-medium">Ex-Dividende</th>
                            <th scope="col" className="pb-4 pr-5 text-right font-medium">Zahlung</th>
                            <th scope="col" className="pb-4 pr-5 text-right font-medium">Div./Aktie</th>
                            <th scope="col" className="pb-4 pr-5 text-right font-medium">Div.-Rendite</th>
                            <th scope="col" className="pb-4 pr-5 text-right font-medium">Kurs</th>
                            <th scope="col" className="pb-4 pr-5 text-right font-medium">Rhythmus</th>
                            <th scope="col" className="pb-4 pr-5 text-right font-medium">5J-Verlauf</th>
                            <th scope="col" className="pb-4 font-medium" aria-label="Details" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-bank-border/60">
                          {list.map((r, idx) => {
                            const d = r.dividends || {};
                            return (
                              <tr
                                key={r.symbol}
                                className={`group transition-colors hover:bg-bank-mint/25 ${idx % 2 === 1 ? 'bg-bank-surface-elev/40' : ''}`}
                                data-testid={`dk-row-${r.symbol}`}
                              >
                                <td className="py-5 pr-5">
                                  <Link to={`/aktien/${r.symbol}`} className="block">
                                    <p className="font-serif text-[16px] text-bank-text group-hover:text-bank-primary">{r.company_name || r.symbol}</p>
                                    <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">{r.symbol}</p>
                                  </Link>
                                </td>
                                <td className="py-5 pr-5"><CountryChip symbol={r.symbol} /></td>
                                <td className="py-5 pr-5 text-right font-mono tabular-nums text-[14.5px] text-bank-text">{fmtDate(d.next_ex_dividend_date)}</td>
                                <td className="py-5 pr-5 text-right font-mono tabular-nums text-bank-text-muted">{fmtDate(d.next_payment_date)}</td>
                                <td className="py-5 pr-5 text-right font-mono tabular-nums text-[14px] text-bank-text">{fmtNum(d.dividend_rate_annual)} {r.currency || ''}</td>
                                <td className="py-5 pr-5 text-right font-mono tabular-nums text-[15px] text-bank-primary-strong">{fmtPct(d.dividend_yield_pct)}</td>
                                <td className="py-5 pr-5 text-right font-mono tabular-nums text-[14px] text-bank-text">{fmtNum(r.previous_close)} {r.currency || ''}</td>
                                <td className="py-5 pr-5 text-right font-mono tabular-nums text-bank-text-muted">{d.frequency || emDash}</td>
                                <td className="py-5 pr-5 text-right"><DivSparkline history={d.history_5y} /></td>
                                <td className="py-5 text-right">
                                  <Link
                                    to={`/aktien/${r.symbol}`}
                                    data-testid={`dk-detail-${r.symbol}`}
                                    className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-primary-strong opacity-70 transition-opacity hover:underline group-hover:opacity-100"
                                  >
                                    Details <ArrowRight className="h-3 w-3" strokeWidth={1.6} aria-hidden />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile-Cards */}
                    <ul className="mt-4 grid grid-cols-1 gap-4 md:hidden" data-testid={`dk-cards-${bucketId}`}>
                      {list.map((r) => {
                        const d = r.dividends || {};
                        return (
                          <li key={r.symbol}>
                            <Link
                              to={`/aktien/${r.symbol}`}
                              data-testid={`dk-card-${r.symbol}`}
                              className="group flex min-h-[44px] flex-col border border-bank-border bg-white p-4 transition-colors hover:border-bank-gold/50 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
                            >
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="font-serif text-[15px] leading-tight text-bank-text">{r.company_name || r.symbol}</p>
                                <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">{r.symbol}</span>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <CountryChip symbol={r.symbol} />
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-primary-strong">
                                  {fmtPct(d.dividend_yield_pct)} Rendite
                                </span>
                              </div>
                              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
                                <div>
                                  <dt className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bank-text-muted">Ex-Dividende</dt>
                                  <dd className="mt-0.5 font-mono tabular-nums text-[13.5px] text-bank-text">{fmtDate(d.next_ex_dividend_date)}</dd>
                                </div>
                                <div>
                                  <dt className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bank-text-muted">Zahlung</dt>
                                  <dd className="mt-0.5 font-mono tabular-nums text-[13.5px] text-bank-text">{fmtDate(d.next_payment_date)}</dd>
                                </div>
                                <div>
                                  <dt className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bank-text-muted">Div./Aktie</dt>
                                  <dd className="mt-0.5 font-mono tabular-nums text-[13.5px] text-bank-text">{fmtNum(d.dividend_rate_annual)} {r.currency || ''}</dd>
                                </div>
                                <div>
                                  <dt className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-bank-text-muted">Kurs</dt>
                                  <dd className="mt-0.5 font-mono tabular-nums text-[13.5px] text-bank-text">{fmtNum(r.previous_close)} {r.currency || ''}</dd>
                                </div>
                              </dl>
                              <span className="mt-4 inline-flex items-center gap-1 self-start font-mono text-[10px] uppercase tracking-[0.2em] text-bank-primary-strong">
                                Aktie ansehen <ArrowRight className="h-3 w-3" strokeWidth={1.6} aria-hidden />
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}

              {/* Disclaimer */}
              <div className="mt-14 border-t border-bank-border pt-6 text-[12px] leading-relaxed text-bank-text-muted" data-testid="dk-disclaimer">
                Dividenden und Ausschüttungstermine können sich ändern. Die dargestellten Informationen dienen der
                allgemeinen Information. Eine individuelle Einordnung Ihrer Anlagesituation erhalten Sie im Rahmen
                unserer persönlichen Anlageberatung.
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default DividendenkalenderPage;
