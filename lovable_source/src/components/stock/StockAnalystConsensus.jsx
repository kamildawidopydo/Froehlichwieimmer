import { getApiBase } from '@/lib/apiBase';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const API_BASE = getApiBase();

// ---- formatters -------------------------------------------------------------
const fmtNum = (v, digits = 2) => {
  if (v == null || Number.isNaN(v)) return null;
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
};
const fmtCompact = (v) => {
  if (v == null || Number.isNaN(v)) return null;
  try { return new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 2 }).format(v); }
  catch { return fmtNum(v); }
};
const fmtMoney = (v, ccy = 'EUR', digits = 2) => {
  if (v == null || Number.isNaN(v)) return null;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: ccy, minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(v);
  } catch { return `${Number(v).toFixed(digits)} ${ccy}`; }
};
const fmtMoneyCompact = (v, ccy = 'EUR') => {
  if (v == null || Number.isNaN(v)) return null;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: ccy, notation: 'compact', maximumFractionDigits: 2,
    }).format(v);
  } catch { return fmtCompact(v); }
};
const fmtPct = (v, digits = 1) => {
  if (v == null || Number.isNaN(v)) return null;
  const s = v > 0 ? '+' : '';
  return `${s}${Number(v).toFixed(digits)} %`;
};
const fmtPctPlain = (v, digits = 1) => {
  if (v == null || Number.isNaN(v)) return null;
  return `${Number(v).toFixed(digits)} %`;
};

/**
 * Tool-Paket 2/4 — Analystenkonsens, Kursziele, Bewertung & Profitabilität.
 * Uses only real yfinance values via GET /api/stocks/{symbol}/analyst.
 * Missing values stay hidden or show "—". No fabricated ratings/targets.
 */
export default function StockAnalystConsensus({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/stocks/${encodeURIComponent(symbol)}/analyst`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [symbol]);

  if (loading) {
    return (
      <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="stock-analyst-loading">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Analysten-Einschätzungen</p>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">Daten werden geladen …</p>
      </section>
    );
  }
  if (error || !data || data.data_source === 'unavailable') {
    return (
      <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="stock-analyst-empty">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Analysten-Einschätzungen</p>
        <p className="mt-6 text-[13.5px] leading-relaxed text-bank-text-muted">
          Für diese Aktie liegen derzeit keine ausreichenden Analystendaten vor.
        </p>
      </section>
    );
  }

  const ccy = data.currency || 'EUR';
  const rec = data.recommendations || {};
  const pt = data.price_target || {};
  const val = data.valuation || {};
  const prof = data.profitability || {};
  const hasConsensus = !!data.has_consensus;
  const hasTarget = !!data.has_target;

  return (
    <>
      {(hasConsensus || hasTarget) && (
        <section
          className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10"
          data-testid="stock-analyst-section"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">
            Analysten-Einschätzungen
          </p>
          <h2 className="mt-3 font-display text-[1.6rem] font-light leading-tight text-bank-text">
            Was Analysten über {symbol} sagen
          </h2>

          {hasConsensus && <ConsensusBlock rec={rec} />}

          {hasTarget && <PriceTargetBlock pt={pt} ccy={ccy} />}

          <p className="mt-8 text-[12px] leading-relaxed text-bank-text-muted">
            Analystenkursziele sind Einschätzungen Dritter und keine Garantie
            für die zukünftige Kursentwicklung.
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
            Quelle: yfinance{rec.period ? ` · Zeitraum · ${formatPeriod(rec.period)}` : ''}
          </p>
        </section>
      )}

      <ValuationBlock val={val} ccy={ccy} />
      <ProfitabilityBlock prof={prof} ccy={ccy} />
      <ReadingBlock rec={rec} pt={pt} val={val} prof={prof} ccy={ccy} />
    </>
  );
}

// ---- Consensus (analyst distribution) --------------------------------------
function ConsensusBlock({ rec }) {
  const buckets = [
    { key: 'strong_buy', label: 'Strong Buy', tone: 'buy' },
    { key: 'buy',        label: 'Buy',        tone: 'buy' },
    { key: 'hold',       label: 'Hold',       tone: 'hold' },
    { key: 'sell',       label: 'Sell',       tone: 'sell' },
    { key: 'strong_sell', label: 'Strong Sell', tone: 'sell' },
  ].map((b) => ({ ...b, count: Number.isInteger(rec[b.key]) ? rec[b.key] : 0, has: Number.isInteger(rec[b.key]) }));

  const sumAll = buckets.reduce((a, b) => a + (b.has ? b.count : 0), 0);
  const buyCount = buckets.filter((b) => b.tone === 'buy').reduce((a, b) => a + b.count, 0);
  const holdCount = buckets.filter((b) => b.tone === 'hold').reduce((a, b) => a + b.count, 0);
  const sellCount = buckets.filter((b) => b.tone === 'sell').reduce((a, b) => a + b.count, 0);

  const totalDisplay = Number.isInteger(rec.total) && rec.total > 0
    ? rec.total
    : sumAll > 0 ? sumAll : null;

  const buyPct = sumAll > 0 ? (buyCount / sumAll) * 100 : 0;
  const holdPct = sumAll > 0 ? (holdCount / sumAll) * 100 : 0;
  const sellPct = sumAll > 0 ? (sellCount / sumAll) * 100 : 0;

  return (
    <div className="mt-8" data-testid="stock-analyst-consensus">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">Analysten insgesamt</p>
          <p className="mt-1.5 rate-figure text-[2rem] font-light tabular-nums text-bank-text" data-testid="analyst-total">
            {totalDisplay != null ? totalDisplay : '—'}
          </p>
        </div>
        <BucketCell label="Kaufen" count={buyCount} tone="positive" testid="analyst-buy" />
        <BucketCell label="Halten" count={holdCount} tone="muted" testid="analyst-hold" />
        <BucketCell label="Verkaufen" count={sellCount} tone="negative" testid="analyst-sell" />
      </div>

      {sumAll > 0 && (
        <div className="mt-6" aria-label={`Analystenverteilung: ${buyCount} Kaufen, ${holdCount} Halten, ${sellCount} Verkaufen`}>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-bank-border/60">
            {buyPct > 0 && <span className="h-full bg-bank-primary" style={{ width: `${buyPct}%` }} />}
            {holdPct > 0 && <span className="h-full bg-bank-text-muted/60" style={{ width: `${holdPct}%` }} />}
            {sellPct > 0 && <span className="h-full bg-red-500/80" style={{ width: `${sellPct}%` }} />}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-bank-text-muted">
            <LegendDot color="bg-bank-primary" label={`Kaufen ${Math.round(buyPct)} %`} />
            <LegendDot color="bg-bank-text-muted/60" label={`Halten ${Math.round(holdPct)} %`} />
            <LegendDot color="bg-red-500/80" label={`Verkaufen ${Math.round(sellPct)} %`} />
          </div>
        </div>
      )}

      {/* Original provider buckets for transparency */}
      {(rec.strong_buy != null || rec.strong_sell != null) && (
        <details className="mt-6 group">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted transition-colors hover:text-bank-text">
            Detaillierte Provider-Kategorien anzeigen
          </summary>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
            {[
              ['Strong Buy', rec.strong_buy],
              ['Buy', rec.buy],
              ['Hold', rec.hold],
              ['Sell', rec.sell],
              ['Strong Sell', rec.strong_sell],
            ].map(([label, count]) => (
              <div key={label}>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</dt>
                <dd className="mt-1 rate-figure text-[1.1rem] font-light tabular-nums text-bank-text">
                  {Number.isInteger(count) ? count : '—'}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}

function BucketCell({ label, count, tone, testid }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</p>
      <p
        className={cn(
          'mt-1.5 rate-figure text-[2rem] font-light tabular-nums',
          tone === 'positive' && 'text-bank-primary-strong',
          tone === 'negative' && 'text-red-600 dark:text-red-400',
          tone === 'muted' && 'text-bank-text',
        )}
        data-testid={testid}
      >
        {count}
      </p>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-block h-2 w-3 rounded-sm', color)} aria-hidden />
      {label}
    </span>
  );
}

// ---- Price target block + range visualization ------------------------------
function PriceTargetBlock({ pt, ccy }) {
  const { mean, low, high, current, upside_pct } = pt;
  const upsidePositive = typeof upside_pct === 'number' && upside_pct >= 0;

  return (
    <div className="mt-10 border-t border-bank-border pt-8" data-testid="stock-price-target">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Kursziele</p>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        <TargetCell label="Aktueller Kurs" value={fmtMoney(current, ccy)} />
        <TargetCell label="Ø Kursziel" value={fmtMoney(mean, ccy)} emphasis testid="target-mean" />
        <TargetCell label="Niedrigstes Ziel" value={fmtMoney(low, ccy)} />
        <TargetCell label="Höchstes Ziel" value={fmtMoney(high, ccy)} />
      </dl>

      {typeof upside_pct === 'number' && (
        <p
          className={cn(
            'mt-6 font-mono text-[11px] uppercase tracking-[0.16em]',
            upsidePositive ? 'text-bank-primary-strong' : 'text-red-600 dark:text-red-400',
          )}
          data-testid="target-upside"
        >
          Abstand zum Ø Kursziel · {fmtPct(upside_pct)}
        </p>
      )}

      <TargetRange low={low} mean={mean} high={high} current={current} ccy={ccy} />
    </div>
  );
}

function TargetCell({ label, value, emphasis, testid }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</p>
      <p
        className={cn(
          'mt-1.5 rate-figure tabular-nums',
          emphasis ? 'text-[1.75rem] font-light text-bank-gold' : 'text-[1.35rem] font-light text-bank-text',
        )}
        data-testid={testid}
      >
        {value || '—'}
      </p>
    </div>
  );
}

function TargetRange({ low, mean, high, current, ccy }) {
  const vals = [low, mean, high, current].filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(max - min, 0.0001);
  const pos = (v) => (typeof v === 'number' ? ((v - min) / span) * 100 : null);

  const markers = [
    { key: 'low', label: 'Tief', value: low, tone: 'muted', top: false },
    { key: 'current', label: 'Aktuell', value: current, tone: 'accent', top: true },
    { key: 'mean', label: 'Ø Ziel', value: mean, tone: 'primary', top: false },
    { key: 'high', label: 'Hoch', value: high, tone: 'muted', top: true },
  ].filter((m) => typeof m.value === 'number');

  return (
    <div className="mt-8" role="img" aria-label={`Kursziel-Spanne von ${fmtMoney(min, ccy)} bis ${fmtMoney(max, ccy)}, aktueller Kurs ${fmtMoney(current, ccy)}`}>
      <div className="relative h-24">
        {/* rail */}
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-bank-border" />
        {/* Ø target thicker segment from low → high */}
        {typeof low === 'number' && typeof high === 'number' && (
          <div
            className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-bank-primary/40"
            style={{ left: `${pos(low)}%`, width: `${Math.max(0, pos(high) - pos(low))}%` }}
          />
        )}
        {markers.map((m) => {
          const p = pos(m.value);
          const color = m.tone === 'accent'
            ? 'bg-bank-gold'
            : m.tone === 'primary'
              ? 'bg-bank-primary'
              : 'bg-bank-text-muted';
          const labelClass = m.tone === 'accent'
            ? 'text-bank-gold'
            : m.tone === 'primary'
              ? 'text-bank-primary-strong'
              : 'text-bank-text-muted';
          return (
            <div key={m.key} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${p}%` }}>
              <span className={cn('block h-3 w-3 rounded-full ring-2 ring-white dark:ring-bank-surface', color)} />
              <div
                className={cn(
                  'absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center',
                  m.top ? 'bottom-full mb-3' : 'top-full mt-3',
                )}
              >
                <p className={cn('font-mono text-[9.5px] uppercase tracking-[0.18em]', labelClass)}>{m.label}</p>
                <p className="mt-0.5 rate-figure text-[13px] font-light tabular-nums text-bank-text">
                  {fmtMoney(m.value, ccy)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Valuation block --------------------------------------------------------
function ValuationBlock({ val, ccy }) {
  const metrics = [
    { label: 'KGV (trailing)', value: fmtNum(val.trailing_pe) },
    { label: 'Forward-KGV', value: fmtNum(val.forward_pe) },
    { label: 'Kurs / Umsatz (P/S)', value: fmtNum(val.price_to_sales) },
    { label: 'Kurs / Buchwert (P/B)', value: fmtNum(val.price_to_book) },
    { label: 'EV / EBITDA', value: fmtNum(val.ev_to_ebitda) },
    { label: 'PEG Ratio', value: fmtNum(val.peg_ratio) },
    { label: 'Marktkapitalisierung', value: fmtMoneyCompact(val.market_cap, ccy) },
    { label: 'Enterprise Value', value: fmtMoneyCompact(val.enterprise_value, ccy) },
    { label: 'Dividendenrendite', value: fmtPctPlain(val.dividend_yield, 2) },
  ].filter((m) => m.value != null);

  if (metrics.length === 0) return null;

  return (
    <section
      className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10"
      data-testid="stock-valuation"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Bewertung</p>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{m.label}</dt>
            <dd className="mt-1 rate-figure text-[1.15rem] font-light tabular-nums text-bank-text">{m.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ---- Profitability block ----------------------------------------------------
function ProfitabilityBlock({ prof, ccy }) {
  const metrics = [
    { label: 'Umsatzwachstum', value: fmtPct(prof.revenue_growth) },
    { label: 'Gewinnwachstum', value: fmtPct(prof.earnings_growth) },
    { label: 'Operative Marge', value: fmtPctPlain(prof.operating_margin) },
    { label: 'Nettomarge', value: fmtPctPlain(prof.profit_margin) },
    { label: 'Eigenkapitalrendite (ROE)', value: fmtPctPlain(prof.return_on_equity) },
    { label: 'Free Cashflow', value: fmtMoneyCompact(prof.free_cashflow, ccy) },
    { label: 'Verschuldung (D/E)', value: fmtNum(prof.debt_to_equity) },
  ].filter((m) => m.value != null);

  if (metrics.length === 0) return null;

  return (
    <section
      className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10"
      data-testid="stock-profitability"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Profitabilität &amp; Qualität</p>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <dt className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{m.label}</dt>
            <dd className="mt-1 rate-figure text-[1.15rem] font-light tabular-nums text-bank-text">{m.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ---- Neutral reading ("Einordnung") ---------------------------------------
function ReadingBlock({ rec, pt, val, prof, ccy }) {
  const lines = useMemo(() => buildReading({ rec, pt, val, prof, ccy }), [rec, pt, val, prof, ccy]);
  if (lines.length === 0) return null;
  return (
    <section
      className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10"
      data-testid="stock-reading"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Einordnung</p>
      <ul className="mt-6 space-y-3 text-[13.5px] leading-relaxed text-bank-text">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-2 inline-block h-[3px] w-4 shrink-0 bg-bank-primary/60" aria-hidden />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function buildReading({ rec, pt, val, prof, ccy }) {
  const out = [];
  const upside = typeof pt.upside_pct === 'number' ? pt.upside_pct : null;
  if (upside != null && pt.mean != null) {
    const abs = Math.abs(upside).toFixed(1);
    if (upside >= 0) {
      out.push(`Das durchschnittliche Analystenkursziel von ${fmtMoney(pt.mean, ccy)} liegt ${abs} % über dem aktuellen Kurs.`);
    } else {
      out.push(`Das durchschnittliche Analystenkursziel von ${fmtMoney(pt.mean, ccy)} liegt ${abs} % unter dem aktuellen Kurs.`);
    }
  }

  if (Number.isInteger(rec.total) && rec.total > 0) {
    const buy = (Number.isInteger(rec.strong_buy) ? rec.strong_buy : 0) + (Number.isInteger(rec.buy) ? rec.buy : 0);
    const hold = Number.isInteger(rec.hold) ? rec.hold : 0;
    const sell = (Number.isInteger(rec.sell) ? rec.sell : 0) + (Number.isInteger(rec.strong_sell) ? rec.strong_sell : 0);
    out.push(`Insgesamt bewerten ${rec.total} Analysten diese Aktie: ${buy}× Kaufen, ${hold}× Halten, ${sell}× Verkaufen.`);
  }

  if (typeof val.forward_pe === 'number' && typeof val.trailing_pe === 'number') {
    if (val.forward_pe < val.trailing_pe) {
      out.push(`Das Forward-KGV (${fmtNum(val.forward_pe)}) liegt unter dem aktuellen KGV (${fmtNum(val.trailing_pe)}).`);
    } else if (val.forward_pe > val.trailing_pe) {
      out.push(`Das Forward-KGV (${fmtNum(val.forward_pe)}) liegt über dem aktuellen KGV (${fmtNum(val.trailing_pe)}).`);
    }
  }

  if (typeof prof.operating_margin === 'number') {
    out.push(`Die operative Marge beträgt ${fmtPctPlain(prof.operating_margin)}.`);
  }
  if (typeof prof.revenue_growth === 'number') {
    out.push(`Das Umsatzwachstum liegt bei ${fmtPct(prof.revenue_growth)}.`);
  }
  return out.slice(0, 5);
}

function formatPeriod(p) {
  // yfinance recommendations period comes as e.g. "0m" (current), "-1m" (last).
  if (!p) return '';
  if (p === '0m') return 'aktueller Monat';
  const m = String(p).match(/^-?(\d+)m$/);
  if (m) return `letzte ${m[1]} Monate`;
  return p;
}
