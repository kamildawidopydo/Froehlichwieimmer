import React, { useState } from 'react';
import PageMeta from '@/components/PageMeta';
import HeroTopNews from '@/components/news-markte/HeroTopNews';
import NewsUeberblick from '@/components/news-markte/NewsUeberblick';
import MarktInsights from '@/components/news-markte/MarktInsights';
import WeitereBeitraege from '@/components/news-markte/WeitereBeitraege';
import AnlegerInteressant from '@/components/news-markte/AnlegerInteressant';
import UnsereEinschaetzung from '@/components/news-markte/UnsereEinschaetzung';
import PhilosophieCTA from '@/components/news-markte/PhilosophieCTA';
import { useNewsFeed, useMarketInsights, useEditorial } from '@/services/newsMarkteApi';

const NewsMarkte = () => {
  const [category, setCategory] = useState('alle');
  const feed = useNewsFeed(category);
  const markets = useMarketInsights();
  const editorial = useEditorial();

  const top = feed.data?.top ?? [];
  const overview = feed.data?.overview ?? [];
  const weitere = feed.data?.weitere ?? [];
  const anleger = feed.data?.anleger ?? [];

  return (
    <div className="bg-white" data-testid="news-markte-page">
      <PageMeta
        title="News & Märkte — Fröhlich Vermögensberatung"
        description="Aktuelle Wirtschafts- und Börsennachrichten, kompakte Marktdaten sowie redaktionelle Einschätzungen der Fröhlich Vermögensberatung."
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
              Aktuelle Meldungen.<br className="hidden sm:block" /> Klare Einordnung.
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-bank-text-muted sm:text-lg">
              Wirtschaft, Börse und Zinsen im Überblick — kompakt aufbereitet und um die Sicht der
              Fröhlich Vermögensberatung ergänzt.
            </p>
          </div>
          <HeroTopNews articles={top} loading={feed.loading} />
        </div>
      </section>

      {/* Sections */}
      <div className="mx-auto max-w-6xl space-y-2 px-6 pb-20 sm:px-10">
        <NewsUeberblick
          articles={overview}
          loading={feed.loading}
          activeCategory={category}
          onCategoryChange={setCategory}
        />
        <MarktInsights insights={markets.data} loading={markets.loading} />
        <WeitereBeitraege articles={weitere} loading={feed.loading} />
        <AnlegerInteressant articles={anleger} loading={feed.loading} />
        <UnsereEinschaetzung posts={editorial.data} loading={editorial.loading} />
      </div>

      <PhilosophieCTA />
    </div>
  );
};

export default NewsMarkte;
