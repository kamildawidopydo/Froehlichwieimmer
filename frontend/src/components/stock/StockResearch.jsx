import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const fmtCurrency = (v, ccy = 'USD', digits = 2) => {
  if (v == null || Number.isNaN(v)) return '—';
  try { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: ccy, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v); }
  catch { return `${Number(v).toFixed(digits)} ${ccy}`; }
};
const fmtCompact = (v, ccy = 'USD') => {
  if (v == null || Number.isNaN(v)) return '—';
  try { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: ccy, notation: 'compact', maximumFractionDigits: 2 }).format(v); }
  catch { return String(v); }
};
const fmtPct = (v, digits = 2) => (v == null || Number.isNaN(v)) ? '—' : `${Number(v).toFixed(digits)} %`;
const fmtPctSigned = (v, digits = 2) => {
  if (v == null || Number.isNaN(v)) return '—';
  const s = v > 0 ? '+' : '';
  return `${s}${Number(v).toFixed(digits)} %`;
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso)); }
  catch { return iso; }
};

const TAG_LABEL = { niedrig: 'niedrig', mittel: 'mittel', hoch: 'hoch' };
const TAG_COLORS = {
  niedrig: 'bg-bank-text-muted/15 text-bank-text',
  mittel:  'bg-bank-primary/10 text-bank-primary-strong',
  hoch:    'bg-bank-gold/15 text-bank-gold',
};

/**
 * Tool-Paket 5 — Professional Research Suite.
 * Bundled `GET /api/stocks/{symbol}/research`. All values from yfinance,
 * fabrication-free: missing fields → hidden or "—".
 */
export default function StockResearch({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ddRange, setDdRange] = useState('5y');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    fetch(`${API_BASE}/api/stocks/${encodeURIComponent(symbol)}/research`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [symbol]);

  if (loading) {
    return (
      <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="stock-research-loading">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Research</p>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">Daten werden geladen …</p>
      </section>
    );
  }
  if (error || !data || data.data_source === 'unavailable') return null;

  const ccy = data.currency || 'USD';
  const tags = data.summary_tags || {};
  const financials = data.financials || [];
  const dd = (data.drawdown || {})[ddRange] || { series: [] };
  const cur = dd.current_dd_pct;
  const max = dd.max_dd_pct;
  const val = data.valuation_snapshot || {};
  const dq = data.data_quality || {};
  const cases = data.investment_case || { opportunities: [], risks: [], watch: [] };

  return (
    <section
      className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10"
      data-testid="stock-research"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Research</p>
      <h2 className="mt-3 font-display text-[1.6rem] font-light leading-tight text-bank-text">
        Was die Zahlen über {symbol} sagen
      </h2>

      {/* Summary tags */}
      <SummaryTags tags={tags} />

      {/* Investment case */}
      <InvestmentCase cases={cases} />

      {/* Financials 5y */}
      {financials.length >= 1 && <Financials rows={financials} ccy={ccy} />}

      {/* Valuation snapshot */}
      <ValuationSnapshot val={val} />

      {/* Drawdown */}
      {dd.series?.length >= 2 && (
        <Drawdown range={ddRange} onRange={setDdRange} current={cur} max={max} series={dd.series} />
      )}

      {/* Data quality */}
      <DataQuality dq={dq} thresholds={data.thresholds} />

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
        Quelle: yfinance · Alle Kennzahlen basieren auf echten Providerdaten. Diese Analyse stellt keine Anlageberatung dar.
      </p>
    </section>
  );
}

// ---- Summary tags ---------------------------------------------------------
function SummaryTags({ tags }) {
  const entries = [
    ['Bewertung', tags.valuation],
    ['Wachstum', tags.growth],
    ['Profitabilität', tags.profitability],
    ['Dividende', tags.dividend],
    ['Risiko', tags.risk],
  ].filter(([, v]) => v);
  if (entries.length === 0) return null;
  return (
    <div className="mt-8 flex flex-wrap gap-3" data-testid="research-tags" role="list" aria-label="Research-Zusammenfassung">
      {entries.map(([label, v]) => (
        <div
          key={label}
          role="listitem"
          className={cn('inline-flex flex-col rounded-lg border border-bank-border px-4 py-3', TAG_COLORS[v] || TAG_COLORS.mittel)}
        >
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] opacity-80">{label}</span>
          <span className="mt-0.5 font-mono text-[12px] uppercase tracking-[0.14em]">{TAG_LABEL[v] || '—'}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Investment case ------------------------------------------------------
function InvestmentCase({ cases }) {
  const { opportunities = [], risks = [], watch = [] } = cases;
  if (opportunities.length + risks.length + watch.length === 0) return null;
  const Column = ({ title, items, tone }) => (
    <div>
      <p className={cn(
        'font-mono text-[10px] uppercase tracking-[0.22em]',
        tone === 'pos' && 'text-bank-primary-strong',
        tone === 'neg' && 'text-red-600 dark:text-red-400',
        tone === 'watch' && 'text-bank-gold',
      )}>{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-bank-text-muted">Keine Punkte aus den vorliegenden Daten ableitbar.</p>
      ) : (
        <ul className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-bank-text">
          {items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <span
                className={cn('mt-2 inline-block h-[3px] w-4 shrink-0',
                  tone === 'pos' && 'bg-bank-primary/70',
                  tone === 'neg' && 'bg-red-500/70',
                  tone === 'watch' && 'bg-bank-gold/70')}
                aria-hidden
              />
              <span>
                {it.text}
                {it.source && (
                  <span className="ml-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                    · {it.source}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div className="mt-10 grid grid-cols-1 gap-8 border-t border-bank-border pt-8 sm:grid-cols-3" data-testid="research-case">
      <Column title="Chancen" items={opportunities} tone="pos" />
      <Column title="Risiken" items={risks} tone="neg" />
      <Column title="Zu beobachten" items={watch} tone="watch" />
    </div>
  );
}

// ---- Financials 5y --------------------------------------------------------
function Financials({ rows, ccy }) {
  const revs = rows.map((r) => r.revenue);
  const nis = rows.map((r) => r.net_income);
  const fcfs = rows.map((r) => r.free_cashflow);
  const has = (arr) => arr.some((v) => v != null);
  return (
    <div className="mt-10 border-t border-bank-border pt-8" data-testid="research-financials">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Finanzentwicklung · letzte Geschäftsjahre</p>
      <div className="mt-6 space-y-8">
        {has(revs) && <SeriesRow label="Umsatz" ccy={ccy} rows={rows} field="revenue" />}
        {has(nis) && <SeriesRow label="Nettogewinn" ccy={ccy} rows={rows} field="net_income" />}
        {rows.some((r) => r.eps != null) && <SeriesRow label="Gewinn je Aktie (EPS)" ccy={ccy} rows={rows} field="eps" money digits={2} />}
        {has(fcfs) && <SeriesRow label="Free Cashflow" ccy={ccy} rows={rows} field="free_cashflow" />}
        {rows.some((r) => r.operating_margin_pct != null) && <SeriesRow label="Operative Marge" rows={rows} field="operating_margin_pct" pct />}
      </div>
    </div>
  );
}

function SeriesRow({ label, ccy, rows, field, pct, money, digits = 0 }) {
  const values = rows.map((r) => r[field]);
  const valid = values.filter((v) => typeof v === 'number');
  if (valid.length < 1) return null;
  const maxAbs = Math.max(...valid.map((v) => Math.abs(v)), 0.0001);
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-bank-text-muted">{label}</p>
      <div className="mt-3 grid grid-flow-col auto-cols-fr items-end gap-3 h-24" role="img"
        aria-label={`${label} über ${rows.length} Geschäftsjahre`}>
        {rows.map((r, i) => {
          const v = r[field];
          const h = v == null ? 0 : Math.round((Math.abs(v) / maxAbs) * 100);
          const negative = typeof v === 'number' && v < 0;
          return (
            <div key={i} className="flex h-full flex-col items-center justify-end">
              <span className="mb-1 font-mono text-[9.5px] tabular-nums text-bank-text-muted">
                {v == null ? '—'
                  : pct ? fmtPct(v, 1)
                  : money ? fmtCurrency(v, ccy, digits)
                  : fmtCompact(v, ccy)}
              </span>
              <div
                className={cn('w-full rounded-t-sm', negative ? 'bg-red-500/70' : 'bg-bank-primary/75')}
                style={{ height: `${h}%`, minHeight: v == null ? '0' : '2px' }}
                title={`${r.fiscal_year || ''}: ${v == null ? '—' : v}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-flow-col auto-cols-fr gap-3">
        {rows.map((r, i) => (
          <p key={i} className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-bank-text-muted">
            {r.fiscal_year || '—'}
          </p>
        ))}
      </div>
    </div>
  );
}

// ---- Valuation snapshot ---------------------------------------------------
function ValuationSnapshot({ val }) {
  const items = [
    ['KGV (trailing)', val.trailing_pe],
    ['Forward-KGV', val.forward_pe],
    ['Kurs / Umsatz', val.price_to_sales],
    ['Kurs / Buchwert', val.price_to_book],
  ].filter(([, v]) => v != null);
  if (items.length === 0) return null;
  return (
    <div className="mt-10 border-t border-bank-border pt-8" data-testid="research-valuation">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Historische Bewertung</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {items.map(([label, v]) => (
          <div key={label}>
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</dt>
            <dd className="mt-1 rate-figure text-[1.2rem] font-light tabular-nums text-bank-text">
              {Number(v).toLocaleString('de-DE', { maximumFractionDigits: 2 })}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12px] leading-relaxed text-bank-text-muted">
        Aktuelle Bewertungskennzahlen. Eine belastbare historische Multiple-Zeitreihe kann aus der bestehenden Providerbasis nicht rekonstruiert werden — daher werden hier keine Median-/Spannenwerte über die Zeit ausgewiesen.
      </p>
    </div>
  );
}

// ---- Drawdown -------------------------------------------------------------
const DD_RANGES = [{ key: '1y', label: '1 Jahr' }, { key: '3y', label: '3 Jahre' }, { key: '5y', label: '5 Jahre' }];

function Drawdown({ range, onRange, current, max, series }) {
  const W = 1000, H = 200, PAD = { l: 6, r: 6, t: 12, b: 20 };
  const dds = series.map((p) => p.dd);
  const minY = Math.min(...dds, 0);
  const maxY = 0;
  const spanY = Math.max(-minY, 0.001);
  const n = series.length;
  const x = (i) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + ((v - maxY) / -spanY) * (H - PAD.t - PAD.b);
  const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p.dd).toFixed(2)}`).join(' ');
  const area = `${path} L${x(n - 1).toFixed(2)},${y(0).toFixed(2)} L${x(0).toFixed(2)},${y(0).toFixed(2)} Z`;
  return (
    <div className="mt-10 border-t border-bank-border pt-8" data-testid="research-drawdown">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Historische Rückschläge</p>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Drawdown-Zeitraum">
          {DD_RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={range === r.key}
              onClick={() => onRange(r.key)}
              className={cn(
                'min-h-[36px] min-w-[80px] rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40',
                range === r.key ? 'bg-bank-primary/10 text-bank-primary-strong' : 'text-bank-text-muted hover:text-bank-text',
              )}
              data-testid={`dd-range-${r.key}`}
            >{r.label}</button>
          ))}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">Aktueller Drawdown</dt>
          <dd className={cn('mt-1 rate-figure text-[1.35rem] font-light tabular-nums', current < 0 ? 'text-red-600 dark:text-red-400' : 'text-bank-text')}>
            {fmtPctSigned(current, 2)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">Maximum Drawdown</dt>
          <dd className="mt-1 rate-figure text-[1.35rem] font-light tabular-nums text-red-600 dark:text-red-400">
            {fmtPct(max, 2)}
          </dd>
        </div>
      </dl>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        className="mt-6 h-[180px] w-full text-red-500"
        role="img"
        aria-label={`Drawdown-Verlauf ${range}: aktueller ${current}% Rückschlag, Maximum ${max}%`}>
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity="0.2" />
        <path d={area} fill="rgba(220,38,38,0.10)" />
        <path d={path} fill="none" stroke="currentColor" strokeOpacity="0.85" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

// ---- Data quality ---------------------------------------------------------
function DataQuality({ dq, thresholds }) {
  const items = [
    ['Kurs-Datenquelle', dq.price_source],
    ['Fundamentals-Quelle', dq.fundamentals_source],
    ['Börse', dq.exchange],
    ['Handelswährung', dq.currency],
    ['Historie seit', dq.history_start ? fmtDate(dq.history_start) : null],
    ['Benchmark', dq.benchmark],
  ].filter(([, v]) => v);
  return (
    <div className="mt-10 border-t border-bank-border pt-8" data-testid="research-quality">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Daten &amp; Aktualität</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {items.map(([label, v]) => (
          <div key={label}>
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</dt>
            <dd className="mt-0.5 text-[13px] text-bank-text">{v}</dd>
          </div>
        ))}
      </dl>
      {dq.is_delayed_notice && (
        <p className="mt-3 text-[12px] leading-relaxed text-bank-text-muted">{dq.is_delayed_notice}</p>
      )}
      {thresholds && (
        <details className="mt-3 group">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted transition-colors hover:text-bank-text">
            Klassifikationsgrenzen anzeigen
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] leading-relaxed text-bank-text-muted sm:grid-cols-2">
            <p>Bewertung (KGV): niedrig &lt; {thresholds.valuation.low} · mittel {thresholds.valuation.low}–{thresholds.valuation.high} · hoch &gt; {thresholds.valuation.high}</p>
            <p>Wachstum (Umsatz %): niedrig &lt; {thresholds.growth.low} · mittel {thresholds.growth.low}–{thresholds.growth.high} · hoch &gt; {thresholds.growth.high}</p>
            <p>Profitabilität (Netto-Marge %): niedrig &lt; {thresholds.profitability.low} · mittel {thresholds.profitability.low}–{thresholds.profitability.high} · hoch &gt; {thresholds.profitability.high}</p>
            <p>Dividende (Yield %): niedrig &lt; {thresholds.dividend.low} · mittel {thresholds.dividend.low}–{thresholds.dividend.high} · hoch &gt; {thresholds.dividend.high}</p>
            <p>Risiko (Vola p.a. %): niedrig &lt; {thresholds.risk.low} · mittel {thresholds.risk.low}–{thresholds.risk.high} · hoch &gt; {thresholds.risk.high}</p>
          </div>
        </details>
      )}
    </div>
  );
}
