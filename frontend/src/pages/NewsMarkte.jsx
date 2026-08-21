import React, { useState, useEffect } from 'react';
import PageMeta from '@/components/PageMeta';
import HeroTopNews from '@/components/news-markte/HeroTopNews';
import NewsUeberblick from '@/components/news-markte/NewsUeberblick';
import MarktInsights from '@/components/news-markte/MarktInsights';
import FondsEtfTopNews from '@/components/news-markte/FondsEtfTopNews';
import InvestmentRadar from '@/components/news-markte/InvestmentRadar';
import Anlagetrends from '@/components/news-markte/Anlagetrends';
import WeitereBeitraege from '@/components/news-markte/WeitereBeitraege';
import StimmenZumMarkt from '@/components/news-markte/StimmenZumMarkt';
import AnlegerInteressant from '@/components/news-markte/AnlegerInteressant';
import UnsereEinschaetzung from '@/components/news-markte/UnsereEinschaetzung';
import Beobachtungslisten from '@/components/news-markte/Beobachtungslisten';
import PhilosophieCTA from '@/components/news-markte/PhilosophieCTA';
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
          <HeroTopNews articles={top} loading={feed.loading} />
        </div>
      </section>

      {/* Main sections */}
      <div className="mx-auto max-w-6xl space-y-2 px-6 pb-20 sm:px-10">
        {/* 1. Marktüberblick */}
        <MarktInsights insights={markets.data} loading={markets.loading} />

        {/* 2. News im Überblick + Kategorien */}
        <NewsUeberblick
          articles={overview}
          loading={feed.loading}
          activeCategory={category}
          onCategoryChange={setCategory}
        />

        {/* 3. Fonds & ETF Top-News */}
        <FondsEtfTopNews articles={fundsEtf.data} loading={fundsEtf.loading} />

        {/* 4. Investment-Radar */}
        <InvestmentRadar items={radar.data} loading={radar.loading} />

        {/* 5. Anlagetrends */}
        <Anlagetrends trends={trends.data} loading={trends.loading} />

        {/* 6. Weitere Beiträge */}
        <WeitereBeitraege articles={weitere} loading={feed.loading} />

        {/* 7. Stimmen zum Markt + Unsere Einordnung */}
        <StimmenZumMarkt
          voices={voices.data}
          loading={voices.loading}
          editorial={editorial.data}
        />

        {/* 8. Für unsere Anleger interessant */}
        <AnlegerInteressant articles={anleger} loading={feed.loading} />

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
