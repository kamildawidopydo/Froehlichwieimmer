import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Shield, Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react';
import BonusIcon from '@/components/BonusIcon';
import StarRatingRow from '@/components/comparison/StarRatingRow';
import OfferReviewForm from '@/components/comparison/OfferReviewForm';
import InterestRateSparkline from '@/components/comparison/InterestRateSparkline';
import BankLogo from '@/components/BankLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { getOfferRatingBundle, getOfferRatingValue } from '@/lib/offerRating';
import { getDisplayProductType } from '@/lib/productDisplay';
import { MEDIATOR_BRAND, getComparisonProfile } from '@/data/comparisonProfiles';
import { getBankBonusContent } from '@/data/bankBonusTexts';
import { formatRateDe } from '@/lib/interestRateHistory';
import { formatStarAverageDe } from '@/lib/starRating';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';
import {
  resolveReviewDisplay,
  getDisplayStarDistribution,
  buildDisplayReviewEntries,
} from '@/lib/offerReviewDisplay';
import {
  fetchApprovedReviewsForOffer,
  fetchMyReviewForOffer,
  fetchMyGuestReviewForOffer,
  fetchOfferReviewStats,
  normalizeOfferReviewRow,
} from '@/lib/offerReviews';
import { getGuestReviewSessionToken } from '@/lib/guestReviewSession';
import { COMPARISON_DEPOSIT_LABEL } from '@/components/comparison/ComparisonOfferCard';
import { formatComparisonMinDepositWithCurrency, formatOfferMinDeposit } from '@/lib/comparisonDisplay';

const TABS = [
  { id: 'produkt', label: 'Produktdetails' },
  { id: 'reviews', label: 'Erfahrungsberichte' },
  { id: 'bewertung', label: 'Bewertung & Sicherheit' },
  { id: 'bonus', label: 'Bonus & Vorteile' },
];

const formatScoreDe = (n) =>
  String(typeof n === 'number' ? Math.round(n * 10) / 10 : n).replace('.', ',');

const cmpAccent = 'text-[#1a4295] dark:text-bank-primary';
const panelClass = 'rounded-xl border border-bank-border bg-white p-4 shadow-sm dark:bg-bank-surface sm:p-5';
const surfaceHeader = 'bg-white dark:bg-bank-surface';
const assessmentBox =
  'rounded-xl border border-amber-100 bg-[#faf8f3] p-3 dark:border-amber-500/25 dark:bg-amber-950/15 sm:p-5';
const bonusBanner =
  'border-b border-amber-100 bg-[#faf6ed] dark:border-amber-500/25 dark:bg-amber-950/20';

function sovereignNumeric(ratingLabel) {
  const r = (ratingLabel || '').replace(/–/g, '-').toUpperCase();
  if (r.includes('AAA')) return 10;
  if (r.includes('AA+')) return 9.8;
  if (r.includes('AA-')) return 9.4;
  if (r.includes('AA')) return 9.6;
  if (r.includes('A+')) return 9.4;
  if (r.includes('A-')) return 9.0;
  if (r.includes('BBB+')) return 8.6;
  if (r.includes('BBB')) return 8.2;
  return 8.4;
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-bank-border/60 py-3 text-sm last:border-0">
      <span className="text-bank-text-muted">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-bank-text">{value}</span>
    </div>
  );
}

function RatingBar({ label, value }) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-end justify-between gap-3">
        <span className="text-sm font-semibold text-bank-text">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-bank-text">{formatScoreDe(value)}</span>
      </div>
      <div className="h-0.5 w-full bg-emerald-600 dark:bg-emerald-400" />
    </div>
  );
}

function SubRow({ label, value }) {
  return (
    <div className="mb-2 flex justify-between gap-4 text-sm">
      <span className="text-bank-text-muted">{label}</span>
      <span className="shrink-0 font-medium tabular-nums text-bank-text">{formatScoreDe(value)}</span>
    </div>
  );
}

function InfoCard({ title, children, footer }) {
  return (
    <div className={cn(panelClass, 'sm:p-6')}>
      <h3 className="text-lg font-bold text-bank-text">{title}</h3>
      <div className="mt-4 text-sm leading-relaxed text-bank-text-muted">{children}</div>
      {footer && <div className="mt-5 space-y-2 border-t border-bank-border pt-4 text-sm">{footer}</div>}
    </div>
  );
}

function availabilityLabel(offer) {
  const early = (offer.early_withdrawal || '').toLowerCase();
  if (early.includes('jederzeit') || early.includes('täglich')) return 'Täglich verfügbar';
  if (early.includes('kündigung')) return 'Mit Kündigung';
  return offer.deposit_term === 0 ? 'Täglich verfügbar' : 'Fest gebunden';
}

export default function OfferComparisonDetail({ offer, rateHistory = [], onClose, onInterestClick }) {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('produkt');
  const [reviewTab, setReviewTab] = useState('Alle');
  const [reviewPage, setReviewPage] = useState(0);
  const [approvedRows, setApprovedRows] = useState([]);
  const [dbStats, setDbStats] = useState({ count: 0, average: null });
  const [myReview, setMyReview] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    if (!offer?.id) return;
    setReviewsLoading(true);
    const isApprovedMember = user && (user.status === 'approved' || user.role === 'admin');
    const guestToken = isApprovedMember ? null : getGuestReviewSessionToken();
    const [statsRes, approvedRes, mineRes] = await Promise.all([
      fetchOfferReviewStats(offer.id),
      fetchApprovedReviewsForOffer(offer.id, { limit: 200 }),
      isApprovedMember
        ? fetchMyReviewForOffer(offer.id)
        : fetchMyGuestReviewForOffer(offer.id, guestToken),
    ]);
    setDbStats({ count: statsRes.count, average: statsRes.average });
    setApprovedRows(approvedRes.data || []);
    setMyReview(normalizeOfferReviewRow(mineRes.data));
    setReviewsLoading(false);
  }, [offer?.id, user]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const profile = useMemo(() => getComparisonProfile(offer), [offer]);
  const bonusContent = useMemo(() => getBankBonusContent(offer, profile), [offer, profile]);
  const ratingBundle = useMemo(() => getOfferRatingBundle(offer), [offer]);
  const ratingValue = useMemo(() => getOfferRatingValue(offer), [offer]);
  const productLabel = useMemo(() => getDisplayProductType(offer), [offer]);
  const rateFormatted = formatRateDe(offer.interest_rate);

  const display = useMemo(() => resolveReviewDisplay(offer, dbStats), [offer, dbStats]);
  const starAvg = display.average;
  const starAvgFormatted = formatStarAverageDe(starAvg);
  const totalReviews = display.count;
  const starCounts = useMemo(
    () => getDisplayStarDistribution(offer, dbStats, approvedRows),
    [offer, dbStats, approvedRows]
  );
  const recommendationPct = Math.min(97, Math.round(78 + (starAvg - 3.6) * 14));

  const sovereign = sovereignNumeric(profile.facts.sovereignRating);
  const landBlockScore = Math.min(10, Math.round(((sovereign + 9.8) / 2) * 10) / 10);
  const withholdingScore = profile.withholding.startsWith('Keine') ? 10 : 8.4;
  const customerPartial = Math.min(10, Math.max(7.2, Math.round((starAvg * 2 - 0.96) * 10) / 10));
  const freq = (offer.interest_frequency || 'Am Ende der Laufzeit').toLowerCase();
  const rhythmScore = freq.includes('jahr') || freq.includes('jähr') ? 10 : 9.5;
  const attractivenessScore = Math.min(10, Math.round((ratingValue - 0.35) * 10) / 10);
  const closingScore = Math.min(10, Math.round((ratingValue + 0.08) * 10) / 10);

  const reviewEntries = useMemo(
    () => buildDisplayReviewEntries(offer, reviewTab, approvedRows),
    [offer, reviewTab, approvedRows]
  );
  const hasSeedInList = useMemo(() => reviewEntries.some((e) => e.source === 'seed'), [reviewEntries]);
  const pageSize = 3;
  const totalPages = Math.max(1, Math.ceil(reviewEntries.length / pageSize));
  const safePage = Math.min(reviewPage, totalPages - 1);
  const pageSlice = reviewEntries.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const reviewRangeStart = reviewEntries.length === 0 ? 0 : safePage * pageSize + 1;
  const reviewRangeEnd = Math.min((safePage + 1) * pageSize, reviewEntries.length);
  const listedReviewCount = reviewTab === 'Alle' ? totalReviews : reviewEntries.length;

  useEffect(() => {
    setReviewPage((page) => Math.min(page, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const assessmentText = useMemo(() => {
    if (ratingValue >= 9.5) {
      return `Starke Kombination aus ${productLabel}-Flexibilität, ${COMPARISON_DEPOSIT_LABEL} und etablierter Aufsicht durch ${offer.regulator_name || 'die zuständige Behörde'}. Für Anleger mit Fokus auf planbare Verzinsung ohne Börsenschwankungen besonders interessant.`;
    }
    return `Solides ${productLabel}-Angebot mit nachvollziehbaren Konditionen und EU-konformer Regulierung. Bitte Kündigungsfristen, Mindestanlage und steuerliche Aspekte im Detail prüfen.`;
  }, [ratingValue, productLabel, offer.regulator_name]);

  const handleInterestClick = typeof onInterestClick === 'function' ? onInterestClick : null;
  const hasBonus = bonusContent.hasBonus;
  const maxDep =
    offer.max_deposit != null && offer.max_deposit > 0
      ? `€${Number(offer.max_deposit).toLocaleString('de-DE')}`
      : 'Keine Obergrenze';

  return (
    <div className="flex max-h-[min(96dvh,920px)] flex-col overflow-hidden bg-[#f5f6f8] dark:bg-bank-bg sm:max-h-[92vh]">
      {/* Header — kompakt auf Mobil */}
      <div className={cn('shrink-0 border-b border-bank-border px-3 py-2.5 sm:px-6 sm:py-5', surfaceHeader)}>
        <div className="flex items-center gap-2.5 sm:hidden">
          <BankLogo logo={offer.bank_logo} bankName={offer.bank_name} size="sm" />
          <div className="min-w-0 flex-1">
            <h2 className={cn('truncate text-[15px] font-semibold leading-tight', cmpAccent)}>{offer.bank_name}</h2>
            <p className="truncate text-[11px] text-bank-text-muted">
              {productLabel} · {profile.countryDe}
            </p>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              <StarRatingRow value={starAvg} size="sm" />
              <span className="truncate text-[10px] text-bank-text-muted">
                {starAvgFormatted} · {totalReviews.toLocaleString('de-DE')}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="text-right">
              <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-bank-text-muted">Zinssatz</p>
              <p className="text-xl font-semibold leading-none text-emerald-700 dark:text-emerald-400">{rateFormatted} %</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-bank-text-muted hover:bg-bank-bg hover:text-bank-text"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
            </button>
          </div>
        </div>

        <div className="hidden items-start justify-between gap-4 sm:flex">
          <div className="flex min-w-0 items-start gap-4">
            <BankLogo logo={offer.bank_logo} bankName={offer.bank_name} size="lg" />
            <div className="min-w-0">
              <h2 className={cn('truncate text-xl font-semibold sm:text-2xl', cmpAccent)}>{offer.bank_name}</h2>
              <p className="mt-1 text-sm text-bank-text-muted">
                {productLabel} · {profile.countryDe}
                {offer.founded_year ? ` · Seit ${offer.founded_year}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StarRatingRow value={starAvg} size="sm" />
                <span className="text-xs text-bank-text-muted">
                  {starAvgFormatted} · {totalReviews.toLocaleString('de-DE')} Bewertungen
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-bank-border bg-bank-bg px-2 py-0.5 text-xs font-semibold">
                  <Shield className={cn('h-3 w-3', cmpAccent)} strokeWidth={LUCIDE_STROKE} />
                  {ratingBundle.formatted} / 10 Trust
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-4">
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">Zinssatz p.a.</p>
              <p className="text-3xl font-semibold text-emerald-700 dark:text-emerald-400">{rateFormatted} %</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-bank-text-muted hover:bg-bank-bg hover:text-bank-text"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" strokeWidth={LUCIDE_STROKE} />
            </button>
          </div>
        </div>
      </div>

      {hasBonus && (
        <div className={cn('shrink-0 flex items-center gap-2 px-3 py-2 sm:flex-wrap sm:gap-3 sm:px-6 sm:py-3', bonusBanner)}>
          <BonusIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-bank-text sm:text-sm">
            <span className="font-semibold uppercase tracking-wide text-[9px] text-amber-800 dark:text-amber-300 sm:text-[10px]">
              Exklusiv für Neukunden
            </span>
            <span className={cn('mt-0.5 block truncate font-medium sm:whitespace-normal', cmpAccent)}>
              Bonus bis zu {Number(offer.bonus_amount).toLocaleString('de-DE')} € · Vermittlungsbonus 45 €
            </span>
          </p>
          <button
            type="button"
            className="hidden shrink-0 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400 sm:inline"
            onClick={() => setActiveTab('bonus')}
          >
            Bonusdetails ansehen →
          </button>
        </div>
      )}

      {/* Tabs — umbrechen statt horizontal scrollen */}
      <div className={cn('shrink-0 border-b border-bank-border px-3 sm:px-6', surfaceHeader)}>
        <div className="flex flex-wrap gap-1.5 py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm',
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                  : 'text-bank-text-muted hover:bg-bank-bg hover:text-bank-text dark:hover:bg-bank-surface-elev',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
        {activeTab === 'produkt' && (
          <div className="space-y-5">
            <p className={cn('text-sm leading-relaxed', cmpAccent)}>{offer.description}</p>

            <div className={assessmentBox}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-bank-text-muted">Unsere Einschätzung</p>
              <p className="mt-2 text-sm leading-relaxed text-bank-text">{assessmentText}</p>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-bank-border bg-white px-2.5 py-1 text-xs font-semibold text-bank-text dark:bg-bank-surface-elev">
                <Shield className="h-3 w-3" strokeWidth={LUCIDE_STROKE} />
                {ratingBundle.formatted} / 10 Trust
              </div>
            </div>

            <div className={cn(panelClass, 'p-5')}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-bank-text-muted">Zinsentwicklung</p>
                  <p className="mt-1 text-xs text-bank-text-muted">Verlauf der letzten Monate — indikativ</p>
                </div>
                <p className="text-right">
                  <span className="text-xs text-bank-text-muted">Aktuell</span>
                  <span className="ml-2 text-lg font-semibold text-emerald-700 dark:text-emerald-400">{rateFormatted} %</span>
                </p>
              </div>
              <div className="mt-4">
                <InterestRateSparkline history={rateHistory} width={560} height={120} showLabels />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className={cn(panelClass, 'p-5')}>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-bank-text-muted">
                  Verfügbarkeit & Liquidität
                </p>
                <div className="mt-3">
                  <DetailRow label="Verfügbarkeit" value={availabilityLabel(offer)} />
                  <DetailRow label="Kündigungsfrist" value={offer.early_withdrawal || 'Vertraglich vereinbart'} />
                  <DetailRow
                    label="Einfach erklärt"
                    value={
                      offer.deposit_term === 0
                        ? 'Flexible Verfügbarkeit · kurzfristig ein-/auszahlbar'
                        : `Fest gebunden · ${offer.deposit_term} Monate Laufzeit`
                    }
                  />
                  <DetailRow label="Mindestanlage" value={formatOfferMinDeposit(offer) || formatComparisonMinDepositWithCurrency()} />
                  <DetailRow label="Maximale Anlage" value={maxDep} />
                </div>
              </div>
              <div className={cn(panelClass, 'p-5')}>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-bank-text-muted">
                  Sicherheit & Konditionen
                </p>
                <div className="mt-3">
                  <DetailRow label="Einlagensicherung" value={COMPARISON_DEPOSIT_LABEL} />
                  <DetailRow label="Aufsicht" value={offer.regulator_name || offer.deposit_protection_authority || '—'} />
                  <DetailRow label="Zinsgutschrift" value={offer.interest_frequency || 'Monatlich'} />
                  <DetailRow label="Bankstandort" value={profile.countryDe} />
                  <DetailRow label="Produktart" value={productLabel} />
                  {offer.credit_rating && <DetailRow label="Bonität (Bank)" value={offer.credit_rating} />}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className={cn(panelClass, 'p-6')}>
              <h3 className="text-xl font-bold text-bank-text">Kundenbewertungen</h3>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <StarRatingRow value={starAvg} size="md" />
                <span className="text-sm text-bank-text-muted">
                  {starAvgFormatted} von 5 Sternen ({totalReviews.toLocaleString('de-DE')} Bewertungen)
                </span>
              </div>

              {hasSeedInList && (
                <div className="mt-6 rounded-lg border border-bank-border bg-bank-bg/50 p-4">
                  <p className="text-sm font-semibold text-bank-text">Unsere Kunden sagen</p>
                  <p className="mt-2 text-sm leading-relaxed text-bank-text-muted">
                    Rückmeldungen betonen solide Konditionen und nachvollziehbare Dokumentation bei {offer.bank_name}.
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-xs text-bank-primary">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    KI-generiert aus dem Text von Kundenbewertungen
                  </p>
                </div>
              )}

              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(11rem,1fr)_minmax(0,1.4fr)]">
                <div>
                  <p className="mb-4 text-sm font-medium text-bank-text">{recommendationPct}% Weiterempfehlung</p>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = starCounts[5 - stars];
                      const max = Math.max(...starCounts, 1);
                      const pct = Math.round((count / max) * 100);
                      return (
                        <div key={stars} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2 text-sm">
                          <span className="text-bank-text-muted">{stars} ★</span>
                            <div className="h-2 overflow-hidden rounded bg-bank-border dark:bg-bank-border/80">
                            <div className="h-full bg-[#1a4295] dark:bg-bank-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-right tabular-nums text-bank-text-muted">{count.toLocaleString('de-DE')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {['Alle', 'Festgeld', 'Flexgeld'].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setReviewTab(tab);
                          setReviewPage(0);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          reviewTab === tab
                            ? 'border-bank-primary text-bank-primary'
                            : 'border-bank-border text-bank-text-muted'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <ul className="divide-y divide-bank-border">
                    {reviewsLoading && (
                      <li className="py-6 text-center text-sm text-bank-text-muted">Bewertungen werden geladen…</li>
                    )}
                    {!reviewsLoading && pageSlice.length === 0 && (
                      <li className="py-6 text-center text-sm text-bank-text-muted">Noch keine Bewertungen.</li>
                    )}
                    {pageSlice.map((r) => (
                      <li key={r.id} className="py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <StarRatingRow value={r.stars} size="md" />
                            <span className="text-sm font-medium text-bank-text">{r.author}</span>
                          </div>
                          <span className="text-xs text-bank-text-muted">{r.date}</span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-bank-text-muted">{r.text}</p>
                        {r.reply && (
                          <div className="mt-3 rounded-lg border border-bank-border/80 bg-bank-bg/70 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className={cn('text-xs font-semibold', cmpAccent)}>{r.reply.author}</span>
                              <span className="text-[11px] text-bank-text-muted">{r.reply.date}</span>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-bank-text-muted">{r.reply.text}</p>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  {!reviewsLoading && reviewEntries.length > pageSize && (
                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-bank-border pt-4">
                      <button
                        type="button"
                        onClick={() => setReviewPage((page) => Math.max(0, page - 1))}
                        disabled={safePage === 0}
                        className="inline-flex items-center gap-1 rounded-full border border-bank-border px-3 py-1.5 text-xs font-semibold text-bank-text transition-colors hover:bg-bank-bg disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Vorherige Bewertungen"
                      >
                        <ChevronLeft className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                        Zurück
                      </button>
                      <p className="text-center text-xs tabular-nums text-bank-text-muted">
                        {reviewRangeStart.toLocaleString('de-DE')}–{reviewRangeEnd.toLocaleString('de-DE')} von{' '}
                        {listedReviewCount.toLocaleString('de-DE')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setReviewPage((page) => Math.min(totalPages - 1, page + 1))}
                        disabled={safePage >= totalPages - 1}
                        className="inline-flex items-center gap-1 rounded-full border border-bank-border px-3 py-1.5 text-xs font-semibold text-bank-text transition-colors hover:bg-bank-bg disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Weitere Bewertungen"
                      >
                        Weiter
                        <ChevronRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={cn(panelClass, 'p-5')} id="bewertung-schreiben">
              {authLoading ? (
                <p className="text-sm text-bank-text-muted">Bewertungsformular wird geladen…</p>
              ) : (
                <OfferReviewForm
                  offer={offer}
                  user={user}
                  profileApproved={user?.status === 'approved' || user?.role === 'admin'}
                  myReview={myReview}
                  onSubmitted={loadReviews}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'bewertung' && (
          <div className="space-y-5">
            <div className={cn(panelClass, 'p-6')}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#1a4295] text-lg font-bold text-white dark:bg-bank-primary">
                  {ratingBundle.formatted}
                </div>
                <div>
                  <p className="text-lg font-bold text-bank-text">{ratingBundle.label}</p>
                  <p className="text-sm text-bank-text-muted">Angebotsbewertung</p>
                </div>
              </div>
              <div className="mt-8 space-y-6">
                <div>
                  <RatingBar label={`Land: ${profile.countryDe}`} value={landBlockScore} />
                  <SubRow label={`Landesbonität – ${profile.facts.sovereignRating}`} value={sovereign} />
                  <SubRow label="Quellensteuer (Orientierung)" value={withholdingScore} />
                </div>
                <div>
                  <RatingBar label="Attraktivität des Angebots" value={attractivenessScore} />
                  <SubRow label={`Kundenbewertung – ${starAvgFormatted} / 5`} value={customerPartial} />
                  <SubRow label={`Zinsrhythmus – ${offer.interest_frequency || '—'}`} value={rhythmScore} />
                  <SubRow label="Angebotsbedingungen" value={9.8} />
                </div>
                <div>
                  <RatingBar label="Abschluss & Kontoführung" value={closingScore} />
                  <SubRow label="Einfachheit Abschluss" value={10} />
                  <SubRow label={`${MEDIATOR_BRAND} Anlagekonto`} value={10} />
                </div>
              </div>
            </div>

            <InfoCard
              title={`Infos zur ${offer.bank_name}`}
              footer={
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-bank-text-muted">Land</span>
                    <span className="font-medium text-bank-text">{profile.countryDe}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-bank-text-muted">Gründung</span>
                    <span className="font-medium text-bank-text">{profile.bank.founded}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-bank-text-muted">Bonität</span>
                    <span className="font-medium text-bank-text">{offer.credit_rating || '—'}</span>
                  </div>
                </>
              }
            >
              <p>{profile.bank.blurb}</p>
            </InfoCard>

            <InfoCard title={`Infos zu ${profile.countryDe}`}>
              <p>{profile.facts.economyBlurb}</p>
            </InfoCard>

            <InfoCard title="Einlagensicherung">
              <p>{COMPARISON_DEPOSIT_LABEL}</p>
            </InfoCard>
          </div>
        )}

        {activeTab === 'bonus' && (
          <div className="space-y-5">
            <div
              className={cn(
                'rounded-xl border p-6 shadow-sm',
                hasBonus
                  ? 'border-amber-100 bg-[#faf6ed] dark:border-amber-500/25 dark:bg-amber-950/15'
                  : 'border-bank-border bg-white dark:bg-bank-surface',
              )}
            >
              <p className={cn('text-lg font-bold', hasBonus ? cmpAccent : 'text-bank-text')}>
                {bonusContent.headline}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-bank-text-muted">{bonusContent.summary}</p>
              <p className="mt-3 text-sm leading-relaxed text-bank-text-muted">{bonusContent.mediatorNote}</p>
            </div>

            <InfoCard title="Ihre Vorteile">
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-bank-text-muted">
                {bonusContent.benefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </InfoCard>

            <InfoCard title="Bedingungen (Auszug)">
              <p>{bonusContent.conditions}</p>
            </InfoCard>
          </div>
        )}
      </div>

      <div className={cn('shrink-0 flex flex-col gap-2 border-t border-bank-border px-3 py-2.5 sm:flex-row sm:gap-3 sm:px-6 sm:py-4', surfaceHeader)}>
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 border-bank-border dark:border-bank-border dark:hover:bg-bank-surface-elev sm:h-10"
          onClick={onClose}
        >
          Schließen
        </Button>
        <Button
          size="sm"
          className="h-9 flex-1 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 sm:h-10"
          onClick={() => handleInterestClick?.(offer)}
          disabled={!handleInterestClick}
        >
          <span className="sm:hidden">Angebot anfragen →</span>
          <span className="hidden sm:inline">Bonus sichern & Angebot anfragen →</span>
        </Button>
      </div>
    </div>
  );
}
