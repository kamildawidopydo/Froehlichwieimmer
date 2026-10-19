import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sprout, ShieldCheck, Clock, Users, Leaf, TrendingUp } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { strategieCategories } from '@/data/strategieContent';
import { goals } from '@/data/strategieGoals';
import { clusterClassesForGoal } from '@/data/strategieClusters';
import StrategieBreadcrumb from './_StrategieBreadcrumb';
import StrategyFinder from './_StrategyFinder';
import StrategyDownloadCenter from './_StrategyDownloadCenter';

const GOAL_ICONS = { sprout: Sprout, 'shield-check': ShieldCheck, clock: Clock, users: Users, leaf: Leaf, 'trending-up': TrendingUp };

const GoalCard = ({ g }) => {
  const Icon = GOAL_ICONS[g.icon] || TrendingUp;
  const firstTopic = g.topics[0];
  const href = firstTopic ? `/strategie/${firstTopic.category}/${firstTopic.topic}` : '/strategie';
  const cluster = clusterClassesForGoal(g.slug);
  return (
    <Link
      to={href}
      data-testid={`strategie-goal-card-${g.slug}`}
      className={`group relative flex flex-col border border-bank-border bg-white p-7 transition-shadow duration-200 hover:shadow-editorial-sm focus-visible:outline-none focus-visible:ring-2 ${cluster.ring} ${cluster.accentTop}`}
    >
      <div className={`${cluster.iconBadge} rounded-full`}>
        <Icon size={20} strokeWidth={1.6} />
      </div>
      <h3 className="mt-4 font-serif text-xl leading-snug text-bank-text">{g.title}</h3>
      <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-bank-text-muted">{g.lede}</p>
      <span className={`mt-5 inline-flex items-center gap-2 text-[12.5px] font-medium ${cluster.textStrong}`}>
        Themen entdecken
        <ArrowRight size={14} strokeWidth={1.8} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
};

const TrustBlock = () => (
  <section className="mt-20 border-t border-bank-border pt-14" data-testid="strategie-trust" aria-label="Vertrauensbereich">
    <h2 className="max-w-3xl font-serif text-3xl leading-snug text-bank-text sm:text-4xl">
      Information ist der Anfang. Entscheidend ist Ihre persönliche Situation.
    </h2>
    <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
      {[
        { t: 'Verständlich statt kompliziert', d: 'Wir übersetzen Fachbegriffe in Alltagssprache, ohne fachliche Substanz zu verlieren.' },
        { t: 'Chancen und Risiken zusammen', d: 'Keine einseitige Betrachtung — jede Strategie hat beides.' },
        { t: 'Nichts isoliert bewerten', d: 'Eine Anlage entfaltet sich immer im Kontext des Gesamtplans.' },
        { t: 'Ziele & Rahmen zählen', d: 'Persönliche Situation, Zeithorizont und Lebensphase bestimmen die passende Struktur.' },
      ].map((b) => (
        <div key={b.t} className="flex flex-col">
          <p className="font-serif text-lg text-bank-text">{b.t}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-bank-text-muted">{b.d}</p>
        </div>
      ))}
    </div>
    <div className="mt-10">
      <Link
        to="/#home-product-wizard"
        className="inline-flex items-center gap-2 rounded-full bg-bank-primary px-6 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-bank-primary/90"
        data-testid="strategie-overview-cta"
      >
        Persönliche Situation besprechen
        <ArrowRight size={14} strokeWidth={1.8} />
      </Link>
    </div>
  </section>
);

const StrategieOverview = () => (
  <div className="bg-white" data-testid="strategie-overview-page">
    <PageMeta
      title="Strategie & Orientierung — welche finanziellen Ziele möchten Sie erreichen?"
      description="Zielorientierte Übersicht: Vermögen aufbauen, schützen, Ruhestand, Familie, nachhaltiges Investieren, Anlagestrategien verstehen. Mit Strategy Finder und 12 Detailseiten."
      path="/strategie"
    />
    <main className="mx-auto max-w-6xl px-4 py-14 sm:py-20 lg:px-8">
      <StrategieBreadcrumb items={[{ label: 'Startseite', path: '/' }, { label: 'Strategie' }]} />

      {/* HERO */}
      <header className="mt-6 max-w-3xl">
        <p className="text-[10.5px] uppercase tracking-[0.24em] text-bank-primary">Strategie & Orientierung</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-bank-text sm:text-5xl lg:text-6xl">
          Welche finanziellen Ziele möchten Sie erreichen?
        </h1>
        <p className="mt-5 text-[15.5px] leading-relaxed text-bank-text-muted">
          Nicht jede Strategie passt zu jedem Menschen. Wählen Sie zunächst aus, was Sie beschäftigt. Anschließend
          zeigen wir Ihnen passende Themen, Hintergründe und mögliche nächste Schritte.
        </p>
      </header>

      {/* GOAL CARDS */}
      <section
        className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        data-testid="strategie-goals-grid"
      >
        {goals.map((g) => <GoalCard key={g.slug} g={g} />)}
      </section>

      {/* STRATEGY FINDER */}
      <StrategyFinder />

      {/* DIRECT TOPIC SELECTION */}
      <section className="mt-20" data-testid="strategie-direct-topics">
        <h2 className="font-serif text-3xl leading-snug text-bank-text">Oder direkt ein Thema auswählen</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-bank-text-muted">
          Sortiert nach Kategorien — jedes Thema führt auf eine Detailseite mit Chancen, Risiken und weiterführenden Informationen.
        </p>
        <div className="mt-8 space-y-10">
          {strategieCategories.map((c) => (
            <div key={c.slug} data-testid={`strategie-direct-cat-${c.slug}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">{c.eyebrow}</p>
                  <h3 className="mt-1 font-serif text-2xl text-bank-text">
                    <Link to={`/strategie/${c.slug}`} className="hover:text-bank-primary">{c.title}</Link>
                  </h3>
                </div>
                <Link
                  to={`/strategie/${c.slug}`}
                  className="text-[12.5px] font-medium text-bank-primary underline-offset-4 hover:underline"
                >
                  Kategorie öffnen →
                </Link>
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {c.topics.map((t) => (
                  <li key={t.slug}>
                    <Link
                      to={`/strategie/${c.slug}/${t.slug}`}
                      data-testid={`strategie-direct-topic-${t.slug}`}
                      className="block border border-bank-border p-4 hover:border-bank-primary hover:bg-bank-primary/[0.03]"
                    >
                      <p className="font-serif text-[16px] text-bank-text">{t.title}</p>
                      <p className="mt-1 text-[12.5px] text-bank-text-muted line-clamp-2">
                        {t.intro.split('.').slice(0, 1).join('.') + '.'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <TrustBlock />
      <StrategyDownloadCenter />
    </main>
  </div>
);

export default StrategieOverview;
