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
  alle: 'Alle', politik: 'Politik', wirtschaft: 'Wirtschaft', europa: 'Europa',
  welt: 'Welt', wissen: 'Wissen', umwelt: 'Umwelt', kultur: 'Kultur',
  sport: 'Sport', videos: 'Videos',
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

const HeadlineRow = ({ item }) => (
  <Link to={`/news/nachrichten/${item.slug}`} className="group flex gap-3 border-b border-bank-border/70 py-3 last:border-b-0" data-testid={`headline-${item.slug}`}>
    <img src={item.image_url} alt="" loading="lazy" className="h-14 w-20 shrink-0 object-cover" />
    <div className="min-w-0 flex-1">
      <CategoryTag category={item.category} />
      <p className="mt-1 truncate-3 font-serif text-[13.5px] leading-snug text-bank-text group-hover:text-bank-primary">
        {item.title}
      </p>
      <p className="mt-1 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
        {timeAgo(item.published_at)}
      </p>
    </div>
  </Link>
);

const HeroCard = ({ item }) => (
  <Link to={`/news/nachrichten/${item.slug}`} className="group grid grid-cols-1 gap-6 border border-bank-border bg-white p-5 sm:p-6 lg:grid-cols-[1.2fr_1fr]" data-testid="news-hero">
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
  </Link>
);

const NewsCard = ({ item }) => (
  <Link to={`/news/nachrichten/${item.slug}`} className="group flex min-w-0 flex-col border border-bank-border bg-white transition-colors hover:border-bank-accent-strong/50" data-testid={`news-card-${item.slug}`}>
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
      <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      {item.content_type === 'video' && (
        <PlayCircle className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-white/95 drop-shadow" strokeWidth={1.2} />
      )}
    </div>
    <div className="flex flex-1 flex-col gap-2 px-4 py-4">
      <div className="flex items-center gap-2">
        <CategoryTag category={item.category} />
      </div>
      <h3 className="font-serif text-[16px] leading-snug text-bank-text group-hover:text-bank-primary">{item.title}</h3>
      <p className="line-clamp-3 text-[13px] leading-relaxed text-bank-text-muted">{item.summary}</p>
      <p className="mt-auto pt-2 text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">{timeAgo(item.published_at)}</p>
    </div>
  </Link>
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
  const [category, setCategory] = useState('alle');
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ provider: null, is_demo: true, last_updated: null });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get('/news/nachrichten', { params: { category, limit: 20 } })
      .then(({ data }) => { if (alive) { setItems(data.items || []); setMeta({ provider: data.provider, is_demo: !!data.is_demo, last_updated: data.last_updated }); } })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category]);

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
          {categories.map(([slug, label]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setCategory(slug)}
              data-testid={`news-cat-${slug}`}
              className={`whitespace-nowrap border px-4 py-1.5 text-[11.5px] font-medium uppercase tracking-[0.18em] transition-colors ${
                category === slug
                  ? 'border-bank-primary bg-bank-primary text-white'
                  : 'border-bank-border text-bank-text-muted hover:border-bank-primary/50 hover:text-bank-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

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

      </div>

      {/* Fröhlich — Unsere Einordnung: klar getrennter, redaktioneller Bereich */}
      <EinordnungSection />
    </div>
  );
};

export default NachrichtenPage;
