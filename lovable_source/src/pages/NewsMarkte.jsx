import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '@/components/PageMeta';
import DisplayCurrencyToggle from '@/components/DisplayCurrencyToggle';
import HeroTopNews from '@/components/news-markte/HeroTopNews';
import NewsUeberblick from '@/components/news-markte/NewsUeberblick';
import MarktInsights from '@/components/news-markte/MarktInsights';
import AktienImFokus from '@/components/news-markte/AktienImFokus';
import WatchlistSection from '@/components/news-markte/WatchlistSection';
import FondsEtfTopNews from '@/components/news-markte/FondsEtfTopNews';
import InvestmentRadar from '@/components/news-markte/InvestmentRadar';
import Anlagetrends from '@/components/news-markte/Anlagetrends';
import WeitereBeitraege from '@/components/news-markte/WeitereBeitraege';
import StimmenZumMarkt from '@/components/news-markte/StimmenZumMarkt';
import AnlegerInteressant from '@/components/news-markte/AnlegerInteressant';
import UnsereEinschaetzung from '@/components/news-markte/UnsereEinschaetzung';
import Beobachtungslisten from '@/components/news-markte/Beobachtungslisten';
import PhilosophieCTA from '@/components/news-markte/PhilosophieCTA';
import { dedupeArticleImages } from '@/lib/newsImageDedup';
import { dedupeArticlesAcrossSections } from '@/lib/newsImageDedup';
import {
  useNewsFeed, useMarketInsights, useEditorial,
  useAnlagetrends, useInvestmentRadar, useMarketVoices,
  newsMarkteApi,
} from '@/services/newsMarkteApi';

const NewsMarkte = () => {
  const [category, setCategory] = useState('alle');
  const feed = useNewsFeed(category);
  const markets = useMarketInsights();
  const editorial = useEditorial();
  const trends = useAnlagetrends();
  const radar = useInvestmentRadar();
  const voices = useMarketVoices();

  // Fetch fund/etf slice for the dedicated section
  const [fundsEtf, setFundsEtf] = useState({ data: [], loading: true });
  useEffect(() => {
    let alive = true;
    newsMarkteApi.feed('fonds-etfs')
      .then((d) => alive && setFundsEtf({ data: d.overview || [], loading: false }))
      .catch(() => alive && setFundsEtf({ data: [], loading: false }));
    return () => { alive = false; };
  }, []);

  const top = feed.data?.top ?? [];
  const overview = feed.data?.overview ?? [];
  const weitere = feed.data?.weitere ?? [];
  const anleger = feed.data?.anleger ?? [];

  // Session 94 · Endgültige Bild- + Artikel-Deduplikation.
  // Zentrale Pipeline in visueller Renderreihenfolge:
  //   1) Hero (top) · 2) News-Überblick (overview) · 3) Fonds/ETF · 4) Weitere · 5) Anleger
  // Dedup auf zwei Achsen:
  //   - stabiler image_key (asset-id / unsplash photo-id / proxy-url / url-fallback)
  //   - article_key (id / slug / title) → verhindert dass derselbe Artikel
  //     aus mehreren Backend-Sektionen mit demselben Bild wiederkommt.
  const dedupResult = useMemo(
    () => dedupeArticlesAcrossSections([
      { section: 'hero-top-news',   articles: top },
      { section: 'news-ueberblick', articles: overview },
      { section: 'fonds-etf-top',   articles: fundsEtf.data },
      { section: 'weitere',         articles: weitere },
      { section: 'anleger',         articles: anleger },
    ], { debug: true }),
    [top, overview, fundsEtf.data, weitere, anleger],
  );
  const [topDedup, overviewDedup, fundsEtfDedup, weitereDedup, anlegerDedup] = dedupResult.groups;

  return (
    <div className="bg-white" data-testid="news-markte-page">
      <PageMeta
        title="News & Märkte — Fröhlich Vermögensberatung"
        description="Aktuelle Wirtschafts- und Börsennachrichten, kompakte Marktdaten, langfristige Investmentthemen sowie redaktionelle Einordnungen der Fröhlich Vermögensberatung."
        path="/news"
      />

      {/* Hero */}
      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-6xl px-6 pb-12 pt-16 sm:px-10 sm:pt-20">
          <div className="mb-10 flex flex-col gap-3">
            <p className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-accent-strong" />
              News &amp; Märkte
            </p>
            <h1 className="max-w-4xl font-serif text-4xl leading-[1.05] text-bank-text sm:text-5xl lg:text-[64px]">
              Informiert sein ist der Anfang.<br className="hidden sm:block" /> Die richtige Einordnung macht den Unterschied.
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-bank-text-muted sm:text-lg">
              Aktien, Fonds, Zinsen, Anleihen, Rohstoffe und Seltene Erden — kompakt aufbereitet, mit Blick auf
              das langfristige Vermögen unserer Anleger.
            </p>
          </div>
          <HeroTopNews articles={topDedup} loading={feed.loading} />

          {/* Sub-Nav: Marktüberblick · Aktien · Watchlist · Nachrichten */}
          <nav className="mt-10 flex flex-wrap gap-2 border-t border-bank-border pt-6" data-testid="news-subnav" aria-label="News-Bereichsnavigation">
            {[
              { to: '#markt-insights', label: 'Marktüberblick' },
              { to: '#aktien-im-fokus', label: 'Aktien' },
              { to: '#watchlist-section', label: 'Watchlist' },
              { to: '/news/nachrichten', label: 'Nachrichten', external: true },
            ].map((n) => (
              n.external ? (
                <Link key={n.label} to={n.to} data-testid={`subnav-${n.label.toLowerCase()}`}
                      className="border border-bank-primary bg-bank-primary px-4 py-1.5 text-[11.5px] font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-bank-primary/90">
                  {n.label}
                </Link>
              ) : (
                <a key={n.label} href={n.to}
                   onClick={(e) => {
                     const id = n.to.slice(1);
                     const el = document.getElementById(id) || document.querySelector(`[data-testid="${id}"]`);
                     if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); window.history.replaceState(null, '', n.to); }
                   }}
                   data-testid={`subnav-${n.label.toLowerCase()}`}
                   className="border border-bank-border px-4 py-1.5 text-[11.5px] font-medium uppercase tracking-[0.18em] text-bank-text-muted transition-colors hover:border-bank-primary/50 hover:text-bank-primary">
                  {n.label}
                </a>
              )
            ))}
          </nav>
        </div>
      </section>

      {/* Main sections */}
      <div className="mx-auto max-w-6xl space-y-2 px-6 pb-20 sm:px-10">
        {/* 0. Persönliche Watchlist (oben) */}
        <WatchlistSection />

        {/* 1. Marktüberblick */}
        <MarktInsights
          insights={markets.data}
          loading={markets.loading}
          currencyToggle={<DisplayCurrencyToggle size="sm" />}
        />

        {/* 1b. Aktien im Fokus — echte Alpha-Vantage-Daten */}
        <AktienImFokus />

        {/* 2. News im Überblick + Kategorien */}
        <NewsUeberblick
          articles={overviewDedup}
          loading={feed.loading}
          activeCategory={category}
          onCategoryChange={setCategory}
        />

        {/* 3. Fonds & ETF Top-News */}
        <FondsEtfTopNews articles={fundsEtfDedup} loading={fundsEtf.loading} />

        {/* 4. Investment-Radar */}
        <InvestmentRadar items={radar.data} loading={radar.loading} />

        {/* 5. Anlagetrends */}
        <Anlagetrends trends={trends.data} loading={trends.loading} />

        {/* 6. Weitere Beiträge */}
        <WeitereBeitraege articles={weitereDedup} loading={feed.loading} />

        {/* 7. Stimmen zum Markt + Unsere Einordnung */}
        <StimmenZumMarkt
          voices={voices.data}
          loading={voices.loading}
          editorial={editorial.data}
        />

        {/* 8. Für unsere Anleger interessant */}
        <AnlegerInteressant articles={anlegerDedup} loading={feed.loading} />

        {/* 9. Unsere Einschätzung (redaktionelle Vollansicht) */}
        <UnsereEinschaetzung posts={editorial.data} loading={editorial.loading} />

        {/* 10. Märkte unter Beobachtung — Navigation zu Detail-Seiten */}
        <Beobachtungslisten />
      </div>

      {/* Verbindung zu unserer Philosophie */}
      <PhilosophieCTA />
    </div>
  );
};

export default NewsMarkte;
