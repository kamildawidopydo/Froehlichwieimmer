import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield, Sparkles, Star } from 'lucide-react';
import BankLogo from '@/components/BankLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import { formatDeScore } from '@/lib/offerRating';
import {
  CREDIT_CARD_EXAMPLE_AMOUNT,
  CREDIT_CARD_EXAMPLE_TERM_MONTHS,
  calculateCreditMonthlyRate,
  creditRatingOutOfTen,
  creditRatingStarScore,
  formatCreditAmountRange,
  formatCreditHighlightSecondary,
  formatCreditTermRange,
  formatEffectiveRateDe,
} from '@/lib/creditOfferDisplay';

const CARD_HEIGHT = 580;
const CARD_VIEWPORT_PADDING = 32;
const CARD_VIEWPORT_INITIAL = CARD_HEIGHT + CARD_VIEWPORT_PADDING;

const EASE = [0.22, 1, 0.36, 1];
const CARD_WIDTH = 300;
const CARD_GAP = 124;
const MOBILE_CAROUSEL_MAX = 639;
const AUTO_PLAY_MS = 4000;
function getCircularOffset(index, activeIndex, count) {
  if (count <= 0) return 0;
  let offset = index - activeIndex;
  const half = count / 2;
  if (offset > half) offset -= count;
  if (offset < -half) offset += count;
  return offset;
}

function getSlideMotion(offset, reduced, compact) {
  const abs = Math.abs(offset);
  if (compact) {
    return {
      x: 0,
      scale: 1,
      opacity: offset === 0 ? 1 : 0,
      zIndex: offset === 0 ? 10 : 0,
      rotateY: 0,
      filter: 'none',
      pointerEvents: offset === 0 ? 'auto' : 'none',
    };
  }
  if (reduced) {
    return {
      x: offset * (CARD_WIDTH + 24),
      scale: offset === 0 ? 1 : 0.92,
      opacity: offset === 0 ? 1 : abs === 1 ? 0.32 : 0,
      zIndex: 10 - abs,
      rotateY: 0,
      filter: 'none',
      pointerEvents: abs <= 1 ? 'auto' : 'none',
    };
  }

  // Only offset 0 (active) and ±1 (preview neighbors) are visible.
  // ±2/±3 fully faded — no ghost text bleeding around the active card.
  if (abs >= 2) {
    return {
      x: offset * CARD_GAP,
      scale: 0.6,
      opacity: 0,
      zIndex: 0,
      rotateY: offset > 0 ? -18 : 18,
      filter: 'blur(3px)',
      pointerEvents: 'none',
    };
  }

  if (abs === 1) {
    return {
      x: offset * CARD_GAP,
      scale: 0.86,
      opacity: 0.28,
      zIndex: 5,
      rotateY: offset * -10,
      filter: 'blur(0.6px)',
      pointerEvents: 'auto',
    };
  }

  return {
    x: 0,
    scale: 1,
    opacity: 1,
    zIndex: 10,
    rotateY: 0,
    filter: 'none',
    pointerEvents: 'auto',
  };
}

function getCreditSubline(offer) {
  const purpose = offer.purpose || 'Freie Verwendung';
  return `${purpose} · ${formatCreditTermRange(offer)}`;
}

function formatExampleMonthlyPayment(offer) {
  const term = Number(offer.default_term_months) || CREDIT_CARD_EXAMPLE_TERM_MONTHS;
  const monthly = calculateCreditMonthlyRate(
    CREDIT_CARD_EXAMPLE_AMOUNT,
    offer.effective_rate_from,
    term,
  );
  if (monthly == null) return '—';
  return monthly.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCreditTrustLine(offer) {
  const amountRange = formatCreditAmountRange(offer);
  if (amountRange) {
    return `Kreditsumme ${amountRange} · regulierte EU-Partnerbank`;
  }
  return 'Regulierte EU-Partnerbank · unverbindliche Konditionen';
}

function StarRating({ scoreOutOfFive }) {
  const clamped = Math.max(0, Math.min(5, Number(scoreOutOfFive) || 0));
  return (
    <div
      className="flex items-center justify-center gap-0.5"
      aria-hidden
      title={`${(clamped * 2).toFixed(1).replace('.', ',')} von 10`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return (
          <span key={i} className="relative inline-flex h-3.5 w-3.5 shrink-0">
            <Star className="h-3.5 w-3.5 fill-transparent text-bank-border/90 dark:text-bank-border" strokeWidth={LUCIDE_STROKE} />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={LUCIDE_STROKE} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function CreditOfferCard({ offer, isActive, cardIndex, totalCount, isTopPick, cardWidth, compact, preview }) {
  const scoreOutOfTen = creditRatingOutOfTen(offer);
  const scoreOutOfFive = creditRatingStarScore(offer);
  const scoreFormatted = scoreOutOfTen != null ? formatDeScore(scoreOutOfTen) : null;
  const regulator = (offer.regulator_name || 'EU-reguliert').toUpperCase();
  const exampleTerm = Number(offer.default_term_months) || CREDIT_CARD_EXAMPLE_TERM_MONTHS;
  const featureLine = (offer.features || [])[0] || 'Verhandelte Partnerkonditionen';
  const secondaryLine = formatCreditHighlightSecondary(offer);
  const showDetails = !preview;

  return (
    <article
      className={cn(
        'group relative flex w-full max-w-full flex-col overflow-hidden rounded-2xl transition-shadow duration-500',
        !compact && 'h-full',
        // Active card: own soft surface so nothing shows through.
        // Preview neighbours: transparent, no surface — they must never compete.
        !preview && 'bg-white ring-1 ring-bank-border/60 shadow-editorial-sm dark:bg-bank-surface dark:ring-bank-border/70',
        preview && 'bg-transparent',
      )}
      style={{ width: cardWidth, ...(compact ? {} : { height: CARD_HEIGHT }) }}
      data-testid={`credit-offer-card-${offer.id}`}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-bank-gold/40 to-transparent',
          preview && 'opacity-0',
        )}
      />
      <div className={cn('relative flex flex-1 flex-col', showDetails && 'min-h-0')}>

      {/* Header: pagination, badge, country — hidden on preview neighbours so they don't echo the active card */}
      {!preview && (
      <div className="relative shrink-0 px-4 pb-1.5 pt-3">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              'font-mono text-[10px] tabular-nums tracking-[0.12em] text-bank-text-muted',
              compact && 'sr-only',
            )}
          >
            {String(cardIndex + 1).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}
          </span>
          {isTopPick && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-gradient-to-r from-amber-50 to-amber-100/90 px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-amber-900 shadow-sm dark:border-amber-700/50 dark:from-amber-950/80 dark:to-amber-900/60 dark:text-amber-100">
              <Sparkles className="h-2.5 w-2.5" strokeWidth={LUCIDE_STROKE} />
              Top-Auswahl
            </span>
          )}
        </div>
        {offer.country && (
          <CountryFlagIcon
            country={offer.country}
            size="sm"
            showLabel
            labelUppercase
            className="mt-2 justify-end"
            labelClassName="font-mono text-[9px] uppercase tracking-[0.14em] text-bank-text-muted"
          />
        )}
        {offer.founded_year && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="h-px flex-1 bg-bank-border" aria-hidden />
            <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.2em] text-bank-text-muted">
              Etabliert seit {offer.founded_year}
            </span>
            <span className="h-px flex-1 bg-bank-border" aria-hidden />
          </div>
        )}
      </div>
      )}

      {/* Logo & rating (preview: nur Logo, kein Rating) */}
      <div className={cn('flex shrink-0 flex-col items-center px-4', preview ? 'pt-8 pb-3' : 'pb-1.5')}>
        <BankLogo logo={offer.bank_logo} bankName={offer.bank_name} size="lg" className="mx-auto" />
        <h3 className={cn(preview ? 'mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-bank-text-muted' : 'sr-only')}>
          {offer.bank_name}
        </h3>
        {!preview && scoreOutOfTen != null && scoreOutOfFive != null && scoreFormatted ? (
          <div className="mt-2.5 flex flex-col items-center gap-1">
            <StarRating scoreOutOfFive={scoreOutOfFive} />
            <p className="text-[11px] font-semibold tabular-nums text-bank-text" data-numeric>
              {scoreFormatted}{' '}
              <span className="font-normal text-bank-text-muted">/ 10,0</span>
            </p>
          </div>
        ) : null}
      </div>

      {/* Rate & product */}
      <div className={cn('shrink-0 px-4 text-center', showDetails ? 'pb-2' : 'flex flex-1 flex-col justify-center pb-4')}>
        <p className={cn('rate-figure font-light leading-tight text-bank-gold', preview ? 'text-[1.1rem]' : 'text-[1.5rem]')} data-numeric>
          ab {formatEffectiveRateDe(offer.effective_rate_from)} %{!preview && ' eff. Jahreszins'}
        </p>
        {!preview && (
          <p className="mt-1 text-[11px] text-bank-text-muted">{getCreditSubline(offer)}</p>
        )}
      </div>

      {showDetails && (
      <>
      {/* Info blocks */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-2">
        <div className="shrink-0 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 dark:border-sky-900/45 dark:bg-sky-950/35">
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-1.5 gap-y-0.5">
            <span className="shrink-0 font-mono text-[7px] font-medium uppercase tracking-[0.12em] text-sky-800/80 dark:text-sky-300/90 sm:text-[8px] sm:tracking-[0.16em]">
              Beispiel-Rate
            </span>
            <span
              className="shrink-0 font-mono text-[7px] tabular-nums text-sky-700/70 dark:text-sky-400/85 sm:text-[8px]"
              data-numeric
            >
              {CREDIT_CARD_EXAMPLE_AMOUNT.toLocaleString('de-DE')} € · {exampleTerm} Mon.
            </span>
          </div>
          <p className="rate-figure mt-0.5 text-center text-lg font-light tabular-nums text-bank-text dark:text-bank-text" data-numeric>
            ≈ {formatExampleMonthlyPayment(offer)} € / Monat
          </p>
        </div>

        <div className="min-h-0 shrink rounded-lg border border-amber-200/70 bg-amber-50/90 px-3 py-2 dark:border-amber-800/45 dark:bg-amber-950/30">
          <p className="text-center text-[10px] font-semibold leading-snug text-amber-950/90 dark:text-amber-50/95">
            {featureLine}
          </p>
          {secondaryLine ? (
            <p
              className="mt-1 line-clamp-3 break-words text-center text-[9px] leading-relaxed text-amber-900/75 dark:text-amber-200/80"
              title={secondaryLine}
            >
              {secondaryLine}
            </p>
          ) : null}
        </div>
      </div>
      </>
      )}
      </div>

      {showDetails && (
      <div
        className={cn(
          'mt-auto shrink-0 px-4 pt-2.5',
          compact ? 'pb-4' : 'pb-3',
        )}
      >
        <div className="mb-2 flex items-start gap-2">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bank-primary dark:text-bank-accent" strokeWidth={LUCIDE_STROKE} />
          <p className="min-w-0 break-words text-[10px] leading-relaxed text-bank-text-muted">
            {formatCreditTrustLine(offer)}
          </p>
        </div>
        <div className="mb-2 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-1">
          <span className="shrink-0 rounded-md border border-bank-border bg-white px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-bank-text dark:border-bank-border dark:bg-bank-surface">
            Kredit
          </span>
          <span
            className="min-w-0 break-words text-right font-mono text-[7px] uppercase leading-relaxed tracking-[0.06em] text-bank-text-muted"
          >
            {regulator}
          </span>
        </div>
        <Link to="/kredit#credit-results" title="Kredit vergleichen">
          <Button
            variant="outline-ink"
            size="sm"
            className="h-9 w-full justify-center gap-1.5 px-3 text-[10px] font-semibold"
            tabIndex={isActive ? 0 : -1}
          >
            Kredit vergleichen
            <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={LUCIDE_STROKE} aria-hidden />
          </Button>
        </Link>
      </div>
      )}
    </article>
  );
}

/**
 * Cover-Flow Karussell für Kreditangebote (Daten wie /kredit).
 */
function useCompactCarousel() {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${MOBILE_CAROUSEL_MAX}px)`).matches : false,
  );
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 390,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_CAROUSEL_MAX}px)`);
    const onMq = () => setCompact(mq.matches);
    const onResize = () => setViewportWidth(window.innerWidth);
    onMq();
    mq.addEventListener('change', onMq);
    window.addEventListener('resize', onResize);
    return () => {
      mq.removeEventListener('change', onMq);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const cardWidth = compact
    ? Math.min(Math.max(viewportWidth - 40, 272), CARD_WIDTH)
    : CARD_WIDTH;

  return { compact, cardWidth };
}

const navBtnClass =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bank-border bg-white text-bank-ink shadow-editorial-sm transition-all duration-300 hover:border-bank-ink/20 hover:shadow-editorial-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 dark:border-bank-border dark:bg-bank-surface-elev dark:text-bank-text dark:hover:border-bank-primary/35 dark:shadow-none';

const navBtnOverlayClass =
  'absolute top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-bank-border/90 bg-white/95 text-bank-ink shadow-editorial-sm backdrop-blur-[2px] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 dark:border-bank-border dark:bg-bank-surface-elev/95 dark:text-bank-text dark:hover:bg-bank-surface';

export default function CreditOffersCoverFlow({ offers }) {
  const prefersReduced = useReducedMotion();
  const { compact, cardWidth } = useCompactCarousel();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  );
  const touchStartX = useRef(null);
  const pauseUntilRef = useRef(0);
  const activeCardRef = useRef(null);
  const [mobileViewportHeight, setMobileViewportHeight] = useState(CARD_VIEWPORT_INITIAL);
  const stageHeight = compact ? mobileViewportHeight : CARD_HEIGHT + CARD_VIEWPORT_PADDING;
  const count = offers.length;
  const topPickId = offers[0]?.id;

  const goTo = useCallback(
    (index) => {
      if (count === 0) return;
      setActiveIndex(((index % count) + count) % count);
    },
    [count],
  );

  const pauseAutoPlay = useCallback((durationMs = AUTO_PLAY_MS) => {
    pauseUntilRef.current = Date.now() + durationMs;
  }, []);

  const goPrev = useCallback(() => {
    pauseAutoPlay();
    setActiveIndex((prev) => (count === 0 ? prev : (prev - 1 + count) % count));
  }, [count, pauseAutoPlay]);

  const goNext = useCallback(() => {
    pauseAutoPlay();
    setActiveIndex((prev) => (count === 0 ? prev : (prev + 1) % count));
  }, [count, pauseAutoPlay]);

  const goToWithPause = useCallback(
    (index) => {
      pauseAutoPlay();
      goTo(index);
    },
    [goTo, pauseAutoPlay],
  );

  useEffect(() => {
    if (activeIndex >= count && count > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, count]);

  useEffect(() => {
    if (!compact || !activeCardRef.current) return undefined;
    const el = activeCardRef.current;
    const measure = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) {
        setMobileViewportHeight(Math.ceil(h) + CARD_VIEWPORT_PADDING);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact, activeIndex, cardWidth, offers]);

  useEffect(() => {
    const onVisibilityChange = () => setIsTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (prefersReduced || count <= 1 || isHovered || isFocused || isTabHidden) return undefined;

    const id = window.setInterval(() => {
      if (document.hidden || Date.now() < pauseUntilRef.current) return;
      setActiveIndex((prev) => (prev + 1) % count);
    }, AUTO_PLAY_MS);

    return () => window.clearInterval(id);
  }, [prefersReduced, count, isHovered, isFocused, isTabHidden]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goPrev, goNext]);

  const onTouchStart = (event) => {
    pauseAutoPlay();
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event) => {
    if (touchStartX.current == null) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goPrev();
    else goNext();
  };

  if (count === 0) return null;

  const showDotNav = count <= 15;

  return (
    <div
      className="relative mx-auto w-full max-w-[960px] overflow-x-hidden px-1 sm:overflow-x-clip sm:px-0"
      aria-label="Ausgewählte Kreditangebote"
      aria-roledescription="Karussell"
      data-testid="home-credit-offers-cover-flow"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsFocused(false);
        }
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 select-none text-center font-display text-[clamp(2.75rem,7vw,4.5rem)] font-light uppercase leading-none tracking-tight text-bank-ink/[0.018] dark:text-white/[0.02] sm:block"
      >
        Kreditangebote
      </div>

      <div className="relative flex flex-col items-center sm:flex-row sm:justify-center sm:gap-5">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Vorheriges Angebot"
          className={cn('relative z-20 hidden sm:flex', navBtnClass)}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
        </button>

        <div
          className={cn(
            'relative w-full max-w-[780px] touch-pan-y overflow-hidden',
            compact && 'px-9',
          )}
          style={{ height: stageHeight }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {compact && count > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Vorheriges Angebot"
                className={cn(navBtnOverlayClass, 'left-0.5')}
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Nächstes Angebot"
                className={cn(navBtnOverlayClass, 'right-0.5')}
              >
                <ArrowRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
              </button>
            </>
          )}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ perspective: compact || prefersReduced ? undefined : '1400px' }}
          >
            {offers.map((offer, index) => {
              const offset = getCircularOffset(index, activeIndex, count);
              const motionValues = getSlideMotion(offset, prefersReduced, compact);
              const isActive = offset === 0;

              return (
                <motion.div
                  key={offer.id}
                  ref={isActive ? activeCardRef : undefined}
                  className="absolute left-1/2 top-1/2 origin-center will-change-transform"
                  style={{
                    width: cardWidth,
                    height: compact ? undefined : CARD_HEIGHT,
                    marginLeft: -cardWidth / 2,
                    marginTop: -stageHeight / 2,
                    zIndex: motionValues.zIndex,
                    pointerEvents:
                      motionValues.pointerEvents ?? (Math.abs(offset) > 2 ? 'none' : 'auto'),
                  }}
                  animate={{
                    x: motionValues.x,
                    scale: motionValues.scale,
                    opacity: motionValues.opacity,
                    rotateY: motionValues.rotateY,
                    filter: motionValues.filter,
                  }}
                  transition={{
                    duration: prefersReduced ? 0.15 : 0.75,
                    ease: EASE,
                  }}
                  onClick={() => {
                    if (!isActive) goToWithPause(index);
                  }}
                  aria-hidden={!isActive}
                >
                  <CreditOfferCard
                    offer={offer}
                    isActive={isActive}
                    cardIndex={index}
                    totalCount={count}
                    isTopPick={offer.id === topPickId}
                    cardWidth={cardWidth}
                    compact={compact}
                    preview={!compact && !isActive}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={goNext}
          aria-label="Nächstes Angebot"
          className={cn('relative z-20 hidden sm:flex', navBtnClass)}
        >
          <ArrowRight className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
        </button>

        {compact && (
          <p className="mt-3 w-full max-w-[min(100%,300px)] truncate px-2 text-center font-mono text-[10px] tabular-nums tracking-[0.12em] text-bank-text-muted sm:hidden">
            {String(activeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            {offers[activeIndex]?.bank_name ? ` · ${offers[activeIndex].bank_name}` : ''}
          </p>
        )}
      </div>

      {showDotNav ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label="Angebotsnavigation">
          {offers.map((offer, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={offer.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Angebot ${index + 1}: ${offer.bank_name}`}
                onClick={() => goToWithPause(index)}
                className={cn(
                  'h-1.5 rounded-full bg-bank-border transition-all ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2',
                  isActive ? 'w-8 bg-bank-ink dark:bg-bank-text' : 'w-1.5 hover:bg-bank-text-muted/50',
                )}
                style={{ transitionDuration: '400ms' }}
              />
            );
          })}
        </div>
      ) : (
        <p className="mt-6 hidden text-center font-mono text-[11px] tabular-nums tracking-[0.14em] text-bank-text-muted sm:mt-8 sm:block">
          {String(activeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')} — {offers[activeIndex]?.bank_name}
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        Angebot {activeIndex + 1} von {count}: {offers[activeIndex]?.bank_name}
      </p>
    </div>
  );
}
