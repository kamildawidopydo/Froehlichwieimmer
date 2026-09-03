import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const fmtMoney = (v, ccy = 'EUR', digits = 2) => {
  if (v == null || Number.isNaN(v)) return null;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: ccy, minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(v);
  } catch { return `${Number(v).toFixed(digits)} ${ccy}`; }
};
const fmtPct = (v, digits = 2) => {
  if (v == null || Number.isNaN(v)) return null;
  const s = v > 0 ? '+' : '';
  return `${s}${Number(v).toFixed(digits)} %`;
};
const fmtPctPlain = (v, digits = 2) => {
  if (v == null || Number.isNaN(v)) return null;
  return `${Number(v).toFixed(digits)} %`;
};
const fmtDate = (iso) => {
  if (!iso) return null;
  try { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso)); }
  catch { return iso; }
};

/**
 * Tool-Paket 3/4 — Real dividend summary + yearly history + growth (yfinance).
 * No fabrication: hides fields that are `null` and shows a neutral empty-state
 * for tickers without dividend policy (e.g. AMZN).
 */
export default function StockDividends({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/stocks/${encodeURIComponent(symbol)}/dividends`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [symbol]);

  if (loading) {
    return (
      <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="stock-dividends-loading">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Dividenden</p>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">Daten werden geladen …</p>
      </section>
    );
  }
  if (error || !data || data.data_source === 'unavailable') {
    return (
      <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="stock-dividends-empty">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Dividenden</p>
        <p className="mt-6 text-[13.5px] leading-relaxed text-bank-text-muted">
          Für diese Aktie sind derzeit keine Dividendendaten abrufbar.
        </p>
      </section>
    );
  }

  const ccy = data.currency || 'EUR';
  const { summary, history = [], growth = {}, has_dividends } = data;

  if (!has_dividends || history.length === 0) {
    return (
      <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="stock-dividends-none">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Dividenden</p>
        <p className="mt-6 text-[13.5px] leading-relaxed text-bank-text-muted">
          Für diese Aktie ist derzeit keine regelmäßige Dividendenzahlung hinterlegt.
        </p>
      </section>
    );
  }

  const summaryMetrics = [
    { label: 'Dividendenrendite', value: fmtPctPlain(summary.dividend_yield_pct) },
    { label: 'Dividende / Jahr', value: fmtMoney(summary.dividend_rate_annual, ccy) },
    { label: 'Ausschüttungsquote', value: fmtPctPlain(summary.payout_ratio_pct, 1) },
    { label: 'Ø 5-Jahres-Rendite', value: fmtPctPlain(summary.five_year_avg_yield_pct) },
    { label: 'Letzte Dividende', value: fmtMoney(summary.last_dividend_value, ccy, 4) },
    { label: 'Letzter Zahltag', value: fmtDate(summary.last_dividend_date) },
    { label: 'Nächster Ex-Tag', value: fmtDate(summary.next_ex_dividend_date) },
  ].filter((m) => m.value != null);

  return (
    <section
      className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10"
      data-testid="stock-dividends"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Dividenden</p>
      <h2 className="mt-3 font-display text-[1.6rem] font-light leading-tight text-bank-text">
        Ausschüttungen &amp; Historie
      </h2>

      {summaryMetrics.length > 0 && (
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {summaryMetrics.map((m) => (
            <div key={m.label}>
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{m.label}</dt>
              <dd className="mt-1 rate-figure text-[1.15rem] font-light tabular-nums text-bank-text">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {history.length >= 2 && <DividendChart history={history} ccy={ccy} />}

      {(growth.one_year_pct != null || growth.cagr_3y_pct != null || growth.cagr_5y_pct != null) && (
        <div className="mt-10 border-t border-bank-border pt-6" data-testid="dividend-growth">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Dividendenwachstum</p>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {growth.one_year_pct != null && (
              <GrowthCell label="1-Jahres-Wachstum" value={fmtPct(growth.one_year_pct)} positive={growth.one_year_pct >= 0} />
            )}
            {growth.cagr_3y_pct != null && (
              <GrowthCell label="3-Jahres-CAGR" value={fmtPct(growth.cagr_3y_pct)} positive={growth.cagr_3y_pct >= 0} />
            )}
            {growth.cagr_5y_pct != null && (
              <GrowthCell label="5-Jahres-CAGR" value={fmtPct(growth.cagr_5y_pct)} positive={growth.cagr_5y_pct >= 0} />
            )}
          </dl>
          {growth.base_end_year && (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
              Basis · Vollständiges Geschäftsjahr {growth.base_end_year}
            </p>
          )}
        </div>
      )}

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
        Quelle: yfinance · Historie in {ccy}
      </p>
    </section>
  );
}

function GrowthCell({ label, value, positive }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</p>
      <p className={cn(
        'mt-1.5 rate-figure text-[1.35rem] font-light tabular-nums',
        positive ? 'text-bank-primary-strong' : 'text-red-600 dark:text-red-400',
      )}>
        <span aria-hidden>{positive ? '▲ ' : '▼ '}</span>{value}
      </p>
    </div>
  );
}

function DividendChart({ history, ccy }) {
  const bars = useMemo(() => history.slice(-10), [history]);
  const max = Math.max(...bars.map((b) => b.total || 0), 0.0001);

  return (
    <div className="mt-10" data-testid="dividend-chart">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Historie · Jahresausschüttung</p>
      <div
        role="img"
        aria-label={`Balkenchart Jahresdividende ${bars[0].year}-${bars[bars.length - 1].year} in ${ccy}`}
        className="mt-4"
      >
        <div className="grid grid-flow-col auto-cols-fr items-end gap-2 h-40">
          {bars.map((b) => {
            const h = Math.max(2, Math.round((b.total / max) * 100));
            return (
              <div key={b.year} className="flex h-full flex-col items-center justify-end">
                <span className="mb-1 font-mono text-[9.5px] tabular-nums text-bank-text-muted">
                  {fmtMoney(b.total, ccy)}
                </span>
                <div
                  className={cn(
                    'w-full rounded-t-sm transition-all',
                    b.complete ? 'bg-bank-primary/80' : 'bg-bank-primary/35',
                  )}
                  style={{ height: `${h}%`, minHeight: '2px' }}
                  title={`${b.year}: ${fmtMoney(b.total, ccy)}${b.complete ? '' : ' (bislang)'}`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 grid grid-flow-col auto-cols-fr gap-2">
          {bars.map((b) => (
            <p key={b.year} className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-bank-text-muted">
              {b.year}{!b.complete ? ' · bislang' : ''}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
