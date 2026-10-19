import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowRight, Leaf } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { findCategory, strategieCategories } from '@/data/strategieContent';
import StrategieBreadcrumb from './_StrategieBreadcrumb';
import { resolveAccentPair } from '@/design-system/accents';

// Session 80.44 — Priority-A Rollout: dezente Sage-Band unter dem Hero,
// ausschließlich für die Nachhaltigkeits-Kategorie. Editorial, nicht promotional.
const NachhaltigkeitAccentBand = () => {
  const { primary: sage } = resolveAccentPair('sage', 'champagne');
  return (
    <aside
      data-testid="strategie-nachhaltigkeit-sage-band"
      aria-label="Editorial-Notiz zur Nachhaltigkeits-Strategie"
      className={`card-accent-top ${sage.top} mt-10 border border-bank-sage-border ${sage.tint} px-6 py-6 sm:px-8`}
    >
      <div className="flex items-start gap-4">
        <span className={`icon-badge icon-badge-lg ${sage.icon}`} aria-hidden>
          <Leaf size={20} strokeWidth={1.6} />
        </span>
        <div className="min-w-0">
          <p className={`font-mono text-[10.5px] uppercase tracking-[0.24em] ${sage.text}`}>
            Editorial · Nachhaltigkeit
          </p>
          <p className="mt-2 max-w-2xl font-serif text-[16.5px] leading-relaxed text-bank-text">
            Nachhaltigkeit ist bei Fröhlich Vermögensberatung keine Etikette,
            sondern strukturelle Frage: Wie werden ESG-Kriterien tatsächlich
            umgesetzt, welche Ziele lassen sich langfristig tragen, und wie
            passt der Ansatz zu Ihrer Vermögensstruktur über Generationen?
          </p>
        </div>
      </div>
    </aside>
  );
};

const StrategieCategory = () => {
  const { category: categorySlug } = useParams();
  const category = findCategory(categorySlug);
  if (!category) return <Navigate to="/strategie" replace />;

  return (
    <div className="bg-white" data-testid={`strategie-category-page-${category.slug}`}>
      <PageMeta
        title={`${category.title} — Strategien im Überblick`}
        description={category.intro.slice(0, 155)}
        path={`/strategie/${category.slug}`}
      />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:py-20 lg:px-8">
        <StrategieBreadcrumb
          items={[
            { label: 'Startseite', path: '/' },
            { label: 'Strategie', path: '/strategie' },
            { label: category.title },
          ]}
        />
        <header className="mt-6 max-w-3xl">
          <p className="text-[10.5px] uppercase tracking-[0.24em] text-bank-primary">{category.eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-bank-text sm:text-5xl">{category.title}</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-bank-text-muted">{category.intro}</p>
        </header>

        {category.slug === 'nachhaltigkeit' && <NachhaltigkeitAccentBand />}

        <section
          className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          data-testid={`strategie-topic-grid-${category.slug}`}
        >
          {category.topics.map((t) => (
            <Link
              key={t.slug}
              to={`/strategie/${category.slug}/${t.slug}`}
              data-testid={`strategie-topic-card-${t.slug}`}
              className="group flex flex-col border border-bank-border bg-white p-7 transition-shadow duration-200 hover:shadow-editorial-sm"
            >
              <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">{category.eyebrow}</p>
              <h2 className="mt-2 font-serif text-2xl leading-snug text-bank-text">{t.title}</h2>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-bank-text-muted">
                {t.intro.split('.').slice(0, 2).join('.') + '.'}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-medium text-bank-primary">
                Mehr erfahren
                <ArrowRight size={14} strokeWidth={1.8} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </section>

        {/* Interne Verlinkung zu anderen Kategorien */}
        <nav className="mt-16 border-t border-bank-border pt-10" aria-label="Weitere Strategie-Kategorien">
          <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">Weitere Kategorien</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            {strategieCategories
              .filter((c) => c.slug !== category.slug)
              .map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/strategie/${c.slug}`}
                    className="text-bank-primary underline-offset-4 hover:underline"
                    data-testid={`strategie-category-crosslink-${c.slug}`}
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </main>
    </div>
  );
};

export default StrategieCategory;
