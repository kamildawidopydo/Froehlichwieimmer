import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Leaf, ShieldCheck, Clock, Users } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { strategieCategories } from '@/data/strategieContent';
import StrategieBreadcrumb from './_StrategieBreadcrumb';

const ICONS = { 'trending-up': TrendingUp, 'leaf': Leaf, 'shield': ShieldCheck, 'clock': Clock, 'users': Users };

const TrustBlock = () => (
  <section
    className="mt-20 border-t border-bank-border pt-14"
    data-testid="strategie-trust"
    aria-label="Vertrauensbereich"
  >
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
      {[
        { t: 'Individuell & unabhängig', d: 'Jedes Gespräch beginnt bei Ihrer Situation, nicht bei einem Produkt.' },
        { t: 'Zielgerichtet & transparent', d: 'Wir benennen Chancen und Grenzen offen, bevor eine Entscheidung fällt.' },
        { t: 'Langfristig an Ihrer Seite', d: 'Vermögen entsteht über Jahre — genauso arbeiten wir mit Ihnen.' },
        { t: 'Persönliche Beratung', d: 'Ein fester Ansprechpartner, der Ihre Themen kennt und mitdenkt.' },
      ].map((b) => (
        <div key={b.t} className="flex flex-col">
          <p className="font-serif text-lg text-bank-text">{b.t}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-bank-text-muted">{b.d}</p>
        </div>
      ))}
    </div>
  </section>
);

const StrategieOverview = () => (
  <div className="bg-white" data-testid="strategie-overview-page">
    <PageMeta
      title="Strategie — Ansätze für Anlage, Vorsorge und Vermögensplanung"
      description="Übersicht über 12 Anlagestrategien und Vorsorge-Ansätze: Value Investing, ESG, Vermögensschutz, Altersvorsorge, Generationenübertragung — verständlich erklärt."
      path="/strategie"
    />
    <main className="mx-auto max-w-6xl px-4 py-14 sm:py-20 lg:px-8">
      <StrategieBreadcrumb items={[{ label: 'Startseite', path: '/' }, { label: 'Strategie' }]} />
      <header className="mt-6 max-w-3xl">
        <p className="text-[10.5px] uppercase tracking-[0.24em] text-bank-primary">Strategie-Hub</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-bank-text sm:text-5xl lg:text-6xl">
          Strategien für Ihre finanziellen Ziele
        </h1>
        <p className="mt-5 text-[15.5px] leading-relaxed text-bank-text-muted">
          Informieren Sie sich über unterschiedliche Möglichkeiten der Geldanlage, Vorsorge und Vermögensplanung.
          Wählen Sie eine Kategorie, um die passenden Themen und Detailinformationen zu sehen.
        </p>
      </header>

      <section
        className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        data-testid="strategie-category-grid"
      >
        {strategieCategories.map((c) => {
          const Icon = ICONS[c.icon] || TrendingUp;
          return (
            <Link
              key={c.slug}
              to={`/strategie/${c.slug}`}
              data-testid={`strategie-category-card-${c.slug}`}
              className="group flex flex-col border border-bank-border bg-white p-7 transition-shadow duration-200 hover:shadow-editorial-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bank-primary/10 text-bank-primary">
                <Icon size={20} strokeWidth={1.6} />
              </div>
              <p className="mt-4 text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">{c.eyebrow}</p>
              <h2 className="mt-2 font-serif text-2xl leading-snug text-bank-text">{c.title}</h2>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-bank-text-muted">{c.lede}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-medium text-bank-primary">
                Mehr erfahren
                <ArrowRight size={14} strokeWidth={1.8} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </section>

      <TrustBlock />
    </main>
  </div>
);

export default StrategieOverview;
