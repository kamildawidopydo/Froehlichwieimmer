import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { useDashboardData } from '@/context/DashboardDataContext';
import StockLogo from '@/components/StockLogo';
import BondLogo from '@/components/BondLogo';
import { formatEUR, formatEURSigned, formatDate } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';

/**
 * MeinePositionen — Positionen-Tabelle für /mein-depot (Session 81.06 Schritt 3/7).
 *
 * Datenherkunft (ausschließlich vorhandene DashboardDataContext-Felder):
 *   AKTIEN aus `stockMetrics` + `stockPriceMap`:
 *     - symbol, stockName, logoUrl (A)
 *     - qty, avg (A) · marketPrice / price (A)
 *     - marktwert, gv, pct (B, bereits berechnet)
 *     - stockPriceMap[sym].currency  (A — häufig USD; kein FX!)
 *     - stockPriceMap[sym].change_pct (A — Tag)
 *     - Detail-Route: `/aktien/${symbol}` (bestehende PublicStockDetail — keine neue Seite)
 *
 *   ANLEIHEN aus `bondPositions` + `computeBondMetrics`:
 *     - bond_name, isin (A)
 *     - nominal_betrag, kaufkurs, aktueller_kurs, kupon_rate, faelligkeitsdatum (A)
 *     - marktwert, einstand, kursgv, rendite, currentYield, approxYtm (B)
 *     - Fach-Standard EUR — kein currency-Feld pro Bond-Row
 *     - Keine dedizierte öffentliche Anleihen-Detailroute existiert → kein „Details"-Link
 *
 * FX-Verhalten (kritisch, Phase-12 Punkt 16):
 *   Aktien-KURS und Aktien-MARKTWERT werden in ORIGINAL-Währung angezeigt
 *   (via Intl.NumberFormat mit `currency: r.currency`). KEINE EUR-Konvertierung
 *   im Frontend, kein neuer FX-Layer.
 *
 * Gewichtung (Section 8):
 *   `weight = marktwert / gesamtvermoegen * 100` NUR wenn currency === 'EUR'.
 *   Bei USD-/gemischten Positionen: „—" (Bezugsgröße nicht sauber).
 *
 * Watchlist ist NICHT enthalten (keine `user_stock_watchlist`-Daten hier).
 *
 * 0 zusätzliche Requests. Sortierung + Suche + Tabs rein clientseitig.
 */

const TABS = [
  { key: 'all', label: 'Alle' },
  { key: 'stocks', label: 'Aktien' },
  { key: 'bonds', label: 'Anleihen' },
];

const SORTS = [
  { key: 'marktwert', label: 'Marktwert absteigend' },
  { key: 'gvPct', label: 'G/V % absteigend' },
  { key: 'weight', label: 'Gewichtung absteigend' },
  { key: 'name', label: 'Name A–Z' },
];

const priceFmt = (v, ccy = 'EUR') => {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  try {
    return Number(v).toLocaleString('de-DE', { style: 'currency', currency: ccy });
  } catch {
    return `${Number(v).toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${ccy}`;
  }
};

const SignedPct = ({ value, small = false }) => {
  if (value == null || !Number.isFinite(Number(value))) {
    return <span className="text-bank-text-muted">—</span>;
  }
  const up = Number(value) >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 tabular-nums',
        up ? 'text-emerald-700' : 'text-rose-700',
        small ? 'text-[11px]' : 'text-[12.5px] font-medium',
      )}
    >
      {up ? <ArrowUpRight size={11} strokeWidth={1.6} aria-hidden /> : <ArrowDownRight size={11} strokeWidth={1.6} aria-hidden />}
      <span className="sr-only">{up ? 'positiv ' : 'negativ '}</span>
      <span aria-hidden>{up ? '+' : ''}</span>
      {Number(value).toFixed(2).replace('.', ',')}&nbsp;%
    </span>
  );
};

const MeinePositionen = () => {
  const {
    loading,
    stockMetrics,
    stockPriceMap,
    bondPositions,
    computeBondMetrics,
    gesamtvermoegen,
    dashboardFetchHadFailure,
  } = useDashboardData();

  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('marktwert');
  const [q, setQ] = useState('');

  const totalPortfolio = Number(gesamtvermoegen) || 0;

  const stockRows = useMemo(() => {
    return (stockMetrics || []).map((m) => {
      const p = stockPriceMap?.[m.symbol] || {};
      const ccy = p.currency || 'EUR';
      const price = m.price ?? p.price ?? null;
      const dayPct = p.change_pct != null && Number.isFinite(Number(p.change_pct))
        ? Number(p.change_pct)
        : null;
      const marktwert = Number(m.marktwert || 0);
      const weight = ccy === 'EUR' && totalPortfolio > 0
        ? (marktwert / totalPortfolio) * 100
        : null;
      return {
        kind: 'stock',
        id: `s-${m.id}`,
        symbol: m.symbol,
        name: m.stockName || m.symbol,
        logoUrl: m.logoUrl,
        qty: Number(m.qty || 0),
        avg: Number(m.avg || 0),
        price,
        currency: ccy,
        einstand: Number(m.einstand || 0),
        marktwert,
        gv: Number(m.gv || 0),
        gvPct: Number.isFinite(Number(m.pct)) ? Number(m.pct) : null,
        weight,
        dayPct,
        to: `/aktien/${encodeURIComponent(m.symbol)}`,
      };
    });
  }, [stockMetrics, stockPriceMap, totalPortfolio]);

  const bondRows = useMemo(() => {
    return (bondPositions || []).map((b) => {
      const m = computeBondMetrics(b);
      const marktwert = Number(m.marktwert || 0);
      const weight = totalPortfolio > 0 ? (marktwert / totalPortfolio) * 100 : null;
      return {
        kind: 'bond',
        id: `b-${b.id}`,
        bond: b,
        symbol: b.isin || '',
        name: b.bond_name || b.isin || 'Anleihe',
        currency: 'EUR',
        nominal: Number(b.nominal_betrag || 0),
        kaufkurs: b.kaufkurs != null ? Number(b.kaufkurs) : null,
        aktKurs: b.aktueller_kurs != null ? Number(b.aktueller_kurs) : null,
        kupon: b.kupon_rate != null ? Number(b.kupon_rate) : null,
        faellig: b.faelligkeitsdatum || null,
        einstand: Number(m.einstand || 0),
        marktwert,
        kursgv: Number(m.kursgv || 0),
        gvPct: Number.isFinite(Number(m.rendite)) ? Number(m.rendite) : null,
        currentYield: m.currentYield,
        approxYtm: m.approxYtm,
        weight,
      };
    });
  }, [bondPositions, computeBondMetrics, totalPortfolio]);

  const availableTabs = useMemo(() => {
    const t = [{ key: 'all', label: 'Alle' }];
    if (stockRows.length > 0) t.push({ key: 'stocks', label: 'Aktien' });
    if (bondRows.length > 0) t.push({ key: 'bonds', label: 'Anleihen' });
    return t;
  }, [stockRows.length, bondRows.length]);

  const activeTab = availableTabs.find((t) => t.key === tab) ? tab : 'all';

  const filterQ = (name, symbol) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return name.toLowerCase().includes(s) || (symbol || '').toLowerCase().includes(s);
  };

  const sortFn = (a, b) => {
    switch (sort) {
      case 'gvPct':
        return (b.gvPct ?? -Infinity) - (a.gvPct ?? -Infinity);
      case 'weight':
        return (b.weight ?? -Infinity) - (a.weight ?? -Infinity);
      case 'name':
        return String(a.name).localeCompare(String(b.name), 'de');
      case 'marktwert':
      default:
        return Number(b.marktwert || 0) - Number(a.marktwert || 0);
    }
  };

  const filteredStocks = useMemo(
    () => stockRows.filter((r) => filterQ(r.name, r.symbol)).sort(sortFn),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stockRows, q, sort],
  );
  const filteredBonds = useMemo(
    () => bondRows.filter((r) => filterQ(r.name, r.symbol)).sort(sortFn),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bondRows, q, sort],
  );

  const showStocks = (activeTab === 'all' || activeTab === 'stocks') && stockRows.length > 0;
  const showBonds = (activeTab === 'all' || activeTab === 'bonds') && bondRows.length > 0;
  const anyRows = stockRows.length > 0 || bondRows.length > 0;

  return (
    <section
      aria-labelledby="mein-depot-positionen-title"
      data-testid="mein-depot-positionen"
      className="mb-14"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">
            Meine Positionen
          </p>
          <h2
            id="mein-depot-positionen-title"
            className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
          >
            Ihre Wertpapierpositionen im Überblick
          </h2>
        </div>
      </div>

      {loading ? (
        <div data-testid="mein-depot-positionen-skeleton" className="h-[220px] animate-pulse rounded-sm bg-bank-border/25" />
      ) : !anyRows ? (
        dashboardFetchHadFailure ? (
          <div data-testid="mein-depot-positionen-error" className="rounded-sm border border-dashed border-bank-border px-6 py-10 text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Verbindung</p>
            <p className="mt-3 text-[14px] font-medium text-bank-text">Ihre Positionen konnten momentan nicht geladen werden.</p>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-bank-text-muted">
              Bitte laden Sie die Seite später erneut. Ein technischer Fehler bedeutet nicht, dass Ihr Depot leer ist.
            </p>
          </div>
        ) : (
          <div data-testid="mein-depot-positionen-empty" className="rounded-sm border border-dashed border-bank-border px-6 py-10 text-center">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Noch keine Positionen</p>
            <p className="mt-3 text-[14px] font-medium text-bank-text">Noch keine Wertpapierpositionen hinterlegt.</p>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-bank-text-muted">
              Sobald Positionen vorhanden sind, erscheinen sie hier mit Einstand, Marktwert und Entwicklung.
            </p>
          </div>
        )
      ) : (
        <>
          {/* Controls: Tabs · Search · Sort */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {availableTabs.length > 1 && (
              <div role="tablist" aria-label="Anlageklasse" className="inline-flex flex-wrap gap-1 rounded-sm border border-bank-border bg-white p-1">
                {availableTabs.map((t) => {
                  const active = t.key === activeTab;
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      type="button"
                      aria-selected={active}
                      data-testid={`mdp-tab-${t.key}`}
                      onClick={() => setTab(t.key)}
                      className={cn(
                        'min-h-[36px] rounded-sm px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold',
                        active ? 'bg-bank-text text-white' : 'text-bank-text-muted hover:bg-bank-bg hover:text-bank-text',
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative inline-flex items-center">
                <Search size={13} strokeWidth={1.6} className="absolute left-2.5 text-bank-text-muted" aria-hidden />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  data-testid="mdp-search"
                  placeholder="Ticker oder Unternehmen"
                  className="min-h-[36px] w-[220px] rounded-sm border border-bank-border bg-white pl-8 pr-3 text-[12.5px] text-bank-text placeholder:text-bank-text-muted focus:outline-none focus:ring-1 focus:ring-bank-gold"
                  aria-label="Positionen suchen"
                />
              </label>
              <label className="relative inline-flex items-center">
                <ArrowUpDown size={13} strokeWidth={1.6} className="absolute left-2.5 text-bank-text-muted" aria-hidden />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  data-testid="mdp-sort"
                  className="min-h-[36px] appearance-none rounded-sm border border-bank-border bg-white pl-8 pr-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-bank-text focus:outline-none focus:ring-1 focus:ring-bank-gold"
                  aria-label="Sortierung"
                >
                  {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {/* AKTIEN — Desktop Table */}
          {showStocks && (
            <div data-testid="mdp-stocks-block" className="mb-8">
              {activeTab === 'all' && (
                <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Aktien</p>
              )}
              <div className="hidden overflow-hidden rounded-sm border border-bank-border bg-white lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <caption className="sr-only">Aktien-Positionen mit Marktwert, Gewichtung und Entwicklung</caption>
                    <thead>
                      <tr className="border-b border-bank-border bg-bank-bg/50">
                        {['Unternehmen','Ticker','Stück','Einstand','Kurs','Marktwert','G/V €','G/V %','Gewichtung','Heute',''].map((h, i) => (
                          <th key={h+i} scope="col" className={cn('px-3 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-bank-text-muted', i >= 2 ? 'text-right' : 'text-left')}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bank-border/60">
                      {filteredStocks.map((r) => (
                        <tr key={r.id} data-testid={`mdp-stock-${r.symbol}`} className="hover:bg-bank-bg/30">
                          <td className="px-3 py-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <StockLogo symbol={r.symbol} name={r.name} logoUrl={r.logoUrl} size="sm" />
                              <span className="truncate font-medium text-bank-text">{r.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-[12px] text-bank-text-muted">{r.symbol}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text-muted">{r.qty ? r.qty.toLocaleString('de-DE',{maximumFractionDigits:4}) : '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text">{r.avg > 0 ? formatEUR(r.avg) : '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text">{priceFmt(r.price, r.currency)}</td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums text-bank-text">{priceFmt(r.marktwert, r.currency)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{r.einstand > 0 ? <span className={cn(r.gv >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{formatEURSigned(r.gv)}</span> : <span className="text-bank-text-muted">—</span>}</td>
                          <td className="px-3 py-3 text-right"><SignedPct value={r.gvPct} /></td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text">{r.weight != null ? `${r.weight.toFixed(1).replace('.',',')} %` : <span className="text-bank-text-muted" title="Bezugsgröße nicht eindeutig (Fremdwährungsposition)">—</span>}</td>
                          <td className="px-3 py-3 text-right"><SignedPct value={r.dayPct} small /></td>
                          <td className="px-3 py-3 text-right">
                            <Link to={r.to} data-testid={`mdp-stock-detail-${r.symbol}`} className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-bank-primary hover:underline focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold">
                              Details <ChevronRight size={12} strokeWidth={1.6} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Mobile Cards */}
              <ul className="grid grid-cols-1 gap-3 lg:hidden">
                {filteredStocks.map((r) => (
                  <li key={r.id} data-testid={`mdp-stock-card-${r.symbol}`} className="rounded-sm border border-bank-border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <StockLogo symbol={r.symbol} name={r.name} logoUrl={r.logoUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-bank-text">{r.name}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-bank-text-muted">{r.symbol} · {r.currency}</p>
                        </div>
                      </div>
                      <p className="text-right text-[14px] font-semibold tabular-nums text-bank-text">{priceFmt(r.marktwert, r.currency)}</p>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                      <div><dt className="text-bank-text-muted">Stück</dt><dd className="tabular-nums text-bank-text">{r.qty ? r.qty.toLocaleString('de-DE',{maximumFractionDigits:4}) : '—'}</dd></div>
                      <div><dt className="text-bank-text-muted">Einstand</dt><dd className="tabular-nums text-bank-text">{r.avg > 0 ? formatEUR(r.avg) : '—'}</dd></div>
                      <div><dt className="text-bank-text-muted">Kurs</dt><dd className="tabular-nums text-bank-text">{priceFmt(r.price, r.currency)}</dd></div>
                      <div><dt className="text-bank-text-muted">G/V</dt><dd>{r.einstand > 0 ? <span className={cn('tabular-nums', r.gv >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{formatEURSigned(r.gv)}</span> : <span className="text-bank-text-muted">—</span>}</dd></div>
                      <div><dt className="text-bank-text-muted">G/V %</dt><dd><SignedPct value={r.gvPct} small /></dd></div>
                      <div><dt className="text-bank-text-muted">Heute</dt><dd><SignedPct value={r.dayPct} small /></dd></div>
                      <div><dt className="text-bank-text-muted">Gewichtung</dt><dd className="tabular-nums text-bank-text">{r.weight != null ? `${r.weight.toFixed(1).replace('.',',')} %` : '—'}</dd></div>
                    </dl>
                    <Link to={r.to} className="mt-3 inline-flex min-h-[44px] items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-bank-primary focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold">
                      Details <ChevronRight size={12} strokeWidth={1.6} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ANLEIHEN — Desktop Table + Mobile Cards */}
          {showBonds && (
            <div data-testid="mdp-bonds-block">
              {activeTab === 'all' && (
                <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Anleihen</p>
              )}
              <div className="hidden overflow-hidden rounded-sm border border-bank-border bg-white lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <caption className="sr-only">Anleihen-Positionen mit Nominal, Kupon, Fälligkeit und Rendite</caption>
                    <thead>
                      <tr className="border-b border-bank-border bg-bank-bg/50">
                        {['Emittent / Titel','Nominal','Kaufkurs','Kurs','Marktwert','Kupon','Fälligkeit','G/V','Current Yield','YTM','Gewichtung'].map((h) => (
                          <th key={h} scope="col" className="px-3 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-bank-text-muted first:text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bank-border/60">
                      {filteredBonds.map((r) => (
                        <tr key={r.id} data-testid={`mdp-bond-${r.id}`} className="hover:bg-bank-bg/30">
                          <td className="px-3 py-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <BondLogo bond={r.bond} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-bank-text">{r.name}</p>
                                {r.symbol && <p className="mt-0.5 font-mono text-[11px] text-bank-text-muted">{r.symbol}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text">{r.nominal > 0 ? formatEUR(r.nominal) : '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text">{r.kaufkurs != null ? `${r.kaufkurs.toFixed(2).replace('.',',')} %` : '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text">{r.aktKurs != null ? `${r.aktKurs.toFixed(2).replace('.',',')} %` : '—'}</td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums text-bank-text">{formatEUR(r.marktwert)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text">{r.kupon != null ? `${r.kupon.toString().replace('.',',')} %` : '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text-muted">{r.faellig ? formatDate(r.faellig) : '—'}</td>
                          <td className="px-3 py-3 text-right"><SignedPct value={r.gvPct} /></td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text">{r.currentYield != null ? `${r.currentYield.toFixed(2).replace('.',',')} %` : '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text">{r.approxYtm != null ? `${r.approxYtm.toFixed(2).replace('.',',')} %` : '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-bank-text">{r.weight != null ? `${r.weight.toFixed(1).replace('.',',')} %` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <ul className="grid grid-cols-1 gap-3 lg:hidden">
                {filteredBonds.map((r) => (
                  <li key={r.id} data-testid={`mdp-bond-card-${r.id}`} className="rounded-sm border border-bank-border bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <BondLogo bond={r.bond} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-bank-text">{r.name}</p>
                          {r.symbol && <p className="mt-0.5 font-mono text-[11px] text-bank-text-muted">{r.symbol}</p>}
                        </div>
                      </div>
                      <p className="text-right text-[14px] font-semibold tabular-nums text-bank-text">{formatEUR(r.marktwert)}</p>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                      <div><dt className="text-bank-text-muted">Nominal</dt><dd className="tabular-nums text-bank-text">{r.nominal > 0 ? formatEUR(r.nominal) : '—'}</dd></div>
                      <div><dt className="text-bank-text-muted">Kupon</dt><dd className="tabular-nums text-bank-text">{r.kupon != null ? `${r.kupon.toString().replace('.',',')} %` : '—'}</dd></div>
                      <div><dt className="text-bank-text-muted">Kaufkurs</dt><dd className="tabular-nums text-bank-text">{r.kaufkurs != null ? `${r.kaufkurs.toFixed(2).replace('.',',')} %` : '—'}</dd></div>
                      <div><dt className="text-bank-text-muted">Kurs</dt><dd className="tabular-nums text-bank-text">{r.aktKurs != null ? `${r.aktKurs.toFixed(2).replace('.',',')} %` : '—'}</dd></div>
                      <div><dt className="text-bank-text-muted">Fälligkeit</dt><dd className="tabular-nums text-bank-text-muted">{r.faellig ? formatDate(r.faellig) : '—'}</dd></div>
                      <div><dt className="text-bank-text-muted">G/V %</dt><dd><SignedPct value={r.gvPct} small /></dd></div>
                      <div><dt className="text-bank-text-muted">Current Yield</dt><dd className="tabular-nums text-bank-text">{r.currentYield != null ? `${r.currentYield.toFixed(2).replace('.',',')} %` : '—'}</dd></div>
                      <div><dt className="text-bank-text-muted">YTM</dt><dd className="tabular-nums text-bank-text">{r.approxYtm != null ? `${r.approxYtm.toFixed(2).replace('.',',')} %` : '—'}</dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default MeinePositionen;
