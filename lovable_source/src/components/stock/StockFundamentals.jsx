import { getApiBase } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const API_BASE = getApiBase();

const fmtNum = (v) => {
  if (v == null || Number.isNaN(v)) return null;
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(v);
};
const fmtCompact = (v) => {
  if (v == null || Number.isNaN(v)) return null;
  try {
    return new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 2 }).format(v);
  } catch { return fmtNum(v); }
};
const fmtPct = (v) => (v == null || Number.isNaN(v) ? null : `${Number(v).toFixed(2)} %`);
const fmtMoney = (v, ccy = 'EUR') => {
  if (v == null || Number.isNaN(v)) return null;
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: ccy, maximumFractionDigits: 2 }).format(v);
  } catch { return `${Number(v).toFixed(2)} ${ccy}`; }
};

/**
 * Fundamentals + 52-week range for one allowlisted ticker.
 * Renders only metrics that yfinance actually returned — missing fields are hidden,
 * not shown as "—". No fabricated values.
 */
export default function StockFundamentals({ symbol, currentPrice }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${API_BASE}/api/stocks/${encodeURIComponent(symbol)}/fundamentals`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch(() => { if (alive) { setData(null); setLoading(false); } });
    return () => { alive = false; };
  }, [symbol]);

  if (loading) return null;
  if (!data || data.data_source === 'unavailable') return null;

  const ccy = data.currency || 'EUR';
  const metrics = [
    { label: 'Marktkapitalisierung', value: fmtCompact(data.market_cap) },
    { label: 'KGV (trailing)', value: fmtNum(data.trailing_pe) },
    { label: 'KGV (forward)', value: fmtNum(data.forward_pe) },
    { label: 'EPS', value: fmtNum(data.eps) },
    { label: 'Dividendenrendite', value: fmtPct(data.dividend_yield) },
    { label: 'Tageshoch', value: fmtMoney(data.day_high, ccy) },
    { label: 'Tagestief', value: fmtMoney(data.day_low, ccy) },
    { label: 'Vortagesschluss', value: fmtMoney(data.previous_close, ccy) },
    { label: 'Volumen', value: fmtCompact(data.volume) },
    { label: 'Ø Volumen', value: fmtCompact(data.average_volume) },
  ].filter((m) => m.value != null);

  const has52w = data.fifty_two_week_high != null && data.fifty_two_week_low != null;
  const has52wCurrent = has52w && typeof currentPrice === 'number';
  const inRangePct = has52wCurrent
    ? Math.max(0, Math.min(1, (currentPrice - data.fifty_two_week_low) / (data.fifty_two_week_high - data.fifty_two_week_low)))
    : null;

  const showProfile = data.sector || data.industry || data.exchange;

  return (
    <>
      {has52w && (
        <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="public-stock-52w">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">
            52-Wochen-Spanne
          </p>
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">
            <span className="tabular-nums text-bank-text">{fmtMoney(data.fifty_two_week_low, ccy)}</span>
            <span className="tabular-nums text-bank-text">{fmtMoney(data.fifty_two_week_high, ccy)}</span>
          </div>
          <div className="relative mt-3 h-1.5 w-full overflow-visible rounded-full bg-bank-border/60">
            {has52wCurrent && (
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${inRangePct * 100}%` }}
                aria-label={`Aktueller Kurs ${fmtMoney(currentPrice, ccy)}`}
              >
                <div className="h-3 w-3 rounded-full bg-bank-primary shadow-md ring-2 ring-white dark:ring-bank-surface" />
              </div>
            )}
          </div>
          {has52wCurrent && (
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              Aktuell · {fmtMoney(currentPrice, ccy)}
            </p>
          )}
        </section>
      )}

      {metrics.length > 0 && (
        <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="public-stock-metrics">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">
            Kennzahlen
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label}>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{m.label}</dt>
                <dd className="mt-1 rate-figure text-[1.15rem] font-light tabular-nums text-bank-text">{m.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
            Quelle: yfinance · Datenstand · {data.data_updated_at ? new Date(data.data_updated_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr' : '—'}
          </p>
        </section>
      )}

      {showProfile && (
        <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="public-stock-profile">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Unternehmen</p>
          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {data.sector && <ProfileRow label="Sektor" value={data.sector} />}
            {data.industry && <ProfileRow label="Branche" value={data.industry} />}
            {data.exchange && <ProfileRow label="Börse" value={data.exchange} />}
          </dl>
        </section>
      )}
    </>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</dt>
      <dd className="mt-1 text-[14px] text-bank-text">{value}</dd>
    </div>
  );
}
