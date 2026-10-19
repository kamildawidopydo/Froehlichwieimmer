import React, { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowUpRight, ArrowLeft } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import MarktInsights from '@/components/news-markte/MarktInsights';
import HeroTopNews from '@/components/news-markte/HeroTopNews';
import WeitereBeitraege from '@/components/news-markte/WeitereBeitraege';
import PhilosophieCTA from '@/components/news-markte/PhilosophieCTA';
import { useNewsFeed, useMarketInsights } from '@/services/newsMarkteApi';
import { WATCH_CATEGORIES } from '@/components/news-markte/Beobachtungslisten';

const CATEGORY_META = {
  aktien: {
    label: 'Aktien',
    lede: 'Unternehmensbezogene Meldungen, Marktbewegungen und langfristige Aktienthemen.',
    hint: 'Aktien unterliegen Kursschwankungen. Betrachten Sie diese Meldungen als Information, nicht als Anlageempfehlung.',
    marketFilter: ['DAX', 'DJI', 'SPX', 'NDX', 'SX5E'],
  },
  'fonds-etfs': {
    label: 'Fonds & ETFs',
    lede: 'ETFs, Investmentfonds, Geldmarkt-, Anleihe- und Themenfonds im Überblick.',
    hint: 'Fondsprodukte weisen unterschiedliche Kostenstrukturen und Risiken auf — bitte im Detail prüfen.',
    marketFilter: ['DAX', 'SPX', 'NDX', 'SX5E'],
  },
  rohstoffe: {
    label: 'Rohstoffe',
    lede: 'Gold, Silber, Kupfer, Öl und strategische Industriemetalle.',
    hint: 'Rohstoffpreise sind volatil und werden durch geopolitische und konjunkturelle Faktoren beeinflusst.',
    marketFilter: ['GOLD', 'SILVER', 'OIL'],
  },
  'seltene-erden': {
    label: 'Seltene Erden',
    lede: 'Strategische Rohstoffe für Hochtechnologie und Industrie — Lieferketten und Preistrends.',
    hint: 'Der Markt für strategische Metalle ist konzentriert und politisch sensibel.',
    marketFilter: ['GOLD', 'SILVER'],
  },
  anleihen: {
    label: 'Anleihen',
    lede: 'Staatsanleihen, Unternehmensanleihen und Pfandbriefe — Renditen und Bonitäten.',
    hint: 'Anleihen weisen Zinsänderungs- und Bonitätsrisiken auf. Es besteht keine EU-Einlagensicherung.',
    marketFilter: ['EURUSD'],
  },
  zinsen: {
    label: 'Zinsen',
    lede: 'Notenbank-Entscheidungen, Zinserwartungen und Auswirkungen auf Anleger.',
    hint: 'Zinsprognosen sind mit Unsicherheit behaftet und können sich rasch ändern.',
    marketFilter: ['EURUSD'],
  },
  waehrungen: {
    label: 'Währungen',
    lede: 'Wechselkurse, Devisenmarkt und geldpolitische Einflüsse auf Währungen.',
    hint: 'Devisenmärkte sind hoch liquide, aber auch politisch beeinflusst.',
    marketFilter: ['EURUSD'],
  },
  investmenttrends: {
    label: 'Investmenttrends',
    lede: 'Langfristige Themen wie KI, Infrastruktur, Energie und Digitalisierung.',
    hint: 'Themenbezogene Investments sind konzentrierter und können stärker schwanken als breit diversifizierte Anlagen.',
    marketFilter: ['NDX', 'SPX'],
  },
  unternehmen: {
    label: 'Unternehmen',
    lede: 'Firmenmeldungen, Quartalszahlen und Strategie-Updates.',
    hint: 'Einzelnews sollten nicht Basis einer spontanen Anlageentscheidung sein.',
    marketFilter: ['DAX', 'SPX'],
  },
};

const NewsCategoryDetail = ({ categorySlug }) => {
  const { category: paramCategory } = useParams();
  const category = categorySlug || paramCategory;
  const meta = CATEGORY_META[category];
  const feed = useNewsFeed(category);
  const markets = useMarketInsights();

  const filteredMarkets = useMemo(() => {
    if (!meta) return [];
    const wanted = new Set(meta.marketFilter);
    return markets.data.filter((m) => wanted.has(m.symbol));
  }, [markets.data, meta]);

  if (!meta) return <Navigate to="/news" replace />;

  const overview = feed.data?.overview ?? [];
  const top = overview.slice(0, 3);
  const weitere = overview.slice(3, 12);

  return (
    <div className="bg-white" data-testid={`news-category-${category}`}>
      <PageMeta
        title={`${meta.label} — News & Märkte`}
        description={`${meta.lede} Aktuelle Meldungen und Marktdaten der Fröhlich Vermögensberatung.`}
        path={`/news/${category}`}
      />

      {/* Hero */}
      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-8 sm:px-10 sm:pt-16">
          <Link to="/news" className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.2em] text-bank-text-muted transition-colors hover:text-bank-accent-strong" data-testid="back-to-news">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.4} />
            News &amp; Märkte
          </Link>
          <div className="mt-6 flex flex-col gap-3">
            <Eyebrow>Themenbereich</Eyebrow>
            <h1 className="max-w-4xl font-serif text-4xl leading-[1.05] text-bank-text sm:text-5xl lg:text-[56px]">
              {meta.label}
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-bank-text-muted sm:text-lg">
              {meta.lede}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-2 px-6 pb-16 sm:px-10">
        {/* Top news for this category */}
        <section className="pt-10 sm:pt-12">
          <HeroTopNews articles={top} loading={feed.loading} />
        </section>

        {/* Market snapshot filtered to relevant symbols */}
        {filteredMarkets.length > 0 && (
          <MarktInsights insights={filteredMarkets} loading={markets.loading} />
        )}

        {/* Further articles */}
        {weitere.length > 0 && (
          <WeitereBeitraege articles={weitere} loading={feed.loading} />
        )}

        {/* Hint */}
        <section className="border-t border-bank-border pt-10">
          <div className="flex items-start gap-3 border-l-2 border-bank-accent-strong bg-white/60 px-5 py-4 text-[13px] leading-relaxed text-bank-text-muted">
            <p><span className="font-medium text-bank-text">Hinweis.</span> {meta.hint}</p>
          </div>
        </section>

        {/* Other watch topics */}
        <section className="border-t border-bank-border pt-10">
          <Eyebrow>Weitere Themen</Eyebrow>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            {WATCH_CATEGORIES.filter((c) => c.slug !== category).map((c) => (
              <li key={c.slug}>
                <Link to={`/news/${c.slug}`} className="group inline-flex items-center gap-2 text-[13.5px] text-bank-text transition-colors hover:text-bank-accent-strong">
                  {c.label}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" strokeWidth={1.4} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <PhilosophieCTA />
    </div>
  );
};

export default NewsCategoryDetail;
