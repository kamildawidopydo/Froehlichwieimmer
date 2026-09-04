import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Landmark, Target } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { fetchHomepageStockBundle } from '@/services/stockBundleService';

/**
 * Session 80.99 → 81.00 — „Deutschland im Fokus"
 * Nutzt jetzt den gemeinsamen Homepage-Bundle (deduped, 1× pro Session).
 */

const DE_SYMBOLS = ['SAP', 'SIE', 'ALV', 'DBK', 'IFX', 'RHM'];

const emDash = '—';
const fmtNumber = (n, digits = 2) =>
  n == null || !Number.isFinite(Number(n))
    ? emDash
    : Number(n).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtPct = (n, digits = 2) =>
  n == null || !Number.isFinite(Number(n))
    ? emDash
    : `${Number(n).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;

const fmtSignedPct = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return emDash;
  const v = Number(n);
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±';
  return `${sign}${Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
};

const fmtMcap = (n) => {
  if (n == null || !Number.isFinite(Number(n)) || Number(n) <= 0) return emDash;
  const v = Number(n);
  if (v >= 1e12) return `${(v / 1e12).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Bio.`;
  if (v >= 1e9) return `${(v / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mrd.`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 0 })} Mio.`;
  return v.toLocaleString('de-DE');
};

const DeutschlandFokus = () => {
  const [state, setState] = useState({ loading: true, items: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchHomepageStockBundle();
        if (alive) {
          const filtered = (data.items || []).filter((it) => DE_SYMBOLS.includes(it.symbol));
          setState({ loading: false, items: filtered });
        }
      } catch {
        if (alive) setState({ loading: false, items: [] });
      }
    })();
    return () => { alive = false; };
  }, []);

  const items = state.items;
  const hasRealData = items.some((it) => it && it.previous_close != null);

  /**
   * Session 81.01 — Highlight-Karten aus BEREITS GELADENEN Daten:
   * 0 zusätzliche Requests, rein clientseitig, `useMemo` cached bis Items sich ändern.
   * Neutrale Labels, keine Bewertung / kein „Top Pick".
   */
  const highlights = useMemo(() => {
    if (!items.length) return null;
    const finite = (v) => v != null && Number.isFinite(Number(v));
    const withYield = items.filter((i) => finite(i.dividend_yield) && Number(i.dividend_yield) > 0);
    const withMcap  = items.filter((i) => finite(i.market_cap)     && Number(i.market_cap)     > 0);
    const withDist  = items.filter((i) => finite(i.distance_from_high_pct));
    const pickMax = (arr, key) => arr.length ? arr.reduce((a, b) => Number(a[key]) >= Number(b[key]) ? a : b) : null;
    const pickMinAbs = (arr, key) => arr.length ? arr.reduce((a, b) => Math.abs(Number(a[key])) <= Math.abs(Number(b[key])) ? a : b) : null;
    return {
      topYield:    pickMax(withYield, 'dividend_yield'),
      topMcap:     pickMax(withMcap, 'market_cap'),
      nearestHigh: pickMinAbs(withDist, 'distance_from_high_pct'),
    };
  }, [items]);

  return (
    <section
      id="home-deutschland-fokus"
      aria-labelledby="home-deutschland-fokus-heading"
      data-testid="home-deutschland-fokus"
      className="relative border-t border-bank-border bg-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        <header className="max-w-3xl">
          <Eyebrow>Aktien-Cockpit</Eyebrow>
          <h2
            id="home-deutschland-fokus-heading"
            className="mt-4 font-display text-[1.9rem] font-light leading-[1.1] tracking-tight text-bank-text sm:text-[2.25rem]"
          >
            Deutschland im Fokus
          </h2>
          <p className="mt-4 max-w-[42rem] text-[14.5px] leading-relaxed text-bank-text-muted sm:text-[15.5px]">
            Ausgewählte deutsche Unternehmen und wichtige Kennzahlen auf einen Blick.
          </p>
          <div className="mt-4 h-px w-16 bg-bank-gold/60" aria-hidden />
        </header>

        {state.loading ? (
          <div className="mt-10 space-y-2">
            {[0,1,2,3,4,5].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-neutral-100" />
            ))}
          </div>
        ) : !hasRealData ? (
          <p className="mt-10 text-center text-[13px] text-bank-text-muted" data-testid="deutschland-fokus-empty">
            Aktienkennzahlen aktuell nicht verfügbar.
          </p>
        ) : (
          <>
            {/* Highlight-Karten — nur echte Werte aus geladenen Items, 0 neue Requests */}
            {highlights && (highlights.topYield || highlights.topMcap || highlights.nearestHigh) && (
              <div
                className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3"
                data-testid="deutschland-fokus-highlights"
              >
                {highlights.topYield && (
                  <Link
                    to={`/aktien/${highlights.topYield.symbol}`}
                    data-testid="de-highlight-yield"
                    className="group border border-bank-border bg-white p-5 transition-colors hover:border-bank-primary/40 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-bank-primary-strong" strokeWidth={1.6} aria-hidden />
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Höchste Dividendenrendite im Vergleich</p>
                    </div>
                    <p className="mt-4 font-mono tabular-nums text-[26px] leading-none text-bank-primary-strong">
                      {fmtPct(highlights.topYield.dividend_yield)}
                    </p>
                    <p className="mt-4 font-serif text-[15px] text-bank-text group-hover:text-bank-primary">
                      {highlights.topYield.company_name || highlights.topYield.symbol}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                      {highlights.topYield.symbol}
                    </p>
                  </Link>
                )}
                {highlights.topMcap && (
                  <Link
                    to={`/aktien/${highlights.topMcap.symbol}`}
                    data-testid="de-highlight-mcap"
                    className="group border border-bank-border bg-white p-5 transition-colors hover:border-bank-primary/40 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
                  >
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-bank-primary-strong" strokeWidth={1.6} aria-hidden />
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Größte Marktkapitalisierung</p>
                    </div>
                    <p className="mt-4 font-mono tabular-nums text-[26px] leading-none text-bank-text">
                      {fmtMcap(highlights.topMcap.market_cap)}
                    </p>
                    <p className="mt-4 font-serif text-[15px] text-bank-text group-hover:text-bank-primary">
                      {highlights.topMcap.company_name || highlights.topMcap.symbol}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                      {highlights.topMcap.symbol}
                    </p>
                  </Link>
                )}
                {highlights.nearestHigh && (
                  <Link
                    to={`/aktien/${highlights.nearestHigh.symbol}`}
                    data-testid="de-highlight-near-high"
                    className="group border border-bank-border bg-white p-5 transition-colors hover:border-bank-primary/40 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold"
                  >
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-bank-primary-strong" strokeWidth={1.6} aria-hidden />
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Nächster am 52W-Hoch</p>
                    </div>
                    <p className="mt-4 font-mono tabular-nums text-[26px] leading-none text-bank-text">
                      {fmtSignedPct(highlights.nearestHigh.distance_from_high_pct)}
                    </p>
                    <p className="mt-4 font-serif text-[15px] text-bank-text group-hover:text-bank-primary">
                      {highlights.nearestHigh.company_name || highlights.nearestHigh.symbol}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                      {highlights.nearestHigh.symbol}
                    </p>
                  </Link>
                )}
              </div>
            )}

            {/* Desktop table */}
            <div className="mt-10 hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-[14px]" data-testid="deutschland-fokus-table">
                <caption className="sr-only">Ausgewählte deutsche Aktien mit Kennzahlen</caption>
                <thead className="border-b border-bank-border text-[10.5px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
                  <tr>
                    <th scope="col" className="pb-4 pr-6 text-left font-medium">Unternehmen</th>
                    <th scope="col" className="pb-4 pr-6 text-right font-medium">Kurs</th>
                    <th scope="col" className="pb-4 pr-6 text-right font-medium">Marktkap.</th>
                    <th scope="col" className="pb-4 pr-6 text-right font-medium">KGV</th>
                    <th scope="col" className="pb-4 pr-6 text-right font-medium">Fwd. KGV</th>
                    <th scope="col" className="pb-4 pr-6 text-right font-medium">Div.-Rendite</th>
                    <th scope="col" className="pb-4 pr-6 text-right font-medium">52W-Abstand</th>
                    <th scope="col" className="pb-4 font-medium" aria-label="Analyse öffnen" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-bank-border/60">
                  {items.map((r, idx) => (
                    <tr
                      key={r.symbol}
                      className={`group transition-colors hover:bg-bank-mint/25 ${idx % 2 === 1 ? 'bg-bank-surface-elev/40' : ''}`}
                      data-testid={`de-row-${r.symbol}`}
                    >
                      <td className="py-5 pr-6">
                        <Link to={`/aktien/${r.symbol}`} className="block">
                          <p className="font-serif text-[16px] text-bank-text">{r.company_name || r.symbol}</p>
                          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">{r.symbol}</p>
                        </Link>
                      </td>
                      <td className="py-5 pr-6 text-right font-mono tabular-nums text-[14.5px] text-bank-text">
                        {fmtNumber(r.previous_close)} {r.currency || ''}
                      </td>
                      <td className="py-5 pr-6 text-right font-mono tabular-nums text-bank-text-muted">
                        {fmtMcap(r.market_cap)}
                      </td>
                      <td className="py-5 pr-6 text-right font-mono tabular-nums text-[14.5px] text-bank-text">
                        {fmtNumber(r.trailing_pe, 1)}
                      </td>
                      <td className="py-5 pr-6 text-right font-mono tabular-nums text-[14.5px] text-bank-text">
                        {fmtNumber(r.forward_pe, 1)}
                      </td>
                      <td className="py-5 pr-6 text-right font-mono tabular-nums text-[14.5px] text-bank-primary-strong">
                        {fmtPct(r.dividend_yield, 2)}
                      </td>
                      <td className="py-5 pr-6 text-right font-mono tabular-nums text-[14.5px] text-bank-text">
                        {fmtSignedPct(r.distance_from_high_pct)}
                      </td>
                      <td className="py-5 text-right">
                        <Link
                          to={`/aktien/${r.symbol}`}
                          data-testid={`de-analyse-${r.symbol}`}
                          className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-primary-strong opacity-70 transition-opacity hover:underline group-hover:opacity-100"
                        >
                          Analyse öffnen
                          <ArrowRight className="h-3 w-3" strokeWidth={1.6} aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="mt-8 divide-y divide-bank-border md:hidden" data-testid="deutschland-fokus-cards">
              {items.map((r) => (
                <li key={r.symbol}>
                  <Link to={`/aktien/${r.symbol}`} className="block py-4" data-testid={`de-card-${r.symbol}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-serif text-[15px] text-bank-text">{r.company_name || r.symbol}</p>
                      <p className="font-mono tabular-nums text-[13.5px] text-bank-text">
                        {fmtNumber(r.previous_close)} {r.currency || ''}
                      </p>
                    </div>
                    <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">{r.symbol}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                      <div className="flex justify-between"><dt className="text-bank-text-muted">KGV</dt><dd className="tabular-nums">{fmtNumber(r.trailing_pe, 1)}</dd></div>
                      <div className="flex justify-between"><dt className="text-bank-text-muted">Fwd. KGV</dt><dd className="tabular-nums">{fmtNumber(r.forward_pe, 1)}</dd></div>
                      <div className="flex justify-between"><dt className="text-bank-text-muted">Div.-Rendite</dt><dd className="tabular-nums">{fmtPct(r.dividend_yield)}</dd></div>
                      <div className="flex justify-between"><dt className="text-bank-text-muted">52W-Abstand</dt><dd className="tabular-nums">{fmtSignedPct(r.distance_from_high_pct)}</dd></div>
                    </dl>
                    <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-primary-strong">
                      Analyse öffnen <ArrowRight className="h-3 w-3" strokeWidth={1.6} aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Provenance */}
            <p className="mt-6 text-left font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted" data-testid="deutschland-fokus-provenance">
              Datenstand yfinance-Cache · Kurse können zeitverzögert sein
            </p>

            {/* Compare-CTA */}
            <div className="mt-6 flex justify-start">
              <Link
                to="/comparison"
                data-testid="deutschland-fokus-compare-cta"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-bank-border bg-white px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-primary/60 hover:text-bank-primary-strong"
              >
                Aktien vergleichen
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.4} aria-hidden />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default DeutschlandFokus;
