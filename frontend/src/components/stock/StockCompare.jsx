import { getApiBase } from '@/lib/apiBase';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Plus } from 'lucide-react';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';

const API_BASE = getApiBase();

const RANGES = [
  { key: '1y', label: '1 Jahr' },
  { key: '3y', label: '3 Jahre' },
  { key: '5y', label: '5 Jahre' },
];

const SERIES_COLORS = ['#36A852', '#B98E3C', '#4A5C6C', '#8B3A62']; // green/gold/graphite/plum
const BENCH_COLOR = '#94A3B8';

const fmtPct = (v, digits = 2) => {
  if (v == null || Number.isNaN(v)) return '—';
  const s = v > 0 ? '+' : '';
  return `${s}${Number(v).toFixed(digits)} %`;
};
const fmtPctPlain = (v, digits = 2) => {
  if (v == null || Number.isNaN(v)) return '—';
  return `${Number(v).toFixed(digits)} %`;
};
const fmtNum = (v, digits = 2) => {
  if (v == null || Number.isNaN(v)) return '—';
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
};
const fmtMoneyCompact = (v, ccy) => {
  if (v == null || Number.isNaN(v)) return '—';
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: ccy || 'EUR', notation: 'compact', maximumFractionDigits: 2,
    }).format(v);
  } catch { return fmtNum(v); }
};

/**
 * Tool-Paket 4/4 — Aktienvergleich + Risikoanalyse.
 * Uses the bundled backend endpoint /api/stocks/compare which returns:
 *   indexed price series (start = 100), risk metrics, fundamentals table.
 * All values come from yfinance; missing → "—".
 */
export default function StockCompare({ baseSymbol }) {
  const [peersList, setPeersList] = useState({ peers: [], benchmarks: [] });
  const [selected, setSelected] = useState([]);   // additional peers (up to 3)
  const [range, setRange] = useState('1y');
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const sectionRef = useRef(null);
  const appliedUrlRef = useRef(false);

  // Load peer list once (static). Fetch runs only when component is on the page.
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/stocks/compare/peers`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) setPeersList({ peers: d.peers || [], benchmarks: d.benchmarks || [] }); })
      .catch(() => { /* keep empty */ });
    return () => { alive = false; };
  }, []);

  // Session 80.81 — preselect peers from `?compare=A,B,C` handed over from watchlist.
  useEffect(() => {
    if (appliedUrlRef.current) return;
    const params = new URLSearchParams(location.search);
    const raw = (params.get('compare') || '').trim();
    if (!raw) return;
    appliedUrlRef.current = true;
    const wanted = raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    const cleaned = wanted.filter((s) => s !== baseSymbol).slice(0, 3);
    if (cleaned.length > 0) {
      setSelected(cleaned);
      // Scroll into the compare section on the next tick.
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.search, baseSymbol]);

  // Symbols we send to /compare = base + up to 3 selected. Deduped, base always first.
  const symbols = useMemo(() => {
    const list = [baseSymbol, ...selected.filter((s) => s !== baseSymbol)].slice(0, 4);
    return list;
  }, [baseSymbol, selected]);

  // Fetch comparison data whenever selection changes (only 2+ symbols).
  useEffect(() => {
    if (symbols.length < 2) { setData(null); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ symbols: symbols.join(','), range });
    if (showBenchmark) {
      // benchmark auto-picked server-side based on base symbol.
    }
    fetch(`${API_BASE}/api/stocks/compare?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [symbols, range, showBenchmark]);

  const availablePeers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return peersList.peers
      .filter((p) => p.symbol !== baseSymbol)
      .filter((p) => !selected.includes(p.symbol))
      .filter((p) => !q || p.symbol.toLowerCase().includes(q) || (p.label || '').toLowerCase().includes(q));
  }, [peersList, selected, baseSymbol, query]);

  const canAdd = selected.length < 3;

  return (
    <section
      ref={sectionRef}
      className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10"
      data-testid="stock-compare"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Aktie vergleichen</p>
      <h2 className="mt-3 font-display text-[1.6rem] font-light leading-tight text-bank-text">
        {baseSymbol} im Vergleich
      </h2>

      {/* Peer selection */}
      <div className="mt-8" data-testid="compare-selection">
        <div className="flex flex-wrap items-center gap-2">
          <PeerChip label={baseSymbol} colorIndex={0} pinned />
          {selected.map((s, i) => (
            <PeerChip
              key={s}
              label={s}
              colorIndex={i + 1}
              onRemove={() => setSelected((cur) => cur.filter((x) => x !== s))}
            />
          ))}
        </div>
        {canAdd && (
          <div className="mt-4">
            <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted" htmlFor="compare-search">
              Aktie hinzufügen
            </label>
            <input
              id="compare-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="z. B. Microsoft, MSFT, Allianz …"
              className="mt-2 w-full min-h-[44px] rounded-lg border border-bank-border bg-white px-4 py-2 text-[15px] text-bank-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 dark:bg-bank-bg dark:text-bank-text"
              data-testid="compare-search"
              autoComplete="off"
            />
            {availablePeers.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" role="listbox" aria-label="Verfügbare Vergleichsaktien">
                {availablePeers.slice(0, 10).map((p) => (
                  <li key={p.symbol}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => { setSelected((cur) => [...cur, p.symbol]); setQuery(''); }}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-bank-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text transition-colors hover:bg-bank-primary/10 hover:text-bank-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
                      data-testid={`compare-add-${p.symbol}`}
                    >
                      <Plus className="h-3 w-3" strokeWidth={LUCIDE_STROKE} aria-hidden />
                      {p.label} <span className="text-bank-text-muted">· {p.symbol}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Range + benchmark controls */}
      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-4">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Zeitraum wählen">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'min-h-[36px] min-w-[80px] rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40',
                range === r.key ? 'bg-bank-primary/10 text-bank-primary-strong' : 'text-bank-text-muted hover:text-bank-text',
              )}
              data-testid={`compare-range-${r.key}`}
            >{r.label}</button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text-muted">
          <input
            type="checkbox"
            checked={showBenchmark}
            onChange={(e) => setShowBenchmark(e.target.checked)}
            className="h-4 w-4 accent-bank-primary"
            data-testid="compare-benchmark-toggle"
          />
          Benchmark einblenden
        </label>
      </div>

      {/* Body */}
      {symbols.length < 2 && (
        <p className="mt-10 text-[13.5px] leading-relaxed text-bank-text-muted">
          Fügen Sie mindestens eine weitere Aktie hinzu, um den Vergleich zu starten.
        </p>
      )}

      {symbols.length >= 2 && loading && (
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">Vergleich wird berechnet …</p>
      )}

      {symbols.length >= 2 && !loading && (error || !data || data.data_source === 'unavailable') && (
        <p className="mt-10 text-[13.5px] leading-relaxed text-bank-text-muted">
          Für diese Kombination liegen aktuell nicht ausreichend gemeinsame Handelstage vor.
        </p>
      )}

      {symbols.length >= 2 && !loading && data && data.data_source !== 'unavailable' && (
        <div className="mt-10 space-y-12">
          <IndexedChart data={data} showBenchmark={showBenchmark} />
          <RiskReturnScatter data={data} />
          <RiskTable data={data} />
          <FundamentalsTable data={data} />
        </div>
      )}

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
        Quelle: yfinance · alle Preisreihen auf Startpunkt 100 indexiert · Historische Daten, keine Prognose
      </p>
    </section>
  );
}

function PeerChip({ label, colorIndex, pinned, onRemove }) {
  const color = SERIES_COLORS[colorIndex] || SERIES_COLORS[0];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-bank-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em]',
        pinned ? 'bg-bank-primary/5' : '',
      )}
      data-testid={`compare-chip-${label}`}
    >
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
      {label}
      {!pinned && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-bank-text-muted transition-colors hover:bg-bank-border hover:text-bank-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
          aria-label={`${label} entfernen`}
          data-testid={`compare-remove-${label}`}
        >
          <X className="h-3 w-3" strokeWidth={LUCIDE_STROKE} />
        </button>
      )}
    </span>
  );
}

// ---- Indexed line chart ----------------------------------------------------
function IndexedChart({ data, showBenchmark }) {
  const { series, benchmark_series, benchmark } = data;
  const W = 1000, H = 260, PAD = { l: 6, r: 6, t: 12, b: 30 };
  const allValid = series.filter((s) => s.points && s.points.length >= 2);
  const allSeries = [...allValid];
  if (showBenchmark && benchmark_series) allSeries.push({ ...benchmark_series, _isBench: true });
  if (allSeries.length === 0) return null;
  const allValues = allSeries.flatMap((s) => s.points.map((p) => p.v));
  const minY = Math.min(...allValues, 100);
  const maxY = Math.max(...allValues, 100);
  const spanY = Math.max(maxY - minY, 0.001);
  const n = Math.max(...allSeries.map((s) => s.points.length));
  const x = (i) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - minY) / spanY) * (H - PAD.t - PAD.b);

  const legend = allSeries.map((s, idx) => ({
    label: s._isBench ? `Benchmark · ${s.label}` : s.symbol,
    color: s._isBench ? BENCH_COLOR : SERIES_COLORS[idx] || SERIES_COLORS[0],
    isBench: !!s._isBench,
    endVal: s.points[s.points.length - 1]?.v,
  }));

  return (
    <div data-testid="compare-chart">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">
        Performance · indexiert auf 100
      </p>
      <div className="mt-4 w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[240px] w-full text-bank-text-muted"
          role="img"
          aria-label={`Vergleichschart, alle Aktien bei Start = 100${showBenchmark && benchmark ? `, Benchmark ${benchmark.label}` : ''}`}
        >
          <line x1={0} x2={W} y1={y(100)} y2={y(100)} stroke="currentColor" strokeOpacity="0.2" strokeDasharray="4 6" />
          {allSeries.map((s, idx) => {
            const color = s._isBench ? BENCH_COLOR : SERIES_COLORS[idx] || SERIES_COLORS[0];
            const path = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i * ((n - 1) / (s.points.length - 1))).toFixed(2)},${y(p.v).toFixed(2)}`).join(' ');
            return (
              <path
                key={s.symbol}
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={s._isBench ? 1.4 : 2}
                strokeOpacity={s._isBench ? 0.6 : 1}
                strokeDasharray={s._isBench ? '4 4' : undefined}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">
        {legend.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-6"
              style={{ background: l.color, opacity: l.isBench ? 0.6 : 1 }}
              aria-hidden
            />
            <span>{l.label}</span>
            <span className={cn('tabular-nums', l.endVal >= 100 ? 'text-bank-primary-strong' : 'text-red-600 dark:text-red-400')}>
              {l.endVal != null ? `${fmtNum(l.endVal - 100, 1)} Pp.` : '—'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---- Risk / Return scatter --------------------------------------------------
function RiskReturnScatter({ data }) {
  const points = (data.risk_metrics || [])
    .map((r, idx) => ({
      symbol: r.symbol,
      x: r.volatility_annual_pct,
      y: r.annual_return_pct,
      color: SERIES_COLORS[idx] || SERIES_COLORS[0],
    }))
    .filter((p) => typeof p.x === 'number' && typeof p.y === 'number');
  if (points.length < 2) return null;
  const W = 500, H = 260, PAD = { l: 50, r: 20, t: 20, b: 40 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) * 0.8;
  const maxX = Math.max(...xs) * 1.1;
  const minY = Math.min(...ys, 0) - 5;
  const maxY = Math.max(...ys, 0) + 5;
  const sx = (v) => PAD.l + ((v - minX) / (maxX - minX)) * (W - PAD.l - PAD.r);
  const sy = (v) => PAD.t + (1 - (v - minY) / (maxY - minY)) * (H - PAD.t - PAD.b);

  return (
    <div data-testid="compare-scatter">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">
        Risiko &amp; Rendite · annualisiert
      </p>
      <div className="mt-4 w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[240px] w-full text-bank-text-muted"
          role="img"
          aria-label="Streudiagramm: annualisierte Volatilität auf der X-Achse, annualisierte Rendite auf der Y-Achse"
        >
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(0)} y2={sy(0)} stroke="currentColor" strokeOpacity="0.2" />
          <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" strokeOpacity="0.3" />
          <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="currentColor" strokeOpacity="0.3" />
          <text x={PAD.l - 8} y={PAD.t + 4} textAnchor="end" fontSize="10" fill="currentColor">Rendite %</text>
          <text x={W - PAD.r} y={H - 8} textAnchor="end" fontSize="10" fill="currentColor">Vola %</text>
          {points.map((p) => (
            <g key={p.symbol}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={7} fill={p.color} stroke="#fff" strokeWidth={2} />
              <text x={sx(p.x) + 12} y={sy(p.y) + 4} fontSize="11" fill="currentColor" className="font-mono">{p.symbol}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ---- Risk table -------------------------------------------------------------
function RiskTable({ data }) {
  const rows = data.risk_metrics || [];
  if (rows.length === 0) return null;
  return (
    <div data-testid="compare-risk-table">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Risiko-Kennzahlen</p>
      <div className="mt-4 w-full overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-bank-border text-left">
              <TH>Aktie</TH>
              <TH>Vola p.a.</TH>
              <TH>Max Drawdown</TH>
              <TH>Beta</TH>
              <TH>Rendite p.a.</TH>
              <TH>Gesamtrendite</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.symbol} className="border-b border-bank-border/60">
                <TD>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS[idx] || SERIES_COLORS[0] }} aria-hidden />
                    {r.symbol}
                  </span>
                </TD>
                <TD tabular>{fmtPctPlain(r.volatility_annual_pct)}</TD>
                <TD tabular negative>{fmtPctPlain(r.max_drawdown_pct)}</TD>
                <TD tabular>{r.beta != null ? fmtNum(r.beta) : '—'}</TD>
                <TD tabular positive={r.annual_return_pct >= 0}>{fmtPct(r.annual_return_pct)}</TD>
                <TD tabular positive={r.total_return_pct >= 0}>{fmtPct(r.total_return_pct)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-bank-text-muted">
        Volatilität = Standardabweichung täglicher Renditen × √252. Max Drawdown = größter Rückschlag ab
        einem laufenden Hoch. Beta gegen {data.benchmark?.label || 'Benchmark'}.
      </p>
    </div>
  );
}

// ---- Fundamentals table -----------------------------------------------------
function FundamentalsTable({ data }) {
  const rows = data.fundamentals || [];
  if (rows.length === 0) return null;
  return (
    <div data-testid="compare-fundamentals-table">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Fundamental-Vergleich</p>
      <div className="mt-4 w-full overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-bank-border text-left">
              <TH>Aktie</TH>
              <TH>Kurs</TH>
              <TH>Marktkap.</TH>
              <TH>KGV</TH>
              <TH>Fwd-KGV</TH>
              <TH>P/S</TH>
              <TH>P/B</TH>
              <TH>Div-Yield</TH>
              <TH>Payout</TH>
              <TH>Δ Umsatz</TH>
              <TH>Δ Gewinn</TH>
              <TH>Netto-M.</TH>
              <TH>ROE</TH>
              <TH>D/E</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.symbol} className="border-b border-bank-border/60">
                <TD>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS[idx] || SERIES_COLORS[0] }} aria-hidden />
                    {r.symbol}
                  </span>
                </TD>
                <TD tabular>{r.current_price != null ? fmtNum(r.current_price) : '—'}</TD>
                <TD tabular>{fmtMoneyCompact(r.market_cap, r.currency)}</TD>
                <TD tabular>{r.trailing_pe != null ? fmtNum(r.trailing_pe) : '—'}</TD>
                <TD tabular>{r.forward_pe != null ? fmtNum(r.forward_pe) : '—'}</TD>
                <TD tabular>{r.price_to_sales != null ? fmtNum(r.price_to_sales) : '—'}</TD>
                <TD tabular>{r.price_to_book != null ? fmtNum(r.price_to_book) : '—'}</TD>
                <TD tabular>{r.dividend_yield_pct != null ? fmtPctPlain(r.dividend_yield_pct) : '—'}</TD>
                <TD tabular>{r.payout_ratio_pct != null ? fmtPctPlain(r.payout_ratio_pct, 1) : '—'}</TD>
                <TD tabular positive={r.revenue_growth_pct >= 0}>{r.revenue_growth_pct != null ? fmtPct(r.revenue_growth_pct, 1) : '—'}</TD>
                <TD tabular positive={r.earnings_growth_pct >= 0}>{r.earnings_growth_pct != null ? fmtPct(r.earnings_growth_pct, 1) : '—'}</TD>
                <TD tabular>{r.profit_margin_pct != null ? fmtPctPlain(r.profit_margin_pct, 1) : '—'}</TD>
                <TD tabular>{r.return_on_equity_pct != null ? fmtPctPlain(r.return_on_equity_pct, 1) : '—'}</TD>
                <TD tabular>{r.debt_to_equity != null ? fmtNum(r.debt_to_equity) : '—'}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TH({ children }) {
  return <th className="whitespace-nowrap py-2 pr-4 font-mono text-[9.5px] font-normal uppercase tracking-[0.16em] text-bank-text-muted">{children}</th>;
}
function TD({ children, tabular, positive, negative }) {
  return (
    <td
      className={cn(
        'whitespace-nowrap py-2.5 pr-4 text-bank-text',
        tabular && 'tabular-nums',
        positive === true && 'text-bank-primary-strong',
        positive === false && 'text-red-600 dark:text-red-400',
        negative && 'text-red-600 dark:text-red-400',
      )}
    >
      {children}
    </td>
  );
}
