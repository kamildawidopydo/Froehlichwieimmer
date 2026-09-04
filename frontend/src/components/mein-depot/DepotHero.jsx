import React from 'react';
import { motion } from 'framer-motion';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR } from '@/lib/dashboardFormatters';
import AnimatedNumber from '@/components/AnimatedNumber';

/**
 * DepotHero — sober private-banking Portfolio-Hero für /mein-depot.
 *
 * Data audit (Session 81.06 Schritt 2/7):
 *  - `gesamtvermoegen` (A): bereits im DashboardDataContext berechnet
 *    = cashBalance + depotWert + bondsMarktwert + contractsTotal
 *  - `stockPricesUpdatedAt` (A): ISO-String der letzten yfinance-Cache-Aktualisierung,
 *    stammt aus `stock_prices_cache.fetched_at`. Bezieht sich fachlich nur auf
 *    Aktien-Kurse — deshalb explizit als "Kursdaten"-Stand beschriftet, nicht als
 *    "Depotstand", um keinen falschen Eindruck zu erwecken.
 *  - `loading`: Skeleton, keine Fake-0,00 €
 *
 * Keine neue Business-Logik. Keine erfundenen Zeitstempel. Kein Requests-Delta.
 */
const formatUpdated = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
};

const DepotHero = () => {
  const { gesamtvermoegen, stockPricesUpdatedAt, loading } = useDashboardData();
  const updated = formatUpdated(stockPricesUpdatedAt);

  return (
    <motion.section
      data-testid="mein-depot-hero"
      className="mb-10 sm:mb-12"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">
        Mein Depot
      </p>
      <h1
        className="mt-3 font-display text-[1.9rem] font-light leading-[1.08] tracking-[-0.02em] text-bank-text sm:text-[2.2rem]"
        style={{ fontVariationSettings: "'opsz' 144" }}
      >
        Ihr Vermögen im Überblick
      </h1>
      <span aria-hidden className="mt-5 block h-px w-16 bg-bank-gold/70" />

      <div className="mt-6 flex flex-col gap-1">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">
          Depotwert
        </p>
        {loading ? (
          <div
            aria-hidden
            data-testid="mein-depot-hero-value-skeleton"
            className="mt-1 h-[42px] w-[280px] animate-pulse rounded-sm bg-bank-border/40 sm:h-[56px] sm:w-[360px]"
          />
        ) : (
          <p
            data-testid="mein-depot-hero-value"
            className="rate-figure mt-1 text-[2.4rem] leading-[1.02] tabular-nums text-bank-text sm:text-[3rem]"
            aria-live="polite"
          >
            <AnimatedNumber value={Number(gesamtvermoegen) || 0} format={formatEUR} />
          </p>
        )}
        <p className="mt-2 text-[13px] leading-relaxed text-bank-text-muted">
          Gesamtwert Ihres hinterlegten Portfolios.
        </p>
        {updated && (
          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted/85">
            Kursdaten-Stand: <time dateTime={stockPricesUpdatedAt}>{updated}</time>
          </p>
        )}
      </div>
    </motion.section>
  );
};

export default DepotHero;
