import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  Handshake,
  Layers,
  MessageCircle,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Pullquote from '@/components/editorial/Pullquote';
import TocSticky from '@/components/editorial/TocSticky';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import siteImages from '@/data/siteImages';

/** About editorial photos — local rebrand assets. */
const HERO_IMAGE_LOCAL = siteImages.about.hero;

const EASE = [0.22, 1, 0.36, 1];
const COMPANY = 'Fröhlich Vermögensberatung GmbH';

const TOC_SECTIONS = [
  { id: 'wer-wir-sind', label: 'Wer wir sind' },
  { id: 'anlageberatung', label: 'Mehr als Anlageberatung' },
  { id: 'konservativ', label: 'Konservativ denken' },
  { id: 'kompetenz', label: 'Kompetenz' },
  { id: 'langfristig', label: 'Langfristige Zusammenarbeit' },
  { id: 'empfehlung', label: 'Weiterempfehlung' },
  { id: 'philosophie', label: 'Unsere Philosophie' },
  { id: 'kontakt', label: 'Kontakt' },
];

const KOMPETENZ_CARDS = [
  {
    icon: BookOpen,
    title: 'Verstehen',
    body: 'Produkte und Märkte nachvollziehen.',
  },
  {
    icon: Scale,
    title: 'Einordnen',
    body: 'Chancen und Risiken angemessen bewerten.',
  },
  {
    icon: MessageCircle,
    title: 'Vermitteln',
    body: 'Komplexe finanzielle Themen verständlich erklären.',
  },
];

const PHILOSOPHIE_CARDS = [
  {
    icon: Handshake,
    title: 'Vertrauen',
    body: 'Finanzielle Entscheidungen setzen Vertrauen und nachvollziehbare Kommunikation voraus.',
  },
  {
    icon: Compass,
    title: 'Langfristigkeit',
    body: 'Wir möchten unsere Kunden über unterschiedliche Lebens- und Marktphasen hinweg begleiten.',
  },
  {
    icon: ShieldAlert,
    title: 'Risikobewusstsein',
    body: 'Chancen sollen immer gemeinsam mit den damit verbundenen Risiken betrachtet werden.',
  },
  {
    icon: Layers,
    title: 'Diversifikation',
    body: 'Eine durchdachte Vermögensplanung sollte nicht von einer einzigen Anlage oder Anlageklasse abhängig sein.',
  },
];

const ANLAGEKLASSEN = [
  'Aktien',
  'Anleihen',
  'weitere Wertpapierlösungen',
  'gegebenenfalls Beteiligungsmöglichkeiten im Zusammenhang mit Börsengängen (IPOs)',
];

const articleSplit =
  'flex w-full min-w-0 max-w-full flex-col gap-y-10 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-0';
const articleMainCol = 'w-full min-w-0 max-w-full lg:col-span-8';
const articleSideCol = 'w-full min-w-0 max-w-full lg:col-span-4';

const AboutSectionHead = ({ id, eyebrow, title }) => (
  <header id={id} className="w-full min-w-0 max-w-full scroll-mt-32">
    {eyebrow ? (
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">{eyebrow}</p>
    ) : null}
    <h2
      className={cn(
        'break-words font-display text-[clamp(1.45rem,4vw+0.65rem,2.05rem)] font-light leading-[1.12] tracking-[-0.02em] text-bank-text [overflow-wrap:anywhere]',
        eyebrow ? 'mt-4' : ''
      )}
      style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
    >
      {title}
    </h2>
    <div className="mt-5 h-px w-14 bg-bank-gold/50" aria-hidden />
  </header>
);

const AboutMobileToc = ({ items }) => {
  const [activeId, setActiveId] = useState(items?.[0]?.id || null);
  const pillRefs = useRef({});

  useEffect(() => {
    if (!items?.length || typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const el = pillRefs.current[activeId];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeId]);

  return (
    <nav
      aria-label="Abschnitte"
      className="sticky top-0 z-20 border-b border-bank-border bg-bank-bg/95 backdrop-blur-md lg:hidden"
    >
      <div className="relative mx-auto max-w-[1440px] px-5 py-3 sm:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((it) => {
            const active = activeId === it.id;
            return (
              <a
                key={it.id}
                href={`#${it.id}`}
                ref={(node) => {
                  pillRefs.current[it.id] = node;
                }}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors',
                  active
                    ? 'border-bank-primary/30 bg-bank-primary/10 font-medium text-bank-primary'
                    : 'border-bank-border text-bank-text-muted hover:border-bank-primary/20 hover:text-bank-text'
                )}
              >
                {it.label}
              </a>
            );
          })}
        </div>
        <span
          className="pointer-events-none absolute inset-y-3 right-5 w-8 bg-gradient-to-l from-bank-bg/95 to-transparent sm:right-8"
          aria-hidden
        />
      </div>
    </nav>
  );
};

const About = () => {
  const reduce = useReducedMotion();
  const fade = (i = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: reduce ? 0 : 0.55, delay: reduce ? 0 : 0.06 * i, ease: EASE },
  });

  const proseClass =
    'prose-copy w-full min-w-0 max-w-full space-y-5 font-sans text-[15px] leading-[1.8] text-bank-text-muted sm:max-w-prose sm:text-[15.5px] sm:leading-[1.85]';

  return (
    <div className="min-h-screen w-full min-w-0 bg-bank-bg text-bank-text">
      <PageMeta
        title="Über uns"
        description={`${COMPANY} — seit 2020 begleiten wir unsere Kunden mit einer langfristig ausgerichteten, risikobewussten Vermögensberatung.`}
        path="/about"
      />

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-bank-ink">
        <div className="absolute inset-0">
          {/* TODO(Fröhlich Vermögensberatung): Hero-Motiv bei Bedarf durch seriöses Vermögensplanungs-Bild ersetzen (kein hektischer Trading-Chart). */}
          <img
            src={HERO_IMAGE_LOCAL}
            alt=""
            width={1356}
            height={768}
            decoding="async"
            fetchpriority="high"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-90 object-[62%_center] sm:object-[58%_center] lg:object-[55%_center]"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-bank-primary/78 from-[24%] via-bank-primary/55 to-bank-primary/10 dark:from-bank-ink dark:via-bank-ink/90 dark:to-bank-ink/45 lg:via-bank-primary/32 lg:via-[42%] lg:to-transparent lg:dark:via-bank-ink/70 lg:dark:to-transparent"
            aria-hidden
          />
          <div className="topo-pattern absolute inset-0 opacity-[0.06] mix-blend-soft-light" aria-hidden />
        </div>

        <div className="relative mx-auto w-full min-w-0 max-w-[1440px] px-5 pb-16 pt-20 sm:px-8 sm:pb-20 sm:pt-24 lg:px-12 lg:pb-24 lg:pt-28">
          <motion.div {...fade(0)} className="w-full min-w-0 max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-bank-gold">Über uns</p>
            <h1
              className="mt-6 break-words font-display text-display-md font-light leading-[1.02] tracking-[-0.02em] text-white sm:text-display-lg lg:text-display-xl"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Vermögen braucht Vertrauen.
              <br />
              <span className="text-bank-gold">Und eine langfristige Perspektive.</span>
            </h1>
            <p className="prose-copy mt-8 w-full min-w-0 max-w-2xl font-sans text-base leading-[1.75] text-white/90 sm:text-[1.05rem]">
              Seit 2020 begleiten wir unsere Kunden bei finanziellen Entscheidungen mit dem Anspruch, langfristige
              Beziehungen statt kurzfristiger Abschlüsse aufzubauen.
            </p>
            <div className="mt-10">
              <a
                href="#philosophie"
                data-testid="about-hero-philosophy-cta"
                className="group relative inline-flex max-w-full cursor-pointer items-stretch overflow-hidden border border-white/18 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] backdrop-blur-[6px] transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-bank-gold/45 hover:bg-white/[0.07] hover:shadow-[0_0_0_1px_rgba(212,175,55,0.12),0_20px_48px_-24px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-gold/55 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-primary sm:max-w-none"
              >
                <span
                  className="w-[3px] shrink-0 bg-gradient-to-b from-bank-gold via-bank-gold to-bank-gold/55"
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4 text-left sm:px-7 sm:py-5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-bank-gold/95">
                    Fröhlich Vermögensberatung
                  </span>
                  <span
                    className="mt-1.5 font-display text-[1.15rem] font-light leading-tight tracking-[-0.02em] text-white sm:text-[1.35rem]"
                    style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
                  >
                    Mehr über unsere Philosophie
                  </span>
                </span>
                <span
                  className="relative flex w-[3.25rem] shrink-0 items-center justify-center border-l border-white/12 bg-white/[0.03] transition-[background-color,border-color] duration-300 group-hover:border-bank-gold/25 group-hover:bg-bank-gold/[0.12] sm:w-16"
                  aria-hidden
                >
                  <ArrowRight
                    className="relative h-5 w-5 text-bank-gold transition-transform duration-300 ease-out group-hover:translate-x-1"
                    strokeWidth={LUCIDE_STROKE}
                  />
                </span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────── ARTICLE ─────────────────────────── */}
      <article className="w-full min-w-0 border-t border-bank-border">
        <AboutMobileToc items={TOC_SECTIONS} />

        <div className="mx-auto w-full min-w-0 max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="flex w-full min-w-0 max-w-full flex-col gap-y-12 lg:grid lg:grid-cols-12 lg:gap-x-10">
            <aside className="w-full min-w-0 lg:col-span-3">
              <TocSticky items={TOC_SECTIONS} />
            </aside>

            <div className="w-full min-w-0 max-w-full lg:col-span-9">
              {/* Wer wir sind */}
              <motion.section {...fade(0)} className="pb-16 sm:pb-20">
                <div className={articleSplit}>
                  <div className={articleMainCol}>
                    <AboutSectionHead eyebrow="Seit 2020" id="wer-wir-sind" title="Wer wir sind" />
                    <div className={cn('mt-8', proseClass)}>
                      <p className="drop-cap text-bank-text">
                        Die {COMPANY} wurde im Jahr 2020 gegründet. Unser Anspruch ist es, unsere Kunden nicht nur bei
                        einzelnen finanziellen Entscheidungen zu begleiten, sondern langfristige und verlässliche
                        Beziehungen aufzubauen.
                      </p>
                      <p>
                        Unser Tätigkeitsfeld umfasst die Anlagevermittlung und Anlageberatung im Rahmen unserer
                        entsprechenden Registrierung als vertraglich gebundener Vermittler.
                      </p>
                      <p>
                        Eine nachvollziehbare Beratung, eine langfristige Perspektive und ein verantwortungsvoller
                        Umgang mit den finanziellen Zielen unserer Kunden stehen im Mittelpunkt unserer Arbeit.
                      </p>
                    </div>
                  </div>
                  <div className={cn(articleSideCol, 'lg:pt-14')}>
                    <aside className="rounded-2xl border border-bank-border bg-bank-surface-elev/80 p-6 shadow-editorial-sm dark:bg-bank-surface/80 sm:p-7">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-gold">Unternehmen</p>
                      <dl className="mt-4 space-y-3 text-[14px] leading-relaxed text-bank-text-muted">
                        <div>
                          <dt className="text-[11px] uppercase tracking-[0.18em] text-bank-text-muted/70">Firma</dt>
                          <dd className="mt-1 text-bank-text">{COMPANY}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] uppercase tracking-[0.18em] text-bank-text-muted/70">
                            Eintragungsdatum
                          </dt>
                          <dd className="mt-1 text-bank-text">11. September 2020</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] uppercase tracking-[0.18em] text-bank-text-muted/70">
                            Unternehmenszweck
                          </dt>
                          <dd className="mt-1">
                            Anlagevermittlung und Anlageberatung als vertraglich gebundener Vermittler nach den Vorgaben
                            der BaFin — ausschließlich für Rechnung und unter der Haftung eines CRR-Kreditinstituts oder
                            eines Wertpapierhandelsunternehmens mit Sitz im Inland bzw. eines im Sinne dieser Regelung
                            tätigen Unternehmens aus dem Europäischen Wirtschaftsraum.
                          </dd>
                        </div>
                      </dl>
                    </aside>
                  </div>
                </div>
              </motion.section>

              {/* Mehr als klassische Anlageberatung */}
              <motion.section {...fade(1)} className="border-t border-bank-border py-16 sm:py-20">
                <AboutSectionHead id="anlageberatung" title="Mehr als klassische Anlageberatung" />
                <div className={cn('mt-8', proseClass)}>
                  <p>
                    Im Laufe unserer Tätigkeit haben wir festgestellt, dass Vermögensberatung nicht ausschließlich aus
                    Wertpapieren und Kapitalmarktanlagen besteht.
                  </p>
                  <p>
                    Gerade bei Kunden mit größeren liquiden Vermögen spielen auch Sparkonten, verzinsliche Einlagen und
                    die strukturierte Verwaltung vorhandener Liquidität eine wichtige Rolle. Dieser Bereich hat sich im
                    Laufe der Zeit aus den Anforderungen und Gesprächen mit unseren Kunden heraus zu einem weiteren
                    wichtigen Bestandteil unserer Betreuung entwickelt.
                  </p>
                  <p>
                    Insbesondere bei größeren Anlagevolumina kann es sinnvoll sein, liquide Mittel strukturiert zu
                    betrachten und Spar- und Einlagenlösungen in eine übergeordnete Vermögensplanung einzubeziehen.
                    Sparkonten betrachten wir deshalb nicht isoliert, sondern als möglichen Bestandteil einer
                    umfassenderen Vermögensstrategie.
                  </p>
                </div>
              </motion.section>

              {/* Konservativ denken. Chancen dennoch nutzen. */}
              <motion.section {...fade(2)} className="border-t border-bank-border py-16 sm:py-20">
                <AboutSectionHead id="konservativ" title="Konservativ denken. Chancen dennoch nutzen." />
                <div className={cn('mt-8', proseClass)}>
                  <p>
                    Auch bei Kapitalmarktanlagen verfolgen wir grundsätzlich einen risikobewussten und diversifizierten
                    Ansatz. Abhängig von der individuellen Situation und Eignung des Kunden können unterschiedliche
                    Anlageklassen betrachtet werden, beispielsweise:
                  </p>
                </div>
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {ANLAGEKLASSEN.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 rounded-xl border border-bank-border bg-bank-surface/40 px-5 py-4 text-[14.5px] leading-relaxed text-bank-text"
                    >
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-gold"
                        aria-hidden
                      />
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className={cn('mt-8', proseClass)}>
                  <p>
                    Dabei soll nicht kurzfristige Spekulation im Vordergrund stehen. Unser Ansatz besteht vielmehr
                    darin, unterschiedliche Anlageklassen und Risiken bewusst zu betrachten und – soweit dies zur
                    jeweiligen Kundensituation passt – sinnvoll miteinander zu kombinieren.
                  </p>
                  <p>
                    Diversifikation, Qualität, Risikobewusstsein und eine langfristige Betrachtungsweise gehören zu den
                    Grundgedanken unserer Arbeit.
                  </p>
                </div>
                <Pullquote cite="Fröhlich Vermögensberatung" className="mt-12 w-full min-w-0 max-w-full">
                  Konservativ bedeutet für uns nicht, Chancen grundsätzlich auszuschließen. Es bedeutet, Chancen und
                  Risiken bewusst gegeneinander abzuwägen.
                </Pullquote>
              </motion.section>

              {/* Beratung beginnt mit Kompetenz */}
              <motion.section {...fade(3)} className="border-t border-bank-border py-16 sm:py-20">
                <AboutSectionHead id="kompetenz" title="Beratung beginnt mit Kompetenz" />
                <div className={cn('mt-8', proseClass)}>
                  <p>
                    Eine gute Beratung setzt qualifizierte Mitarbeiter voraus. Deshalb legen wir Wert auf die
                    kontinuierliche fachliche Aus- und Weiterbildung unseres Teams.
                  </p>
                  <p>
                    Unsere Mitarbeiter sollen Finanzprodukte nicht lediglich kennen, sondern deren Funktionsweise sowie
                    wesentliche Chancen und Risiken verstehen und verständlich vermitteln können. Das gilt sowohl für
                    klassische Spar- und Einlagenlösungen als auch für Wertpapiere und unterschiedliche Formen der
                    langfristigen Vermögensanlage.
                  </p>
                </div>
                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  {KOMPETENZ_CARDS.map(({ icon: Icon, title, body }) => (
                    <div
                      key={title}
                      data-testid={`kompetenz-card-${title.toLowerCase()}`}
                      className="group relative overflow-hidden rounded-2xl border border-bank-border bg-bank-surface/50 p-6 shadow-editorial-sm transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-bank-gold/40 hover:shadow-editorial-md sm:p-7"
                    >
                      <span
                        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/50 to-transparent"
                        aria-hidden
                      />
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-bank-border bg-white/60 text-bank-primary dark:bg-bank-surface">
                        <Icon className="h-5 w-5" strokeWidth={LUCIDE_STROKE} aria-hidden />
                      </span>
                      <h3
                        className="mt-5 font-display text-[1.15rem] font-light leading-tight tracking-[-0.01em] text-bank-text"
                        style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
                      >
                        {title}
                      </h3>
                      <p className="mt-2 text-[14.5px] leading-relaxed text-bank-text-muted">{body}</p>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* Langfristige Zusammenarbeit — highlighted */}
              <motion.section {...fade(4)} className="border-t border-bank-border py-16 sm:py-20">
                <div className="relative overflow-hidden rounded-3xl border border-bank-ink/15 bg-bank-ink px-6 py-12 text-white shadow-editorial-md sm:px-10 sm:py-14 lg:px-14 lg:py-16">
                  <span
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/60 to-transparent"
                    aria-hidden
                  />
                  <span
                    className="topo-pattern pointer-events-none absolute inset-0 opacity-[0.05]"
                    aria-hidden
                  />
                  <div className="relative">
                    <p
                      id="langfristig"
                      className="scroll-mt-32 font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold"
                    >
                      Unser Anspruch
                    </p>
                    <h2
                      className="mt-4 max-w-3xl break-words font-display text-[clamp(1.55rem,3.4vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-white"
                      style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                    >
                      Langfristige Zusammenarbeit statt kurzfristiger Abschluss
                    </h2>
                    <div className="mt-6 h-px w-14 bg-bank-gold/60" aria-hidden />
                    <div className="mt-8 max-w-2xl space-y-5 text-[15px] leading-[1.8] text-white/85 sm:text-[15.5px] sm:leading-[1.85]">
                      <p>
                        Unser Ziel ist nicht der einzelne Abschluss. Wir möchten unsere Kunden über viele Jahre begleiten
                        und Ansprechpartner sein, wenn sich Lebenssituationen, finanzielle Ziele oder wirtschaftliche
                        Rahmenbedingungen verändern.
                      </p>
                      <p>
                        Dazu gehört für uns auch, bestehende Entscheidungen regelmäßig neu zu betrachten. Was heute
                        sinnvoll erscheint, muss nicht automatisch in einigen Jahren noch zur persönlichen Situation
                        eines Kunden passen.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Ihre Empfehlung */}
              <motion.section {...fade(5)} className="border-t border-bank-border py-16 sm:py-20">
                <AboutSectionHead
                  id="empfehlung"
                  title="Die Weiterempfehlung unserer Kunden ist für uns besonders wertvoll."
                />
                <div className={cn('mt-8', proseClass)}>
                  <p>
                    Wir betrachten die persönliche Weiterempfehlung eines zufriedenen Kunden als eine besondere Form
                    des Vertrauens.
                  </p>
                  <p>
                    Unser Ziel ist es deshalb, eine Betreuung zu bieten, die Kunden aufgrund ihrer eigenen Erfahrungen
                    gerne weiterempfehlen. Nicht ein einzelner Vertragsabschluss soll die Qualität einer
                    Kundenbeziehung bestimmen, sondern die Erfahrung aus einer langfristigen Zusammenarbeit.
                  </p>
                </div>
                <figure className="mt-12 border-l-2 border-bank-gold/60 pl-6 sm:pl-8">
                  <blockquote
                    className="font-display text-[clamp(1.35rem,2.6vw+0.75rem,2rem)] font-light leading-[1.2] tracking-[-0.015em] text-bank-text [overflow-wrap:anywhere]"
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                  >
                    „Wir möchten Beziehungen aufbauen, die länger bestehen als eine einzelne Anlageentscheidung."
                  </blockquote>
                  <figcaption className="mt-5 font-mono text-[11px] uppercase tracking-[0.24em] text-bank-text-muted">
                    Fröhlich Vermögensberatung
                  </figcaption>
                </figure>
              </motion.section>

              {/* Unsere Philosophie */}
              <motion.section {...fade(6)} className="border-t border-bank-border py-16 sm:py-20">
                <AboutSectionHead id="philosophie" eyebrow="Werte" title="Unsere Philosophie" />
                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  {PHILOSOPHIE_CARDS.map(({ icon: Icon, title, body }, i) => (
                    <div
                      key={title}
                      data-testid={`philosophie-card-${title.toLowerCase()}`}
                      className="group relative overflow-hidden rounded-2xl border border-bank-border bg-bank-surface/50 p-6 shadow-editorial-sm transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-bank-gold/40 hover:shadow-editorial-md sm:p-8"
                    >
                      <div className="flex items-start gap-5">
                        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-bank-border bg-white/60 text-bank-primary dark:bg-bank-surface">
                          <Icon className="h-5 w-5" strokeWidth={LUCIDE_STROKE} aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">
                            {String(i + 1).padStart(2, '0')} — Prinzip
                          </p>
                          <h3
                            className="mt-2 font-display text-[1.2rem] font-light leading-tight tracking-[-0.01em] text-bank-text"
                            style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
                          >
                            {title}
                          </h3>
                          <p className="mt-2.5 text-[14.5px] leading-relaxed text-bank-text-muted">{body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* CTA */}
              <motion.section {...fade(7)} className="border-t border-bank-border py-16 sm:py-20">
                <div
                  id="kontakt"
                  className="relative scroll-mt-32 overflow-hidden rounded-3xl border border-bank-border bg-bank-surface-elev/80 p-8 shadow-editorial-md dark:bg-bank-surface/80 sm:p-12 lg:p-14"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/60 to-transparent"
                    aria-hidden
                  />
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">
                    Lernen Sie uns kennen
                  </p>
                  <h2
                    className="mt-4 break-words font-display text-[clamp(1.75rem,3.6vw+0.75rem,2.6rem)] font-light leading-[1.05] tracking-[-0.02em] text-bank-text"
                    style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                  >
                    Vermögen. Vertrauen.{' '}
                    <span className="text-bank-primary">Zukunft.</span>
                  </h2>
                  <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-bank-text-muted sm:text-[16px]">
                    Lernen Sie uns kennen und erfahren Sie mehr über unseren Ansatz einer langfristig ausgerichteten
                    Vermögensberatung.
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-3 sm:gap-4">
                    <Link
                      to="/contact"
                      data-testid="about-cta-contact"
                      className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'inline-flex cursor-pointer')}
                    >
                      Kontakt aufnehmen
                      <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} aria-hidden />
                    </Link>
                    <Link
                      to="/comparison"
                      data-testid="about-cta-services"
                      className={cn(buttonVariants({ variant: 'outline-ink', size: 'lg' }), 'inline-flex cursor-pointer')}
                    >
                      Unsere Leistungen entdecken
                    </Link>
                  </div>
                </div>

                {/* Rechtlicher Hinweis / Klarstellung Branchenangaben */}
                <p className="mt-10 text-[12.5px] leading-relaxed text-bank-text-muted/85">
                  Hinweis: Angaben zu Branchen und Tätigkeitsbereichen aus dem Unternehmensregister
                  (Versicherungsvermittlung, Managementtätigkeiten von Holdinggesellschaften mit überwiegend
                  finanziellem Anteilsbesitz, Effekten- und Warenterminhandel) sind nicht als aufsichtsrechtliche
                  Erlaubnisse oder als vollständige Beschreibung unserer aktuell angebotenen Leistungen zu verstehen.
                  Maßgeblich ist ausschließlich unsere Registrierung als vertraglich gebundener Vermittler bei der
                  BaFin.
                </p>
              </motion.section>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default About;
