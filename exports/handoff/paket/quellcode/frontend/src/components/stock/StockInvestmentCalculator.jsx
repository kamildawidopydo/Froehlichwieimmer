import { getApiBase } from '@/lib/apiBase';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const API_BASE = getApiBase();

const BENCHMARK_LABEL = { NDX: 'Nasdaq-100', DAX: 'DAX' };
const TICKER_TO_BENCHMARK = {
  NVDA: 'NDX', AAPL: 'NDX', MSFT: 'NDX', GOOGL: 'NDX', AMZN: 'NDX',
  SAP: 'DAX', SIE: 'DAX', ALV: 'DAX', DBK: 'DAX', IFX: 'DAX', RHM: 'DAX',
};
const RANGES = [
  { key: '1m', label: '1 Monat' },
  { key: '3m', label: '3 Monate' },
  { key: '1y', label: '1 Jahr' },
  { key: '5y', label: '5 Jahre' },
];
const QUICK_AMOUNTS = [10000, 20000, 50000, 100000];

const fmtMoney = (v, ccy) => {
  if (v == null || Number.isNaN(v)) return '—';
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: ccy || 'EUR', maximumFractionDigits: 0 }).format(v);
  } catch { return `${Math.round(v).toLocaleString('de-DE')} ${ccy}`; }
};
const fmtPct = (v, digits = 2) => {
  if (v == null || Number.isNaN(v)) return '—';
  const s = v > 0 ? '+' : '';
  return `${s}${Number(v).toFixed(digits)} %`;
};

async function fetchHistory(symbol, range) {
  const r = await fetch(`${API_BASE}/api/stocks/${encodeURIComponent(symbol)}/history?range=${range}`);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/**
 * Investment calculator + real benchmark comparison. Uses only historical
 * close prices from /api/stocks/{symbol}/history — no simulation, no dividends.
 */
export default function StockInvestmentCalculator({ symbol, currency = 'EUR' }) {
  const benchmark = TICKER_TO_BENCHMARK[symbol];
  const [range, setRange] = useState('1y');
  const [amount, setAmount] = useState(20000);
  const [stockData, setStockData] = useState({ points: [], source: null });
  const [benchData, setBenchData] = useState({ points: [], source: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchHistory(symbol, range).catch(() => ({ points: [], data_source: 'unavailable' })),
      benchmark ? fetchHistory(benchmark, range).catch(() => ({ points: [], data_source: 'unavailable' })) : Promise.resolve({ points: [], data_source: 'unavailable' }),
    ]).then(([s, b]) => {
      if (!alive) return;
      setStockData({ points: s.points || [], source: s.data_source });
      setBenchData({ points: b.points || [], source: b.data_source });
      setLoading(false);
    });
    return () => { alive = false; };
  }, [symbol, range, benchmark]);

  // Sync ranges on common timestamps (day-precision) so returns are comparable.
  const { stockReturn, benchReturn, stockStart, stockEnd, normalised } = useMemo(() => {
    const s = stockData.points;
    const b = benchData.points;
    if (!s || s.length < 2) return { stockReturn: null, benchReturn: null, stockStart: null, stockEnd: null, normalised: [] };
    const dayKey = (iso) => (iso || '').slice(0, 10);
    const bMap = new Map(b.map((p) => [dayKey(p.timestamp), p.close]));
    // Find first + last common day where both stock and bench have a close.
    let firstIdx = -1, lastIdx = -1;
    for (let i = 0; i < s.length; i++) {
      if (bMap.has(dayKey(s[i].timestamp))) {
        if (firstIdx === -1) firstIdx = i;
        lastIdx = i;
      }
    }
    // Stock return: use full stock range even if benchmark absent.
    const sStart = s[0].close, sEnd = s[s.length - 1].close;
    const stockReturn = sStart > 0 ? ((sEnd - sStart) / sStart) * 100 : null;

    let benchReturn = null, normalised = [];
    if (firstIdx !== -1 && lastIdx > firstIdx) {
      const s0 = s[firstIdx].close;
      const b0 = bMap.get(dayKey(s[firstIdx].timestamp));
      const sN = s[lastIdx].close;
      const bN = bMap.get(dayKey(s[lastIdx].timestamp));
      benchReturn = b0 > 0 ? ((bN - b0) / b0) * 100 : null;
      normalised = s.slice(firstIdx, lastIdx + 1).map((p) => {
        const bClose = bMap.get(dayKey(p.timestamp));
        return {
          t: p.timestamp,
          stock: (p.close / s0) * 100,
          bench: bClose ? (bClose / b0) * 100 : null,
        };
      });
    }
    return { stockReturn, benchReturn, stockStart: sStart, stockEnd: sEnd, normalised };
  }, [stockData, benchData]);

  const endValue = stockReturn != null ? amount * (1 + stockReturn / 100) : null;
  const gain = endValue != null ? endValue - amount : null;
  const stockPositive = (stockReturn ?? 0) >= 0;
  const diffPP = (stockReturn != null && benchReturn != null) ? stockReturn - benchReturn : null;

  return (
    <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="stock-investment-calc">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">
        Investment-Rechner
      </p>
      <h2 className="mt-3 font-display text-[1.6rem] font-light leading-tight text-bank-text">
        Was wäre aus Ihrem Einsatz geworden?
      </h2>

      {/* Inputs */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="calc-amount" className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">
            Anlagebetrag (€)
          </label>
          <input
            id="calc-amount"
            type="number"
            min="100"
            step="500"
            value={amount}
            onChange={(e) => setAmount(Math.max(100, Number(e.target.value) || 0))}
            className="mt-2 w-full min-h-[44px] rounded-lg border border-bank-border bg-white px-4 py-2 text-[18px] font-light tabular-nums text-bank-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 dark:bg-bank-bg dark:text-bank-text"
            data-testid="calc-amount-input"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className={cn(
                  'min-h-[36px] rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40',
                  amount === v ? 'bg-bank-primary/10 text-bank-primary-strong' : 'text-bank-text-muted hover:text-bank-text',
                )}
              >{v.toLocaleString('de-DE')} €</button>
            ))}
          </div>
        </div>
        <div>
          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Zeitraum</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  className={cn(
                    'min-h-[44px] min-w-[80px] rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40',
                    range === r.key
                      ? 'bg-bank-primary/10 text-bank-primary-strong'
                      : 'text-bank-text-muted hover:text-bank-text',
                  )}
                  data-testid={`calc-range-${r.key}`}
                >{r.label}</button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">Daten werden berechnet …</p>
      ) : stockReturn == null ? (
        <p className="mt-8 text-[13.5px] leading-relaxed text-bank-text-muted">
          Für diesen Zeitraum sind derzeit nicht genügend historische Kursdaten verfügbar.
        </p>
      ) : (
        <>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            <ResultCell label="Eingesetzt" value={fmtMoney(amount, currency)} />
            <ResultCell label="Wert heute" value={fmtMoney(endValue, currency)} emphasis />
            <ResultCell
              label="Gewinn / Verlust"
              value={`${gain >= 0 ? '+' : '−'} ${fmtMoney(Math.abs(gain), currency)}`}
              positive={gain >= 0}
            />
            <ResultCell
              label="Rendite"
              value={fmtPct(stockReturn)}
              positive={stockPositive}
            />
          </dl>

          {/* Benchmark comparison */}
          {benchReturn != null ? (
            <div className="mt-10 rounded-xl border border-bank-border bg-bank-panel/50 p-6 dark:bg-bank-bg/40" data-testid="stock-benchmark">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">
                Aktie im Vergleich zum Markt
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <BenchmarkCell label={symbol} value={fmtPct(stockReturn)} positive={stockPositive} />
                <BenchmarkCell label={BENCHMARK_LABEL[benchmark]} value={fmtPct(benchReturn)} positive={benchReturn >= 0} />
                <BenchmarkCell
                  label="Differenz"
                  value={`${diffPP >= 0 ? '+' : ''}${diffPP.toFixed(2)} Pp.`}
                  positive={diffPP >= 0}
                />
              </div>
              <p className="mt-4 text-[13.5px] leading-relaxed text-bank-text-muted">
                {diffPP >= 0
                  ? `Die Aktie entwickelte sich im gewählten Zeitraum besser als der Vergleichsindex.`
                  : `Die Aktie blieb im gewählten Zeitraum hinter dem Vergleichsindex zurück.`}
              </p>
              {normalised.length >= 2 && (
                <NormalisedChart
                  points={normalised}
                  stockPositive={stockPositive}
                  stockLabel={symbol}
                  benchLabel={BENCHMARK_LABEL[benchmark]}
                />
              )}
            </div>
          ) : (
            <p className="mt-8 text-[12.5px] leading-relaxed text-bank-text-muted">
              Vergleich zum Markt: für diesen Zeitraum liegen keine gemeinsamen Benchmark-Kursdaten vor.
            </p>
          )}
        </>
      )}

      <p className="mt-6 text-[11.5px] leading-relaxed text-bank-text-muted">
        Berechnung auf Basis der Kursentwicklung, ohne Dividenden, Steuern und Gebühren. Historische Kurse: yfinance · Kurse können zeitverzögert sein.
      </p>
    </section>
  );
}

function ResultCell({ label, value, emphasis, positive }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</p>
      <p className={cn(
        'rate-figure mt-1.5 tabular-nums',
        emphasis ? 'text-[1.75rem] font-light text-bank-gold' : 'text-[1.35rem] font-light',
        positive === true && !emphasis && 'text-bank-primary-strong',
        positive === false && !emphasis && 'text-red-600 dark:text-red-400',
        positive === undefined && !emphasis && 'text-bank-text',
      )}>{value}</p>
    </div>
  );
}
function BenchmarkCell({ label, value, positive }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</p>
      <p className={cn(
        'rate-figure mt-1.5 text-[1.35rem] font-light tabular-nums',
        positive ? 'text-bank-primary-strong' : 'text-red-600 dark:text-red-400',
      )}>
        <span aria-hidden>{positive ? '▲ ' : '▼ '}</span>{value}
      </p>
    </div>
  );
}

function NormalisedChart({ points, stockPositive, stockLabel, benchLabel }) {
  const W = 1000, H = 200, PAD = { l: 6, r: 6, t: 10, b: 20 };
  const allVals = points.flatMap((p) => [p.stock, p.bench].filter((v) => v != null));
  const minY = Math.min(...allVals, 100);
  const maxY = Math.max(...allVals, 100);
  const spanY = Math.max(maxY - minY, 0.001);
  const n = points.length;
  const x = (i) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - minY) / spanY) * (H - PAD.t - PAD.b);
  const stockPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p.stock).toFixed(2)}`).join(' ');
  const benchPts = points.map((p, i) => (p.bench != null ? { i, v: p.bench } : null)).filter(Boolean);
  const benchPath = benchPts.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(2)},${y(p.v).toFixed(2)}`).join(' ');
  const stockColor = stockPositive ? '#36A852' : '#DC2626';
  const benchColor = 'currentColor';
  return (
    <div className="mt-6">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[180px] w-full text-bank-text-muted"
        role="img"
        aria-label={`Vergleich ${stockLabel} vs. ${benchLabel} · beide bei Start = 100`}
      >
        <line x1={0} x2={W} y1={y(100)} y2={y(100)} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="4 6" />
        <path d={benchPath} fill="none" stroke={benchColor} strokeWidth={1.5} strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
        <path d={stockPath} fill="none" stroke={stockColor} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: stockColor }} aria-hidden /> {stockLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-current opacity-60" aria-hidden /> {benchLabel}
        </span>
        <span>Start · 100</span>
      </div>
    </div>
  );
}
