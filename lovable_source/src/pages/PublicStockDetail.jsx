import { getApiBase } from '@/lib/apiBase';
import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';

const StockPriceChart = lazy(() => import('@/components/stock/StockPriceChart'));
const StockFundamentals = lazy(() => import('@/components/stock/StockFundamentals'));
const StockNews = lazy(() => import('@/components/stock/StockNews'));
const StockInvestmentCalculator = lazy(() => import('@/components/stock/StockInvestmentCalculator'));
const StockAnalystConsensus = lazy(() => import('@/components/stock/StockAnalystConsensus'));
const StockDividends = lazy(() => import('@/components/stock/StockDividends'));
const StockEarnings = lazy(() => import('@/components/stock/StockEarnings'));
const StockCompare = lazy(() => import('@/components/stock/StockCompare'));
const StockResearch = lazy(() => import('@/components/stock/StockResearch'));
const StockWatchButton = lazy(() => import('@/components/stock/StockWatchButton'));
const StockAlertButton = lazy(() => import('@/components/stock/StockAlertButton'));

const API_BASE = getApiBase();

const formatPrice = (value, currency = 'EUR') => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(value);
  } catch { return `${value.toFixed(2)} ${currency}`; }
};

const formatDate = (iso, withTime = false) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(new Date(iso));
  } catch { return iso; }
};

const formatUpside = (pct) => {
  if (typeof pct !== 'number' || Number.isNaN(pct)) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)} %`;
};

/**
 * Public stock detail page. Renders verified analyst research data from
 * `/api/stock-research` for one ticker. No fabricated price, chart, or
 * fundamentals data — sections without a real data source are omitted.
 */
export default function PublicStockDetail() {
  const { symbol } = useParams();
  const [rows, setRows] = useState(null);   // null = loading
  const [live, setLive] = useState(null);   // null = loading, false = unavailable
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    axios
      .get(`${API_BASE}/api/stock-research`, { signal: controller.signal, params: { limit: 12 } })
      .then(({ data }) => {
        if (!alive) return;
        setRows(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((err) => {
        if (axios.isCancel?.(err) || err?.name === 'CanceledError') return;
        if (!alive) return;
        setError('Aktienanalyse-Daten sind derzeit nicht verfügbar.');
        setRows([]);
      });
    return () => { alive = false; controller.abort(); };
  }, []);

  // Session 85 · Trust — echte Börsendaten unabhängig vom Research-Feed laden.
  // Nutzt die zentrale, in Schritt 3 reparierte yfinance-Pipeline
  // (`/api/stocks/{sym}/history`) plus Fundamentals für den Firmennamen.
  useEffect(() => {
    if (!symbol) return undefined;
    let alive = true;
    const controller = new AbortController();
    const sym = String(symbol).toUpperCase();
    Promise.allSettled([
      axios.get(`${API_BASE}/api/stocks/${encodeURIComponent(sym)}/history`, {
        params: { range: '5d' }, signal: controller.signal,
      }),
      axios.get(`${API_BASE}/api/stocks/${encodeURIComponent(sym)}/fundamentals`, {
        signal: controller.signal,
      }),
    ]).then(([hRes, fRes]) => {
      if (!alive) return;
      const hist = hRes.status === 'fulfilled' ? hRes.value.data : null;
      const fund = fRes.status === 'fulfilled' ? fRes.value.data : null;
      const points = Array.isArray(hist?.points) ? hist.points : [];
      if (points.length === 0) { setLive(false); return; }
      const last = points[points.length - 1] || {};
      const prev = points.length >= 2 ? points[points.length - 2] : null;
      const price = Number(last.close);
      const prevClose = prev ? Number(prev.close) : NaN;
      const change = Number.isFinite(prevClose) && prevClose > 0 ? price - prevClose : null;
      const changePct = change != null && prevClose > 0 ? (change / prevClose) * 100 : null;
      setLive({
        symbol: hist?.symbol || sym,
        providerSymbol: hist?.yf_symbol || null,
        price: Number.isFinite(price) ? price : null,
        currency: hist?.currency || fund?.currency || fund?.data?.currency || 'EUR',
        change,
        changePct,
        asOf: last?.timestamp || hist?.stats?.last_timestamp || null,
        dataSource: hist?.data_source || null,
        companyName: fund?.company_name || fund?.data?.company_name || fund?.long_name || fund?.short_name || null,
      });
    }).catch(() => { if (alive) setLive(false); });
    return () => { alive = false; controller.abort(); };
  }, [symbol]);

  const stock = useMemo(() => {
    if (!rows) return null;
    const target = String(symbol || '').toUpperCase();
    return rows.find((r) => String(r.ticker || '').toUpperCase() === target) || null;
  }, [rows, symbol]);

  const isLoading = rows === null || live === null;
  const hasResearch = !!stock;
  const hasLive = !!live && live !== false && live.price != null;
  const notFound = !isLoading && !hasResearch && !hasLive;

  return (
    <main className="min-h-screen bg-bank-bg pb-24" data-testid="public-stock-detail">
      <div className="mx-auto max-w-[1080px] px-5 pt-10 sm:px-8 sm:pt-14 lg:px-12">
        <Link
          to="/#home-stock-research"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bank-text-muted transition-colors hover:text-bank-text"
          data-testid="public-stock-back"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
          Zurück zu Aktien mit Potenzial
        </Link>

        {isLoading && (
          <div className="mt-16 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
            Daten werden geladen …
          </div>
        )}

        {!isLoading && notFound && (
          <div className="mt-16 rounded-2xl border border-bank-border bg-white p-10 text-center dark:bg-bank-surface" data-testid="public-stock-not-found">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Aktie nicht gefunden</p>
            <h1 className="mt-3 font-display text-[1.75rem] font-light text-bank-text">
              Zu „{symbol}" liegen aktuell keine Börsendaten vor.
            </h1>
            <p className="mt-4 text-[14.5px] leading-relaxed text-bank-text-muted">
              Das Symbol ist möglicherweise nicht bekannt oder aktuell nicht handelbar.
            </p>
          </div>
        )}

        {!isLoading && !notFound && <StockContent stock={stock} live={live && live !== false ? live : null} error={error} />}
      </div>
    </main>
  );
}

function StockContent({ stock, live }) {
  // Session 85 · Trust — Kurs kommt aus dem zentralen yfinance-Pfad (`live`),
  // Analystendaten kommen aus dem Research-Feed (`stock`). Beide Bereiche
  // rendern unabhängig; fehlende Analystendaten führen nur zu einem
  // dezenten Hinweis im Analystenbereich statt zur ganzen „nicht gefunden"-
  // Seite. Wenn nur einer der beiden Datenpunkte vorhanden ist, wird der
  // jeweils andere entsprechend heruntergestuft.
  const tickerSymbol = (stock?.ticker || live?.symbol || '').toUpperCase();
  const rawCompanyName = stock?.company_name || live?.companyName || null;
  const hasRealName = !!rawCompanyName && rawCompanyName.trim().toUpperCase() !== tickerSymbol;
  const companyName = hasRealName ? rawCompanyName : tickerSymbol;
  const currency = stock?.currency || live?.currency || 'EUR';
  const liveCurrent = Number.isFinite(Number(live?.price)) ? Number(live.price) : null;
  const researchCurrent = Number.isFinite(Number(stock?.current_price)) ? Number(stock.current_price) : null;
  const current = liveCurrent ?? researchCurrent;
  const change = Number.isFinite(Number(live?.change)) ? Number(live.change) : null;
  const changePct = Number.isFinite(Number(live?.changePct)) ? Number(live.changePct) : null;
  const target = Number.isFinite(Number(stock?.target_price)) ? Number(stock.target_price) : null;
  const upside = typeof stock?.upside_pct === 'number' ? stock.upside_pct
    : (current != null && current > 0 && target != null) ? ((target - current) / current) * 100 : null;

  const analystLabel = stock?.analyst || stock?.research_house;
  const showAnalystName = analystLabel && analystLabel !== '—';
  const priceUpdatedAt = live?.asOf || stock?.price_updated_at || null;
  const changeTone = changePct == null ? 'text-bank-text-muted'
    : changePct > 0 ? 'text-emerald-700 dark:text-emerald-400'
    : changePct < 0 ? 'text-red-700 dark:text-red-400'
    : 'text-bank-text-muted';
  const fmtChange = () => {
    if (change == null || changePct == null) return null;
    const sign = change > 0 ? '+' : change < 0 ? '−' : '±';
    const abs = Math.abs(change).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const absPct = Math.abs(changePct).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sign}${abs} ${currency} · ${sign}${absPct} %`;
  };
  const changeStr = fmtChange();

  return (
    <>
      {/* HERO */}
      <header className="mt-10 border-b border-bank-border pb-10 sm:mt-14 sm:pb-14" data-testid="public-stock-hero">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">
          {stock ? 'Analystenresearch' : 'Aktie'}
        </p>
        <h1 className="mt-4 font-display text-[2.25rem] font-light leading-[1.05] tracking-tight text-bank-text sm:text-[3rem]">
          {companyName}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11.5px] uppercase tracking-[0.18em] text-bank-text-muted">
          {hasRealName && <span>{tickerSymbol}</span>}
          {currency && <span>{hasRealName ? '· ' : ''}{currency}</span>}
        </div>

        <div className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <div className="rate-figure text-[2.75rem] font-light tabular-nums text-bank-text" data-numeric>
            {formatPrice(current, currency)}
          </div>
          {changeStr && (
            <span className={`font-mono text-[13px] font-medium tabular-nums ${changeTone}`} data-testid="public-stock-change">
              {changeStr}
            </span>
          )}
          {priceUpdatedAt && (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              Kursstand · {formatDate(priceUpdatedAt, true)} Uhr
            </p>
          )}
        </div>

        <p className="mt-5 max-w-[42rem] text-[13px] leading-relaxed text-bank-text-muted">
          Kursdaten können zeitverzögert sein. Datenstand und Verfügbarkeit können je nach Börsenplatz variieren.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Suspense fallback={null}>
            <StockWatchButton symbol={tickerSymbol} displayName={companyName} />
            <StockAlertButton symbol={tickerSymbol} displayName={companyName} currency={currency} />
          </Suspense>
        </div>
      </header>

      {/* ANALYST TARGET — nur wenn Research vorhanden, sonst dezenter Hinweis */}
      {stock ? (
        <section className="mt-12 rounded-2xl border border-bank-border bg-white p-8 dark:bg-bank-surface sm:p-10" data-testid="public-stock-target">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">
          Analystenkursziel
        </p>
        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <MetricBlock
            label="Kursziel"
            value={formatPrice(target, currency)}
            emphasis
          />
          <MetricBlock
            label="Aktueller Kurs"
            value={formatPrice(current, currency)}
          />
          <MetricBlock
            label="Potenzial"
            value={formatUpside(upside)}
            tone={typeof upside === 'number' && upside >= 0 ? 'positive' : 'muted'}
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 border-t border-bank-border pt-6 text-[13px] leading-relaxed sm:grid-cols-2">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">
              {showAnalystName ? 'Analyst' : 'Analystenkonsens'}
            </p>
            <p className="mt-1.5 text-bank-text">
              {showAnalystName ? analystLabel : (stock.source_name || 'Aggregierte Analystenschätzungen')}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">
              Stand · Research
            </p>
            <p className="mt-1.5 text-bank-text">
              {formatDate(stock.research_date)}
            </p>
          </div>
          {stock.source_name && (
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">Quelle</p>
              {stock.source_url ? (
                <a
                  href={stock.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1.5 text-bank-primary-strong underline-offset-4 hover:underline"
                >
                  {stock.source_name}
                  <ExternalLink className="h-3 w-3" strokeWidth={LUCIDE_STROKE} />
                </a>
              ) : (
                <p className="mt-1.5 text-bank-text">{stock.source_name}</p>
              )}
            </div>
          )}
        </div>
        </section>
      ) : null}

      {/* Reihenfolge (Session 80.77): Chart → Investment-Rechner → Analystenkonsens
           → Dividenden → Earnings → Fundamentals → News. Alle Sektionen zeigen
           nur echte yfinance-Daten und blenden fehlende Felder aus. */}
      <Suspense fallback={null}>
        <StockResearch symbol={tickerSymbol} />
        <StockPriceChart symbol={tickerSymbol} />
        <StockInvestmentCalculator symbol={tickerSymbol} currency={currency} />
        <StockAnalystConsensus symbol={tickerSymbol} />
        <StockDividends symbol={tickerSymbol} />
        <StockEarnings symbol={tickerSymbol} />
        <StockFundamentals symbol={tickerSymbol} currentPrice={current} />
        <StockCompare baseSymbol={tickerSymbol} />
        <StockNews symbol={tickerSymbol} />
      </Suspense>

      {/* DISCLAIMER */}
      <p className="mt-10 max-w-[42rem] text-[12px] leading-relaxed text-bank-text-muted">
        Die dargestellten Informationen dienen ausschließlich der Information und stellen keine Anlageberatung
        oder Kaufempfehlung dar. Kurse und Analystenschätzungen können zeitverzögert sein.
      </p>
    </>
  );
}

function MetricBlock({ label, value, tone, emphasis }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</p>
      <p
        className={cn(
          'rate-figure mt-2 tabular-nums',
          emphasis ? 'text-[2.15rem] font-light text-bank-gold' : 'text-[1.65rem] font-light text-bank-text',
          tone === 'positive' && !emphasis && 'text-bank-primary-strong',
        )}
        data-numeric
      >
        {value}
      </p>
    </div>
  );
}
