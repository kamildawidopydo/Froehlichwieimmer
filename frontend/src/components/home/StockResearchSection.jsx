import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, LineChart, ShieldCheck } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1];

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
    Icon: BarChart3,
  },
  {
    key: 'experten',
    kicker: 'Experten-Know-How',
    body: 'Analysteneinschätzungen werden transparent mit Quelle und Datenstand dargestellt.',
    Icon: LineChart,
  },
  {
    key: 'risiko',
    kicker: 'Risikobewusst Investieren',
    body: 'Kursziele sind Einschätzungen und keine Garantie für zukünftige Wertentwicklungen.',
    Icon: ShieldCheck,
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
              className="border-b border-bank-border/60 transition-colors last:border-b-0 hover:bg-bank-mint/25"
              data-testid={`stock-research-row-${row.ticker.toLowerCase()}`}
            >
              <td className="px-6 py-5 align-top">
                <p className="text-[15px] font-semibold leading-tight text-bank-text">{row.company}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-bank-text-muted">
                  {row.ticker}
                </p>
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
              <td className="px-6 py-5 text-right align-top font-mono text-[11.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                {formatDate(row.asOfDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile — kompakte Research-Cards */}
    <ul className="divide-y divide-bank-border md:hidden">
      {rows.map((row, idx) => (
        <li key={`m-${row.ticker}-${idx}`} className="px-5 py-5">
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
            <div className="col-span-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">Datenstand</dt>
              <dd className="mt-0.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                {formatDate(row.asOfDate)}
              </dd>
            </div>
          </dl>
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
 * Renders an editorial empty-state when no verified analyst data exists;
 * automatically shows the research table once real rows are supplied.
 *
 * @param {{ rows?: StockResearchRow[] }} props
 */
const StockResearchSection = ({ rows = [] }) => {
  const prefersReduced = useReducedMotion();
  const hasData = Array.isArray(rows) && rows.length > 0;

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
        <motion.div {...reveal(1)} className="mt-14 sm:mt-16">
          {hasData ? <ResearchTable rows={rows} /> : <EmptyState />}
        </motion.div>

        {/* Info cards */}
        <motion.ul
          {...reveal(2)}
          className="mt-14 grid grid-cols-1 gap-6 sm:mt-16 md:grid-cols-3 md:gap-7"
          data-testid="stock-research-info-cards"
        >
          {INFO_CARDS.map(({ key, kicker, body, Icon }) => (
            <li
              key={key}
              className="group relative flex flex-col rounded-2xl border border-bank-border bg-white p-7 transition-colors hover:border-bank-primary/30 sm:p-8"
              data-testid={`stock-research-info-card-${key}`}
            >
              <span
                aria-hidden
                className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-bank-primary/25 bg-bank-mint/60 text-bank-primary-strong"
              >
                <Icon size={18} strokeWidth={LUCIDE_STROKE} />
              </span>
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong/85">
                {kicker}
              </p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">
                {body}
              </p>
            </li>
          ))}
        </motion.ul>

        {/* Disclaimer */}
        <p className="mx-auto mt-14 max-w-[54rem] text-center text-[12px] leading-relaxed text-bank-text-muted sm:mt-16 sm:text-[12.5px]">
          Analysteneinschätzungen und Kursziele stellen keine Anlageberatung oder Empfehlung zum
          Kauf oder Verkauf von Wertpapieren dar. Einschätzungen und Kursziele können sich jederzeit
          ändern.
        </p>
      </div>
    </section>
  );
};

export default StockResearchSection;
