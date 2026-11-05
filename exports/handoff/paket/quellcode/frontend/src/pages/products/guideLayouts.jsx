import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

export function GuideImage({ src, alt, className, priority }) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
    />
  );
}

export function GuideHeroClassic({ guide, accent, comparisonHref }) {
  return (
    <section className="border-b border-bank-border bg-white dark:bg-bank-surface">
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-20">
        <div>
          <Eyebrow>{guide.title}</Eyebrow>
          <h1 className="font-display mt-4 text-display-md font-light text-bank-text">{guide.heroTitle}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-bank-text-muted">{guide.heroLede}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={comparisonHref}>
              <Button variant="primary" size="lg" className={cn(accent.btn, 'border-0')}>
                {guide.title}angebote vergleichen
                <ArrowRight className="ml-1 h-4 w-4" strokeWidth={LUCIDE_STROKE} />
              </Button>
            </Link>
            <Link to="/calculator">
              <Button variant="outline-ink" size="lg">
                <Calculator className="mr-1 h-4 w-4" strokeWidth={LUCIDE_STROKE} />
                Zinsrechner
              </Button>
            </Link>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-bank-border shadow-editorial-md">
          <GuideImage
            src={guide.heroImage}
            alt={guide.heroAlt ?? guide.lifestyleAlt}
            priority
            className="aspect-[4/3] w-full object-cover object-center"
          />
        </div>
      </div>
    </section>
  );
}

export function GuideHeroSplit({ guide, accent, comparisonHref }) {
  return (
    <section className="border-b border-bank-border bg-white dark:bg-bank-surface lg:grid lg:min-h-[min(88vh,760px)] lg:grid-cols-2">
      <div className="relative min-h-[300px] lg:min-h-full">
        <GuideImage
          src={guide.heroImage}
          alt={guide.heroAlt ?? guide.lifestyleAlt}
          priority
          className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-bank-ink/40 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-bank-ink/20" />
      </div>
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:px-14 lg:py-16">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-700 dark:text-emerald-400">
          Flexibel · Reguliert · EU
        </p>
        <h1 className="font-display mt-4 text-display-md font-light text-bank-text">{guide.heroTitle}</h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-bank-text-muted">{guide.heroLede}</p>
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {guide.keyFacts.map((fact) => (
            <div
              key={fact.label}
              className="rounded-lg border border-emerald-200/60 bg-emerald-50/50 px-3 py-3 dark:border-emerald-500/25 dark:bg-bank-surface-elev"
            >
              <dt className="font-mono text-[8px] uppercase tracking-[0.18em] text-bank-text-muted">{fact.label}</dt>
              <dd className="mt-1 text-sm font-semibold text-bank-text" {...(fact.numeric ? { 'data-numeric': true } : {})}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to={comparisonHref}>
            <Button variant="primary" size="lg" className={cn(accent.btn, 'border-0')}>
              Angebote vergleichen
              <ArrowRight className="ml-1 h-4 w-4" strokeWidth={LUCIDE_STROKE} />
            </Button>
          </Link>
          <Link to="/calculator">
            <Button variant="outline-ink" size="lg">
              Zinsrechner
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function GuideHeroMagazine({ guide, accent, comparisonHref }) {
  return (
    <section className="relative isolate min-h-[min(72vh,640px)] border-b border-bank-border">
      <GuideImage
        src={guide.lifestyleImage}
        alt={guide.lifestyleAlt}
        priority
        className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-bank-ink/85 via-bank-ink/45 to-bank-ink/25" />
      <div className="relative mx-auto flex min-h-[min(72vh,640px)] max-w-[1440px] flex-col justify-end px-5 pb-14 pt-28 sm:px-8 lg:px-12 lg:pb-20">
        <Eyebrow tone="light">{guide.title}</Eyebrow>
        <h1 className="font-display mt-4 max-w-2xl text-display-md font-light text-white">{guide.heroTitle}</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">{guide.heroLede}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={comparisonHref}>
            <Button variant="primary" size="lg" className={cn(accent.btn, 'border-0')}>
              {guide.title} vergleichen
              <ArrowRight className="ml-1 h-4 w-4" strokeWidth={LUCIDE_STROKE} />
            </Button>
          </Link>
          <Link to="/calculator">
            <Button variant="outline-accent" size="lg">
              Zinsrechner
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function GuideLifestyleStrip({ guide, captionAlign = 'left' }) {
  return (
    <section className="border-b border-bank-border bg-bank-surface-elev">
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12">
        <figure className="relative overflow-hidden rounded-2xl border border-bank-border shadow-editorial-sm">
          <GuideImage
            src={guide.lifestyleImage}
            alt={guide.lifestyleAlt}
            className="aspect-[21/9] min-h-[220px] w-full object-cover object-[center_30%] sm:min-h-[280px] sm:aspect-[3/1]"
          />
          <div
            aria-hidden
            className={cn(
              'absolute inset-0',
              captionAlign === 'right'
                ? 'bg-gradient-to-l from-bank-ink/65 via-bank-ink/20 to-transparent'
                : 'bg-gradient-to-r from-bank-ink/60 via-bank-ink/25 to-transparent',
            )}
          />
          <figcaption
            className={cn(
              'absolute bottom-0 max-w-xl p-6 sm:p-8',
              captionAlign === 'right' ? 'right-0 text-right' : 'left-0',
            )}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-accent">
              Regulierte Partnerbanken
            </p>
            <p className="mt-2 font-display text-xl font-light text-white sm:text-2xl">
              Transparent vergleichen. Digital abschließen.
            </p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

export function GuideTocHorizontal({ items }) {
  const [activeId, setActiveId] = useState(items?.[0]?.id || null);
  const [isPinned, setIsPinned] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const pillRefs = useRef({});
  const navRef = useRef(null);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!items?.length || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-28% 0px -58% 0px', threshold: 0 },
    );

    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const el = activeId ? pillRefs.current[activeId] : null;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(([entry]) => {
      setNavHeight(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
    });
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let observer;

    const setup = () => {
      observer?.disconnect();
      const header = document.querySelector('header');
      const topPx = header ? Math.ceil(header.getBoundingClientRect().height) : 88;
      observer = new IntersectionObserver(
        ([entry]) => setIsPinned(!entry.isIntersecting),
        { rootMargin: `-${topPx}px 0px 0px 0px`, threshold: 0 },
      );
      observer.observe(sentinel);
    };

    setup();
    window.addEventListener('resize', setup);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', setup);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateScrollHints = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
    };

    updateScrollHints();
    el.addEventListener('scroll', updateScrollHints, { passive: true });
    window.addEventListener('resize', updateScrollHints);
    return () => {
      el.removeEventListener('scroll', updateScrollHints);
      window.removeEventListener('resize', updateScrollHints);
    };
  }, [items]);

  if (!items?.length) return null;

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      {isPinned && navHeight > 0 && <div style={{ height: navHeight }} aria-hidden />}

      <nav
        ref={navRef}
        aria-label="Inhaltsverzeichnis"
        className={cn(
          'z-40 w-full border-b border-bank-border bg-white/95 backdrop-blur-md dark:bg-bank-surface/95',
          isPinned
            ? 'fixed left-0 right-0 top-[4.6rem] sm:top-[4.95rem] lg:top-[5.4rem]'
            : 'relative',
        )}
      >
        <div className="relative mx-auto w-full min-w-0 max-w-[1440px] px-5 py-3 sm:px-8 lg:px-12">
          <div
            ref={scrollRef}
            className="flex min-w-0 max-w-full gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((it) => {
              const active = it.id === activeId;
              return (
                <a
                  key={it.id}
                  ref={(node) => {
                    if (node) pillRefs.current[it.id] = node;
                  }}
                  href={`#${it.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveId(it.id);
                    document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 font-sans text-[11.5px] leading-tight transition-colors duration-200 sm:px-3.5 sm:text-[12.5px]',
                    active
                      ? 'border-bank-gold/45 bg-bank-gold/10 text-bank-text'
                      : 'border-bank-border text-bank-text-muted hover:border-bank-gold/30 hover:text-bank-text',
                  )}
                >
                  {it.label}
                </a>
              );
            })}
            <span className="shrink-0 pr-1" aria-hidden />
          </div>

          {canScrollLeft && (
            <span
              className="pointer-events-none absolute inset-y-3 left-5 w-8 bg-gradient-to-r from-white/95 to-transparent dark:from-bank-surface/95 sm:left-8 lg:left-12"
              aria-hidden
            />
          )}
          {canScrollRight && (
            <span
              className="pointer-events-none absolute inset-y-3 right-5 w-10 bg-gradient-to-l from-white/95 to-transparent dark:from-bank-surface/95 sm:right-8 lg:right-12"
              aria-hidden
            />
          )}
        </div>
      </nav>
    </>
  );
}
