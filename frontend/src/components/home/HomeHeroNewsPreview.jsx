import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Newspaper, Clock } from 'lucide-react';
import SafeNewsImage from '@/components/news/SafeNewsImage';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';
import { trackInvestmentEvent } from '@/lib/investmentAnalytics';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const CATEGORY_LABEL = {
  politik: 'Politik', wirtschaft: 'Wirtschaft', unternehmen: 'Unternehmen',
  maerkte: 'Märkte', europa: 'Europa', welt: 'Welt', zinsen: 'Zinsen',
  waehrungen: 'Währungen', rohstoffe: 'Rohstoffe', energie: 'Energie',
  klima: 'Klima', technologie: 'Technologie', industrie: 'Industrie',
  mobilitaet: 'Mobilität', gesundheit: 'Gesundheit', sicherheit: 'Sicherheit',
  wissen: 'Wissen', 'fonds-etfs': 'Fonds & ETFs',
};

const humanizeCategory = (raw) => {
  if (!raw) return '';
  if (CATEGORY_LABEL[raw]) return CATEGORY_LABEL[raw];
  return raw
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
};

const dateFmt = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { return ''; }
};

/** Deutsch, defensive gegen ungültige Werte. */
const relTime = (iso) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diffSec = Math.max(0, (Date.now() - t) / 1000);
  if (diffSec < 60) return 'gerade eben';
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `vor ${m} Min.`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `vor ${h} Std.`;
  }
  const d = Math.floor(diffSec / 86400);
  return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`;
};

/** Alle 60s neu berechnen. Timer sauber aufräumen. */
const useRelativeTime = (iso) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return undefined;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [iso]);
  // now dient nur als Rerender-Trigger; relTime nutzt Date.now() intern
  void now;
  return relTime(iso);
};

const isOwnEditorial = (item) =>
  item?.content_type !== 'aggregated' && !!item?.slug;

const categoryHref = (category) => {
  if (!category || !CATEGORY_LABEL[category]) return '/nachrichten';
  return `/nachrichten#kategorie=${encodeURIComponent(category)}`;
};

const FeaturedCard = ({ item }) => {
  const rel = useRelativeTime(item.published_at);
  return (
    <Link
      to={`/nachrichten/${item.slug}`}
      data-testid="hero-news-featured"
      className="group flex flex-col overflow-hidden rounded-lg border border-bank-border bg-white transition-all duration-200 hover:border-bank-primary/40 hover:shadow-[0_18px_40px_-24px_rgb(30_41_43/0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 sm:flex-row"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-bank-mint sm:aspect-auto sm:w-[42%] sm:min-h-[10rem]">
        <SafeNewsImage
          src={item.image_url}
          category={item.category}
          alt={item.title || ''}
          loading="eager"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          testId="hero-news-featured-img"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] font-medium uppercase tracking-[0.18em]">
          <span className="text-bank-primary-strong">{humanizeCategory(item.category)}</span>
          {item.published_at ? (
            <>
              <span className="text-bank-border" aria-hidden>·</span>
              <span className="text-bank-text-muted tabular-nums">{dateFmt(item.published_at)}</span>
            </>
          ) : null}
          {rel ? (
            <span
              data-testid="hero-news-featured-relative"
              className="inline-flex items-center gap-1 rounded-full bg-bank-mint px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-bank-primary-strong"
            >
              <Clock size={10} strokeWidth={LUCIDE_STROKE} aria-hidden />
              {rel}
            </span>
          ) : null}
        </div>
        <h3 className="font-display text-[1.15rem] font-medium leading-[1.2] tracking-tight text-bank-text [overflow-wrap:anywhere] sm:text-[1.35rem]">
          {item.title}
        </h3>
        {item.summary ? (
          <p className="line-clamp-2 text-[13px] leading-snug text-bank-text-muted">
            {item.summary}
          </p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-bank-primary-strong transition-colors group-hover:text-bank-primary">
          Mehr erfahren
          <ArrowRight size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
        </span>
      </div>
    </Link>
  );
};

const SmallCard = ({ item, testId }) => {
  const label = humanizeCategory(item.category);
  const handleChipClick = (e) => {
    // preventDefault + stopPropagation, damit die umgebende Karte nicht die
    // Detailseite öffnet — nur der Chip navigiert in die Übersicht.
    e.preventDefault();
    e.stopPropagation();
    try {
      trackInvestmentEvent('news_category_click', {
        category: item.category || null,
        source: 'home_hero',
      });
    } catch { /* silent */ }
    if (typeof window !== 'undefined') {
      window.location.assign(categoryHref(item.category));
    }
  };

  return (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-bank-border bg-bank-panel transition-all duration-200 hover:border-bank-primary/40 hover:bg-white focus-within:border-bank-primary/40"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-bank-mint">
        <SafeNewsImage
          src={item.image_url}
          category={item.category}
          alt={item.title || ''}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-3.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] font-medium uppercase tracking-[0.18em]">
          <a
            href={categoryHref(item.category)}
            onClick={handleChipClick}
            data-testid={`hero-news-small-chip-${item.category || 'none'}`}
            aria-label={`Kategorie ${label} anzeigen`}
            className={cn(
              'relative z-10 -mx-1 inline-flex min-h-[24px] items-center rounded px-1 py-0.5 text-bank-primary-strong',
              'transition-colors hover:text-bank-primary hover:underline underline-offset-4',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/50 focus-visible:ring-offset-1',
            )}
          >
            {label}
          </a>
          {item.published_at ? (
            <>
              <span className="text-bank-border" aria-hidden>·</span>
              <span className="text-bank-text-muted tabular-nums">{dateFmt(item.published_at)}</span>
            </>
          ) : null}
        </div>
        <h4 className="line-clamp-3 font-display text-[0.9rem] font-medium leading-[1.25] tracking-tight text-bank-text [overflow-wrap:anywhere] sm:text-[0.95rem]">
          {item.title}
        </h4>
        <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-bank-primary-strong transition-colors group-hover:text-bank-primary">
          Mehr erfahren
          <ArrowRight size={11} strokeWidth={LUCIDE_STROKE} aria-hidden />
        </span>
      </div>
      {/* Stretched Link — deckt die gesamte Karte ab, unter dem Chip (z-0). */}
      <Link
        to={`/nachrichten/${item.slug}`}
        data-testid={testId}
        aria-label={item.title || 'Nachricht öffnen'}
        className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
      >
        <span className="sr-only">{item.title}</span>
      </Link>
    </div>
  );
};

const SkeletonBar = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-bank-mint/60', className)} aria-hidden />
);

const HomeHeroNewsPreview = () => {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error
  const lastFetchRef = React.useRef(0);

  // Fetch-Logik: initial (mit Loading-State) UND still im Hintergrund.
  // Bei Background-Refresh bleibt das UI stabil — nur wenn neue Daten
  // vorliegen, wird der State ersetzt. Fehler beim Refresh sind still.
  const loadNews = React.useCallback(async (silent = false) => {
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
        if (deduped.length >= 4) break;
      }
      lastFetchRef.current = Date.now();
      setItems((prev) => {
        // Kein Rerender, wenn Slug-Reihenfolge identisch → verhindert Flackern.
        if (
          prev.length === deduped.length &&
          prev.every((p, i) => p.slug === deduped[i].slug)
        ) {
          return prev;
        }
        return deduped;
      });
      setState('ready');
    } catch (err) {
      if (!silent) {
        setState('error');
      } else {
        // eslint-disable-next-line no-console
        console.warn('[HomeHeroNewsPreview] background refresh failed', err?.message || err);
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    loadNews(false).then(() => { if (!alive) return; });

    const REFRESH_MS = 5 * 60 * 1000; // 5 Minuten
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (Date.now() - lastFetchRef.current < REFRESH_MS - 5_000) return;
      loadNews(true);
    };
    const refreshId = setInterval(tick, REFRESH_MS);

    // Tab wieder sichtbar → einmal aktualisieren, falls letzter Fetch alt.
    const onVisible = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchRef.current >= REFRESH_MS) {
        loadNews(true);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }

    return () => {
      alive = false;
      clearInterval(refreshId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [loadNews]);

  const featured = items[0] || null;
  const small = items.slice(1, 4);

  return (
    <div className="w-full min-w-0" data-testid="hero-news-preview">
      {state === 'loading' && (
        <div className="flex flex-col gap-4" data-testid="hero-news-loading">
          <SkeletonBar className="h-[9rem] w-full sm:h-[11rem]" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((k) => <SkeletonBar key={k} className="h-32" />)}
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-lg border border-bank-border bg-bank-panel p-6 text-center" data-testid="hero-news-error">
          <p className="text-[14px] text-bank-text-muted">
            Nachrichten werden gerade aktualisiert.
          </p>
          <Link
            to="/nachrichten"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-bank-primary-strong hover:text-bank-primary"
          >
            Zum Nachrichtenbereich
            <ArrowRight size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
          </Link>
        </div>
      )}

      {state === 'ready' && featured && (
        <>
          <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong">
            Aktuelle Nachrichten
          </p>
          <FeaturedCard item={featured} />

          {small.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {small.map((it, idx) => (
                <SmallCard key={it.slug} item={it} testId={`hero-news-small-${idx}`} />
              ))}
            </div>
          )}

          <Link
            to="/nachrichten"
            data-testid="hero-news-all-link"
            className="group mt-4 flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border border-bank-border bg-white px-4 py-2.5 transition-all duration-200 hover:border-bank-primary/40 hover:bg-bank-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40"
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
