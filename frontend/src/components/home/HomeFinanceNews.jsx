import { getApiBase } from '@/lib/apiBase';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Clock } from 'lucide-react';
import Eyebrow from '@/components/editorial/Eyebrow';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false });

const EASE = [0.22, 1, 0.36, 1];

/** Fest definierte Reihenfolge und Labels — Chips werden aber DYNAMISCH aus
 *  den tatsächlich vorhandenen Kategorien im Feed gebaut, damit neue
 *  Kategorien (z. B. 'politik', 'welt') sofort erscheinen. */
const CATEGORY_LABEL = {
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
  'fonds-etfs': 'Fonds & ETFs',
};

/** Whitelist gültiger Hash-Werte für den Deep-Link.
 *  Alles außerhalb dieser Liste fällt auf 'all' zurück. */
const ALLOWED_HASH_CATEGORIES = new Set([
  'all', ...Object.keys(CATEGORY_LABEL).filter((k) => k !== 'alle'),
]);

const HASH_PREFIX = '#kategorie=';

const readCategoryFromHash = () => {
  if (typeof window === 'undefined') return { key: 'all', wasInvalid: false };
  const raw = (window.location.hash || '').toLowerCase();
  if (!raw) return { key: 'all', wasInvalid: false };
  if (!raw.startsWith(HASH_PREFIX)) {
    // Fremder Hash (z. B. #ankermarke) — nicht als „ungültig" behandeln, unangetastet lassen.
    return { key: 'all', wasInvalid: false };
  }
  const key = decodeURIComponent(raw.slice(HASH_PREFIX.length));
  if (ALLOWED_HASH_CATEGORIES.has(key)) return { key, wasInvalid: false };
  return { key: 'all', wasInvalid: true };
};

const CATEGORY_ORDER_HINT = [
  'wirtschaft', 'maerkte', 'unternehmen', 'zinsen', 'fonds-etfs',
  'europa', 'welt', 'politik', 'rohstoffe', 'energie', 'technologie',
  'industrie', 'waehrungen', 'klima', 'mobilitaet', 'gesundheit',
  'sicherheit', 'wissen',
];

const humanizeCategory = (raw) => {
  if (!raw) return '';
  if (CATEGORY_LABEL[raw]) return CATEGORY_LABEL[raw];
  return raw
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
};

/** Fallback-Bild pro Kategorie — zentral in @/lib/news/newsImage (lokale SVG). */
import { getNewsFallbackImage } from '@/lib/news/newsImage';

const onNewsImgError = (event, category) => {
  const t = event.currentTarget;
  if (!t) return;
  if (!t.dataset.fb) { t.dataset.fb = '1'; t.src = getNewsFallbackImage(category); return; }
  t.style.display = 'none';
};

const fallbackImageFor = (category) => getNewsFallbackImage(category);

const handleImgError = (e, category) => {
  const target = e.currentTarget;
  if (!target) return;
  if (!target.dataset.fbStage) {
    target.dataset.fbStage = '1';
    target.src = fallbackImageFor(category);
    return;
  }
  // Auch der lokale Kategorie-Fallback ist gescheitert (nie erwartet, da SVG-DataURL)
  target.dataset.fbStage = 'final';
  target.style.display = 'none';
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 90) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
  return `vor ${Math.floor(diff / 86400)} Tagen`;
};

const dateFmt = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return ''; }
};

/** Nur eigene redaktionelle Artikel — externe RSS-Aggregatoren würden
 *  auf externe Seiten verlinken, das widerspricht dem Ziel „Content bleibt
 *  auf unserer Domain" aus Session 68. */
const isOwnEditorial = (item) =>
  item?.content_type !== 'aggregated' &&
  !!item?.slug;

/** Extrahiert 2–3 einleitende Sätze aus summary/content für Card-Vorschau. */
const buildPreview = (item, maxChars = 260) => {
  const raw = item?.summary || item?.content || '';
  if (!raw) return '';
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastPeriod = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (lastPeriod > 120 ? cut.slice(0, lastPeriod + 1) : cut) + ' …';
};

const buildLongPreview = (item) => buildPreview(item, 520);

const SourceLine = ({ item, className }) => {
  const source = item?.source_name || (item?.content_type === 'aggregated' ? 'Externer Publisher' : 'Fröhlich Redaktion');
  return (
    <p className={cn('font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted', className)}>
      Quelle: {source}
    </p>
  );
};

const CategoryTag = ({ category, className }) => (
  <span className={cn('font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-bank-primary/80', className)}>
    {humanizeCategory(category)}
  </span>
);

// ---------------------------------------------------------------------------
// Feature-Card (Top-Story)
// ---------------------------------------------------------------------------
const FeaturedCard = ({ item }) => (
  <Link
    to={`/news/${item.slug}`}
    data-testid="home-finance-news-featured"
    className="group flex h-full flex-col border border-bank-border bg-white shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_36px_100px_-56px_rgb(9_33_66/0.16)] transition-shadow hover:shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_44px_120px_-56px_rgb(9_33_66/0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30"
  >
    {item.image_url ? (
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-bank-cream/40 lg:aspect-[16/10]">
        <img
          src={item.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => handleImgError(e, item.category)}
          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bank-ink/25 via-transparent to-transparent" />
        <div className="absolute left-5 top-5 inline-flex items-center gap-2 bg-white/95 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.24em] text-bank-primary shadow-sm">
          Top-Story · {humanizeCategory(item.category)}
        </div>
      </div>
    ) : null}
    <div className="flex flex-1 flex-col gap-4 p-6 sm:p-8 lg:p-9">
      <h3 className="font-display text-[1.55rem] font-light leading-[1.2] tracking-tight text-bank-ink sm:text-[1.85rem] lg:text-[2rem]">
        {item.title}
      </h3>
      <p className="text-[15px] leading-relaxed text-bank-text-muted sm:text-[15.5px]" data-testid="home-finance-news-featured-preview">
        {buildLongPreview(item)}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-bank-border pt-5 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
        <span className="inline-flex items-center gap-2">
          <Clock size={12} strokeWidth={LUCIDE_STROKE} aria-hidden />
          {timeAgo(item.published_at)}
        </span>
        <SourceLine item={item} className="normal-case tracking-normal" />
      </div>
      <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-bank-primary transition-colors group-hover:text-bank-primary/80">
        Weiterlesen
        <ArrowUpRight size={14} strokeWidth={LUCIDE_STROKE} aria-hidden />
      </span>
    </div>
  </Link>
);

// ---------------------------------------------------------------------------
// Secondary teaser (rechte Spalte)
// ---------------------------------------------------------------------------
const SecondaryTeaser = ({ item, testId }) => (
  <Link
    to={`/news/${item.slug}`}
    data-testid={testId}
    className="group flex gap-4 py-6 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30 sm:gap-5"
  >
    {item.image_url ? (
      <div className="relative h-24 w-32 shrink-0 overflow-hidden bg-bank-cream/40 sm:h-28 sm:w-40">
        <img
          src={item.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => handleImgError(e, item.category)}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
      </div>
    ) : null}
    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
      <div>
        <CategoryTag category={item.category} />
        <h3 className="mt-1.5 font-display text-[1rem] font-light leading-snug tracking-tight text-bank-ink transition-colors group-hover:text-bank-primary sm:text-[1.1rem]">
          {item.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-bank-text-muted">
          {buildPreview(item, 180)}
        </p>
      </div>
      <p className="text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
        {timeAgo(item.published_at)} · {item.source_name || 'Fröhlich Redaktion'}
      </p>
    </div>
  </Link>
);

// ---------------------------------------------------------------------------
// Grid-Card
// ---------------------------------------------------------------------------
const GridCard = ({ item, testId }) => (
  <Link
    to={`/news/${item.slug}`}
    data-testid={testId}
    className="group flex h-full flex-col border-b border-bank-border pb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30"
  >
    {item.image_url ? (
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-bank-cream/40">
        <img
          src={item.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => handleImgError(e, item.category)}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      </div>
    ) : null}
    <div className="flex flex-1 flex-col gap-3 pt-5">
      <CategoryTag category={item.category} />
      <h3 className="font-display text-[1.1rem] font-light leading-snug tracking-tight text-bank-ink transition-colors group-hover:text-bank-primary sm:text-[1.15rem]">
        {item.title}
      </h3>
      <p className="line-clamp-4 text-[14px] leading-relaxed text-bank-text-muted">
        {buildPreview(item, 300)}
      </p>
      <div className="mt-auto flex items-center justify-between pt-3 text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={11} strokeWidth={LUCIDE_STROKE} aria-hidden />
          {timeAgo(item.published_at)}
        </span>
        <span>{dateFmt(item.published_at)}</span>
      </div>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">
        Quelle: {item.source_name || 'Fröhlich Redaktion'}
      </p>
    </div>
  </Link>
);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const HomeFinanceNews = () => {
  const prefersReduced = useReducedMotion();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState(() => readCategoryFromHash().key);

  // Deep-Link: Hash ↔ activeCategory. Zwei Wege:
  //  1) Hash-Änderung von außen (Back/Forward, direktes Setzen) → State updaten
  //  2) State-Änderung im Component → Hash aktualisieren (pushState, kein Reload)
  // Zusätzlich: Beim ersten Mount ungültige #kategorie=<x>-Hashes SILENT via
  // replaceState entfernen, damit URL und aktiver Filter konsistent sind.
  useEffect(() => {
    const initial = readCategoryFromHash();
    if (initial.wasInvalid && typeof window !== 'undefined') {
      const url = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', url);
    }
    const onHash = () => setActiveCategory(readCategoryFromHash().key);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const applyCategory = (key) => {
    setActiveCategory(key);
    if (typeof window === 'undefined') return;
    const nextHash = key === 'all' ? '' : `${HASH_PREFIX}${key}`;
    const current = window.location.hash || '';
    if (current === nextHash) return;
    // pushState statt replaceState, damit Back/Forward zwischen Filtern navigiert.
    const url = window.location.pathname + window.location.search + nextHash;
    window.history.pushState(null, '', url);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get('/news/nachrichten', { params: { limit: 40 } })
      .then((res) => {
        if (!alive) return;
        const raw = (res?.data?.items || []).filter(isOwnEditorial);
        // Sortierung: neueste zuerst
        raw.sort((a, b) => {
          const da = a.published_at ? new Date(a.published_at).getTime() : 0;
          const db = b.published_at ? new Date(b.published_at).getTime() : 0;
          return db - da;
        });
        setItems(raw);
        setError(false);
      })
      .catch((e) => {
        console.warn('[HomeFinanceNews] load failed', e);
        setError(true);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const activeFilters = useMemo(() => {
    const present = new Set(items.map((i) => i.category).filter(Boolean));
    const orderedPresent = CATEGORY_ORDER_HINT.filter((k) => present.has(k));
    // Sonstige (nicht im Hint-Order): alphabetisch anhängen
    const extras = Array.from(present)
      .filter((k) => !orderedPresent.includes(k))
      .sort();
    const chips = [{ key: 'all', label: 'Alle' }];
    for (const key of [...orderedPresent, ...extras]) {
      chips.push({ key, label: humanizeCategory(key) });
    }
    return chips;
  }, [items]);

  const featured = items[0] || null;
  const rest = useMemo(() => items.slice(1), [items]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return rest;
    // Featured explizit ausschließen, damit er nicht doppelt (oben + im Grid) erscheint
    const featuredSlug = featured?.slug;
    return items.filter((it) => it.category === activeCategory && it.slug !== featuredSlug);
  }, [items, rest, activeCategory, featured]);

  const teasers = useMemo(() => rest.slice(0, 3), [rest]);
  const grid = useMemo(() => {
    if (activeCategory === 'all') return rest.slice(3, 13);
    return filtered.slice(0, 10);
  }, [rest, filtered, activeCategory]);

  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-72px' },
    transition: { duration: prefersReduced ? 0 : 0.55, ease: EASE, delay: prefersReduced ? 0 : 0.03 * i },
  });

  return (
    <section
      id="home-finance-news"
      className="relative border-t border-bank-border bg-[linear-gradient(180deg,#ffffff_0%,#fafaf7_60%,#f4f4f0_100%)] py-16 sm:py-20 lg:py-28"
      data-testid="home-finance-news"
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          {...reveal(0)}
          className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end"
        >
          <div>
            <Eyebrow>Aktuelle Finanznachrichten</Eyebrow>
            <h2 className="mt-4 font-display text-[2rem] font-light leading-[1.05] tracking-tight text-bank-ink sm:text-[2.6rem] lg:text-[3rem]">
              Was Märkte und Anleger
              <br />
              jetzt bewegt.
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-bank-text-muted sm:text-[15.5px]">
            Redaktionell aufbereitete Meldungen zu Kapitalmärkten, Zinsen, Konjunktur, Unternehmen und Vermögensaufbau.
            Quellen: EZB, Deutsche Bundesbank, BaFin, EU-Kommission, Tagesschau, DW. Aktualisierung mindestens stündlich.
          </p>
        </motion.div>

        {/* Loading / Error / Empty */}
        {loading ? (
          <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" data-testid="home-finance-news-loading">
            <div className="h-[520px] animate-pulse border border-bank-border bg-white/70" />
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map((k) => (
                <div key={k} className="h-24 animate-pulse border border-bank-border bg-white/70 sm:h-28" />
              ))}
            </div>
          </div>
        ) : error || !featured ? (
          <div
            className="mt-14 flex flex-col items-center gap-5 border border-bank-border bg-white px-6 py-14 text-center"
            data-testid="home-finance-news-empty"
          >
            <p className="font-display text-[1.4rem] font-light text-bank-ink">
              Aktuelle Nachrichten werden gerade aktualisiert.
            </p>
            <p className="max-w-lg text-[14px] leading-relaxed text-bank-text-muted">
              Der automatische News-Sync läuft mindestens stündlich. Falls hier gerade keine Meldungen erscheinen,
              schauen Sie im vollständigen Newsbereich vorbei.
            </p>
            <Link
              to="/nachrichten"
              className="inline-flex items-center gap-2 border border-bank-ink bg-bank-ink px-6 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-bank-ink/85"
            >
              Zum Nachrichtenbereich
              <ArrowRight size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
            </Link>
          </div>
        ) : (
          <>
            {/* Featured + 3 teaser */}
            <motion.div
              {...reveal(1)}
              className="mt-12 grid grid-cols-1 gap-8 lg:mt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
            >
              <FeaturedCard item={featured} />
              <div className="flex flex-col divide-y divide-bank-border" data-testid="home-finance-news-secondary">
                {teasers.map((t, idx) => (
                  <SecondaryTeaser key={t.slug} item={t} testId={`home-finance-news-secondary-${idx}`} />
                ))}
              </div>
            </motion.div>

            {/* Filter */}
            <div
              className="mt-16 flex flex-wrap items-center gap-2 border-b border-bank-border pb-5 sm:mt-20 sm:gap-2.5"
              data-testid="home-finance-news-filters"
            >
              <p className="mr-3 hidden font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted sm:inline-flex">
                Filter
              </p>
              {activeFilters.map((cat) => {
                const active = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => applyCategory(cat.key)}
                    data-testid={`home-finance-news-filter-${cat.key}`}
                    data-active={active ? 'true' : 'false'}
                    className={cn(
                      'rounded-full border px-4 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] transition-all duration-200',
                      active
                        ? 'border-bank-ink bg-bank-ink text-white shadow-sm'
                        : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40 hover:text-bank-ink',
                    )}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Grid */}
            <div
              className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-14"
              data-testid="home-finance-news-grid"
            >
              {grid.length === 0 ? (
                <p
                  className="col-span-full py-10 text-center text-[14px] italic text-bank-text-muted"
                  data-testid="home-finance-news-grid-empty"
                >
                  Für diesen Filter sind aktuell keine Beiträge vorhanden.
                </p>
              ) : (
                grid.map((it, i) => (
                  <motion.div key={it.slug} {...reveal(i + 2)}>
                    <GridCard item={it} testId={`home-finance-news-card-${it.slug}`} />
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}

        {/* Bottom CTA */}
        <motion.div
          {...reveal(2)}
          className="mt-16 flex flex-col items-start gap-6 border-t border-bank-border pt-10 sm:mt-20 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-xl">
            <h3 className="font-display text-[1.4rem] font-light leading-tight tracking-tight text-bank-ink sm:text-[1.65rem]">
              Alle aktuellen Meldungen im Überblick
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">
              Sortiert nach Datum, filterbar nach Kategorie. Zusätzlich vertiefendes Finanzwissen im redaktionellen
              Evergreen-Bereich.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/nachrichten"
              data-testid="home-finance-news-cta-all"
              className="inline-flex items-center gap-2 border border-bank-ink bg-bank-ink px-6 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-bank-ink/85"
            >
              Alle Nachrichten
              <ArrowRight size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
            </Link>
            <Link
              to="/wissen"
              data-testid="home-finance-news-cta-wissen"
              className="inline-flex items-center gap-2 border border-bank-border bg-white px-6 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-bank-text transition-colors hover:border-bank-primary/40 hover:text-bank-primary"
            >
              Finanzwissen
              <ArrowRight size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HomeFinanceNews;
