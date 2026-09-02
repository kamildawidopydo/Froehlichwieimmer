import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ExternalLink, Info } from 'lucide-react';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

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

  const stock = useMemo(() => {
    if (!rows) return null;
    const target = String(symbol || '').toUpperCase();
    return rows.find((r) => String(r.ticker || '').toUpperCase() === target) || null;
  }, [rows, symbol]);

  const isLoading = rows === null;

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

        {!isLoading && !stock && (
          <div className="mt-16 rounded-2xl border border-bank-border bg-white p-10 text-center dark:bg-bank-surface" data-testid="public-stock-not-found">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Aktie nicht gefunden</p>
            <h1 className="mt-3 font-display text-[1.75rem] font-light text-bank-text">
              Zu „{symbol}" liegen aktuell keine veröffentlichten Analystendaten vor.
            </h1>
            <p className="mt-4 text-[14.5px] leading-relaxed text-bank-text-muted">
              Möglicherweise wurde die Aktie noch nicht in unser Research aufgenommen — oder der Datenstand ist abgelaufen.
            </p>
          </div>
        )}

        {stock && <StockContent stock={stock} error={error} />}
      </div>
    </main>
  );
}

function StockContent({ stock }) {
  const currency = stock.currency || 'EUR';
  const current = Number(stock.current_price);
  const target = Number(stock.target_price);
  const upside = typeof stock.upside_pct === 'number' ? stock.upside_pct
    : (isFinite(current) && current > 0 && isFinite(target)) ? ((target - current) / current) * 100 : null;

  const analystLabel = stock.analyst || stock.research_house;
  const showAnalystName = analystLabel && analystLabel !== '—';

  return (
    <>
      {/* HERO */}
      <header className="mt-10 border-b border-bank-border pb-10 sm:mt-14 sm:pb-14" data-testid="public-stock-hero">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">
          Analystenresearch
        </p>
        <h1 className="mt-4 font-display text-[2.25rem] font-light leading-[1.05] tracking-tight text-bank-text sm:text-[3rem]">
          {stock.company_name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11.5px] uppercase tracking-[0.18em] text-bank-text-muted">
          <span>{stock.ticker}</span>
          {currency && <span>· {currency}</span>}
        </div>

        <div className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-3">
          <div className="rate-figure text-[2.75rem] font-light tabular-nums text-bank-text" data-numeric>
            {formatPrice(current, currency)}
          </div>
          {stock.price_updated_at && (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              Kursstand · {formatDate(stock.price_updated_at, true)} Uhr
            </p>
          )}
        </div>

        <p className="mt-5 max-w-[42rem] text-[13px] leading-relaxed text-bank-text-muted">
          Kurse können zeitverzögert sein. Angabe basiert auf dem letzten Datenstand des Research-Providers.
        </p>
      </header>

      {/* ANALYST TARGET */}
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

      {/* CHART / DATA HINT — honest note, no fabricated data */}
      <section className="mt-12 rounded-2xl border border-bank-border bg-bank-panel p-8 dark:bg-bank-surface sm:p-10" data-testid="public-stock-chart-placeholder">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">
          Historischer Kursverlauf
        </p>
        <div className="mt-6 flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-bank-text-muted" strokeWidth={LUCIDE_STROKE} />
          <p className="text-[13.5px] leading-relaxed text-bank-text-muted">
            Für einzelne Aktien stellen wir aktuell keinen eigenen Kurschart bereit — nur verifizierte
            Analystenschätzungen mit Quellenangabe. Für tiefergehende Kursverläufe verweisen wir auf die
            offizielle Quelle des jeweiligen Research-Anbieters.
          </p>
        </div>
      </section>

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
