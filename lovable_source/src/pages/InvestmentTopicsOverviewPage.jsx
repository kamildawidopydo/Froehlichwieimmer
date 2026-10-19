import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDown } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import InvestmentTopicCard from '@/components/investment/InvestmentTopicCard';
import InvestmentBreadcrumbs from '@/components/investment/InvestmentBreadcrumbs';
import { fetchActiveInvestmentTopics } from '@/services/investmentTopics';
import { trackInvestmentEvent, InvestmentEvents } from '@/lib/investmentAnalytics';

// Redaktionelle Kurztitel je Slug (nur für Karten-Überschrift; Backend bleibt Source of Truth
// für Kategorie/Teaser). Neue Slugs erben einen Title-Case-Fallback.
const SHORT_TITLES = {
  aktien: 'Aktien',
  anleihen: 'Anleihen',
  dividenden: 'Dividenden',
  altersvorsorge: 'Altersvorsorge',
  immobilien: 'Immobilien',
  marktchancen: 'Marktchancen',
};

const InvestmentTopicsOverviewPage = () => {
  const location = useLocation();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchActiveInvestmentTopics()
      .then((items) => { if (alive) { setTopics(items || []); setLoading(false); } })
      .catch(() => { if (alive) { setTopics([]); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    trackInvestmentEvent(InvestmentEvents.TOPICS_OVERVIEW_VIEW, { route: location.pathname });
  }, [location.pathname]);

  const scrollToGrid = () => {
    const el = document.getElementById('themen-grid');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const enriched = topics.map((t) => ({
    ...t,
    short_title: SHORT_TITLES[t.slug] || (t.slug ? t.slug.charAt(0).toUpperCase() + t.slug.slice(1) : ''),
  }));

  return (
    <div className="bg-white" data-testid="investment-topics-overview">
      <PageMeta
        title="Investmentthemen | Fröhlich Vermögensberatung"
        description="Aktien, Anleihen und weitere Investmentthemen verständlich erklärt. Erfahren Sie mehr über Chancen, Risiken und die persönliche Einordnung im Rahmen Ihrer Vermögensstrategie."
        path="/themen"
      />

      {/* HERO */}
      <section className="border-b border-bank-border">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:px-10 sm:pt-20">
          <InvestmentBreadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Themen' }]} />
          <div className="mt-6 max-w-3xl">
            <Eyebrow>Investmentthemen</Eyebrow>
            <h1 className="mt-4 font-serif text-3xl leading-tight text-bank-text sm:text-[46px]">
              Investmentthemen im Überblick
            </h1>
            <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-bank-text-muted">
              <p>
                Kapitalmärkte bieten unterschiedliche Möglichkeiten, Vermögen zu strukturieren.
                Welche Anlageformen sinnvoll sein können, hängt von persönlichen Zielen, Anlagehorizont
                und Risikobereitschaft ab.
              </p>
              <p>
                In unserem Themenbereich erhalten Sie verständliche Einordnungen zu ausgewählten
                Anlageklassen und Kapitalmarktthemen.
              </p>
            </div>
            <button
              type="button"
              onClick={scrollToGrid}
              data-testid="topics-overview-cta"
              className="mt-8 inline-flex items-center gap-1.5 border-b border-bank-primary pb-0.5 text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary transition-colors hover:text-bank-primary/80"
            >
              Themen entdecken <ArrowDown size={13} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section id="themen-grid" className="bg-bank-bg" data-testid="topics-overview-grid">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex flex-col border border-bank-border bg-white">
                  <div className="aspect-[16/9] w-full animate-pulse bg-neutral-100" />
                  <div className="space-y-2.5 p-6">
                    <div className="h-3 w-24 animate-pulse bg-neutral-100" />
                    <div className="h-5 w-2/3 animate-pulse bg-neutral-200" />
                    <div className="h-4 w-full animate-pulse bg-neutral-100" />
                    <div className="h-4 w-4/5 animate-pulse bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : enriched.length === 0 ? (
            <div className="mx-auto max-w-xl border border-bank-border bg-white p-10 text-center" data-testid="topics-overview-empty">
              <Eyebrow>Themenbereich</Eyebrow>
              <h2 className="mt-3 font-serif text-2xl text-bank-text">
                Aktuell werden hier keine Themen präsentiert.
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">
                Sprechen Sie uns gerne direkt an — wir freuen uns über Ihr Interesse.
              </p>
              <Link
                to="/contact"
                className="mt-6 inline-flex items-center gap-1.5 border-b border-bank-primary pb-0.5 text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary hover:text-bank-primary/80"
              >
                Zum Kontakt
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {enriched.map((t, idx) => (
                <InvestmentTopicCard key={t.slug} topic={t} source="overview" index={idx} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HINWEIS */}
      <section className="border-t border-bank-border">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-bank-text-muted/80">
            Information der Fröhlich Vermögensberatung
          </p>
          <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-bank-text-muted">
            Die dargestellten Inhalte dienen der allgemeinen Information.
            Eine individuelle Einordnung erfolgt im persönlichen Gespräch mit Ihrem Berater.
          </p>
        </div>
      </section>
    </div>
  );
};

export default InvestmentTopicsOverviewPage;
