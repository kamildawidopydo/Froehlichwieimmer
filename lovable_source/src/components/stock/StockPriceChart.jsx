import { getApiBase } from '@/lib/apiBase';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const API_BASE = getApiBase();

const RANGES = [
  { key: '1d', label: '1T' },
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '1y', label: '1J' },
  { key: '5y', label: '5J' },
  { key: 'max', label: 'MAX' },
];

const fmtPrice = (v, currency = 'EUR') => {
  if (v == null || Number.isNaN(v)) return '—';
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(v);
  } catch { return `${Number(v).toFixed(2)} ${currency}`; }
};
const fmtPct = (v) => {
  if (v == null || Number.isNaN(v)) return '—';
  const s = v > 0 ? '+' : '';
  return `${s}${Number(v).toFixed(2)} %`;
};
const fmtTip = (iso, range) => {
  try {
    const d = new Date(iso);
    const withTime = range === '1d' || range === '1w';
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(d);
  } catch { return iso; }
};

/**
 * Real-data intraday/historical chart for one allowlisted ticker.
 * No synthetic points, no library dependency — inline SVG.
 */
export default function StockPriceChart({ symbol }) {
  const [range, setRange] = useState('3m');
  const [state, setState] = useState({ loading: true, points: [], source: null, currency: 'EUR', error: null });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(`${API_BASE}/api/stocks/${encodeURIComponent(symbol)}/history?range=${range}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((d) => {
        if (!alive) return;
        setState({
          loading: false,
          points: Array.isArray(d?.points) ? d.points : [],
          source: d?.data_source,
          currency: d?.currency || 'EUR',
          error: null,
        });
      })
      .catch((e) => { if (alive) setState({ loading: false, points: [], source: 'unavailable', currency: 'EUR', error: e.message }); });
    return () => { alive = false; };
  }, [symbol, range]);

  const { points, currency, loading, source } = state;
  const hasData = !loading && points.length >= 2;
  const first = hasData ? points[0].close : null;
  const last = hasData ? points[points.length - 1].close : null;
  const changeAbs = hasData ? last - first : null;
  const changePct = hasData && first ? ((last - first) / first) * 100 : null;
  const positive = changeAbs != null && changeAbs >= 0;

  return (
    <section className="mt-12 rounded-2xl border border-bank-border bg-white p-6 dark:bg-bank-surface sm:p-10" data-testid="public-stock-chart">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">
          Kursverlauf · yfinance
        </p>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Zeitraum wählen">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'min-h-[36px] min-w-[44px] rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40',
                range === r.key
                  ? 'bg-bank-primary/10 text-bank-primary-strong dark:bg-bank-primary/20'
                  : 'text-bank-text-muted hover:text-bank-text',
              )}
              data-testid={`chart-range-${r.key}`}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {hasData && (
        <div className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">Startwert</p>
            <p className="mt-1 rate-figure text-[1.3rem] font-light tabular-nums text-bank-text">{fmtPrice(first, currency)}</p>
          </div>
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">Endwert</p>
            <p className="mt-1 rate-figure text-[1.3rem] font-light tabular-nums text-bank-text">{fmtPrice(last, currency)}</p>
          </div>
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">Veränderung</p>
            <p className={cn(
              'mt-1 rate-figure text-[1.3rem] font-light tabular-nums',
              positive ? 'text-bank-primary-strong' : 'text-red-600 dark:text-red-400',
            )}>
              <span aria-hidden>{positive ? '▲ ' : '▼ '}</span>
              {fmtPct(changePct)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        {loading && (
          <div className="flex h-[220px] items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
            Chart wird geladen …
          </div>
        )}
        {!loading && !hasData && (
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-xl bg-bank-panel/50 p-6 text-center text-[13.5px] text-bank-text-muted dark:bg-bank-bg/40">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Datenquelle nicht erreichbar</p>
            <p>Für diesen Zeitraum liegen aktuell keine Kursdaten vor.</p>
          </div>
        )}
        {hasData && <ChartCanvas points={points} positive={positive} currency={currency} range={range} />}
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
        Quelle: yfinance · Daten können zeitverzögert sein
      </p>
    </section>
  );
}

function ChartCanvas({ points, positive, currency, range }) {
  const svgRef = useRef(null);
  const [tip, setTip] = useState(null);

  const W = 1000; // logical viewBox
  const H = 240;
  const PAD = { l: 6, r: 6, t: 12, b: 20 };

  const { path, xs, ys, minY, maxY } = useMemo(() => {
    const cs = points.map((p) => p.close);
    const minY = Math.min(...cs);
    const maxY = Math.max(...cs);
    const spanY = Math.max(maxY - minY, 0.0001);
    const n = points.length;
    const xs = points.map((_, i) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r));
    const ys = cs.map((c) => PAD.t + (1 - (c - minY) / spanY) * (H - PAD.t - PAD.b));
    const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${ys[i].toFixed(2)}`).join(' ');
    return { path, xs, ys, minY, maxY };
  }, [points]);

  const onMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const px = ((clientX - rect.left) / rect.width) * W;
    let idx = 0, best = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const d = Math.abs(xs[i] - px);
      if (d < best) { best = d; idx = i; }
    }
    setTip({ idx, x: xs[idx], y: ys[idx] });
  };

  const stroke = positive ? '#36A852' : '#DC2626';
  const fill = positive ? 'rgba(54,168,82,0.08)' : 'rgba(220,38,38,0.08)';
  const areaPath = `${path} L${xs[xs.length - 1].toFixed(2)},${H - PAD.b} L${xs[0].toFixed(2)},${H - PAD.b} Z`;

  const tipPoint = tip ? points[tip.idx] : null;

  return (
    <div
      className="relative w-full overflow-hidden"
      role="img"
      aria-label={`Kursverlauf ${range.toUpperCase()} · von ${fmtPrice(points[0].close, currency)} auf ${fmtPrice(points[points.length - 1].close, currency)}`}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[220px] w-full select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setTip(null)}
        onTouchStart={onMove}
        onTouchMove={onMove}
        onTouchEnd={() => setTimeout(() => setTip(null), 1200)}
      >
        {/* horizontal min/max guides */}
        <line x1={0} x2={W} y1={PAD.t} y2={PAD.t} stroke="currentColor" strokeOpacity="0.06" />
        <line x1={0} x2={W} y1={H - PAD.b} y2={H - PAD.b} stroke="currentColor" strokeOpacity="0.06" />
        <path d={areaPath} fill={fill} />
        <path d={path} fill="none" stroke={stroke} strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {tip && (
          <g>
            <line x1={tip.x} x2={tip.x} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" strokeOpacity="0.25" />
            <circle cx={tip.x} cy={tip.y} r={4} fill={stroke} stroke="#fff" strokeWidth={1.5} />
          </g>
        )}
      </svg>
      {tipPoint && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-bank-border bg-white/95 px-3 py-1.5 text-[11.5px] shadow-sm backdrop-blur-sm dark:bg-bank-surface-elev/95"
          style={{ left: `min(calc(${(tip.x / W) * 100}% - 40px), calc(100% - 140px))`, maxWidth: 140 }}
        >
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-bank-text-muted">
            {fmtTip(tipPoint.timestamp, range)}
          </p>
          <p className="mt-0.5 tabular-nums text-bank-text">{fmtPrice(tipPoint.close, currency)}</p>
        </div>
      )}
      <div className="mt-1 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.16em] text-bank-text-muted">
        <span>Tief · {fmtPrice(minY, currency)}</span>
        <span>Hoch · {fmtPrice(maxY, currency)}</span>
      </div>
    </div>
  );
}
