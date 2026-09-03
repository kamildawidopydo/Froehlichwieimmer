import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const fmtMoney = (v, ccy = 'USD', digits = 2) => {
  if (v == null || Number.isNaN(v)) return null;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: ccy, minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(v);
  } catch { return `${Number(v).toFixed(digits)} ${ccy}`; }
};
const fmtMoneyCompact = (v, ccy = 'USD') => {
  if (v == null || Number.isNaN(v)) return null;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: ccy, notation: 'compact', maximumFractionDigits: 2,
    }).format(v);
  } catch { return null; }
};
const fmtPct = (v, digits = 2) => {
  if (v == null || Number.isNaN(v)) return null;
  const s = v > 0 ? '+' : '';
  return `${s}${Number(v).toFixed(digits)} %`;
};
const fmtDate = (iso, opts = {}) => {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: 'long', year: 'numeric', ...opts,
    }).format(new Date(iso));
  } catch { return iso; }
};

/**
 * Tool-Paket 3/4 — real yfinance earnings history + next-quarter estimates
 * + calendar (important corporate dates). No fabricated EPS or fake dates.
 */
export default function StockEarnings({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/stocks/${encodeURIComponent(symbol)}/earnings`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [symbol]);

  if (loading) {
    return (
      <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="stock-earnings-loading">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Quartalszahlen &amp; Earnings</p>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">Daten werden geladen …</p>
      </section>
    );
  }
  if (error || !data || data.data_source === 'unavailable') {
    return (
      <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="stock-earnings-empty">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Quartalszahlen &amp; Earnings</p>
        <p className="mt-6 text-[13.5px] leading-relaxed text-bank-text-muted">
          Für diese Aktie liegen derzeit keine Earnings-Daten vor.
        </p>
      </section>
    );
  }

  const ccy = data.currency || 'USD';
  const { history = [], next = null, important_dates = {} } = data;

  const hasHistory = history.length > 0;
  const hasNext = !!next && !!next.date;
  const hasDates = important_dates && (
    important_dates.next_earnings_date ||
    important_dates.dividend_payment_date ||
    important_dates.ex_dividend_date
  );

  if (!hasHistory && !hasNext && !hasDates) {
    return (
      <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="stock-earnings-empty">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Quartalszahlen &amp; Earnings</p>
        <p className="mt-6 text-[13.5px] leading-relaxed text-bank-text-muted">
          Für diese Aktie liegen derzeit keine Earnings-Daten vor.
        </p>
      </section>
    );
  }

  return (
    <section
      className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10"
      data-testid="stock-earnings"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Quartalszahlen &amp; Earnings</p>
      <h2 className="mt-3 font-display text-[1.6rem] font-light leading-tight text-bank-text">
        Berichte &amp; wichtige Termine
      </h2>

      {hasDates && <ImportantDates dates={important_dates} />}

      {hasNext && <NextEarnings next={next} ccy={ccy} />}

      {hasHistory && <EarningsHistory history={history} ccy={ccy} />}

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
        Quelle: yfinance · EPS-Werte in {ccy}
      </p>
    </section>
  );
}

// ---- Important corporate dates ---------------------------------------------
function ImportantDates({ dates }) {
  const items = [];
  if (dates.next_earnings_date) {
    const label = dates.next_earnings_is_range && dates.next_earnings_date_end && dates.next_earnings_date_end !== dates.next_earnings_date
      ? `voraussichtlich ${fmtDate(dates.next_earnings_date)} – ${fmtDate(dates.next_earnings_date_end)}`
      : fmtDate(dates.next_earnings_date);
    items.push({ label: 'Nächster Earnings-Termin', value: label, iso: dates.next_earnings_date });
  }
  if (dates.ex_dividend_date) {
    items.push({ label: 'Ex-Dividenden-Tag', value: fmtDate(dates.ex_dividend_date), iso: dates.ex_dividend_date });
  }
  if (dates.dividend_payment_date) {
    items.push({ label: 'Dividenden-Zahltag', value: fmtDate(dates.dividend_payment_date), iso: dates.dividend_payment_date });
  }
  if (items.length === 0) return null;
  return (
    <div className="mt-8" data-testid="stock-important-dates">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Wichtige Termine</p>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{it.label}</dt>
            <dd className="mt-1 text-[15px] font-light text-bank-text">
              <time dateTime={it.iso}>{it.value}</time>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ---- Next quarter estimate --------------------------------------------------
function NextEarnings({ next, ccy }) {
  const rows = [
    { label: 'EPS erwartet (Ø)', value: next.estimate_avg != null ? fmtMoney(next.estimate_avg, ccy, 2) : (next.eps_estimate != null ? fmtMoney(next.eps_estimate, ccy, 2) : null) },
    { label: 'EPS-Spanne', value: (next.estimate_low != null && next.estimate_high != null) ? `${fmtMoney(next.estimate_low, ccy, 2)} – ${fmtMoney(next.estimate_high, ccy, 2)}` : null },
    { label: 'Umsatz erwartet (Ø)', value: fmtMoneyCompact(next.revenue_estimate_avg, ccy) },
    { label: 'Umsatzspanne', value: (next.revenue_estimate_low != null && next.revenue_estimate_high != null) ? `${fmtMoneyCompact(next.revenue_estimate_low, ccy)} – ${fmtMoneyCompact(next.revenue_estimate_high, ccy)}` : null },
  ].filter((r) => r.value != null);
  if (rows.length === 0) return null;
  return (
    <div className="mt-10 border-t border-bank-border pt-6" data-testid="stock-next-earnings">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Nächstes Quartal · Analystenschätzung</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{r.label}</dt>
            <dd className="mt-1 rate-figure text-[1.1rem] font-light tabular-nums text-bank-text">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12px] leading-relaxed text-bank-text-muted">
        Analystenschätzung für das kommende Quartal, keine Prognose der Fröhlich Vermögensberatung.
      </p>
    </div>
  );
}

// ---- Earnings history ------------------------------------------------------
function EarningsHistory({ history, ccy }) {
  const rows = useMemo(() => history.slice(0, 8), [history]);
  return (
    <div className="mt-10 border-t border-bank-border pt-6" data-testid="stock-earnings-history">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Historie · Letzte Quartale</p>

      {/* Desktop grid header (hidden on mobile) */}
      <div className="mt-4 hidden grid-cols-4 gap-4 border-b border-bank-border pb-3 sm:grid" aria-hidden>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">Berichtstermin</p>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">EPS erwartet</p>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">EPS gemeldet</p>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">Über/Unter Erwartung</p>
      </div>

      <div className="divide-y divide-bank-border">
        {rows.map((row) => {
          const sur = row.surprise_pct;
          const positive = typeof sur === 'number' && sur >= 0;
          const negative = typeof sur === 'number' && sur < 0;
          return (
            <div
              key={row.date}
              className="grid grid-cols-2 gap-x-4 gap-y-1 py-4 sm:grid-cols-4 sm:items-baseline sm:py-3"
            >
              <div className="col-span-2 sm:col-span-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted sm:hidden">Termin</p>
                <p className="text-[14px] font-light text-bank-text">
                  <time dateTime={row.date}>{fmtDate(row.date)}</time>
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted sm:hidden">Erwartet</p>
                <p className="rate-figure text-[15px] font-light tabular-nums text-bank-text">
                  {fmtMoney(row.eps_estimate, ccy, 2) || '—'}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted sm:hidden">Gemeldet</p>
                <p className="rate-figure text-[15px] font-light tabular-nums text-bank-text">
                  {fmtMoney(row.eps_actual, ccy, 2) || '—'}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted sm:hidden">Abweichung</p>
                <p
                  className={cn(
                    'rate-figure text-[15px] font-light tabular-nums',
                    positive && 'text-bank-primary-strong',
                    negative && 'text-red-600 dark:text-red-400',
                    !positive && !negative && 'text-bank-text-muted',
                  )}
                  aria-label={positive ? 'Über Erwartung' : negative ? 'Unter Erwartung' : 'Keine Angabe'}
                >
                  {typeof sur === 'number' ? (
                    <>
                      <span aria-hidden>{positive ? '▲ ' : '▼ '}</span>
                      {fmtPct(sur)}
                    </>
                  ) : '—'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-bank-text-muted">
        Positive Abweichung: gemeldeter Gewinn je Aktie lag über der Analystenschätzung. Keine Bewertung von Einzelquartalen.
      </p>
    </div>
  );
}
