import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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

  return (
    <section
      id="home-deutschland-fokus"
      aria-labelledby="home-deutschland-fokus-heading"
      data-testid="home-deutschland-fokus"
      className="relative border-t border-bank-border bg-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        <header className="mx-auto max-w-3xl text-center">
          <Eyebrow>Aktien-Cockpit</Eyebrow>
          <h2
            id="home-deutschland-fokus-heading"
            className="mt-4 font-display text-[1.75rem] font-light leading-[1.15] tracking-tight text-bank-text sm:text-[2rem]"
          >
            Deutschland im Fokus
          </h2>
          <p className="mx-auto mt-4 max-w-[38rem] text-[14px] leading-relaxed text-bank-text-muted sm:text-[15px]">
            Ausgewählte deutsche Unternehmen und wichtige Kennzahlen auf einen Blick.
          </p>
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
            {/* Desktop table */}
            <div className="mt-10 hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-[13px]" data-testid="deutschland-fokus-table">
                <caption className="sr-only">Ausgewählte deutsche Aktien mit Kennzahlen</caption>
                <thead className="border-b border-bank-border text-[10.5px] font-medium uppercase tracking-[0.2em] text-bank-text-muted">
                  <tr>
                    <th scope="col" className="pb-3 pr-4 text-left font-medium">Unternehmen</th>
                    <th scope="col" className="pb-3 pr-4 text-right font-medium">Kurs</th>
                    <th scope="col" className="pb-3 pr-4 text-right font-medium">Marktkap.</th>
                    <th scope="col" className="pb-3 pr-4 text-right font-medium">KGV</th>
                    <th scope="col" className="pb-3 pr-4 text-right font-medium">Fwd. KGV</th>
                    <th scope="col" className="pb-3 pr-4 text-right font-medium">Div.-Rendite</th>
                    <th scope="col" className="pb-3 pr-4 text-right font-medium">52W-Abstand</th>
                    <th scope="col" className="pb-3 font-medium" aria-label="Analyse öffnen" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-bank-border/60">
                  {items.map((r) => (
                    <tr key={r.symbol} className="group hover:bg-bank-mint/25" data-testid={`de-row-${r.symbol}`}>
                      <td className="py-4 pr-4">
                        <Link to={`/aktien/${r.symbol}`} className="block">
                          <p className="font-serif text-[14.5px] text-bank-text">{r.company_name || r.symbol}</p>
                          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">{r.symbol}</p>
                        </Link>
                      </td>
                      <td className="py-4 pr-4 text-right font-mono tabular-nums text-bank-text">
                        {fmtNumber(r.previous_close)} {r.currency || ''}
                      </td>
                      <td className="py-4 pr-4 text-right font-mono tabular-nums text-bank-text-muted">
                        {fmtMcap(r.market_cap)}
                      </td>
                      <td className="py-4 pr-4 text-right font-mono tabular-nums text-bank-text-muted">
                        {fmtNumber(r.trailing_pe, 1)}
                      </td>
                      <td className="py-4 pr-4 text-right font-mono tabular-nums text-bank-text-muted">
                        {fmtNumber(r.forward_pe, 1)}
                      </td>
                      <td className="py-4 pr-4 text-right font-mono tabular-nums text-bank-text-muted">
                        {fmtPct(r.dividend_yield, 2)}
                      </td>
                      <td className="py-4 pr-4 text-right font-mono tabular-nums text-bank-text-muted">
                        {fmtSignedPct(r.distance_from_high_pct)}
                      </td>
                      <td className="py-4 text-right">
                        <Link
                          to={`/aktien/${r.symbol}`}
                          data-testid={`de-analyse-${r.symbol}`}
                          className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-primary-strong hover:underline"
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
            <p className="mt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted" data-testid="deutschland-fokus-provenance">
              Datenstand yfinance-Cache · Kurse können zeitverzögert sein
            </p>

            {/* Compare-CTA */}
            <div className="mt-6 flex justify-center">
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
