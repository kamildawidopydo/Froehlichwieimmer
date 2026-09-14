import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Scale } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import { cn } from '@/lib/utils';
import siteContact from '@/data/siteContact';
import { legalPages } from '@/data/legalPages';

const LEGAL_STAND = 'September 2026';

const legalNav = [
  { slug: 'impressum', label: 'Impressum' },
  { slug: 'privacy', label: 'Datenschutz' },
  { slug: 'terms', label: 'AGB' },
  { slug: 'disclaimer', label: 'Haftungsausschluss' },
  { slug: 'revocation', label: 'Widerruf' },
];

const legalArticleClass = cn(
  'legal-doc break-words',
  '[&_.legal-section-body_p]:text-[15px] [&_.legal-section-body_p]:leading-[1.78] [&_.legal-section-body_p]:text-bank-text-muted',
  '[&_.legal-section-body_strong]:font-semibold [&_.legal-section-body_strong]:text-bank-text',
  '[&_a]:font-medium [&_a]:text-bank-primary [&_a]:underline-offset-[3px] [&_a]:transition-colors hover:[&_a]:underline',
  '[&_a]:focus-visible:outline-none [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-bank-primary/30 [&_a]:focus-visible:ring-offset-2'
);

const Legal = () => {
  const { page } = useParams();
  const pathSlug = page || 'impressum';
  const current = legalPages[pathSlug] || legalPages.impressum;
  const PageIcon = current.icon || Scale;

  return (
    <div className="min-h-screen bg-bank-bg text-bank-text">
      <PageMeta title={current.title} description={current.description} path={`/legal/${pathSlug}`} />

      <div className="grid min-h-screen lg:grid-cols-12">
        <aside className="relative flex flex-col border-b border-white/10 bg-bank-ink px-6 py-10 text-white sm:px-10 sm:py-12 lg:col-span-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:border-white/10 lg:px-10 lg:py-14 xl:col-span-3">
          <div aria-hidden className="pointer-events-none absolute inset-0 topo-pattern opacity-[0.07]" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-accent/50 to-transparent" />
          <div className="relative">
            <Eyebrow tone="light">Rechtliches</Eyebrow>
            <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-white/68">
              Pflichtinformationen, Vertragsgrundlagen und Datenschutz — klar strukturiert und jederzeit abrufbar.
            </p>
            <Link
              to="/"
              className="mt-8 inline-flex cursor-pointer items-center gap-2 text-[12px] font-medium text-white/75 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              Zurück zur Startseite
            </Link>
          </div>

          <nav className="relative mt-12 flex-1 lg:mt-14" aria-label="Rechtliche Dokumente">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Dokumente</p>
            <ul className="space-y-1">
              {legalNav.map((item) => {
                const navPage = legalPages[item.slug];
                const NavIcon = navPage?.icon || Scale;
                const active = pathSlug === item.slug;
                return (
                  <li key={item.slug}>
                    <Link
                      to={`/legal/${item.slug}`}
                      className={cn(
                        'block cursor-pointer rounded-lg border border-transparent py-3 pl-4 pr-3 text-[14px] transition-[background-color,border-color,color] duration-200',
                        active
                          ? 'border-white/15 bg-white/[0.08] font-medium text-white shadow-inner'
                          : 'text-white/72 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2.5">
                          <NavIcon
                            className={cn(
                              'h-3.5 w-3.5 shrink-0',
                              active ? 'text-bank-accent' : 'text-white/45'
                            )}
                            strokeWidth={1.5}
                            aria-hidden
                          />
                          {item.label}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="relative mt-auto hidden border-t border-white/10 pt-8 text-[11px] leading-relaxed text-white/50 lg:block">
            <p>{siteContact.companyName}</p>
            <p className="mt-1">{siteContact.street}</p>
            <p>{siteContact.postalCity}</p>
          </div>
        </aside>

        <main className="relative flex min-h-0 flex-col lg:col-span-8 xl:col-span-9">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,rgb(var(--bank-accent)/0.08),transparent_55%)] dark:opacity-90"
          />
          <header className="relative border-b border-bank-border bg-white/95 px-6 py-10 backdrop-blur-sm sm:px-10 sm:py-12 lg:px-14 lg:py-14 dark:bg-bank-surface/95">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h1
                  className="font-display text-[clamp(1.85rem,4vw,2.75rem)] font-light leading-[1.08] tracking-[-0.02em] text-bank-text"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                >
                  {current.title}
                </h1>
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-bank-text-muted">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text-muted/90">Stand</span>
                  <span className="tabular-nums text-bank-text">{LEGAL_STAND}</span>
                  <span aria-hidden className="hidden h-1 w-1 rounded-full bg-bank-border sm:inline" />
                  <span className="text-[12px] text-bank-text-muted/90">redaktionell gepflegt</span>
                </p>
              </div>
              <div className="hidden shrink-0 sm:block">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-bank-border bg-bank-surface-elev text-bank-primary shadow-editorial-sm dark:bg-bank-surface">
                  <PageIcon className="h-7 w-7" strokeWidth={1.15} aria-hidden />
                </span>
              </div>
            </div>
          </header>

          <div className="relative flex-1 bg-bank-bg px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14 xl:px-12 dark:bg-bank-bg">
            <div className="w-full max-w-none">
              <article
                className={cn(
                  legalArticleClass,
                  'rounded-2xl border border-bank-border bg-white px-5 py-8 shadow-editorial-sm sm:px-8 sm:py-10 md:px-10 md:py-12 dark:bg-bank-surface'
                )}
              >
                {current.body}
              </article>

              <aside className="mt-10 rounded-2xl border border-bank-border bg-bank-ink px-6 py-7 text-white shadow-editorial-md sm:px-8 sm:py-8">
                <h2 className="font-display text-xl font-light leading-snug">Rückfragen zum Inhalt?</h2>
                <p className="mt-3 text-[14px] leading-relaxed text-white/72">
                  Für verbindliche Auslegung gelten die ausgehändigten Dokumente. Allgemeine Fragen beantworten wir über
                  das Kontaktformular.
                </p>
                <Link
                  to="/contact"
                  className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-5 py-3 text-[13px] font-semibold text-bank-ink shadow-editorial-sm transition-[box-shadow] duration-200 hover:shadow-editorial-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-ink"
                >
                  Kontakt aufnehmen
                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </Link>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Legal;
