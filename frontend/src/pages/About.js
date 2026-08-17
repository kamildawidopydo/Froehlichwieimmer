import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Pullquote from '@/components/editorial/Pullquote';
import TocSticky from '@/components/editorial/TocSticky';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import siteContact from '@/data/siteContact';
import siteImages from '@/data/siteImages';

/** About editorial photos — local rebrand assets. */
const IMG_PARTNER = siteImages.about.partner;
const IMG_LEISTUNG = siteImages.about.leistung;
const IMG_STANDORT = siteImages.about.standort;
const HERO_IMAGE_LOCAL = siteImages.about.hero;

const EASE = [0.22, 1, 0.36, 1];
const COMPANY = 'Alexander Wahl Vermögensverwaltung GmbH';
const PARTNER = 'Vermogens Advies Administratie B.V.';
const SLOGAN =
  'Gemeinsam verbinden wir Nähe und Internationalität – für Ihre finanzielle Freiheit und eine sichere Zukunft.';

const TOC_SECTIONS = [
  { id: 'einfuehrung', label: 'Einführung' },
  { id: 'wer-wir-sind', label: 'Wer wir sind' },
  { id: 'was-wir-tun', label: 'Was wir tun' },
  { id: 'partnerschaft', label: 'Unsere Partnerschaft' },
  { id: 'warum', label: 'Warum mit uns?' },
  { id: 'vorteil', label: 'Ihr Vorteil' },
  { id: 'faq', label: 'Häufige Fragen' },
];

const OFFERINGS = [
  {
    title: 'Sparprodukte',
    body: 'Tagesgeld, Flexgeld und Festgeldangebote mit attraktiven Konditionen',
  },
  {
    title: 'Wertpapierlösungen',
    body: 'Anleihen, Aktien und weitere Anlageinstrumente für jedes Anlageziel',
  },
  {
    title: 'Vermögensverwaltung und Anlageberatung',
    body: 'Strategien, die zu Ihrer persönlichen Situation passen',
  },
  {
    title: 'Kreditvermittlung',
    body: 'Maßgeschneiderte Finanzierungslösungen für private und geschäftliche Vorhaben',
  },
  {
    title: 'Individuelle Lösungen',
    body: 'Wir vergleichen für Sie Produkte und Konditionen, um die beste Lösung zu finden',
  },
];

const FAQ_ITEMS = [
  {
    id: 'faq-trust',
    question: 'Was tut Kapitalmitte für das Vertrauen seiner Kunden?',
    answer:
      'Wir verbinden lokale Betreuung in Deutschland mit einem regulierten europäischen Kooperationspartner, informieren transparent über Produkte und Abläufe und stellen Ihre Interessen in den Mittelpunkt.',
    links: [
      { label: 'Sicherheit', href: '/security' },
      { label: 'Impressum', href: '/legal/impressum' },
    ],
  },
  {
    id: 'faq-how',
    question: 'Wie funktioniert Kapitalmitte?',
    answer:
      'Sie vergleichen Angebote auf unserer Plattform, wählen ein passendes Produkt und werden von uns persönlich begleitet. Die regulierten Wertpapierdienstleistungen erbringt unser niederländischer Kooperationspartner im Rahmen der gesetzlichen Vorgaben.',
    links: [{ label: 'So funktioniert es', href: '/how-it-works' }],
  },
  {
    id: 'faq-bank',
    question: 'Ist Kapitalmitte eine Bank?',
    answer: `Nein. Die ${COMPANY} ist Ihr Ansprechpartner in Deutschland für Betreuung und Koordination. Kundengelder und regulierte Wertpapierdienstleistungen liegen bei den jeweiligen Partnerinstituten bzw. unserem Kooperationspartner — nicht bei uns als Einlagenkonto.`,
  },
  {
    id: 'faq-service',
    question: 'Wie erreiche ich den Kundenservice?',
    answer: `Per Telefon (${siteContact.phoneDisplay}), E-Mail (${siteContact.email}) oder über unsere Kontaktseite — ${siteContact.businessHoursLine}.`,
    links: [{ label: 'Kontakt', href: '/contact' }],
  },
];

const AboutImage = ({ src, alt, className = '' }) => (
  <figure className={cn('group w-full min-w-0', className)}>
    <div className="relative overflow-hidden border border-bank-border bg-muted/30 shadow-editorial-md">
      <span
        className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-bank-gold/60 to-transparent"
        aria-hidden
      />
      <img src={src} alt={alt} className="aspect-[16/10] w-full object-cover object-center" loading="lazy" />
    </div>
  </figure>
);

const articleSplit =
  'flex w-full min-w-0 max-w-full flex-col gap-y-10 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-0';
const articleMainCol = 'w-full min-w-0 max-w-full lg:col-span-7';
const articleSideCol = 'w-full min-w-0 max-w-full lg:col-span-5';

const AboutSectionHead = ({ id, title }) => (
  <header id={id} className="w-full min-w-0 max-w-full scroll-mt-32">
    <h2
      className="w-full max-w-full break-words font-display text-[clamp(1.35rem,4vw+0.65rem,1.85rem)] font-light leading-[1.12] tracking-[-0.02em] text-bank-text [overflow-wrap:anywhere]"
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
  const inlineLink =
    'font-medium text-bank-primary underline-offset-4 transition-colors hover:text-bank-ink hover:underline';

  return (
    <div className="min-h-screen w-full min-w-0 bg-bank-bg text-bank-text">
      <PageMeta
        title="Über uns"
        description={`${COMPANY} und ${PARTNER} — lokale Betreuung in Deutschland, europäische Expertise. kapitalmitte.com.`}
        path="/about"
      />

      <section className="relative isolate overflow-hidden bg-bank-ink">
        <div className="absolute inset-0">
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
              className="mt-6 break-words font-display text-display-md font-light leading-[0.98] tracking-[-0.02em] text-white sm:text-display-lg lg:text-display-xl"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Gemeinsam für Ihre
              <br />
              <span className="text-bank-gold">finanziellen Ziele.</span>
            </h1>
            <p className="prose-copy mt-8 w-full min-w-0 max-w-2xl font-sans text-base leading-[1.75] text-white sm:text-[1.05rem]">
              Die {COMPANY} mit Sitz in Frankfurt am Main und die niederländische {PARTNER} in Amsterdam haben sich
              zusammengeschlossen, um Anlegern in Deutschland und im gesamten europäischen Wirtschaftsraum Zugang zu
              maßgeschneiderten Finanzlösungen zu bieten.
            </p>
            <div className="mt-10">
              <Link
                to="/contact"
                data-testid="about-hero-contact-cta"
                className="group relative inline-flex max-w-full cursor-pointer items-stretch overflow-hidden border border-white/18 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] backdrop-blur-[6px] transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-bank-gold/45 hover:bg-white/[0.07] hover:shadow-[0_0_0_1px_rgba(212,175,55,0.12),0_20px_48px_-24px_rgba(0,0,0,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-gold/55 focus-visible:ring-offset-2 focus-visible:ring-offset-bank-primary sm:max-w-none"
              >
                <span
                  className="w-[3px] shrink-0 bg-gradient-to-b from-bank-gold via-bank-gold to-bank-gold/55"
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4 text-left sm:px-7 sm:py-5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-bank-gold/95">
                    Kapitalmitte
                  </span>
                  <span
                    className="mt-1.5 font-display text-[1.15rem] font-light leading-tight tracking-[-0.02em] text-white sm:text-[1.35rem]"
                    style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
                  >
                    Persönlich kennenlernen
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
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <article className="w-full min-w-0 border-t border-bank-border">
        <AboutMobileToc items={TOC_SECTIONS} />

        <div className="mx-auto w-full min-w-0 max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="flex w-full min-w-0 max-w-full flex-col gap-y-12 lg:grid lg:grid-cols-12 lg:gap-x-10">
            <aside className="w-full min-w-0 lg:col-span-3">
              <TocSticky items={TOC_SECTIONS} />
            </aside>

            <div className="w-full min-w-0 max-w-full lg:col-span-9">
              <motion.section {...fade(0)} className="pb-16 sm:pb-20">
                <div className={articleSplit}>
                  <div className={articleMainCol}>
                    <AboutSectionHead id="einfuehrung" title="Gemeinsam für Ihre finanziellen Ziele" />
                    <div className={cn('mt-8', proseClass)}>
                      <p className="drop-cap text-bank-text">
                        Unser Anspruch ist es, professionelle Expertise, persönliche Betreuung und ein starkes Netzwerk
                        zu verbinden – für nachhaltigen Erfolg und finanzielle Sicherheit.
                      </p>
                      <p>
                        Über kapitalmitte.com bündeln wir lokale Nähe in Deutschland mit der internationalen Expertise
                        unseres Partners in Amsterdam — transparent, strukturiert und auf Ihre Ziele ausgerichtet.
                      </p>
                    </div>
                  </div>
                  <div className={cn(articleSideCol, 'lg:pt-14')}>
                    <aside className="rounded-2xl border border-bank-border bg-bank-surface-elev/80 p-6 shadow-editorial-sm dark:bg-bank-surface/80 sm:p-7">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-gold">Unser Anspruch</p>
                      <p className="mt-4 text-[14.5px] leading-relaxed text-bank-text-muted">
                        Wir glauben an eine Finanzberatung und Vermittlung, die auf Vertrauen, Transparenz und
                        langfristigen Partnerschaften basiert. Jeder Kunde hat individuelle Ziele – und wir arbeiten
                        täglich daran, die besten Lösungen zu finden, um diese Ziele zu erreichen. Dabei stehen Ihre
                        Interessen für uns immer im Mittelpunkt.
                      </p>
                    </aside>
                  </div>
                </div>
              </motion.section>

              <motion.section {...fade(1)} className="border-t border-bank-border py-16 sm:py-20">
                <div className={articleSplit}>
                  <div className={articleMainCol}>
                    <AboutSectionHead id="wer-wir-sind" title="Wer wir sind" />
                    <div className={cn('mt-8', proseClass)}>
                      <p className="text-bank-text">
                        Die {COMPANY} ist Ihr Ansprechpartner in Deutschland für die Betreuung und Koordination unserer
                        Kunden. Wir verfügen über langjährige Erfahrung im Finanzsektor und kennen die Bedürfnisse
                        privater und institutioneller Anleger genau.
                      </p>
                      <p>
                        Gemeinsam mit unserem starken Partner {PARTNER}, einem niederländischen Wertpapierunternehmen seit
                        2006, bieten wir Ihnen Zugang zu einem breiten Spektrum an
                        Finanzdienstleistungen und Anlageprodukten. Durch die Kombination lokaler Nähe in Deutschland und
                        internationaler Expertise schaffen wir Lösungen, die flexibel, effizient und auf Ihre Situation
                        abgestimmt sind.
                      </p>
                    </div>
                  </div>
                  <div className={cn(articleSideCol, 'lg:pt-14')}>
                    <AboutImage src={IMG_PARTNER} alt="Partnerschaftliches Gespräch auf Augenhöhe — geteiltes Notizbuch" />
                  </div>
                </div>
              </motion.section>

              <motion.section {...fade(2)} className="border-t border-bank-border py-16 sm:py-20">
                <div className={articleSplit}>
                  <div className={articleMainCol}>
                    <AboutSectionHead id="was-wir-tun" title="Was wir tun" />
                    <div className={cn('mt-8', proseClass)}>
                      <p>
                        Wir vermitteln Finanzprodukte und Finanzdienstleistungen von ausgewählten Banken, Emittenten und
                        Finanzinstituten in Deutschland und Europa. Unser Angebot umfasst:
                      </p>
                    </div>
                    <ul className="mt-8 divide-y divide-bank-border border-y border-bank-border">
                      {OFFERINGS.map((item) => (
                        <li key={item.title} className="py-5">
                          <h3 className="font-display text-[1.05rem] font-light text-bank-ink">{item.title}</h3>
                          <p className="mt-1.5 text-[14.5px] leading-relaxed text-bank-text-muted">{item.body}</p>
                        </li>
                      ))}
                    </ul>
                    <p className={cn('mt-8', proseClass)}>
                      Unser Ziel ist es, Ihnen den Zugang zu erstklassigen Finanzprodukten zu erleichtern und Sie bei
                      allen finanziellen Entscheidungen kompetent zu begleiten.
                    </p>
                  </div>
                  <div className={cn(articleSideCol, 'lg:pt-14')}>
                    <AboutImage src={IMG_LEISTUNG} alt="Zwei Fachleute prüfen Produktmappen — ruhige Zusammenarbeit" />
                  </div>
                </div>
              </motion.section>

              <motion.section {...fade(3)} className="border-t border-bank-border py-16 sm:py-20">
                <AboutSectionHead id="partnerschaft" title="Unsere Partnerschaft" />
                <div className={cn('mt-8', proseClass)}>
                  <p className="text-bank-text">
                    Die {PARTNER} ist ein nach niederländischem Recht zugelassenes Wertpapierunternehmen und erbringt im
                    Rahmen der Dienstleistungsfreiheit innerhalb der Europäischen Union regulierte
                    Wertpapierdienstleistungen, darunter Anlageberatung, Vermögensverwaltung sowie die Annahme und
                    Weiterleitung von Kundenaufträgen.
                  </p>
                  <p>
                    Durch diese Partnerschaft können wir unseren Kunden in Deutschland Zugang zu einem internationalen
                    Netzwerk von Banken, Emittenten und Finanzdienstleistern bieten – verbunden mit einem hohen Maß an
                    Sicherheit und Regulierung.
                  </p>
                  <p className="pt-2">
                    <Link to="/legal/impressum" className={inlineLink}>
                      Impressum & Partnerangaben
                    </Link>
                  </p>
                </div>
              </motion.section>

              <motion.section {...fade(4)} className="border-t border-bank-border py-16 sm:py-20">
                <AboutSectionHead id="warum" title="Warum mit uns?" />
                <div className={cn('mt-8', proseClass)}>
                  <p>
                    Weil wir mehr bieten als nur Produkte. Wir nehmen uns Zeit, hören zu und entwickeln Lösungen, die
                    wirklich zu Ihnen passen. Unser Anspruch ist es, Ihnen nicht nur heute, sondern langfristig zur Seite
                    zu stehen – als verlässlicher Partner in allen finanziellen Fragen.
                  </p>
                </div>
              </motion.section>

              <motion.section {...fade(5)} className="border-t border-bank-border py-16 sm:py-20">
                <AboutSectionHead id="vorteil" title="Ihr Vorteil" />
                <div className="mt-8 rounded-2xl border border-bank-border bg-bank-ink px-6 py-8 text-white shadow-editorial-md sm:px-8 sm:py-10">
                  <p className="text-[15px] leading-relaxed text-white/80 sm:text-[16px] sm:leading-[1.75]">
                    Sie profitieren von lokaler Betreuung in Deutschland, kombiniert mit der Stärke und Erfahrung eines
                    internationalen Partners. So erhalten Sie Zugang zu attraktiven Konditionen, einer breiten
                    Produktauswahl und persönlicher Beratung – alles aus einer Hand.
                  </p>
                </div>
                <Pullquote cite="Kapitalmitte" className="mt-10 w-full min-w-0 max-w-full">
                  {SLOGAN}
                </Pullquote>
                <div className={cn('mt-10', proseClass)}>
                  <p>
                    Wir freuen uns darauf, Sie persönlich kennenzulernen und Sie auf Ihrem Weg zu Ihren finanziellen
                    Zielen zu begleiten.
                  </p>
                </div>
                <div className={cn('mt-10', articleSplit)}>
                  <div className={articleMainCol}>
                    <p className="text-[14px] leading-relaxed text-bank-text-muted">
                      Unser Hauptsitz: {siteContact.street}, {siteContact.postalCity}. Kundenservice:{' '}
                      <a href={`mailto:${siteContact.email}`} className={inlineLink}>
                        {siteContact.email}
                      </a>
                      ,{' '}
                      <a href={`tel:${siteContact.phoneTel}`} className={inlineLink}>
                        {siteContact.phoneDisplay}
                      </a>
                      .
                    </p>
                  </div>
                  <div className={articleSideCol}>
                    <AboutImage src={IMG_STANDORT} alt="Frankfurt am Main bei Blauen Stunde — Skyline mit Alltag am Fluss" />
                  </div>
                </div>
              </motion.section>

              <motion.section {...fade(6)} className="border-t border-bank-border py-16 sm:py-20">
                <AboutSectionHead id="faq" title="Häufige Fragen" />
                <Accordion type="single" collapsible className="mt-10 space-y-3">
                  {FAQ_ITEMS.map((item, i) => (
                    <AccordionItem
                      key={item.id}
                      value={item.id}
                      className="overflow-hidden border border-bank-border bg-bank-surface/40 px-0"
                    >
                      <AccordionTrigger className="min-w-0 px-5 py-5 text-left font-display text-[1rem] font-light leading-snug text-bank-text hover:no-underline hover:text-bank-primary sm:text-[1.08rem]">
                        <span className="flex min-w-0 items-baseline gap-4">
                          <span className="shrink-0 font-mono text-[10px] tabular-nums tracking-[0.2em] text-bank-text-muted">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0 [overflow-wrap:anywhere]">{item.question}</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="border-t border-bank-border px-5 pb-6 pt-5 font-sans text-[14.5px] leading-[1.8] text-bank-text-muted">
                        <p className="prose-copy min-w-0">{item.answer}</p>
                        {item.links?.length > 0 && (
                          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                            {item.links.map((link) => (
                              <Link key={link.href} to={link.href} className={inlineLink}>
                                {link.label}
                              </Link>
                            ))}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <footer className="mt-16 border-t border-bank-ink/15 pt-12">
                  <p className="flex flex-wrap items-center gap-4">
                    <Link
                      to="/contact"
                      className={cn(buttonVariants({ variant: 'outline-ink', size: 'lg' }), 'inline-flex cursor-pointer')}
                    >
                      Kontakt
                      <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </Link>
                    <Link
                      to="/legal/impressum"
                      className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'cursor-pointer')}
                    >
                      Impressum
                    </Link>
                    <Link to="/comparison" className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'cursor-pointer')}>
                      Sparvergleich
                    </Link>
                  </p>
                </footer>
              </motion.section>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default About;
