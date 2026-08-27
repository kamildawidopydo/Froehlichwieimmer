import React, { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * Session 80.37 — Market-Kontext-Streifen für /comparison.
 *
 * Zeigt kompakt:
 *   • EZB-Einlagensatz (Deposit Facility) mit Datum
 *   • Top Tagesgeld aus aktuellen Angeboten
 *   • Top Festgeld 12 Monate aus aktuellen Angeboten
 *
 * Alle Werte kommen aus `/api/content/comparison/context` — keine
 * hardcoded UI-Werte, keine Marktannahmen. Bei Fehlern wird nur der
 * bekannte Teil gerendert (graceful).
 */
const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api` });

const fmtRate = (r) => (r == null ? '—' : `${Number(r).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`);

const MarketContextStrip = () => {
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get('/content/comparison/context')
      .then((r) => { if (alive) setCtx(r.data); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, []);

  if (error || !ctx) return null;

  const ecb = ctx.ecb;
  const top = ctx.top_tagesgeld;
  const top12 = ctx.top_festgeld_12m;

  return (
    <section
      data-testid="market-context-strip"
      className="mb-10 border border-bank-border bg-white"
      aria-labelledby="market-context-title"
    >
      <div className="grid grid-cols-1 divide-y divide-bank-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {/* EZB */}
        <div className="p-5" data-testid="mcs-ecb">
          <p id="market-context-title" className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-text-muted">
            EZB-Einlagensatz
          </p>
          <p className="mt-2 font-serif text-[24px] leading-tight tabular-nums text-bank-text">
            {fmtRate(ecb?.deposit_facility_rate)}
          </p>
          <p className="mt-1 text-[11px] text-bank-text-muted">
            Stand {ecb?.effective_date} · Quelle: {ecb?.source_name}
          </p>
        </div>
        {/* Top Tagesgeld */}
        <div className="p-5" data-testid="mcs-top-tagesgeld">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-petrol-strong">
            Top Tagesgeld
          </p>
          <p className="mt-2 font-serif text-[24px] leading-tight tabular-nums text-bank-text">
            {fmtRate(top?.interest_rate)}
          </p>
          <p className="mt-1 text-[11px] text-bank-text-muted">
            {top?.product_name || '—'}
            {top?.interest_rate_type === 'promo' && top?.promo_duration_months && (
              <> · Aktion {top.promo_duration_months} Mon.</>
            )}
          </p>
        </div>
        {/* Top Festgeld 12M */}
        <div className="p-5" data-testid="mcs-top-festgeld-12m">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-amber-strong">
            Top Festgeld 12 Monate
          </p>
          <p className="mt-2 font-serif text-[24px] leading-tight tabular-nums text-bank-text">
            {fmtRate(top12?.interest_rate)}
          </p>
          <p className="mt-1 text-[11px] text-bank-text-muted">
            {top12?.product_name || '—'}
          </p>
        </div>
      </div>
    </section>
  );
};

export default MarketContextStrip;
