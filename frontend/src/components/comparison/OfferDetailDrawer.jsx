import React, { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiBase } from '@/lib/apiBase';
import { getCountryLabelDe } from '@/lib/countryFlags';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import BankLogo from '@/components/bank/BankLogo';
import { computeYield, formatEur } from '@/lib/savingsCalculator';
import { Button } from '@/components/ui/button';
import RateHistoryChart from './RateHistoryChart';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';

const FRESHNESS_LABEL = {
  fresh: 'Zuletzt geprüft',
  stale: 'Kondition wird überprüft',
  expired: 'Angebot abgelaufen',
  demo: 'Demo-Konditionen',
  unverified: 'Quellennachweis noch nicht vollständig',
  unknown: '',
};

const FRESHNESS_STYLES = {
  fresh: 'border-emerald-600/40 bg-emerald-500/10 text-emerald-700',
  stale: 'border-amber-500/50 bg-amber-500/10 text-amber-700',
  expired: 'border-rose-500/50 bg-rose-500/10 text-rose-700',
  demo: 'border-bank-gold/50 bg-bank-gold/10 text-bank-gold',
  unverified: 'border-bank-border bg-bank-bg text-bank-text-muted',
  unknown: 'border-bank-border bg-bank-bg text-bank-text-muted',
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Session 93 · Phase 4 — Detail-Drawer (Desktop) / Fullscreen-Sheet (Mobile).
 *
 * Sektionen: Übersicht · Zinsen · Anlagebedingungen · Einlagensicherung ·
 * Über die Bank · Zinsverlauf · Datenquelle.
 * Sticky-CTA nur bei aktivem OfferLink.
 */
export default function OfferDetailDrawer({ offer, isOpen, onClose }) {
  const [rateHistory, setRateHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [links, setLinks] = useState({ primary: null, links: [], has_affiliate: false });

  useEffect(() => {
    if (!isOpen || !offer?.id) return;
    let cancelled = false;
    const api = getApiBase();
    setHistoryLoading(true);
    Promise.all([
      fetch(`${api}/api/public/savings-offers/${offer.id}/rate-history`, { credentials: 'include' })
        .then((r) => r.json())
        .catch(() => ({ items: [] })),
      fetch(`${api}/api/public/offer-links/${offer.id}`, { credentials: 'include' })
        .then((r) => r.json())
        .catch(() => ({ primary: null, links: [], has_affiliate: false })),
    ]).then(([hist, linkRes]) => {
      if (cancelled) return;
      setRateHistory(hist.items || []);
      setLinks(linkRes || { primary: null, links: [], has_affiliate: false });
      setHistoryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, offer?.id]);

  // Focus trap + ESC close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!offer) return null;
  const freshness = offer.freshness || { label: 'unknown' };
  const label = freshness.label;
  const yieldForAmount = offer.expected_yield || computeYield(offer, 25000);

  const primary = links.primary;
  const hasCTA = Boolean(primary?.url);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/55 backdrop-blur-sm"
            data-testid="offer-drawer-backdrop"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`Details: ${offer.banks?.name || offer.product_name}`}
            data-testid="offer-detail-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.32 }}
            className="fixed inset-y-0 right-0 z-[170] flex w-full max-w-2xl flex-col border-l border-bank-border bg-white"
          >
            {/* Sticky Header */}
            <header className="flex items-start justify-between gap-4 border-b border-bank-border px-6 py-5">
              <div className="flex min-w-0 gap-3">
                <BankLogo bank={offer.banks} size={48} />
                <div className="min-w-0">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
                    {offer.product_type === 'festgeld' ? 'Festgeld' : 'Tagesgeld'}
                    {offer.term_months ? ` · ${offer.term_months} M` : ''}
                  </p>
                  <h2 className="mt-1 truncate font-display text-2xl font-light text-bank-text">
                    {offer.banks?.name || offer.product_name}
                    {offer.banks?.country_code && (
                      <CountryFlagIcon country={offer.banks.country_code} size="sm" className="ml-2 inline-block align-middle" />
                    )}
                  </h2>
                  {label !== 'unknown' && FRESHNESS_LABEL[label] && (
                    <p
                      data-testid={`drawer-freshness-${label}`}
                      className={cn(
                        'mt-1.5 inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]',
                        FRESHNESS_STYLES[label]
                      )}
                    >
                      {FRESHNESS_LABEL[label]}
                      {label === 'fresh' && offer.verified_at ? `: ${fmtDate(offer.verified_at)}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                data-testid="offer-drawer-close"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-bank-border text-bank-text-muted hover:border-bank-primary hover:text-bank-primary"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
              </button>
            </header>

            {/* Sticky Metric Bar */}
            <div className="grid grid-cols-2 gap-4 border-b border-bank-border bg-bank-bg px-6 py-4 text-bank-text">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Zinssatz
                </p>
                <p className="rate-figure mt-1 text-3xl text-bank-primary" data-numeric>
                  {(offer.interest_rate ?? 0).toFixed(2).replace('.', ',')}
                  <span className="ml-1 font-mono text-sm text-bank-gold">% p.a.</span>
                </p>
                {offer.interest_rate_type === 'promo' && offer.standard_rate_after_promo != null && (
                  <p className="mt-1 text-[11.5px] text-bank-text-muted">
                    danach {offer.standard_rate_after_promo.toFixed(2).replace('.', ',')} % p.a.
                    {offer.promo_duration_months ? ` · Aktion ${offer.promo_duration_months} M` : ''}
                  </p>
                )}
              </div>
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Erwarteter Ertrag
                </p>
                <p className="rate-figure mt-1 text-3xl text-bank-text" data-numeric>
                  {yieldForAmount?.gross_return_eur != null
                    ? formatEur(yieldForAmount.gross_return_eur)
                    : '—'}
                </p>
                <p className="mt-1 text-[11.5px] text-bank-text-muted">
                  {yieldForAmount?.horizon_months
                    ? `bei 25.000 € · ${yieldForAmount.horizon_months} M`
                    : ''}
                </p>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 text-[13.5px] text-bank-text">
              <section className="mb-6" aria-labelledby="sec-conditions">
                <h3 id="sec-conditions" className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Anlagebedingungen
                </h3>
                <dl className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
                  <div className="flex justify-between border-b border-bank-border py-1.5">
                    <dt className="text-bank-text-muted">Mindestanlage</dt>
                    <dd>{offer.min_amount != null ? `${offer.min_amount.toLocaleString('de-DE')} €` : '—'}</dd>
                  </div>
                  <div className="flex justify-between border-b border-bank-border py-1.5 sm:border-l sm:pl-3">
                    <dt className="text-bank-text-muted">Maximalanlage</dt>
                    <dd>{offer.max_amount != null ? `${offer.max_amount.toLocaleString('de-DE')} €` : '—'}</dd>
                  </div>
                  <div className="flex justify-between border-b border-bank-border py-1.5">
                    <dt className="text-bank-text-muted">Zinsgutschrift</dt>
                    <dd>{offer.interest_frequency || '—'}</dd>
                  </div>
                  <div className="flex justify-between border-b border-bank-border py-1.5 sm:border-l sm:pl-3">
                    <dt className="text-bank-text-muted">Nur Neukunden</dt>
                    <dd>{offer.new_customers_only ? 'ja' : 'nein'}</dd>
                  </div>
                  {offer.term_months && (
                    <div className="flex justify-between border-b border-bank-border py-1.5">
                      <dt className="text-bank-text-muted">Laufzeit</dt>
                      <dd>{offer.term_months} Monate</dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="mb-6">
                <h3 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Einlagensicherung
                </h3>
                <p>
                  Bis <strong>{offer.deposit_guarantee_limit?.toLocaleString('de-DE') || '100.000'} €</strong>
                  {offer.deposit_guarantee_country && (
                    <>
                      {' '}nach dem gesetzlichen System in{' '}
                      <span className="inline-flex items-center gap-1">
                        <CountryFlagIcon country={offer.deposit_guarantee_country} size="xs" />
                        {getCountryLabelDe(offer.deposit_guarantee_country)}
                      </span>
                      .
                    </>
                  )}
                </p>
                <p className="mt-2 text-[11.5px] text-bank-text-muted">
                  Bankland und Sicherungsland können abweichen — beide werden getrennt geführt.
                </p>
              </section>

              <section className="mb-6">
                <h3 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Über die Bank
                </h3>
                <dl className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
                  <div className="flex justify-between border-b border-bank-border py-1.5">
                    <dt className="text-bank-text-muted">Sitz</dt>
                    <dd className="inline-flex items-center gap-1.5">
                      <CountryFlagIcon country={offer.banks?.country_code} size="xs" />
                      {getCountryLabelDe(offer.banks?.country_code) || offer.banks?.country || '—'}
                    </dd>
                  </div>
                  {offer.banks?.founded_year && (
                    <div className="flex justify-between border-b border-bank-border py-1.5 sm:border-l sm:pl-3">
                      <dt className="text-bank-text-muted">Gegründet</dt>
                      <dd>{offer.banks.founded_year}</dd>
                    </div>
                  )}
                  {offer.banks?.regulator_name && (
                    <div className="flex justify-between border-b border-bank-border py-1.5">
                      <dt className="text-bank-text-muted">Regulator</dt>
                      <dd>{offer.banks.regulator_name}</dd>
                    </div>
                  )}
                  {offer.banks?.legal_name && (
                    <div className="flex justify-between border-b border-bank-border py-1.5 sm:border-l sm:pl-3">
                      <dt className="text-bank-text-muted">Rechtsträger</dt>
                      <dd className="truncate">{offer.banks.legal_name}</dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="mb-6">
                <h3 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Zinsverlauf
                </h3>
                {historyLoading ? (
                  <div className="flex h-32 animate-pulse items-center justify-center border border-bank-border bg-bank-bg text-[12px] text-bank-text-muted">
                    Lädt…
                  </div>
                ) : (
                  <RateHistoryChart items={rateHistory} />
                )}
              </section>

              <section className="mb-2">
                <h3 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
                  Datenquelle
                </h3>
                {offer.is_demo ? (
                  <p className="text-[12.5px] text-bank-text-muted">
                    Diese Kondition ist eine <strong>Demo-Kondition</strong> zu Test- und
                    Vorschauzwecken. Sobald ein autorisierter Datenfeed angebunden ist, wird der
                    Wert automatisch durch verifizierte Live-Zinsen ersetzt.
                  </p>
                ) : offer.data_status === 'verified' && offer.verified_at ? (
                  <p>
                    Zuletzt geprüft am <strong>{fmtDate(offer.verified_at)}</strong>
                    {offer.data_source ? ` · Quelle: ${offer.data_source}` : ''}.
                  </p>
                ) : (
                  <p className="text-bank-text-muted">
                    Für dieses Angebot liegt noch kein vollständiger Quellennachweis
                    (Quelle · Prüfmethode · Prüfzeitpunkt) vor.
                  </p>
                )}
              </section>
            </div>

            {/* Sticky Footer CTA */}
            <footer className="border-t border-bank-border bg-white px-6 py-4">
              {hasCTA ? (
                <>
                  <Button
                    variant="primary"
                    size="xl"
                    className="w-full text-[12px] uppercase tracking-[0.16em]"
                    data-testid="offer-drawer-cta"
                    onClick={() => window.open(primary.url, '_blank', 'noopener,noreferrer')}
                  >
                    Zum Angebot
                    <ExternalLink className="ml-2 inline-block h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
                  </Button>
                  {primary.is_affiliate && (
                    <p
                      data-testid="affiliate-disclosure"
                      className="mt-2 text-center text-[11px] text-bank-text-muted"
                    >
                      Transparenz-Hinweis: Bei Abschluss über diesen Link können wir eine Vergütung erhalten.
                    </p>
                  )}
                </>
              ) : (
                <div
                  data-testid="offer-drawer-no-cta"
                  className="border border-dashed border-bank-border bg-bank-bg px-4 py-3 text-center text-[12px] text-bank-text-muted"
                >
                  Für dieses Angebot ist aktuell kein direkter Weiterleitungs-Link hinterlegt.
                </div>
              )}
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
