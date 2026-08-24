import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, ArrowUpRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import EinordnungSection from '@/components/nachrichten/EinordnungSection';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const CAT_LABEL = {
  alle: 'Alle',
  politik: 'Politik',
  wirtschaft: 'Wirtschaft',
  unternehmen: 'Unternehmen',
  maerkte: 'Märkte',
  europa: 'Europa',
  welt: 'Welt',
  zinsen: 'Zinsen',
  waehrungen: 'Währungen',
  rohstoffe: 'Rohstoffe',
  energie: 'Energie',
  klima: 'Klima',
  technologie: 'Technologie',
  industrie: 'Industrie',
  mobilitaet: 'Mobilität',
  gesundheit: 'Gesundheit',
  sicherheit: 'Sicherheit',
  wissen: 'Wissen',
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 90) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  return `vor ${Math.floor(diff / 86400)} Tagen`;
};

const CategoryTag = ({ category }) => (
  <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-accent-strong">
    {CAT_LABEL[category] || category}
  </span>
);

// Aggregator-Items externer Publisher öffnen in neuem Tab, eigene Redaktions-
// Artikel bleiben auf der internen Detail-Seite.
const linkPropsFor = (item) => {
  if (item?.content_type === 'aggregated' && item?.source_url) {
    return { as: 'a', href: item.source_url, target: '_blank', rel: 'noopener noreferrer' };
  }
  return { as: 'link', to: `/news/nachrichten/${item.slug}` };
};

const SmartLink = ({ item, children, className, testId }) => {
  const p = linkPropsFor(item);
  if (p.as === 'a') {
    return <a href={p.href} target={p.target} rel={p.rel} className={className} data-testid={testId}>{children}</a>;
  }
  return <Link to={p.to} className={className} data-testid={testId}>{children}</Link>;
};

const PublisherTag = ({ item }) => {
  const pub = item?.content_type === 'aggregated' ? (item.source_name || 'Externer Publisher') : 'Fröhlich Redaktion';
  return (
    <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">
      · {pub}
    </span>
  );
};

const HeadlineRow = ({ item }) => (
  <SmartLink item={item} className="group flex gap-3 border-b border-bank-border/70 py-3 last:border-b-0" testId={`headline-${item.slug}`}>
    <img src={item.image_url} alt="" loading="lazy" className="h-14 w-20 shrink-0 object-cover" />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1">
        <CategoryTag category={item.category} />
        <PublisherTag item={item} />
      </div>
      <p className="mt-1 truncate-3 font-serif text-[13.5px] leading-snug text-bank-text group-hover:text-bank-primary">
        {item.title}
      </p>
      <p className="mt-1 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
        {timeAgo(item.published_at)}
      </p>
    </div>
  </SmartLink>
);

const HeroCard = ({ item }) => (
  <SmartLink item={item} className="group grid grid-cols-1 gap-6 border border-bank-border bg-white p-5 sm:p-6 lg:grid-cols-[1.2fr_1fr]" testId="news-hero">
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
      <img src={item.image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      {item.content_type === 'video' && (
        <PlayCircle className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/95 drop-shadow-lg" strokeWidth={1.2} />
      )}
    </div>
    <div className="flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <CategoryTag category={item.category} />
          <PublisherTag item={item} />
        </div>
        <h2 className="mt-3 font-serif text-2xl leading-[1.15] text-bank-text sm:text-3xl">
          {item.title}
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">{item.summary}</p>
      </div>
      <div className="flex items-center justify-between border-t border-bank-border pt-3 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
        <span>{timeAgo(item.published_at)}</span>
        <span className="inline-flex items-center gap-1 text-bank-primary">
          Weiterlesen <ArrowUpRight size={12} strokeWidth={1.8} />
        </span>
      </div>
    </div>
  </SmartLink>
);

const NewsCard = ({ item }) => (
  <SmartLink item={item} className="group flex min-w-0 flex-col border border-bank-border bg-white transition-colors hover:border-bank-accent-strong/50" testId={`news-card-${item.slug}`}>
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
      <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      {item.content_type === 'video' && (
        <PlayCircle className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-white/95 drop-shadow" strokeWidth={1.2} />
      )}
    </div>
    <div className="flex flex-1 flex-col gap-2 px-4 py-4">
      <div className="flex items-center gap-2">
        <CategoryTag category={item.category} />
        <PublisherTag item={item} />
      </div>
      <h3 className="font-serif text-[17px] leading-tight text-bank-text group-hover:text-bank-primary">
        {item.title}
      </h3>
      <p className="line-clamp-3 text-[13px] leading-relaxed text-bank-text-muted">{item.summary}</p>
      <p className="mt-auto text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
        {timeAgo(item.published_at)}
      </p>
    </div>
  </SmartLink>
);

const RedaktionSlot = () => (
  <aside className="border border-bank-border bg-bank-primary/95 p-5 text-white" data-testid="froehlich-redaktion-slot">
    <div className="flex items-center gap-2">
      <ShieldCheck className="h-4 w-4 text-bank-gold" strokeWidth={1.6} />
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-bank-gold">Fröhlich Redaktion</p>
    </div>
    <p className="mt-2 font-serif text-lg leading-snug">Eigenständig recherchiert. Neutral eingeordnet.</p>
    <p className="mt-3 text-[12.5px] leading-relaxed text-white/80">
      Alle Nachrichten werden von unserer Redaktion auf Basis offizieller Quellen wie EZB,
      Bundesbank, BaFin, EU-Kommission und öffentlich-rechtlicher Berichterstattung
      eigenständig verfasst. Keine Fremdtexte, keine Anlageempfehlungen — nur eine
      neutrale Einordnung dessen, was für Anleger wichtig ist.
    </p>
    <p className="mt-4 text-[10.5px] uppercase tracking-[0.16em] text-white/60">
      Aktualisierung: alle 15 Minuten Quellencheck, stündliche Redaktion.
    </p>
  </aside>
);

const NachrichtenPage = () => {
  const [items, setItems] = useState([]);
  // Deep-Link: Kategorie aus URL-Hash `#kategorie=<key>` initial übernehmen,
  // Format kompatibel zu HomeFinanceNews & HomeHeroNewsPreview.
  const readCategoryHash = () => {
    if (typeof window === 'undefined') return 'alle';
    const raw = (window.location.hash || '').toLowerCase();
    const prefix = '#kategorie=';
    if (!raw.startsWith(prefix)) return 'alle';
    const key = decodeURIComponent(raw.slice(prefix.length));
    return CAT_LABEL[key] ? key : 'alle';
  };
  const [category, setCategory] = useState(readCategoryHash);
  // Chip-Klick oder Hero-Deep-Link: State ↔ URL-Hash synchron halten.
  // pushState statt replaceState → Back/Forward navigiert zwischen Filtern.
  // hashchange-Listener (unten) übernimmt umgekehrten Weg.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = window.location.hash || '';
    const next = category === 'alle' ? '' : `#kategorie=${encodeURIComponent(category)}`;
    if (current === next) return;
    const url = window.location.pathname + window.location.search + next;
    window.history.pushState(null, '', url);
  }, [category]);
  const [publisher, setPublisher] = useState('alle');
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState({ provider: null, is_demo: false, last_updated: null });

  const PAGE = 24;
  const MORE = 18;

  // Hash-Änderungen (Back/Forward, externe Deep-Links) live spiegeln.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = () => setCategory(readCategoryHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // Publisher-Auswahl serverseitig laden (distinct Publisher aus /news/publishers).
  useEffect(() => {
    let alive = true;
    api.get('/news/publishers')
      .then(({ data }) => { if (alive) setPublishers(data?.publishers || []); })
      .catch(() => { if (alive) setPublishers([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    let firstLoad = true;
    const lastFetchRef = { current: 0 };

    const load = async (silent) => {
      if (!alive) return;
      if (!silent) setLoading(true);
      if (!silent) setItems([]);
      const params = { category, limit: PAGE, skip: 0 };
      if (publisher !== 'alle') params.source = publisher;
      try {
        const { data } = await api.get('/news/nachrichten', { params });
        if (!alive) return;
        const nextItems = data.items || [];
        if (silent) {
          // Kein Rerender, wenn Reihenfolge identisch → kein Flackern.
          setItems((prev) => {
            if (prev.length === nextItems.length && prev.every((p, i) => p.slug === nextItems[i]?.slug)) {
              return prev;
            }
            return nextItems;
          });
        } else {
          setItems(nextItems);
        }
        setHasMore(!!data.has_more);
        setTotal(data.total || nextItems.length);
        setMeta({ provider: data.provider, is_demo: !!data.is_demo, last_updated: data.last_updated });
        lastFetchRef.current = Date.now();
      } catch (err) {
        if (!alive) return;
        if (!silent) setItems([]);
        // silent errors: bestehende Inhalte bleiben stehen
        // eslint-disable-next-line no-console
        if (silent) console.warn('[NachrichtenPage] background refresh failed', err?.message || err);
      } finally {
        if (alive && !silent) setLoading(false);
      }
    };

    load(false).then(() => { firstLoad = false; });

    const REFRESH_MS = 5 * 60 * 1000; // 5 Min still im Hintergrund
    const tick = () => {
      if (firstLoad) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (Date.now() - lastFetchRef.current < REFRESH_MS - 5_000) return;
      load(true);
    };
    const refreshId = setInterval(tick, REFRESH_MS);

    const onVisible = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      if (firstLoad) return;
      if (Date.now() - lastFetchRef.current >= REFRESH_MS) load(true);
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
  }, [category, publisher]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const params = { category, limit: MORE, skip: items.length };
      if (publisher !== 'alle') params.source = publisher;
      const { data } = await api.get('/news/nachrichten', { params });
      const seen = new Set(items.map((x) => x.slug));
      const fresh = (data.items || []).filter((x) => !seen.has(x.slug));
      setItems((prev) => [...prev, ...fresh]);
      setHasMore(!!data.has_more);
    } catch { /* silent */ } finally { setLoadingMore(false); }
  };

  const hero = items[0];
  const headlines = items.slice(1, 6);
  const grid = items.slice(1);

  const categories = useMemo(() => Object.entries(CAT_LABEL), []);

  return (
    <div className="bg-white" data-testid="nachrichten-page">
      <PageMeta
        title="Nachrichten — Fröhlich Vermögensberatung"
        description="Aktuelle Wirtschafts- und Finanznachrichten. Eigenständig recherchiert auf Basis offizieller Quellen (EZB, Bundesbank, BaFin, EU-Kommission, Tagesschau, DW)."
        path="/news/nachrichten"
      />

      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-14 sm:px-10 sm:pt-16">
          <Link to="/news" className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-bank-text-muted hover:text-bank-primary">
            <ArrowLeft size={12} strokeWidth={1.7} /> Zurück zu News &amp; Märkte
          </Link>
          <div className="mt-6 flex flex-col gap-3">
            <Eyebrow>Nachrichten</Eyebrow>
            <h1 className="max-w-3xl font-serif text-4xl leading-[1.05] text-bank-text sm:text-5xl">
              Aktuelle Nachrichten aus Deutschland, Europa und der Welt.
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-[11.5px] uppercase tracking-[0.18em] text-bank-text-muted">
              <span>Redaktion: Fröhlich Vermögensberatung</span>
              <span aria-hidden className="text-bank-gold">·</span>
              <span>Quellen: EZB, Bundesbank, BaFin, EU-Kommission, Tagesschau, DW</span>
              {meta.last_updated && <><span aria-hidden className="text-bank-gold">·</span><span>Letzte Aktualisierung {timeAgo(meta.last_updated)}</span></>}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-10 sm:px-10">
        {/* Hero + Headlines */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          {loading || !hero ? (
            <div className="h-[420px] animate-pulse border border-bank-border bg-neutral-50" />
          ) : (
            <HeroCard item={hero} />
          )}
          <div className="flex flex-col gap-4">
            <div className="border border-bank-border bg-white p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Schlagzeilen</p>
              <div className="mt-2">
                {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse border-b border-bank-border/50 bg-neutral-50" />) :
                  headlines.map((h) => <HeadlineRow key={h.slug} item={h} />)}
              </div>
              <button type="button" onClick={() => setCategory('alle')} className="mt-3 w-full border border-bank-border py-2 text-[11.5px] font-medium uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-primary/60" data-testid="show-all-news-btn">
                Alle Nachrichten anzeigen
              </button>
            </div>
            <RedaktionSlot />
          </div>
        </div>

        {/* Category nav */}
        <nav className="mt-12 flex gap-2 overflow-x-auto border-b border-bank-border pb-3 [scrollbar-width:thin]" data-testid="news-category-nav">
          {categories.map(([slug, label]) => {
            const active = category === slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setCategory(slug)}
                data-testid={`news-cat-${slug}`}
                data-active={active ? 'true' : 'false'}
                aria-current={active ? 'true' : undefined}
                className={`whitespace-nowrap rounded-md border px-4 py-1.5 text-[11.5px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40 focus-visible:ring-offset-1 ${
                  active
                    ? 'border-bank-primary bg-bank-mint font-semibold text-bank-primary-strong'
                    : 'border-bank-border bg-white font-medium text-bank-text-muted hover:border-bank-primary/50 hover:bg-bank-mint/50 hover:text-bank-primary-strong'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Publisher filter */}
        <div className="mt-4 flex flex-wrap items-center gap-3" data-testid="news-publisher-filter">
          <label htmlFor="publisher-select" className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
            Publisher
          </label>
          <select
            id="publisher-select"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            data-testid="news-publisher-select"
            className="min-w-[180px] border border-bank-border bg-white px-3 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bank-text focus:border-bank-primary focus:outline-none"
          >
            <option value="alle">Alle Publisher ({publishers.length})</option>
            {publishers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {publisher !== 'alle' && (
            <button type="button" onClick={() => setPublisher('alle')} className="text-[11px] uppercase tracking-[0.18em] text-bank-primary hover:underline" data-testid="news-publisher-reset">
              Filter zurücksetzen
            </button>
          )}
        </div>

        {/* Cards grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="news-card-grid">
          {loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[320px] animate-pulse border border-bank-border bg-neutral-50" />) :
            grid.map((it) => <NewsCard key={it.slug} item={it} />)}
          {!loading && grid.length === 0 && !hero && (
            <div className="col-span-full border border-bank-border bg-white p-10 text-center" data-testid="news-empty">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Aktuell keine Beiträge</p>
              <p className="mt-3 font-serif text-[19px] leading-snug text-bank-text">Wir bereiten die nächsten Beiträge vor.</p>
              <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-bank-text-muted">
                Sobald neue geprüfte Nachrichten aus unseren Redaktionsquellen vorliegen, erscheinen sie hier.
                Marktdaten, Watchlist und unsere Einordnungen finden Sie weiterhin unter „News &amp; Märkte".
              </p>
            </div>
          )}
          {!loading && grid.length === 0 && hero && (
            <p className="col-span-full text-[13px] text-bank-text-muted" data-testid="news-empty-cat">Keine Meldungen in dieser Kategorie.</p>
          )}
        </div>

        {/* „Mehr laden" — echter Aggregator-Feed */}
        {!loading && hasMore && (
          <div className="mt-10 flex flex-col items-center gap-2" data-testid="news-load-more-wrap">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              data-testid="news-load-more-btn"
              className="inline-flex items-center gap-2 border border-bank-border bg-white px-6 py-2.5 text-[11.5px] font-medium uppercase tracking-[0.2em] text-bank-text transition-colors hover:border-bank-primary hover:text-bank-primary disabled:opacity-60"
            >
              {loadingMore ? 'Lade weitere Artikel …' : 'Mehr Nachrichten laden'}
            </button>
            <p className="text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              {items.length} von {total} Artikeln geladen
            </p>
          </div>
        )}
      </div>

      {/* Fröhlich — Unsere Einordnung: klar getrennter, redaktioneller Bereich */}
      <EinordnungSection />
    </div>
  );
};

export default NachrichtenPage;
