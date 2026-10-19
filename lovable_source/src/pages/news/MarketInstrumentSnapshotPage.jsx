import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import PageMeta from '@/components/PageMeta';
import PublicNewsLayout from '@/components/news/PublicNewsLayout';
import MarketAreaChart from '@/components/news/MarketAreaChart';
import PublicNewsCard from '@/components/news/PublicNewsCard';
import {
  DETAIL_CHART_RANGES,
  fetchChartHistory,
} from '@/lib/market/chartOverviewConfig';
import {
  getInstrument,
  INDEX_INSTRUMENTS,
  overviewPath,
  ROHSTOFF_INSTRUMENTS,
  snapshotPath,
} from '@/lib/market/marketInstruments';
import { fetchMarketQuotes } from '@/services/marketService';
import { listPublicFeed } from '@/services/newsService';
import { cn } from '@/lib/utils';

const formatPrice = (value, currency) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const opts =
    n >= 1000
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 4 };
  return `${n.toLocaleString('de-DE', opts)}${currency ? ` ${currency}` : ''}`;
};

const formatPct = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
};

const formatDate = (unixSec) => {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(unixSec * 1000));
  } catch {
    return '—';
  }
};

const DayRangeBar = ({ low, high, current }) => {
  if (low == null || high == null || current == null || high === low) return null;
  const pct = Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));
  return (
    <div className="mt-1">
      <div className="relative h-1.5 rounded-full bg-bank-border/60">
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-bank-accent shadow-sm"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-bank-text-muted">
        <span>{formatPrice(low, '')}</span>
        <span>{formatPrice(high, '')}</span>
      </div>
    </div>
  );
};

const QuoteSidebar = ({ instrument, quote, displayCurrency, yearRange }) => (
  <aside className="space-y-4">
    <div className="rounded-lg border border-bank-border/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-bank-ink/25">
      <h2 className="text-sm font-semibold text-bank-text">
        Aktueller {instrument.title} in {displayCurrency}
      </h2>
      <dl className="mt-3 space-y-2.5 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-bank-text-muted">Kurs</dt>
          <dd className="font-semibold tabular-nums text-bank-text">
            {formatPrice(quote?.displayPrice, displayCurrency)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-bank-text-muted">Eröffnung/Vortag</dt>
          <dd className="tabular-nums text-bank-text">
            {formatPrice(quote?.displayPrev, displayCurrency)}
          </dd>
        </div>
        <div>
          <dt className="text-bank-text-muted">Tagestief/-hoch</dt>
          <DayRangeBar
            low={quote?.displayLow}
            high={quote?.displayHigh}
            current={quote?.displayPrice}
          />
        </div>
        {yearRange && (
          <div className="flex justify-between gap-3 border-t border-bank-border/50 pt-2">
            <dt className="text-bank-text-muted">52 Wochen (Tief/Hoch)</dt>
            <dd className="text-right text-[12px] tabular-nums text-bank-text">
              {formatPrice(yearRange.min, displayCurrency)}
              <br />
              {formatPrice(yearRange.max, displayCurrency)}
            </dd>
          </div>
        )}
      </dl>
      <p className="mt-4 text-[12px]">
        <Link to={overviewPath(instrument.type)} className="text-bank-accent hover:underline">
          {instrument.type === 'rohstoff' ? 'alle Rohstoff-Charts »' : 'zurück zu News »'}
        </Link>
      </p>
    </div>
  </aside>
);

const QuickLinks = ({ type, currentSlug }) => {
  const items = type === 'rohstoff' ? ROHSTOFF_INSTRUMENTS : INDEX_INSTRUMENTS;
  return (
    <footer className="mt-10 rounded-lg border border-bank-border/60 bg-bank-bg/30 p-4 dark:bg-bank-ink/15">
      <h2 className="mb-3 text-sm font-semibold text-bank-text">
        {type === 'rohstoff' ? 'Rohstoffe Quick Links' : 'Indizes Quick Links'}
      </h2>
      <ul className="flex flex-wrap gap-x-1 gap-y-2 text-[12px] text-bank-accent">
        {items.map((item, i) => (
          <li key={item.slug} className="inline-flex items-center">
            {i > 0 && <span className="mx-1 text-bank-text-muted">|</span>}
            {item.slug === currentSlug ? (
              <span className="font-medium text-bank-text">{item.label}</span>
            ) : (
              <Link to={snapshotPath(type, item.slug)} className="hover:underline">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </footer>
  );
};

const MarketInstrumentSnapshotPage = () => {
  const { type, slug } = useParams();
  const base = getInstrument(type, slug);

  const [range, setRange] = useState('1y');
  const [displayCurrency, setDisplayCurrency] = useState(base?.currency ?? 'EUR');
  const [chartPoints, setChartPoints] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [yearRange, setYearRange] = useState(null);
  const [quote, setQuote] = useState(null);
  const [eurUsd, setEurUsd] = useState(null);
  const [news, setNews] = useState([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const instrument = useMemo(
    () => (base ? { ...base, type } : null),
    [base, type],
  );

  useEffect(() => {
    if (!instrument) return;
    setDisplayCurrency(instrument.currency);
  }, [instrument]);

  useEffect(() => {
    if (!instrument) return undefined;
    let cancelled = false;
    setLoadingChart(true);
    fetchChartHistory(instrument.symbol, range)
      .then((pts) => {
        if (!cancelled) setChartPoints(pts);
      })
      .catch(() => {
        if (!cancelled) setChartPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingChart(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instrument, range]);

  useEffect(() => {
    if (!instrument) return undefined;
    let cancelled = false;
    setLoadingMeta(true);

    const symbols =
      instrument.currency === 'USD'
        ? [instrument.symbol, 'EURUSD=X']
        : [instrument.symbol];

    Promise.all([
      fetchMarketQuotes(symbols),
      fetchChartHistory(instrument.symbol, '1y'),
      listPublicFeed({ category: instrument.newsCategory, limit: 6 }),
    ])
      .then(([quotes, yearPts, feed]) => {
        if (cancelled) return;
        const q = quotes.find((r) => r.symbol === instrument.symbol) ?? null;
        const fx = quotes.find((r) => r.symbol === 'EURUSD=X');
        if (fx?.price != null) setEurUsd(Number(fx.price));

        setQuote(q);
        const rows = [...yearPts].slice(-15).reverse();
        setHistoryRows(rows);
        if (yearPts.length) {
          const closes = yearPts.map((p) => p.c);
          setYearRange({ min: Math.min(...closes), max: Math.max(...closes) });
        }
        setNews(feed?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setQuote(null);
          setHistoryRows([]);
          setNews([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });

    return () => {
      cancelled = true;
    };
  }, [instrument]);

  const convertToDisplay = (value) => {
    if (value == null) return null;
    if (instrument?.currency === displayCurrency) return value;
    if (instrument?.currency === 'USD' && displayCurrency === 'EUR' && eurUsd) {
      return value / eurUsd;
    }
    if (instrument?.currency === 'EUR' && displayCurrency === 'USD' && eurUsd) {
      return value * eurUsd;
    }
    return value;
  };

  const displayQuote = useMemo(() => {
    if (!quote) return null;
    return {
      displayPrice: convertToDisplay(quote.price),
      displayPrev: convertToDisplay(quote.prev_close),
      displayHigh: convertToDisplay(quote.day_high),
      displayLow: convertToDisplay(quote.day_low),
      changePct: quote.change_pct,
      changeAbs: convertToDisplay(quote.change_abs),
    };
  }, [quote, displayCurrency, eurUsd, instrument]);

  const chartDisplayPoints = useMemo(() => {
    if (instrument?.currency === displayCurrency || !eurUsd) return chartPoints;
    const factor =
      instrument?.currency === 'USD' && displayCurrency === 'EUR'
        ? 1 / eurUsd
        : instrument?.currency === 'EUR' && displayCurrency === 'USD'
          ? eurUsd
          : 1;
    return chartPoints.map((p) => ({ ...p, c: p.c * factor }));
  }, [chartPoints, displayCurrency, eurUsd, instrument]);

  const rangePerformance = useMemo(() => {
    if (chartDisplayPoints.length < 2) return null;
    const first = chartDisplayPoints[0].c;
    const last = chartDisplayPoints[chartDisplayPoints.length - 1].c;
    if (!first) return null;
    return ((last - first) / first) * 100;
  }, [chartDisplayPoints]);

  const rangeLabel = DETAIL_CHART_RANGES.find((r) => r.id === range)?.label ?? range;

  if (!instrument) {
    const fallback = type === 'index' ? '/news' : '/news/rohstoffcharts';
    return <Navigate to={fallback} replace />;
  }

  const changePositive = (displayQuote?.changePct ?? 0) >= 0;
  const currencies =
    instrument.currency === 'USD' ? ['USD', 'EUR'] : instrument.currency === 'EUR' ? ['EUR', 'USD'] : [instrument.currency];

  return (
    <PublicNewsLayout showSidebar={false}>
      <PageMeta
        title={instrument.title}
        description={`${instrument.title} Chart, Kurse und Nachrichten im Überblick.`}
        path={snapshotPath(type, slug)}
        noIndex
      />

      <nav className="mb-4 text-[12px] text-bank-text-muted">
        <Link to="/news" className="hover:text-bank-accent">
          News
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <Link to={overviewPath(type)} className="hover:text-bank-accent">
          {type === 'rohstoff' ? 'Rohstoffcharts' : 'News'}
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <span className="text-bank-text">{instrument.title}</span>
      </nav>

      <header className="border-b border-bank-border/70 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-light text-bank-text">{instrument.title}</h1>
            <p className="mt-1 text-[13px] text-bank-text-muted">{instrument.unit}</p>
          </div>
          {displayQuote && (
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums text-bank-text">
                {formatPrice(displayQuote.displayPrice, displayCurrency)}
              </p>
              <p
                className={cn(
                  'text-[13px] font-medium tabular-nums',
                  changePositive ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {formatPrice(displayQuote.changeAbs, displayCurrency)}{' '}
                ({formatPct(displayQuote.changePct)})
              </p>
            </div>
          )}
        </div>

        {currencies.length > 1 && (
          <div className="mt-3 flex gap-2" role="tablist" aria-label="Währung">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={displayCurrency === c}
                onClick={() => setDisplayCurrency(c)}
                className={cn(
                  'rounded border px-3 py-1 text-[12px] font-medium transition',
                  displayCurrency === c
                    ? 'border-bank-accent bg-bank-accent/10 text-bank-accent'
                    : 'border-bank-border text-bank-text-muted hover:text-bank-text',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-bank-border/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-bank-ink/25">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-bank-text">
                {instrument.title} Chart in {displayCurrency} – {rangeLabel}
              </h2>
              {rangePerformance != null && (
                <span
                  className={cn(
                    'text-[13px] font-semibold tabular-nums',
                    rangePerformance >= 0 ? 'text-emerald-600' : 'text-red-600',
                  )}
                >
                  {formatPct(rangePerformance)}
                </span>
              )}
            </div>

            <div
              className="flex flex-wrap gap-x-3 gap-y-1 border-b border-bank-border/60 pb-px"
              role="tablist"
              aria-label="Zeitraum"
            >
              {DETAIL_CHART_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={range === r.id}
                  onClick={() => setRange(r.id)}
                  className={cn(
                    'px-1 py-2 text-[12px] font-medium transition-colors',
                    range === r.id
                      ? 'border-b-2 border-bank-gold text-bank-text'
                      : 'text-bank-text-muted hover:text-bank-text',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {loadingChart ? (
                <div className="h-72 animate-pulse rounded bg-bank-border/25" />
              ) : (
                <MarketAreaChart
                  points={chartDisplayPoints}
                  range={range}
                  height={360}
                  variant="detailed"
                  showHighLow
                />
              )}
            </div>
          </section>

          <section className="rounded-lg border border-bank-border/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-bank-ink/25">
            <h2 className="text-[15px] font-semibold text-bank-text">
              Nachrichten zu {instrument.title}
            </h2>
            {loadingMeta ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded bg-bank-border/25" />
                ))}
              </div>
            ) : news.length === 0 ? (
              <p className="mt-3 text-[13px] text-bank-text-muted">Keine passenden Meldungen.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2">
                {news.slice(0, 4).map((article) => (
                  <PublicNewsCard key={article.id ?? article.slug} article={article} compact />
                ))}
              </div>
            )}
            <p className="mt-4">
              <Link to={`/news?category=${instrument.newsCategory}`} className="text-[12px] text-bank-accent hover:underline">
                mehr News »
              </Link>
            </p>
          </section>

          <section className="rounded-lg border border-bank-border/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-bank-ink/25">
            <h2 className="text-[15px] font-semibold text-bank-text">
              {instrument.title} – Historische Kurse
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[280px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-bank-border/70 text-bank-text-muted">
                    <th className="py-2 pr-4 font-medium">Datum</th>
                    <th className="py-2 font-medium">Schlusskurs</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={row.t} className="border-b border-bank-border/40">
                      <td className="py-2 pr-4 tabular-nums text-bank-text-muted">
                        {formatDate(row.t)}
                      </td>
                      <td className="py-2 tabular-nums text-bank-text">
                        {formatPrice(convertToDisplay(row.c), displayCurrency)}
                      </td>
                    </tr>
                  ))}
                  {!loadingMeta && historyRows.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 text-bank-text-muted">
                        Keine historischen Daten verfügbar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-bank-border/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-bank-ink/25">
            <h2 className="text-[15px] font-semibold text-bank-text">{instrument.title}</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-bank-text-muted">{instrument.about}</p>
          </section>
        </div>

        <div>
          {loadingMeta ? (
            <div className="h-48 animate-pulse rounded-lg bg-bank-border/25" />
          ) : (
            <QuoteSidebar
              instrument={instrument}
              quote={displayQuote}
              displayCurrency={displayCurrency}
              yearRange={
                yearRange
                  ? {
                      min: convertToDisplay(yearRange.min),
                      max: convertToDisplay(yearRange.max),
                    }
                  : null
              }
            />
          )}
        </div>
      </div>

      <QuickLinks type={type} currentSlug={slug} />
    </PublicNewsLayout>
  );
};

export default MarketInstrumentSnapshotPage;
