import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield, Sparkles, Star } from 'lucide-react';
import BankLogo from '@/components/BankLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { getDisplayProductType } from '@/lib/productDisplay';
import { getOfferRatingBundle } from '@/lib/offerRating';
import { formatRateDe } from '@/lib/interestRateHistory';
import { getOfferBonusAmount } from '@/lib/offerBonus';
import CountryFlagIcon from '@/components/CountryFlagIcon';

const CARD_HEIGHT = 508;
/** Initialer Viewport mobil, bis ResizeObserver misst. */
const CARD_VIEWPORT_INITIAL_MOBILE = 520;

const EASE = [0.22, 1, 0.36, 1];
const CARD_WIDTH = 300;
const CARD_GAP = 124;
const MOBILE_CAROUSEL_MAX = 639;
const AUTO_PLAY_MS = 4000;
const EXAMPLE_DEPOSIT = 50_000;

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
      opacity: abs > 1 ? 0 : 1,
      zIndex: 10 - abs,
      rotateY: 0,
      filter: 'none',
    };
  }

  if (abs > 3) {
    return {
      x: offset * CARD_GAP,
      scale: 0.55,
      opacity: 0,
      zIndex: 0,
      rotateY: offset > 0 ? -18 : 18,
      filter: 'blur(2px)',
      pointerEvents: 'none',
    };
  }

  const scale = offset === 0 ? 1 : abs === 1 ? 0.84 : abs === 2 ? 0.72 : 0.62;
  const opacity = abs === 3 ? 0.35 : 1 - abs * 0.08;

  return {
    x: offset * CARD_GAP,
    scale,
    opacity,
    zIndex: 10 - abs,
    rotateY: offset * -10,
    filter: abs >= 2 ? 'blur(0.4px)' : 'none',
  };
}

function getAvailabilitySubline(offer) {
  const product = getDisplayProductType(offer);
  const early = (offer.early_withdrawal || '').toLowerCase();
  if (early.includes('jederzeit') || early.includes('täglich') || offer.deposit_term === 0) {
    return `${product} · täglich verfügbar`;
  }
  if (offer.deposit_term > 0) {
    return `${product} · ${offer.deposit_term} Monate Laufzeit`;
  }
  return product;
}

function formatExampleYield(offer) {
  const rate = Number(offer.interest_rate) || 0;
  const raw = (EXAMPLE_DEPOSIT * rate) / 100;
  return Math.round(raw).toLocaleString('de-DE');
}

function formatDepositProtection(offer) {
  const amount = offer.deposit_protection_amount || offer.deposit_protection;
  if (amount && /\d/.test(String(amount))) {
    const digits = String(amount).replace(/[^\d]/g, '');
    if (digits) {
      return `Einlagensicherung bis ${Number(digits).toLocaleString('de-DE')} € je Anleger`;
    }
  }
  return 'Einlagensicherung bis 100.000 € je Anleger';
}

function StarRating({ scoreOutOfFive }) {
  const full = Math.floor(scoreOutOfFive);
  const half = scoreOutOfFive - full >= 0.35;
  return (
    <div className="flex items-center justify-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            className={cn(
              'h-3 w-3',
              filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-bank-border dark:text-bank-border',
            )}
            strokeWidth={LUCIDE_STROKE}
          />
        );
      })}
    </div>
  );
}

function OfferCard({ offer, isActive, cardIndex, totalCount, isTopPick, cardWidth, cardHeight, compact, preview }) {
  const rating = getOfferRatingBundle(offer);
  const scoreOutOfFive = Math.min(5, (rating.value / 10) * 5);
  const scoreFormatted = scoreOutOfFive.toFixed(1).replace('.', ',');
  const product = getDisplayProductType(offer);
  const regulator = (offer.regulator_name || 'EU-reguliert').toUpperCase();
  const bonusAmount = getOfferBonusAmount(offer);
  const showDetails = !preview;

  return (
    <article
      className={cn(
        'group relative flex max-w-full flex-col overflow-hidden rounded-2xl border border-bank-border bg-white shadow-editorial-sm transition-shadow duration-500',
        'dark:border-bank-border dark:bg-bank-surface-elev dark:shadow-none',
        compact && 'h-auto',
        !compact && 'h-full',
        isActive ? 'shadow-editorial-md dark:ring-1 dark:ring-bank-border/80' : 'shadow-editorial-sm',
      )}
      style={compact ? { width: cardWidth } : { width: cardWidth, height: cardHeight }}
      data-testid={`offer-card-${offer.id}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/40 to-transparent"
      />

      {/* Header: pagination, badge, country */}
      <div className="relative px-4 pb-2 pt-3.5">
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

      {/* Logo & rating */}
      <div className="flex flex-col items-center px-4 pb-2">
        <BankLogo logo={offer.bank_logo} bankName={offer.bank_name} size="lg" className="mx-auto" />
        <h3 className="sr-only">{offer.bank_name}</h3>
        <div className="mt-2.5 flex flex-col items-center gap-1">
          <StarRating scoreOutOfFive={scoreOutOfFive} />
          <p className="text-[11px] font-semibold tabular-nums text-bank-text" data-numeric>
            {scoreFormatted}{' '}
            <span className="font-normal text-bank-text-muted">/ 5,0</span>
          </p>
        </div>
      </div>

      {/* Rate & product */}
      <div className={cn('px-4 text-center', showDetails ? 'pb-3' : 'flex flex-1 flex-col justify-center pb-4')}>
        <p className="rate-figure text-[1.65rem] font-light leading-none text-bank-gold" data-numeric>
          bis zu {formatRateDe(offer.interest_rate)} % p.a.
        </p>
        <p className="mt-1.5 text-[11px] text-bank-text-muted">{getAvailabilitySubline(offer)}</p>
        {preview && (
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-bank-text-muted/80">
            Angebot öffnen
          </p>
        )}
      </div>

      {showDetails && (
      <>
      {/* Info blocks */}
      <div className="flex shrink-0 flex-col gap-2 px-4">
        <div className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2.5 dark:border-sky-900/45 dark:bg-sky-950/35">
          <div className="flex min-w-0 items-baseline justify-between gap-1.5">
            <span className="shrink-0 font-mono text-[7px] font-medium uppercase tracking-[0.12em] text-sky-800/80 dark:text-sky-300/90 sm:text-[8px] sm:tracking-[0.16em]">
              Beispiel-Ertrag
            </span>
            <span
              className="shrink-0 font-mono text-[7px] tabular-nums text-sky-700/70 dark:text-sky-400/85 sm:text-[8px]"
              data-numeric
            >
              {EXAMPLE_DEPOSIT.toLocaleString('de-DE')} € / Jahr
            </span>
          </div>
          <p className="rate-figure mt-1 text-center text-xl font-light tabular-nums text-bank-text dark:text-bank-text" data-numeric>
            ≈ {formatExampleYield(offer)} €
          </p>
        </div>

        <div className="flex min-h-[3.35rem] flex-col justify-center rounded-lg border border-amber-200/70 bg-amber-50/90 px-3 py-2 dark:border-amber-800/45 dark:bg-amber-950/30">
          <p className="text-center text-[10px] font-semibold leading-snug text-amber-950/90 dark:text-amber-50/95">
            Neukundenkonditionen bis zu {bonusAmount.toLocaleString('de-DE')} €
          </p>
          <p className="mt-0.5 text-center text-[9px] leading-snug text-amber-900/75 dark:text-amber-200/80">
            zzgl. 45 € bei Vermittlung
          </p>
        </div>
      </div>

      {!compact && <div className="min-h-2 flex-1" aria-hidden />}
      </>
      )}

      {showDetails && (
      <div
        className={cn(
          'mt-auto shrink-0 border-t border-bank-border bg-bank-bg/40 px-4 pt-3 dark:bg-bank-surface/50',
          compact ? 'pb-4' : 'pb-3',
        )}
      >
        <div className="mb-3 flex items-start gap-2">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bank-primary dark:text-bank-accent" strokeWidth={LUCIDE_STROKE} />
          <p className="text-[10px] leading-snug text-bank-text-muted">{formatDepositProtection(offer)}</p>
        </div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="rounded-md border border-bank-border bg-white px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-bank-text dark:border-bank-border dark:bg-bank-surface">
            {product}
          </span>
          <span className="max-w-[52%] truncate text-right font-mono text-[8px] uppercase tracking-[0.1em] text-bank-text-muted">
            {regulator}
          </span>
        </div>
        <Link to="/comparison" title="Details ansehen">
          <Button
            variant="outline-ink"
            size="sm"
            className="h-9 w-full justify-center gap-1.5 px-3 text-[10px] font-semibold"
            tabIndex={isActive ? 0 : -1}
          >
            Details ansehen
            <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={LUCIDE_STROKE} aria-hidden />
          </Button>
        </Link>
      </div>
      )}
    </article>
  );
}

/**
 * Cover-Flow Karussell für Sparangebote auf der Homepage.
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
  const cardHeight = CARD_HEIGHT;

  return { compact, cardWidth, cardHeight };
}

const navBtnClass =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bank-border bg-white text-bank-ink shadow-editorial-sm transition-all duration-300 hover:border-bank-ink/20 hover:shadow-editorial-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 dark:border-bank-border dark:bg-bank-surface-elev dark:text-bank-text dark:hover:border-bank-primary/35 dark:shadow-none';

const navBtnOverlayClass =
  'absolute top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-bank-border/90 bg-white/95 text-bank-ink shadow-editorial-sm backdrop-blur-[2px] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-2 dark:border-bank-border dark:bg-bank-surface-elev/95 dark:text-bank-text dark:hover:bg-bank-surface';

export default function HomeOffersCoverFlow({ offers }) {
  const prefersReduced = useReducedMotion();
  const { compact, cardWidth, cardHeight } = useCompactCarousel();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  );
  const touchStartX = useRef(null);
  const pauseUntilRef = useRef(0);
  const activeCardRef = useRef(null);
  const [mobileViewportHeight, setMobileViewportHeight] = useState(CARD_VIEWPORT_INITIAL_MOBILE);
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
        setMobileViewportHeight(Math.ceil(h) + 4);
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
      aria-label="Ausgewählte Sparangebote"
      aria-roledescription="Karussell"
      data-testid="home-offers-cover-flow"
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
        className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 select-none text-center font-display text-[clamp(3.5rem,12vw,7rem)] font-light uppercase leading-none tracking-tight text-bank-ink/[0.04] dark:text-white/[0.035] sm:block"
      >
        Sparangebote
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
          style={{ height: compact ? mobileViewportHeight : cardHeight }}
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
                    marginLeft: -cardWidth / 2,
                    marginTop: -(compact ? mobileViewportHeight : cardHeight) / 2,
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
                  <OfferCard
                    offer={offer}
                    isActive={isActive}
                    cardIndex={index}
                    totalCount={count}
                    isTopPick={offer.id === topPickId}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
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
