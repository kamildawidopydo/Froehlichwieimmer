import React, { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronDown } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { findTopic, findCategory } from '@/data/strategieContent';
import StrategieBreadcrumb from './_StrategieBreadcrumb';
import StrategieCta from './_StrategieCta';

const Section = ({ heading, body }) => (
  <section className="mt-10 first:mt-6">
    <h2 className="font-serif text-2xl leading-snug text-bank-text">{heading}</h2>
    {Array.isArray(body) ? (
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[14.5px] leading-relaxed text-bank-text-muted marker:text-bank-primary/60">
        {body.map((line, i) => <li key={i}>{line}</li>)}
      </ul>
    ) : (
      <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">{body}</p>
    )}
  </section>
);

const FaqItem = ({ q, a, idx }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-bank-border py-4" data-testid={`strategie-faq-${idx}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="font-serif text-[16px] text-bank-text">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-bank-primary transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      </button>
      {open && (
        <p className="mt-3 text-[13.5px] leading-relaxed text-bank-text-muted">{a}</p>
      )}
    </div>
  );
};

const StrategieDetail = () => {
  const { category: categorySlug, topic: topicSlug } = useParams();
  const found = findTopic(categorySlug, topicSlug);
  if (!found) return <Navigate to="/strategie" replace />;
  const { category, topic } = found;

  const otherTopics = category.topics.filter((t) => t.slug !== topic.slug);

  const faqJsonLd = topic.faqs && topic.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: topic.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null;

  return (
    <div className="bg-white" data-testid={`strategie-detail-page-${topic.slug}`}>
      <PageMeta
        title={topic.meta.title}
        description={topic.meta.description}
        path={`/strategie/${category.slug}/${topic.slug}`}
      />
      {faqJsonLd && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        </Helmet>
      )}

      <main className="mx-auto max-w-3xl px-4 py-14 sm:py-20 lg:px-8">
        <StrategieBreadcrumb
          items={[
            { label: 'Startseite', path: '/' },
            { label: 'Strategie', path: '/strategie' },
            { label: category.title, path: `/strategie/${category.slug}` },
            { label: topic.title },
          ]}
        />
        <header className="mt-6">
          <p className="text-[10.5px] uppercase tracking-[0.24em] text-bank-primary">{category.eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-bank-text sm:text-5xl">{topic.title}</h1>
          <p className="mt-5 text-[15.5px] leading-relaxed text-bank-text-muted">{topic.intro}</p>
        </header>

        {topic.sections.map((s, i) => (
          <Section key={i} heading={s.heading} body={s.body} />
        ))}

        {topic.faqs && topic.faqs.length > 0 && (
          <section className="mt-14" aria-label="Häufige Fragen">
            <h2 className="font-serif text-2xl leading-snug text-bank-text">Häufige Fragen</h2>
            <div className="mt-4 border-t border-bank-border">
              {topic.faqs.map((f, i) => <FaqItem key={i} idx={i} q={f.q} a={f.a} />)}
            </div>
          </section>
        )}

        <StrategieCta topicTitle={topic.title} />

        {otherTopics.length > 0 && (
          <nav className="mt-16 border-t border-bank-border pt-10" aria-label="Weitere Themen in dieser Kategorie">
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
              Weitere Themen: {category.title}
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
              {otherTopics.map((t) => (
                <li key={t.slug}>
                  <Link
                    to={`/strategie/${category.slug}/${t.slug}`}
                    className="text-bank-primary underline-offset-4 hover:underline"
                    data-testid={`strategie-related-${t.slug}`}
                  >
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>
    </div>
  );
};

export default StrategieDetail;
