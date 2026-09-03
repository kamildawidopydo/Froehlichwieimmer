import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import axios from 'axios';
import { ArrowRight, LineChart } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1];
const API_BASE = process.env.REACT_APP_BACKEND_URL;

/**
 * @typedef {Object} StockResearchRow
 * @property {string} company        Unternehmen (z. B. "SAP SE")
 * @property {string} ticker         Ticker-Symbol (z. B. "SAP")
 * @property {number} currentPrice   Aktueller Kurs
 * @property {number} priceTarget    Kursziel
 * @property {number} upsidePct      Abstand in Prozent
 * @property {string} analyst        Analyst / Research-Haus
 * @property {string} asOfDate       ISO-Datum des Datenstands
 * @property {string} source         Quelle
 * @property {string} currency       Währung (z. B. "EUR")
 */

const TABLE_COLUMNS = [
  { key: 'company', label: 'Unternehmen', align: 'left' },
  { key: 'current', label: 'Aktuell', align: 'right' },
  { key: 'target', label: 'Kursziel', align: 'right' },
  { key: 'upside', label: 'Abstand', align: 'right' },
  { key: 'analyst', label: 'Analyst', align: 'left' },
  { key: 'asOf', label: 'Stand', align: 'right' },
];

const INFO_CARDS = [
  {
    key: 'fundamental',
    kicker: 'Fundamentale Stärke',
    body: 'Wir betrachten Geschäftsmodell, Bilanzqualität, Ertragskraft und langfristige Perspektiven.',
    Icon: LineChart,
  },
];

const formatPrice = (value, currency = 'EUR') => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const formatUpside = (pct) => {
  if (typeof pct !== 'number' || Number.isNaN(pct)) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}\u202f%`;
};

/**
 * Renders the analyst research table once real data becomes available.
 * @param {{ rows: StockResearchRow[] }} props
 */
const ResearchTable = ({ rows }) => (
  <div
    className="overflow-hidden rounded-2xl border border-bank-border bg-white"
    data-testid="stock-research-table"
  >
    {/* Desktop / Tablet ≥ md */}
    <div className="hidden md:block">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-bank-border bg-bank-mint/50">
            {TABLE_COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-6 py-4 font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-bank-primary-strong',
                  col.align === 'right' && 'text-right',
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={`${row.ticker}-${idx}`}
              className="group cursor-pointer border-b border-bank-border/60 transition-colors last:border-b-0 hover:bg-bank-mint/25 focus-within:bg-bank-mint/30"
              data-testid={`stock-research-row-${row.ticker.toLowerCase()}`}
              onClick={(e) => {
                // Row click navigates; keyboard uses the anchor.
                const link = e.currentTarget.querySelector('a[data-row-link]');
                if (link && e.target.tagName !== 'A') link.click();
              }}
            >
              <td className="px-6 py-5 align-top">
                <Link
                  to={`/aktien/${encodeURIComponent(row.ticker)}`}
                  data-row-link
                  className="block outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
                  aria-label={`${row.company} · Details öffnen`}
                >
                  <p className="text-[15px] font-semibold leading-tight text-bank-text group-hover:text-bank-primary-strong transition-colors">
                    {row.company}
                  </p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-bank-text-muted">
                    {row.ticker}
                  </p>
                </Link>
              </td>
              <td className="px-6 py-5 text-right align-top">
                <span className="rate-figure text-[15px] tabular-nums text-bank-text" data-numeric>
                  {formatPrice(row.currentPrice, row.currency)}
                </span>
              </td>
              <td className="px-6 py-5 text-right align-top">
                <span className="rate-figure text-[15px] tabular-nums text-bank-text" data-numeric>
                  {formatPrice(row.priceTarget, row.currency)}
                </span>
              </td>
              <td className="px-6 py-5 text-right align-top">
                <span
                  className={cn(
                    'inline-flex items-baseline font-mono text-[13.5px] font-semibold tabular-nums',
                    row.upsidePct >= 0 ? 'text-bank-primary-strong' : 'text-bank-text-muted',
                  )}
                  data-numeric
                >
                  {formatUpside(row.upsidePct)}
                </span>
              </td>
              <td className="px-6 py-5 align-top">
                <p className="text-[13.5px] leading-snug text-bank-text">{row.analyst}</p>
                {row.source ? (
                  <p className="mt-0.5 text-[11.5px] leading-snug text-bank-text-muted">
                    Quelle: {row.source}
                  </p>
                ) : null}
              </td>
              <td className="px-6 py-5 text-right align-top">
                <div className="flex items-center justify-end gap-3">
                  <span className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                    {formatDate(row.asOfDate)}
                  </span>
                  <span
                    className="hidden font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-primary-strong opacity-70 transition-opacity group-hover:opacity-100 lg:inline"
                    data-testid={`stock-research-open-analysis-${row.ticker.toLowerCase()}`}
                  >
                    Analyse öffnen
                  </span>
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-bank-primary-strong opacity-40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                    strokeWidth={LUCIDE_STROKE}
                    aria-hidden
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile — kompakte Research-Cards */}
    <ul className="divide-y divide-bank-border md:hidden">
      {rows.map((row, idx) => (
        <li key={`m-${row.ticker}-${idx}`}>
          <Link
            to={`/aktien/${encodeURIComponent(row.ticker)}`}
            className="block px-5 py-5 transition-colors hover:bg-bank-mint/25 focus-visible:bg-bank-mint/30 focus-visible:outline-none"
            aria-label={`${row.company} · Details öffnen`}
          >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-bank-text">{row.company}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-bank-text-muted">
                {row.ticker}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 font-mono text-[13px] font-semibold tabular-nums',
                row.upsidePct >= 0 ? 'text-bank-primary-strong' : 'text-bank-text-muted',
              )}
              data-numeric
            >
              {formatUpside(row.upsidePct)}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">Aktuell</dt>
              <dd className="mt-0.5 tabular-nums text-bank-text" data-numeric>
                {formatPrice(row.currentPrice, row.currency)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">Kursziel</dt>
              <dd className="mt-0.5 tabular-nums text-bank-text" data-numeric>
                {formatPrice(row.priceTarget, row.currency)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">Analyst</dt>
              <dd className="mt-0.5 text-bank-text">{row.analyst}</dd>
              {row.source ? (
                <dd className="mt-0.5 text-[11.5px] text-bank-text-muted">Quelle: {row.source}</dd>
              ) : null}
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">Datenstand</dt>
                <dd className="mt-0.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                  {formatDate(row.asOfDate)}
                </dd>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-primary-strong">
                Analyse öffnen
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} aria-hidden />
              </span>
            </div>
          </dl>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const EmptyState = () => (
  <div
    className="relative overflow-hidden rounded-2xl border border-bank-border bg-white"
    data-testid="stock-research-empty-state"
  >
    {/* Header row mimicking the future table — signals intent */}
    <div className="hidden border-b border-bank-border bg-bank-mint/50 md:block">
      <div className="grid grid-cols-6 gap-6 px-6 py-4">
        {TABLE_COLUMNS.map((col) => (
          <span
            key={col.key}
            className={cn(
              'font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-bank-primary-strong',
              col.align === 'right' && 'text-right',
            )}
          >
            {col.label}
          </span>
        ))}
      </div>
    </div>

    {/* Empty state body */}
    <div className="px-6 py-14 sm:px-10 sm:py-20">
      <div className="mx-auto flex max-w-[42rem] flex-col items-center text-center">
        <div
          aria-hidden
          className="mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-bank-border bg-bank-mint/60 text-bank-primary-strong"
        >
          <LineChart size={22} strokeWidth={LUCIDE_STROKE} />
        </div>

        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-bank-primary-strong/85">
          Research · Datenstand ausstehend
        </p>

        <h3 className="mt-4 font-display text-[1.35rem] font-light leading-snug tracking-tight text-bank-text sm:text-[1.55rem]">
          Aktuell liegen keine verifizierten Analysteneinschätzungen vor.
        </h3>

        <p className="mt-4 max-w-[36rem] text-[14.5px] leading-relaxed text-bank-text-muted">
          Sobald neue, nachvollziehbare Research-Daten verfügbar sind, werden sie hier mit
          Quelle und Datenstand veröffentlicht.
        </p>

        {/* Dezente Skelett-Andeutung — keine simulierten Daten, nur Struktur */}
        <div
          aria-hidden
          className="mt-10 hidden w-full max-w-[36rem] flex-col gap-3 opacity-60 sm:flex"
        >
          {[0.9, 0.75, 0.6].map((w, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-2 flex-1 rounded-full bg-bank-border/70" style={{ width: `${w * 100}%` }} />
              <div className="h-2 w-16 rounded-full bg-bank-border/50" />
              <div className="h-2 w-12 rounded-full bg-bank-border/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Homepage stock research section.
 * Fetches verified analyst rows from `/api/stock-research`. If none are
 * published, the editorial empty-state is rendered instead. Consumers may
 * still pass `rows` explicitly to bypass the fetch (e.g. in Storybook).
 *
 * @param {{ rows?: StockResearchRow[] }} props
 */
const StockResearchSection = ({ rows: rowsProp }) => {
  const prefersReduced = useReducedMotion();
  const [fetched, setFetched] = useState(null); // null while loading
  const [asOf, setAsOf] = useState(null);

  useEffect(() => {
    if (rowsProp !== undefined) {
      setFetched(rowsProp);
      return () => {};
    }
    let alive = true;
    const controller = new AbortController();
    axios
      .get(`${API_BASE}/api/stock-research`, { signal: controller.signal, params: { limit: 12 } })
      .then(({ data }) => {
        if (!alive) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        // Map API shape → row shape used by ResearchTable
        setFetched(items.map((it) => ({
          company: it.company_name,
          ticker: it.ticker,
          currentPrice: Number(it.current_price),
          priceTarget: Number(it.target_price),
          upsidePct: Number(it.upside_pct),
          analyst: it.analyst || it.research_house || '—',
          asOfDate: it.research_date,
          source: it.source_name,
          sourceUrl: it.source_url,
          currency: it.currency || 'EUR',
        })));
        setAsOf(data?.as_of || null);
      })
      .catch((err) => {
        if (axios.isCancel?.(err) || err?.name === 'CanceledError') return;
        if (!alive) return;
        setFetched([]); // fall back to empty state on error
      });
    return () => { alive = false; controller.abort(); };
  }, [rowsProp]);

  const rows = fetched || [];
  const isLoading = fetched === null;
  const hasData = !isLoading && rows.length > 0;

  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-72px' },
    transition: { duration: prefersReduced ? 0 : 0.6, ease: EASE, delay: prefersReduced ? 0 : 0.05 * i },
  });

  return (
    <section
      id="home-stock-research"
      aria-labelledby="home-stock-research-heading"
      data-testid="home-stock-research"
      className="relative border-t border-bank-border bg-bank-bg py-20 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <motion.header {...reveal(0)} className="mx-auto max-w-3xl text-center">
          <Eyebrow>Exklusive Analysen</Eyebrow>
          <h2
            id="home-stock-research-heading"
            className="mt-5 font-display text-[2rem] font-light leading-[1.1] tracking-tight text-bank-text sm:text-[2.5rem] lg:text-[2.75rem]"
          >
            Aktien mit Potenzial
          </h2>
          <div aria-hidden className="mx-auto mt-7 flex h-px w-16 items-center justify-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-bank-primary/45" />
            <span className="h-1 w-1 shrink-0 rounded-full bg-bank-primary/55" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-bank-primary/45" />
          </div>
          <p className="mx-auto mt-7 max-w-[38rem] text-[15.5px] leading-relaxed text-bank-text-muted sm:text-base">
            Aktuelle Analysteneinschätzungen und Kursziele im Überblick.
          </p>
        </motion.header>

        {/* Research table or empty state */}
        <motion.div {...reveal(1)} className="mt-14 sm:mt-16" data-testid="stock-research-container">
          {hasData ? <ResearchTable rows={rows} /> : <EmptyState />}
        </motion.div>

        {/* Data provenance line (only with real data) */}
        {hasData ? (
          <>
            <p className="mt-5 text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted" data-testid="stock-research-as-of">
              {asOf ? `Datenstand: ${new Date(asOf).toLocaleString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · ` : ''}
              Quellen: Analysten-/Research-Angaben der jeweils genannten Anbieter
            </p>
            {/* Session 80.98 — Compare-Handoff aus Investment-Cockpit */}
            <div className="mt-8 flex justify-center">
              <Link
                to="/comparison"
                data-testid="stock-research-compare-cta"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-bank-border bg-white px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-primary/60 hover:text-bank-primary-strong"
              >
                Aktien vergleichen
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} aria-hidden />
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default StockResearchSection;
