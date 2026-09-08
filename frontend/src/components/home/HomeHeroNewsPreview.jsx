import { getApiBase } from '@/lib/apiBase';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Newspaper, Clock } from 'lucide-react';
import SafeNewsImage from '@/components/news/SafeNewsImage';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';
import { trackInvestmentEvent } from '@/lib/investmentAnalytics';

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const CATEGORY_LABEL = {
  politik: 'Politik', wirtschaft: 'Wirtschaft', unternehmen: 'Unternehmen',
  maerkte: 'Märkte', europa: 'Europa', welt: 'Welt', zinsen: 'Zinsen',
  waehrungen: 'Währungen', rohstoffe: 'Rohstoffe', energie: 'Energie',
  klima: 'Klima', technologie: 'Technologie', industrie: 'Industrie',
  mobilitaet: 'Mobilität', gesundheit: 'Gesundheit', sicherheit: 'Sicherheit',
  wissen: 'Wissen', 'fonds-etfs': 'Fonds & ETFs',
};

const humanize = (raw) => {
  if (!raw) return '';
  if (CATEGORY_LABEL[raw]) return CATEGORY_LABEL[raw];
  return raw.split(/[-_]/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : '')).join(' ');
};

const relTime = (iso) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'gerade eben';
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  const d = Math.floor(s / 86400);
  return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`;
};

const useRelativeTime = (iso) => {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!iso) return undefined;
    const id = setInterval(() => tick((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return relTime(iso);
};

const isOwnEditorial = (item) => item?.content_type !== 'aggregated' && !!item?.slug;

const categoryHref = (category) => {
  if (!category || !CATEGORY_LABEL[category]) return '/nachrichten';
  return `/nachrichten#kategorie=${encodeURIComponent(category)}`;
};

const MetaLine = ({ item, showRelative = false, className }) => {
  const rel = useRelativeTime(showRelative ? item.published_at : null);
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] font-medium uppercase tracking-[0.18em]', className)}>
      <span className="text-bank-primary-strong">{humanize(item.category)}</span>
      {showRelative && rel ? (
        <>
          <span className="text-bank-border" aria-hidden>·</span>
          <span className="text-bank-text-muted normal-case tracking-normal">{rel}</span>
        </>
      ) : null}
    </div>
  );
};

/* ── Center: dominante Top-Story mit editorialer Overlay-Box ─────────────── */
const TopStory = ({ item }) => (
  <Link
    to={`/news/${item.slug}`}
    data-testid="hero-news-top"
    aria-label={item.title || 'Top-Story lesen'}
    className="group relative block overflow-hidden rounded-lg border border-bank-border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
  >
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-bank-mint">
      <SafeNewsImage
        src={item.image_url}
        category={item.category}
        alt={item.title || ''}
        loading="eager"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        testId="hero-news-top-img"
      />
    </div>
    {/* Editorial-Box: mobile unter dem Bild, lg als Overlay am unteren Bildrand */}
    <div className="border-t border-bank-border bg-white p-5 lg:absolute lg:inset-x-6 lg:bottom-6 lg:mt-0 lg:rounded-md lg:border lg:bg-white/95 lg:p-6 lg:shadow-[0_18px_44px_-24px_rgb(30_41_43/0.28)] lg:backdrop-blur-sm">
      <MetaLine item={item} showRelative className="lg:text-[11px]" />
      <h2 className="mt-3 font-serif text-[1.35rem] font-medium leading-[1.15] tracking-tight text-bank-text [overflow-wrap:anywhere] sm:text-[1.6rem] lg:text-[1.75rem]">
        {item.title}
      </h2>
      {item.summary ? (
        <p className="mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-bank-text-muted lg:text-[14px]">
          {item.summary}
        </p>
      ) : null}
      <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-bank-primary-strong transition-colors group-hover:text-bank-primary">
        Artikel lesen
        <ArrowRight size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
      </span>
    </div>
  </Link>
);

/* ── Left: ruhige, textorientierte Story ─────────────────────────────────── */
const LeftStory = ({ item }) => (
  <div className="flex h-full flex-col border-t border-bank-border pt-5 lg:border-t-0 lg:border-r lg:pr-6 lg:pt-0">
    <p className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong">
      Aktuelle Nachrichten
    </p>
    <Link
      to={`/news/${item.slug}`}
      data-testid="hero-news-left"
      aria-label={item.title || 'Meldung lesen'}
      className="group flex flex-1 flex-col rounded-md p-1 -mx-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
    >
      <MetaLine item={item} showRelative />
      <h3 className="mt-3 font-serif text-[1.05rem] font-medium leading-[1.2] tracking-tight text-bank-text [overflow-wrap:anywhere] sm:text-[1.15rem]">
        {item.title}
      </h3>
      {item.summary ? (
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-bank-text-muted">
          {item.summary}
        </p>
      ) : null}
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12px] font-semibold text-bank-primary-strong transition-colors group-hover:text-bank-primary">
        Artikel lesen
        <ArrowRight size={12} strokeWidth={LUCIDE_STROKE} aria-hidden />
      </span>
    </Link>
  </div>
);

/* ── Right: 3 kompakte weitere Meldungen ─────────────────────────────────── */
const CompactItem = ({ item, testId, onCategoryClick }) => {
  const rel = useRelativeTime(item.published_at);
  const handleChip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      trackInvestmentEvent('news_category_click', {
        category: item.category || null,
        source: 'home_hero',
      });
    } catch { /* silent */ }
    if (typeof window !== 'undefined') window.location.assign(categoryHref(item.category));
    onCategoryClick?.();
  };
  return (
    <div className="group relative flex min-h-[80px] gap-3 py-3">
      <Link
        to={`/news/${item.slug}`}
        data-testid={testId}
        aria-label={item.title || 'Meldung lesen'}
        className="absolute inset-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
      >
        <span className="sr-only">{item.title}</span>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium uppercase tracking-[0.18em]">
          <a
            href={categoryHref(item.category)}
            onClick={handleChip}
            data-testid={`hero-news-right-chip-${item.category || 'none'}`}
            aria-label={`Kategorie ${humanize(item.category)} anzeigen`}
            className="relative z-10 -mx-1 inline-flex min-h-[20px] items-center rounded px-1 text-bank-primary-strong transition-colors hover:text-bank-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/50"
          >
            {humanize(item.category)}
          </a>
          {rel ? (
            <>
              <span className="text-bank-border" aria-hidden>·</span>
              <span className="text-bank-text-muted normal-case tracking-normal">{rel}</span>
            </>
          ) : null}
        </div>
        <h4 className="mt-1.5 line-clamp-3 font-serif text-[13.5px] font-medium leading-[1.25] tracking-tight text-bank-text [overflow-wrap:anywhere] group-hover:text-bank-primary-strong">
          {item.title}
        </h4>
      </div>
      <div className="relative h-[70px] w-[92px] shrink-0 overflow-hidden rounded-md bg-bank-mint">
        <SafeNewsImage
          src={item.image_url}
          category={item.category}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
    </div>
  );
};

const RightList = ({ items }) => (
  <div className="flex h-full flex-col border-t border-bank-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
    <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong">
      Weitere Meldungen
    </p>
    <ul className="flex flex-col divide-y divide-bank-border">
      {items.map((it, idx) => (
        <li key={it.slug}>
          <CompactItem item={it} testId={`hero-news-right-${idx}`} />
        </li>
      ))}
    </ul>
  </div>
);

/* ── Category Ribbon: hottest categories of last 24h ────────────────────── */
const CategoryRibbon = ({ items }) => {
  const chips = useMemo(() => {
    const now = Date.now();
    const CUTOFF = 24 * 60 * 60 * 1000;
    const stats = new Map(); // key → {count, newest}
    for (const it of items) {
      const key = it.category;
      if (!key || !CATEGORY_LABEL[key]) continue;
      const t = it.published_at ? new Date(it.published_at).getTime() : 0;
      if (!Number.isFinite(t) || now - t > CUTOFF) continue;
      const cur = stats.get(key) || { count: 0, newest: 0 };
      cur.count += 1;
      if (t > cur.newest) cur.newest = t;
      stats.set(key, cur);
    }
    return [...stats.entries()]
      .sort((a, b) => (b[1].count - a[1].count) || (b[1].newest - a[1].newest))
      .slice(0, 5)
      .map(([key, s]) => ({ key, label: CATEGORY_LABEL[key], count: s.count }));
  }, [items]);

  if (!chips.length) return null;

  const handleClick = (category) => {
    try {
      trackInvestmentEvent('news_category_click', {
        category,
        source: 'home_hero_ribbon',
      });
    } catch { /* silent */ }
  };

  return (
    <nav
      aria-label="Aktuelle Themen"
      data-testid="hero-news-ribbon"
      className="mb-5 flex items-center gap-3 border-b border-bank-border pb-3"
    >
      <span className="hidden shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-bank-text-muted sm:inline">
        Themen
      </span>
      <ul className="-mx-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {chips.map(({ key, label }) => (
          <li key={key} className="shrink-0">
            <Link
              to={categoryHref(key)}
              onClick={() => handleClick(key)}
              data-testid={`hero-news-ribbon-chip-${key}`}
              aria-label={`Kategorie ${label} anzeigen`}
              className="inline-flex min-h-[32px] items-center rounded-full border border-bank-border bg-white px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-bank-primary-strong transition-colors hover:border-bank-primary/40 hover:bg-bank-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const SkeletonBar = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-bank-mint/60', className)} aria-hidden />
);

const HomeHeroNewsPreview = () => {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading');
  const [toast, setToast] = useState(null); // { slug, title }
  const lastFetchRef = useRef(0);
  const prevTopSlugRef = useRef(null);
  const prevTopTimeRef = useRef(0);
  const toastTimerRef = useRef(null);
  const initialLoadRef = useRef(true);

  // Reduced Motion respektieren
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dismissToast = useCallback(() => {
    setToast(null);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  const scheduleAutoClose = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 9000);
  }, []);

  const loadNews = useCallback(async (silent = false) => {
    try {
      const res = await api.get('/news/nachrichten', { params: { limit: 12 } });
      const list = (res?.data?.items || [])
        .filter(isOwnEditorial)
        .slice()
        .sort((a, b) => {
          const da = a.published_at ? new Date(a.published_at).getTime() : 0;
          const db = b.published_at ? new Date(b.published_at).getTime() : 0;
          return db - da;
        });
      const seen = new Set();
      const deduped = [];
      for (const it of list) {
        if (seen.has(it.slug)) continue;
        seen.add(it.slug);
        deduped.push(it);
        if (deduped.length >= 12) break;
      }
      lastFetchRef.current = Date.now();

      // Fresh-Article-Toast: nur bei Background-Refresh (silent=true),
      // wenn wirklich neue Featured-Story (Slug anders UND neuer UND initial vorhanden).
      const nextTop = deduped[0];
      const nextTopTime = nextTop?.published_at ? new Date(nextTop.published_at).getTime() : 0;
      if (
        silent
        && !initialLoadRef.current
        && nextTop
        && prevTopSlugRef.current
        && nextTop.slug !== prevTopSlugRef.current
        && nextTopTime > prevTopTimeRef.current
      ) {
        let alreadyShown = false;
        try {
          const key = 'heroNewsLastToastSlug';
          const prev = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
          if (prev === nextTop.slug) alreadyShown = true;
          else if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, nextTop.slug);
        } catch { /* sessionStorage blocked → best-effort */ }
        if (!alreadyShown) {
          setToast({ slug: nextTop.slug, title: nextTop.title || 'Neue Meldung' });
          scheduleAutoClose();
          try {
            trackInvestmentEvent('news_fresh_toast_show', {
              slug: nextTop.slug, source: 'home_hero',
            });
          } catch { /* silent */ }
        }
      }
      if (nextTop) {
        prevTopSlugRef.current = nextTop.slug;
        prevTopTimeRef.current = nextTopTime;
      }
      initialLoadRef.current = false;

      setItems((prev) => {
        if (prev.length === deduped.length && prev.every((p, i) => p.slug === deduped[i].slug)) return prev;
        return deduped;
      });
      setState('ready');
    } catch (err) {
      if (!silent) setState('error');
      // eslint-disable-next-line no-console
      else console.warn('[HomeHeroNewsPreview] background refresh failed', err?.message || err);
    }
  }, [scheduleAutoClose]);

  useEffect(() => {
    let alive = true;
    loadNews(false).then(() => { if (!alive) return; });
    const REFRESH_MS = 5 * 60 * 1000;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (Date.now() - lastFetchRef.current < REFRESH_MS - 5_000) return;
      loadNews(true);
    };
    const refreshId = setInterval(tick, REFRESH_MS);
    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchRef.current >= REFRESH_MS) loadNews(true);
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(refreshId);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadNews]);

  return (
    <div className="w-full min-w-0" data-testid="hero-news-preview">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="hero-news-fresh-toast"
          className={cn(
            'pointer-events-auto mb-4 flex items-start gap-3 rounded-lg border border-bank-border bg-white px-4 py-3 shadow-[0_18px_40px_-24px_rgb(30_41_43/0.22)]',
            prefersReduced ? '' : 'transition-all duration-200 ease-out',
          )}
          style={{ maxWidth: '640px' }}
        >
          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bank-mint text-bank-primary-strong" aria-hidden>
            <Newspaper className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-bank-primary-strong">
              Neue Meldung
            </p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-bank-text">
              {toast.title}
            </p>
          </div>
          <Link
            to={`/news/${toast.slug}`}
            data-testid="hero-news-fresh-toast-cta"
            onClick={() => {
              try {
                trackInvestmentEvent('news_fresh_toast_click', {
                  slug: toast.slug, source: 'home_hero',
                });
              } catch { /* silent */ }
              dismissToast();
            }}
            className="shrink-0 self-center inline-flex items-center gap-1 rounded-md border border-bank-border bg-white px-2.5 py-1 text-[11.5px] font-semibold text-bank-primary-strong transition-colors hover:border-bank-primary/40 hover:bg-bank-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
          >
            Ansehen
            <ArrowRight size={11} strokeWidth={LUCIDE_STROKE} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={dismissToast}
            data-testid="hero-news-fresh-toast-close"
            aria-label="Neue Meldung ausblenden"
            className="shrink-0 self-start rounded p-1 text-bank-text-muted transition-colors hover:text-bank-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
          >
            <span aria-hidden className="block h-3 w-3">×</span>
          </button>
        </div>
      )}
      {state === 'loading' && (
        <div className="grid gap-6 lg:grid-cols-12" data-testid="hero-news-loading">
          <SkeletonBar className="h-[420px] lg:col-span-3" />
          <SkeletonBar className="h-[420px] lg:col-span-6" />
          <SkeletonBar className="h-[420px] lg:col-span-3" />
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-lg border border-bank-border bg-bank-panel p-6 text-center" data-testid="hero-news-error">
          <p className="text-[14px] text-bank-text-muted">Nachrichten werden gerade aktualisiert.</p>
          <Link to="/nachrichten" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-bank-primary-strong hover:text-bank-primary">
            Zum Nachrichtenbereich
            <ArrowRight size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
          </Link>
        </div>
      )}

      {state === 'ready' && items.length > 0 && (
        <>
          <CategoryRibbon items={items} />
          {(() => {
            const top = items[0];
            const left = items[1] || null;
            const right = items.slice(2, 5);
            return (
              <div className="grid gap-6 md:grid-cols-6 md:gap-8 lg:grid-cols-12">
                {/* Mobile-Reihenfolge: TopStory zuerst, dann Left, dann Right.
                    Desktop-Reihenfolge: Left | Top | Right. */}
                {left && (
                  <div className="order-2 md:order-1 md:col-span-3 lg:col-span-3">
                    <LeftStory item={left} />
                  </div>
                )}
                <div className={cn(
                  'order-1 md:order-2',
                  left ? 'md:col-span-6 lg:col-span-6' : 'md:col-span-6 lg:col-span-9',
                )}>
                  <TopStory item={top} />
                </div>
                {right.length > 0 && (
                  <div className={cn(
                    'order-3',
                    left ? 'md:col-span-6 md:order-3 lg:col-span-3' : 'md:col-span-6 lg:col-span-3',
                  )}>
                    <RightList items={right} />
                  </div>
                )}
              </div>
            );
          })()}

          <Link
            to="/nachrichten"
            data-testid="hero-news-all-link"
            className="group mt-6 flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border border-bank-border bg-white px-4 py-2.5 transition-all duration-200 hover:border-bank-primary/40 hover:bg-bank-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-bank-border bg-white text-bank-primary-strong">
                <Newspaper className="h-3.5 w-3.5" strokeWidth={LUCIDE_STROKE} aria-hidden />
              </span>
              <span className="truncate text-[13px] font-semibold text-bank-text">
                Alle Nachrichten im Überblick
              </span>
            </span>
            <ArrowRight
              size={14}
              strokeWidth={LUCIDE_STROKE}
              className="shrink-0 text-bank-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-bank-primary-strong"
              aria-hidden
            />
          </Link>
        </>
      )}
    </div>
  );
};

export default HomeHeroNewsPreview;
