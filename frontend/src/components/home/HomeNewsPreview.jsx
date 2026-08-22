import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { einordnungApi, EINORDNUNG_CATEGORY_LABEL } from '@/services/einordnungApi';
import { fetchMarketOverview, formatDisplayPrice, formatChangePct } from '@/services/marketService';

const BASE = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const CAT_LABEL = {
  politik: 'Politik', wirtschaft: 'Wirtschaft', europa: 'Europa', welt: 'Welt',
  wissen: 'Wissen', umwelt: 'Umwelt', kultur: 'Kultur', sport: 'Sport', videos: 'Videos',
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 90) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  return `vor ${Math.floor(diff / 86400)} Tagen`;
};

const dateFmt = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '');

const CategoryTag = ({ category, tone = 'gold' }) => (
  <span className={`font-mono text-[10px] uppercase tracking-[0.22em] ${tone === 'gold' ? 'text-bank-gold' : 'text-bank-accent-strong'}`}>
    {CAT_LABEL[category] || EINORDNUNG_CATEGORY_LABEL[category] || category}
  </span>
);

/** Marktüberblick-Streifen — Preview only (top 6 tiles + Zum Marktüberblick). */
const MarketStrip = () => {
  const [state, setState] = useState({ loading: true, tiles: [] });
  useEffect(() => {
    let alive = true;
    fetchMarketOverview('EUR').then((o) => {
      if (!alive) return;
      const tiles = [
        ...o.indices.filter((i) => ['DAX', 'SPX', 'NDX'].includes(i.symbol)),
        ...o.commodities.filter((c) => ['GOLD', 'OIL'].includes(c.symbol)),
        ...o.fx.filter((f) => f.symbol === 'EURUSD'),
      ];
      setState({ loading: false, tiles });
    }).catch(() => setState({ loading: false, tiles: [] }));
    return () => { alive = false; };
  }, []);

  if (state.loading) return <div className="mt-6 h-16 animate-pulse border border-bank-border bg-white/70" />;
  if (!state.tiles.length) return null;

  return (
    <div className="mt-8 border-y border-bank-gold/40 bg-white/70" data-testid="home-market-strip">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Marktüberblick</p>
        <Link to="/news" className="hidden items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary hover:underline sm:inline-flex" data-testid="home-market-more">
          Zum Marktüberblick <ArrowRight size={12} strokeWidth={1.8} />
        </Link>
      </div>
      <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto border-t border-bank-border/60 px-4 py-4 sm:px-6 [scrollbar-width:thin]">
        {state.tiles.map((t) => {
          const up = (t.change_percent ?? 0) >= 0;
          const Icon = up ? TrendingUp : TrendingDown;
          const { primary } = formatDisplayPrice(t);
          return (
            <div key={t.symbol} className="snap-start min-w-[110px]">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">{t.name}</p>
              <p className="mt-1 font-serif text-[15.5px] tabular-nums text-bank-text">{primary}</p>
              <p className={`mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] tabular-nums ${up ? 'text-emerald-700' : 'text-rose-700'}`}>
                <Icon size={10} strokeWidth={1.9} />{up ? '+' : '−'}{formatChangePct(t.change_percent)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Extended topic feeds — Wirtschaft, Europa, Technologie mit je 6 Cards. */
const ExtendedTopicSections = () => {
  const [state, setState] = useState({ loading: true, sections: {} });
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get('/news/nachrichten', { params: { category: 'wirtschaft', limit: 6, skip: 0 } }),
      api.get('/news/nachrichten', { params: { category: 'europa', limit: 6, skip: 0 } }),
      api.get('/news/nachrichten', { params: { category: 'technologie', limit: 6, skip: 0 } }),
    ]).then(([w, e, t]) => {
      if (!alive) return;
      setState({
        loading: false,
        sections: {
          wirtschaft: (w?.data?.items || []).slice(0, 6),
          europa:     (e?.data?.items || []).slice(0, 6),
          technologie:(t?.data?.items || []).slice(0, 6),
        },
      });
    }).catch(() => setState({ loading: false, sections: {} }));
    return () => { alive = false; };
  }, []);

  const linkFor = (item) => (item?.content_type === 'aggregated' && item?.source_url)
    ? { href: item.source_url, isExternal: true }
    : { href: `/news/nachrichten/${item.slug}`, isExternal: false };

  const Section = ({ title, cat, items }) => (
    <section className="mt-16" data-testid={`home-topic-${cat}`}>
      <div className="flex items-end justify-between border-b border-bank-border pb-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">{title}</p>
          <h3 className="mt-1 font-serif text-2xl leading-tight text-bank-text sm:text-[28px]">Aktuell aus {title}</h3>
        </div>
        <Link to={`/news/nachrichten`} className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary hover:underline sm:inline-flex" data-testid={`home-topic-${cat}-more`}>
          Alle {title}-News →
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid={`home-topic-${cat}-grid`}>
        {items.map((it) => {
          const { href, isExternal } = linkFor(it);
          const CardTag = isExternal ? 'a' : Link;
          const props = isExternal
            ? { href, target: '_blank', rel: 'noopener noreferrer' }
            : { to: href };
          const publisher = it.content_type === 'aggregated' ? (it.source_name || 'Externer Publisher') : 'Fröhlich Redaktion';
          return (
            <CardTag key={it.slug} {...props} className="group flex flex-col border border-bank-border bg-white transition-colors hover:border-bank-accent-strong/50" data-testid={`home-topic-${cat}-card`}>
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
                <img src={it.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
              </div>
              <div className="flex flex-1 flex-col gap-2 px-4 py-4">
                <div className="flex items-center gap-2">
                  <CategoryTag category={it.category} />
                  <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">· {publisher}</span>
                </div>
                <h4 className="font-serif text-[16px] leading-snug text-bank-text group-hover:text-bank-primary">{it.title}</h4>
                <p className="line-clamp-2 text-[12.5px] leading-relaxed text-bank-text-muted">{it.summary}</p>
                <p className="mt-auto text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">{timeAgo(it.published_at)}</p>
              </div>
            </CardTag>
          );
        })}
      </div>
    </section>
  );

  if (state.loading) return <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-[280px] animate-pulse border border-bank-border bg-neutral-50"/>)}</div>;
  if (!Object.keys(state.sections).length) return null;
  return (
    <>
      {state.sections.wirtschaft?.length > 0 && <Section title="Wirtschaft" cat="wirtschaft" items={state.sections.wirtschaft} />}
      {state.sections.europa?.length > 0 &&     <Section title="Europa"     cat="europa"     items={state.sections.europa} />}
      {state.sections.technologie?.length > 0 &&<Section title="Technologie"cat="technologie"items={state.sections.technologie} />}
    </>
  );
};

const HomeNewsPreview = () => {
  const [newsState, setNewsState] = useState({ items: [], loading: true });
  const [einState, setEinState] = useState({ items: [], loading: true });
  const [lastUpdated, setLastUpdated] = useState(null);
  // Force re-render for the "vor X Min." label every minute
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      // Fetch both in parallel; keep existing content on error → no flicker.
      const [newsRes, einRes] = await Promise.allSettled([
        api.get('/news/nachrichten', { params: { limit: 5 } }),
        einordnungApi.list({ limit: 3 }),
      ]);
      if (!alive) return;
      if (newsRes.status === 'fulfilled') {
        const items = (newsRes.value.data.items || []).slice().sort((a, b) => {
          const da = a.published_at ? new Date(a.published_at).getTime() : 0;
          const db = b.published_at ? new Date(b.published_at).getTime() : 0;
          return db - da;
        });
        setNewsState({ items, loading: false });
      } else {
        setNewsState((s) => ({ items: s.items, loading: false })); // preserve
      }
      if (einRes.status === 'fulfilled') {
        setEinState({ items: einRes.value.items || [], loading: false });
      } else {
        setEinState((s) => ({ items: s.items, loading: false }));
      }
      setLastUpdated(new Date());
    };

    load();
    const iv = setInterval(load, 5 * 60 * 1000); // 5 Minuten
    const tickIv = setInterval(() => setTick((n) => n + 1), 60 * 1000); // Label alle 60 s
    return () => {
      alive = false;
      clearInterval(iv);
      clearInterval(tickIv);
    };
  }, []);

  const top = newsState.items[0];
  const secondary = newsState.items.slice(1, 5);
  const lastUpdatedLabel = lastUpdated ? timeAgo(lastUpdated.toISOString()) : '';

  return (
    <section className="bg-gradient-to-b from-bank-cream/40 to-white py-16 sm:py-20" data-testid="home-news-preview">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        {/* Header row: Eyebrow + big statement + CTA */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-center">
          <div>
            <Eyebrow>Aktuelle Nachrichten</Eyebrow>
            <h2 className="mt-3 font-serif text-4xl leading-[1.05] text-bank-text sm:text-5xl">
              Wichtige Themen.<br />Klar eingeordnet.
            </h2>
            {lastUpdatedLabel && (
              <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted" data-testid="home-news-last-updated">
                Zuletzt aktualisiert {lastUpdatedLabel}
              </p>
            )}
            <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-bank-text-muted">
              Aktuelle Nachrichten, Entwicklungen an den Märkten und unsere Einordnung — kompakt für Sie zusammengestellt.
            </p>
            <Link
              to="/news/nachrichten"
              data-testid="home-news-top-cta"
              className="mt-6 inline-flex items-center gap-2 bg-bank-primary px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-bank-primary/90"
            >
              Zu den Nachrichten <ArrowRight size={13} strokeWidth={1.8} />
            </Link>
          </div>

          {/* Top news card */}
          {top ? (
            <Link to={`/news/nachrichten/${top.slug}`} className="group relative block overflow-hidden border border-bank-border bg-white" data-testid="home-news-top">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
                {top.image_url && (
                  <img src={top.image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                )}
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Top-News</span>
                  {top.is_demo && (
                    <span className="border border-amber-300 bg-amber-50 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.16em] text-amber-900">Demo</span>
                  )}
                </div>
                <h3 className="mt-3 font-serif text-2xl leading-tight text-bank-text sm:text-[26px]">{top.title}</h3>
                <p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-bank-text-muted">{top.summary}</p>
                <div className="mt-4 flex items-center justify-between border-t border-bank-border pt-3 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                  <span>{timeAgo(top.published_at)} · <CategoryTag category={top.category} /></span>
                  <ArrowUpRight size={14} strokeWidth={1.7} className="text-bank-gold" />
                </div>
              </div>
            </Link>
          ) : (
            <div className="h-[420px] animate-pulse border border-bank-border bg-white/70" />
          )}
        </div>

        <MarketStrip />

        {/* Grid: 4 secondary news + Einordnung side column */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="flex items-center justify-between">
              <Eyebrow>Nachrichten</Eyebrow>
              <Link to="/news/nachrichten" className="font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary hover:underline" data-testid="home-news-all">
                Alle Nachrichten →
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(newsState.loading ? Array.from({ length: 4 }) : secondary).slice(0, 4).map((item, idx) => (
                item ? (
                  <Link key={item.slug} to={`/news/nachrichten/${item.slug}`} className="group flex flex-col border border-bank-border bg-white transition-colors hover:border-bank-gold/60" data-testid={`home-news-card-${item.slug}`}>
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
                      {item.image_url && <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />}
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 px-3 py-3">
                      <CategoryTag category={item.category} />
                      <h4 className="font-serif text-[15px] leading-snug text-bank-text group-hover:text-bank-primary">{item.title}</h4>
                      <p className="mt-auto pt-2 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">{timeAgo(item.published_at)}</p>
                    </div>
                  </Link>
                ) : (
                  <div key={idx} className="h-[220px] animate-pulse border border-bank-border bg-white/70" />
                )
              ))}
            </div>
          </div>

          {/* Einordnung side column */}
          <aside data-testid="home-einordnung-preview">
            <div className="flex items-center justify-between">
              <Eyebrow>Fröhlich — Unsere Einordnung</Eyebrow>
            </div>
            <div className="mt-4 space-y-3">
              {(einState.loading ? Array.from({ length: 3 }) : einState.items.slice(0, 3)).map((post, idx) => (
                post ? (
                  <Link key={post.slug} to={`/news/einordnung/${post.slug}`} className="group flex gap-3 border border-bank-border bg-white p-3 transition-colors hover:border-bank-gold/60" data-testid={`home-einordnung-${post.slug}`}>
                    {post.image_url && (
                      <img src={post.image_url} alt="" loading="lazy" className="h-16 w-20 shrink-0 object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="line-clamp-2 font-serif text-[13.5px] leading-snug text-bank-text group-hover:text-bank-primary">{post.title}</h4>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-bank-text-muted">
                        {dateFmt(post.published_at)} · Unsere Einordnung
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div key={idx} className="h-[90px] animate-pulse border border-bank-border bg-white/70" />
                )
              ))}
            </div>
            <Link to="/news/nachrichten#einordnung-section" className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-primary hover:underline" data-testid="home-einordnung-all">
              Alle Einordnungen lesen <ArrowRight size={12} strokeWidth={1.8} />
            </Link>
          </aside>
        </div>

        {/* Erweiterte Themen-Sektionen — direkt aus Aggregator-Pipeline */}
        <ExtendedTopicSections />

        {/* Final CTA */}
        <div className="mt-14 border-t border-bank-border pt-10 text-center">
          <h3 className="font-serif text-2xl leading-tight text-bank-text sm:text-[28px]">Mehr Nachrichten entdecken</h3>
          <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-bank-text-muted">
            Aktuelle Entwicklungen aus Wirtschaft, Politik, Märkten und der Welt finden Sie in unserem
            vollständigen Nachrichtenbereich — inklusive Kategorien, Videos und persönlicher Einordnung.
          </p>
          <Link
            to="/news/nachrichten"
            data-testid="home-news-primary-cta"
            className="mt-6 inline-flex items-center gap-2 bg-bank-primary px-6 py-3 font-mono text-[12px] font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-bank-primary/90"
          >
            Weitere Nachrichten lesen <ArrowRight size={14} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeNewsPreview;
